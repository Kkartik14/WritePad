package main

import (
	"context"
	"io"
	"log"
	"net/http"
	"sync"

	"github.com/quic-go/quic-go/http3"
	"github.com/quic-go/webtransport-go"
)

// WebTransportSession represents an active WebTransport connection
type WebTransportSession struct {
	session          *webtransport.Session
	client           *Client
	room             *Room
	textStream       *webtransport.Stream // Stream 1: Text operations
	formattingStream *webtransport.Stream // Stream 2: Formatting
	structureStream  *webtransport.Stream // Stream 3: Structure

	// Synchronization: signals when streams are ready
	streamsReady chan struct{}
	streamsMu    sync.Mutex
	streamsCount int
}

// StartWebTransportServer starts an HTTP/3 server for WebTransport
func StartWebTransportServer(port string, hub *CollaborationHub, certFile, keyFile string) error {
	// Create the WebTransport server
	wt := webtransport.Server{
		H3: http3.Server{
			Addr: ":" + port,
		},
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Create a mux for the WebTransport server
	mux := http.NewServeMux()
	mux.HandleFunc("/collab/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[DEBUG] WebTransport handler received request: %s %s", r.Method, r.URL.Path)
		// Extract room ID from path
		// Path is /collab/{roomID}
		roomID := r.URL.Path[len("/collab/"):]
		if roomID == "" {
			http.Error(w, "Missing room ID", http.StatusBadRequest)
			return
		}

		room := hub.GetOrCreateRoom(roomID)

		// Upgrade to WebTransport
		session, err := wt.Upgrade(w, r)
		if err != nil {
			log.Printf("[WARN] WebTransport upgrade failed: %v", err)
			w.WriteHeader(500)
			return
		}

		client := NewClient(room, "WebTransport")
		room.Register <- client

		wts := &WebTransportSession{
			session:      session,
			client:       client,
			room:         room,
			streamsReady: make(chan struct{}),
			streamsCount: 0,
		}

		log.Printf("[INFO] WebTransport session established for room %s", roomID)

		// Handle the session
		wts.handleSession()
	})

	wt.H3.Handler = mux

	log.Printf("[INFO] Starting HTTP/3 (QUIC) server on port %s for WebTransport", port)
	return wt.ListenAndServeTLS(certFile, keyFile)
}

// handleSession manages the WebTransport session lifecycle
func (wts *WebTransportSession) handleSession() {
	defer func() {
		wts.room.Unregister <- wts.client
		_ = wts.session.CloseWithError(0, "session closed")
		log.Printf("[INFO] WebTransport session closed for client %s", wts.client.ID)
	}()

	ctx := context.Background()

	// Handle incoming streams (bidirectional and unidirectional)
	go wts.handleIncomingStreams(ctx)

	// Handle incoming datagrams (unreliable, for awareness)
	go wts.handleIncomingDatagrams(ctx)

	// Handle outgoing messages from client.Send channel
	// We run this in the same goroutine or separate? Separate is fine.
	go wts.handleOutgoingMessages(ctx)

	// Wait for session to close
	<-wts.session.Context().Done()
}

// handleIncomingStreams processes incoming bidirectional streams
func (wts *WebTransportSession) handleIncomingStreams(ctx context.Context) {
	for {
		stream, err := wts.session.AcceptStream(ctx)
		if err != nil {
			// Check if error is due to session closing
			if err != context.Canceled {
				log.Printf("[WARN] Failed to accept stream: %v", err)
			}
			return
		}

		go wts.handleStream(stream)
	}
}

// handleStream processes a single bidirectional stream
func (wts *WebTransportSession) handleStream(stream *webtransport.Stream) {
	defer func() { _ = stream.Close() }()

	// Read the stream type from the first byte
	buf := make([]byte, 1)
	log.Printf("[DEBUG] Waiting for stream type...")
	_, err := io.ReadFull(stream, buf)
	if err != nil {
		log.Printf("[WARN] Failed to read stream type: %v", err)
		return
	}
	log.Printf("[DEBUG] Received stream type: 0x%02x", buf[0])

	streamType := buf[0]

	switch streamType {
	case 0x01: // Text operations stream
		wts.handleTextOpStream(stream)
	case 0x02: // Formatting stream
		wts.handleFormattingStream(stream)
	case 0x03: // Structure stream
		wts.handleStructureStream(stream)
	default:
		log.Printf("[WARN] Unknown stream type: 0x%02x", streamType)
	}
}

