package main

import (
	"context"
	"crypto/tls"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"sync/atomic"

	"github.com/quic-go/quic-go/http3"
	"github.com/quic-go/webtransport-go"
)

// ============ Configuration ============

var (
	httpPort   = getEnv("HTTP_PORT", "8080")
	quicPort   = getEnv("QUIC_PORT", "4433")
	certFile   = getEnv("CERT_FILE", "localhost.pem")
	keyFile    = getEnv("KEY_FILE", "localhost.key")
	domainName = getEnv("DOMAIN", "localhost")
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ============ Main ============

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	hub := NewHub()

	// Start WebTransport server (QUIC/HTTP3)
	go func() {
		log.Printf("Starting WebTransport server on :%s", quicPort)
		if err := startWebTransportServer(hub); err != nil {
			log.Fatalf("WebTransport server error: %v", err)
		}
	}()

	// Start HTTPS server (WebSocket fallback + health check)
	log.Printf("Starting HTTPS server on :%s", httpPort)
	if err := startHTTPSServer(hub); err != nil {
		log.Fatalf("HTTPS server error: %v", err)
	}
}

// ============ WebTransport Server ============

func startWebTransportServer(hub *Hub) error {
	// Verify certificates exist and are readable
	if _, err := os.Stat(certFile); err != nil {
		log.Printf("[WT] ERROR: Cannot read cert file %s: %v", certFile, err)
		return err
	}
	if _, err := os.Stat(keyFile); err != nil {
		log.Printf("[WT] ERROR: Cannot read key file %s: %v", keyFile, err)
		return err
	}
	log.Printf("[WT] Certificates loaded from %s", certFile)

	wt := webtransport.Server{
		H3: http3.Server{
			Addr: "0.0.0.0:" + quicPort, // Bind to IPv4 explicitly
		},
		CheckOrigin: func(r *http.Request) bool {
			log.Printf("[WT] CheckOrigin called from: %s", r.RemoteAddr)
			return true // Allow all origins
		},
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[WT] Request received: %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)

		// Handle health check
		if r.URL.Path == "/health" {
			w.Write([]byte("ok"))
			return
		}

		// Extract room ID
		roomID := "default"
		if len(r.URL.Path) > len("/collab/") && r.URL.Path[:7] == "/collab" {
			roomID = r.URL.Path[8:]
		}
		if roomID == "" {
			roomID = "default"
		}

		log.Printf("[WT] Connection request for room: %s from %s", roomID, r.RemoteAddr)

		session, err := wt.Upgrade(w, r)
		if err != nil {
			log.Printf("[WT] Upgrade failed: %v", err)
			return
		}

		room := hub.GetOrCreateRoom(roomID)
		client := NewClient(room)
		room.Register <- client

		handleSession(session, client, room)
	})

	wt.H3.Handler = mux

	log.Printf("[WT] WebTransport server starting on :%s with cert %s", quicPort, certFile)
	return wt.ListenAndServeTLS(certFile, keyFile)
}

// ============ HTTPS Server ============

func startHTTPSServer(hub *Hub) error {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","webtransport":"wss://` + domainName + `:` + quicPort + `"}`))
	})

	// CORS preflight
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		w.Write([]byte("y-webtransport server. WebTransport available on port " + quicPort))
	})

	server := &http.Server{
		Addr:    ":" + httpPort,
		Handler: mux,
		TLSConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
		},
	}

	return server.ListenAndServeTLS(certFile, keyFile)
}

// ============ Session Handler ============

func handleSession(session *webtransport.Session, client *Client, room *Room) {
	defer func() {
		room.Unregister <- client
		session.CloseWithError(0, "session closed")
		log.Printf("[WT] Session closed for client %d", client.ID)
	}()

	ctx := context.Background()
	var wg sync.WaitGroup

	// Handle incoming streams
	wg.Add(1)
	go func() {
		defer wg.Done()
		handleStreams(ctx, session, client, room)
	}()

	// Handle incoming datagrams
	wg.Add(1)
	go func() {
		defer wg.Done()
		handleDatagrams(ctx, session, client, room)
	}()

	// Handle outgoing messages
	wg.Add(1)
	go func() {
		defer wg.Done()
		handleOutgoing(ctx, session, client)
	}()

	// Wait for session to close
	<-session.Context().Done()
	wg.Wait()
}

