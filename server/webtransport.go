package main

import (
	"context"
	"io"
	"log"
	"net/http"

	"github.com/quic-go/quic-go/http3"
	"github.com/quic-go/webtransport-go"
)

// WebTransportSession represents an active WebTransport connection
type WebTransportSession struct {
	session *webtransport.Session
	client  *Client
	room    *Room
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
			session: session,
			client:  client,
			room:    room,
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
	_, err := io.ReadFull(stream, buf)
	if err != nil {
		log.Printf("[WARN] Failed to read stream type: %v", err)
		return
	}

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

// handleTextOpStream processes text operation messages
func (wts *WebTransportSession) handleTextOpStream(stream *webtransport.Stream) {
	for {
		// Read message length (2 bytes, big-endian)
		lenBuf := make([]byte, 2)
		_, err := io.ReadFull(stream, lenBuf)
		if err != nil {
			if err != io.EOF {
				log.Printf("[WARN] Text stream read error: %v", err)
			}
			return
		}

		msgLen := int(lenBuf[0])<<8 | int(lenBuf[1])

		// Read message
		msg := make([]byte, msgLen)
		_, err = io.ReadFull(stream, msg)
		if err != nil {
			log.Printf("[WARN] Failed to read text message: %v", err)
			return
		}

		// Broadcast to room (zero-copy relay)
		wts.room.BroadcastMessage(msg, wts.client)

		log.Printf("[DEBUG] Text op relayed: %d bytes", msgLen)
	}
}

// handleFormattingStream processes formatting messages
func (wts *WebTransportSession) handleFormattingStream(stream *webtransport.Stream) {
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

		wts.room.BroadcastMessage(msg, wts.client)
		log.Printf("[DEBUG] Formatting op relayed: %d bytes", msgLen)
	}
}

// handleStructureStream processes structure messages
func (wts *WebTransportSession) handleStructureStream(stream *webtransport.Stream) {
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

		wts.room.BroadcastMessage(msg, wts.client)
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
		wts.room.BroadcastMessage(msg, wts.client)
		log.Printf("[DEBUG] Awareness datagram relayed: %d bytes", len(msg))
	}
}

// handleOutgoingMessages sends messages from the room to the client
func (wts *WebTransportSession) handleOutgoingMessages(ctx context.Context) {
	for msg := range wts.client.Send {
		// For now, send all messages as datagrams
		// In a more sophisticated implementation, we'd route based on message type
		err := wts.session.SendDatagram(msg)
		if err != nil {
			log.Printf("[WARN] Failed to send datagram: %v", err)
			return
		}
	}
}