// markStreamReady increments the stream count and signals when all 3 streams are ready
func (wts *WebTransportSession) markStreamReady() {
	wts.streamsMu.Lock()
	wts.streamsCount++
	count := wts.streamsCount
	wts.streamsMu.Unlock()

	log.Printf("[DEBUG] Stream ready, count: %d/3", count)

	// Signal when all 3 streams (text, formatting, structure) are ready
	if count == 3 {
		close(wts.streamsReady)
		log.Printf("[INFO] All streams ready for client %s", wts.client.ID)
	}
}

// handleTextOpStream processes text operation messages
func (wts *WebTransportSession) handleTextOpStream(stream *webtransport.Stream) {
	// Store the stream so we can write back to it
	wts.textStream = stream
	wts.markStreamReady()
	log.Printf("[DEBUG] Handling Text Op Stream for client %s", wts.client.ID)

	for {
		// Read message length (2 bytes, big-endian)
		lenBuf := make([]byte, 2)
		log.Printf("[DEBUG] Waiting for message length...")
		_, err := io.ReadFull(stream, lenBuf)
		if err != nil {
			if err != io.EOF {
				log.Printf("[WARN] Text stream read error: %v", err)
			} else {
				log.Printf("[DEBUG] Text stream closed by client")
			}
			return
		}

		msgLen := int(lenBuf[0])<<8 | int(lenBuf[1])
		log.Printf("[DEBUG] Message length: %d. Reading payload...", msgLen)

		// Read message
		msg := make([]byte, msgLen)
		_, err = io.ReadFull(stream, msg)
		if err != nil {
			log.Printf("[WARN] Failed to read text message: %v", err)
			return
		}

		// Broadcast to room (zero-copy relay)
		// Prefix with 0x01 to indicate Text Op
		broadcastMsg := append([]byte{0x01}, msg...)
		log.Printf("[DEBUG] Broadcasting text op to room...")
		wts.room.BroadcastMessage(broadcastMsg, wts.client)

		log.Printf("[DEBUG] Text op relayed: %d bytes", msgLen)
	}
}

// handleFormattingStream processes formatting messages
func (wts *WebTransportSession) handleFormattingStream(stream *webtransport.Stream) {
	wts.formattingStream = stream
	wts.markStreamReady()
	log.Printf("[DEBUG] Handling Formatting Stream")
	for {
		lenBuf := make([]byte, 2)
		_, err := io.ReadFull(stream, lenBuf)
		if err != nil {
			if err != io.EOF {
				log.Printf("[WARN] Formatting stream read error: %v", err)
			}
			return
		}

		msgLen := int(lenBuf[0])<<8 | int(lenBuf[1])
		msg := make([]byte, msgLen)
		_, err = io.ReadFull(stream, msg)
		if err != nil {
			log.Printf("[WARN] Failed to read formatting message: %v", err)
			return
		}

		// Prefix with 0x02 for Formatting
		broadcastMsg := append([]byte{0x02}, msg...)
		wts.room.BroadcastMessage(broadcastMsg, wts.client)
		log.Printf("[DEBUG] Formatting op relayed: %d bytes", msgLen)
	}
}

// handleStructureStream processes structure messages
func (wts *WebTransportSession) handleStructureStream(stream *webtransport.Stream) {
	wts.structureStream = stream
	wts.markStreamReady()
	log.Printf("[DEBUG] Handling Structure Stream")
	for {
		lenBuf := make([]byte, 2)
		_, err := io.ReadFull(stream, lenBuf)
		if err != nil {
			if err != io.EOF {
				log.Printf("[WARN] Structure stream read error: %v", err)
			}
			return
		}

		msgLen := int(lenBuf[0])<<8 | int(lenBuf[1])
		msg := make([]byte, msgLen)
		_, err = io.ReadFull(stream, msg)
		if err != nil {
			log.Printf("[WARN] Failed to read structure message: %v", err)
			return
		}

		// Prefix with 0x03 for Structure
		broadcastMsg := append([]byte{0x03}, msg...)
		wts.room.BroadcastMessage(broadcastMsg, wts.client)
		log.Printf("[DEBUG] Structure op relayed: %d bytes", msgLen)
	}
}