func handleStreams(ctx context.Context, session *webtransport.Session, client *Client, room *Room) {
	for {
		stream, err := session.AcceptStream(ctx)
		if err != nil {
			return
		}

		go func(s *webtransport.Stream) {
			defer s.Close()

			// Read stream type
			typeBuf := make([]byte, 1)
			if _, err := io.ReadFull(s, typeBuf); err != nil {
				return
			}

			log.Printf("[WT] Stream type 0x%02x from client %d", typeBuf[0], client.ID)

			// Store sync stream for outgoing messages
			if typeBuf[0] == 0x01 {
				client.SetSyncStream(s)

				// Send initial sync response (empty sync step 2)
				// This tells the client "I have no document state, you're synced"
				// Format: [length_hi, length_lo, msg_type, step_type]
				// msg_type 0x00 = sync, step_type 0x01 = step 2, followed by 0x00 (empty update)
				initialSync := []byte{
					0x00, 0x03, // Length: 3 bytes
					0x00,       // Message type: sync
					0x01,       // Sync step 2
					0x00,       // Empty update (0 structs)
				}
				if _, err := s.Write(initialSync); err != nil {
					log.Printf("[WT] Failed to send initial sync to client %d: %v", client.ID, err)
				} else {
					log.Printf("[WT] Sent initial sync step 2 to client %d", client.ID)
				}
			}

			// Read and relay messages
			for {
				lenBuf := make([]byte, 2)
				if _, err := io.ReadFull(s, lenBuf); err != nil {
					return
				}

				msgLen := int(lenBuf[0])<<8 | int(lenBuf[1])
				if msgLen == 0 || msgLen > 65535 {
					continue
				}

				msg := make([]byte, msgLen)
				if _, err := io.ReadFull(s, msg); err != nil {
					return
				}

				log.Printf("[WT] Client %d sent %d bytes (type 0x%02x)", client.ID, msgLen, msg[0])

				// Frame and broadcast
				framed := make([]byte, 2+msgLen)
				framed[0] = byte(msgLen >> 8)
				framed[1] = byte(msgLen)
				copy(framed[2:], msg)

				room.Broadcast <- &Message{Data: framed, Sender: client}
			}
		}(stream)
	}
}

func handleDatagrams(ctx context.Context, session *webtransport.Session, client *Client, room *Room) {
	for {
		data, err := session.ReceiveDatagram(ctx)
	if err != nil {
			return
		}

		// Echo back 8-byte pings for latency measurement
		if len(data) == 8 {
			_ = session.SendDatagram(data)
		}

		// Broadcast to others
		room.BroadcastDatagram(data, client)
	}
}

func handleOutgoing(ctx context.Context, session *webtransport.Session, client *Client) {
	for {
		select {
		case msg, ok := <-client.Send:
			if !ok {
				return
			}
			stream := client.GetSyncStream()
			if stream != nil {
				stream.Write(msg)
			}
		case <-ctx.Done():
			return
		}
	}
}

// ============ Hub ============

type Hub struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{rooms: make(map[string]*Room)}
}

func (h *Hub) GetOrCreateRoom(id string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, ok := h.rooms[id]; ok {
		return room
	}

	room := NewRoom(id)
	h.rooms[id] = room
	go room.Run()
	return room
}

// ============ Room ============

type Room struct {
	ID         string
	clients    map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan *Message
	mu         sync.RWMutex
}

type Message struct {
	Data   []byte
	Sender *Client
}

func NewRoom(id string) *Room {
	return &Room{
		ID:         id,
		clients:    make(map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan *Message, 256),
	}
}

func (r *Room) Run() {
	for {
		select {
		case client := <-r.Register:
			r.mu.Lock()
			r.clients[client] = true
			r.mu.Unlock()
			log.Printf("[Room %s] Client %d joined, total: %d", r.ID, client.ID, len(r.clients))

		case client := <-r.Unregister:
			r.mu.Lock()
			if _, ok := r.clients[client]; ok {
				delete(r.clients, client)
				close(client.Send)
			}
			r.mu.Unlock()
			log.Printf("[Room %s] Client %d left, total: %d", r.ID, client.ID, len(r.clients))

		case msg := <-r.Broadcast:
			r.mu.RLock()
			for client := range r.clients {
				if client == msg.Sender {
					continue
				}
				select {
				case client.Send <- msg.Data:
				default:
				}
			}
			r.mu.RUnlock()
		}
	}
}

func (r *Room) BroadcastDatagram(data []byte, sender *Client) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for client := range r.clients {
		if client == sender || client.sendDatagram == nil {
			continue
		}
		client.sendDatagram(data)
	}
}

// ============ Client ============

var clientIDCounter uint64

type Client struct {
	ID           uint64
	Room         *Room
	Send         chan []byte
	sendDatagram func([]byte)
	syncStream   *webtransport.Stream
	streamMu     sync.Mutex
}

func NewClient(room *Room) *Client {
	return &Client{
		ID:   atomic.AddUint64(&clientIDCounter, 1),
		Room: room,
		Send: make(chan []byte, 256),
	}
}

func (c *Client) SetSyncStream(s *webtransport.Stream) {
	c.streamMu.Lock()
	c.syncStream = s
	c.streamMu.Unlock()
}

func (c *Client) GetSyncStream() *webtransport.Stream {
	c.streamMu.Lock()
	defer c.streamMu.Unlock()
	return c.syncStream
}
