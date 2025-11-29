package main

import (
	"io"
	"log"
	"net/http"

	"github.com/gobwas/ws"
	"github.com/gobwas/ws/wsutil"
)

// HandleWebSocket handles WebSocket connections (zero-copy)
func (h *CollaborationHub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Path[len("/collab/"):]
	room := h.GetOrCreateRoom(roomID)

	// Upgrade to WebSocket
	conn, _, _, err := ws.UpgradeHTTP(r, w)
	if err != nil {
		log.Printf("[WARN] WebSocket upgrade failed: %v", err)
		return
	}

	client := NewClient(room, "WebSocket")
	room.Register <- client

	// Goroutine to read from WebSocket and broadcast
	go func() {
		defer func() {
			room.Unregister <- client
			_ = conn.Close()
		}()

		for {
			msg, op, err := wsutil.ReadClientData(conn)
			if err != nil {
				if err != io.EOF {
					log.Printf("[WARN] WebSocket read error: %v", err)
				}
				return
			}

			// Only handle binary messages (Y.js updates)
			if op == ws.OpBinary {
				room.BroadcastMessage(msg, client)
			}
		}
	}()

	// Goroutine to write to WebSocket from client.Send channel
	go func() {
		for msg := range client.Send {
			err := wsutil.WriteServerBinary(conn, msg)
			if err != nil {
				log.Printf("[WARN] WebSocket write error: %v", err)
				return
			}
		}
	}()
}

// HandleWebTransport is a placeholder for WebTransport connections
// Phase 1: We'll implement the multi-stream DocSync protocol here
func (h *CollaborationHub) HandleWebTransport(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement WebTransport multi-stream protocol
	// For now, return 501 Not Implemented
	http.Error(w, "WebTransport not yet implemented", http.StatusNotImplemented)
	log.Printf("[INFO] WebTransport connection attempted (not implemented yet)")
}