// handleIncomingDatagrams processes unreliable datagrams (awareness/cursor updates)
func (wts *WebTransportSession) handleIncomingDatagrams(ctx context.Context) {
	for {
		msg, err := wts.session.ReceiveDatagram(ctx)
		if err != nil {
			// Check if error is due to session closing
			if err != context.Canceled {
				log.Printf("[WARN] Datagram receive error: %v", err)
			}
			return
		}

		// Broadcast awareness (cursor position) to all clients
		// Prefix with 0x04 for Awareness (Datagram)
		broadcastMsg := append([]byte{0x04}, msg...)
		wts.room.BroadcastMessage(broadcastMsg, wts.client)
		log.Printf("[DEBUG] Awareness datagram relayed: %d bytes", len(msg))
	}
}

// handleOutgoingMessages sends messages from the room to the client
func (wts *WebTransportSession) handleOutgoingMessages(ctx context.Context) {
	// CRITICAL: Wait for all streams to be ready before processing messages
	// This prevents the race condition where messages arrive before streams are set up
	log.Printf("[DEBUG] Waiting for streams to be ready before processing outgoing messages...")
	select {
	case <-wts.streamsReady:
		log.Printf("[DEBUG] Streams ready, starting to process outgoing messages")
	case <-ctx.Done():
		log.Printf("[DEBUG] Context cancelled while waiting for streams")
		return
	}

	for msg := range wts.client.Send {
		if len(msg) == 0 {
			continue
		}

		msgType := msg[0]
		payload := msg[1:]

		if msgType == 0x01 { // Text Op -> Reliable Stream
			if wts.textStream != nil {
				log.Printf("[DEBUG] Sending text op to client %s: %d bytes", wts.client.ID, len(payload))
				// Protocol: [Length (2 bytes)] [Data]
				lenBuf := []byte{byte(len(payload) >> 8), byte(len(payload) & 0xFF)}

				// Write length
				_, err := wts.textStream.Write(lenBuf)
				if err != nil {
					log.Printf("[WARN] Failed to write length to text stream: %v", err)
					return
				}

				// Write payload
				_, err = wts.textStream.Write(payload)
				if err != nil {
					log.Printf("[WARN] Failed to write payload to text stream: %v", err)
					return
				}
				log.Printf("[DEBUG] Text op sent successfully to client %s", wts.client.ID)
			} else {
				log.Printf("[WARN] textStream is nil for client %s, cannot send text op!", wts.client.ID)
			}
		} else if msgType == 0x02 { // Formatting -> Reliable Stream
			if wts.formattingStream != nil {
				lenBuf := []byte{byte(len(payload) >> 8), byte(len(payload) & 0xFF)}
				if _, err := wts.formattingStream.Write(lenBuf); err != nil {
					log.Printf("[WARN] Failed to write length to formatting stream: %v", err)
					return
				}
				if _, err := wts.formattingStream.Write(payload); err != nil {
					log.Printf("[WARN] Failed to write payload to formatting stream: %v", err)
					return
				}
			}
		} else if msgType == 0x03 { // Structure -> Reliable Stream
			if wts.structureStream != nil {
				lenBuf := []byte{byte(len(payload) >> 8), byte(len(payload) & 0xFF)}
				if _, err := wts.structureStream.Write(lenBuf); err != nil {
					log.Printf("[WARN] Failed to write length to structure stream: %v", err)
					return
				}
				if _, err := wts.structureStream.Write(payload); err != nil {
					log.Printf("[WARN] Failed to write payload to structure stream: %v", err)
					return
				}
			}
		} else if msgType == 0x04 { // Awareness -> Datagram
			err := wts.session.SendDatagram(payload)
			if err != nil {
				log.Printf("[WARN] Failed to send datagram: %v", err)
				return
			}
		} else {
			// Fallback for other types or if stream not ready
			// log.Printf("[WARN] Unknown message type or no stream: 0x%02x", msgType)
		}
	}
}
