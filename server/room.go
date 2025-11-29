package main

import (
	"log"
	"sync"
	"time"
)

// Room represents a collaboration room
type Room struct {
	ID         string
	Hub        *CollaborationHub
	Clients    map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte
	mu         sync.RWMutex
}

// Run starts the room's event loop
func (r *Room) Run() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case client := <-r.Register:
			r.mu.Lock()
			r.Clients[client] = true
			r.mu.Unlock()
			log.Printf("[INFO] Client (ID: %s) joined room %s via %s. Total clients: %d",
				client.ID, r.ID, client.Protocol, len(r.Clients))

		case client := <-r.Unregister:
			r.mu.Lock()
			if _, ok := r.Clients[client]; ok {
				delete(r.Clients, client)
				close(client.Send)
				log.Printf("[INFO] Client (ID: %s) left room %s. Remaining clients: %d",
					client.ID, r.ID, len(r.Clients))
			}
			r.mu.Unlock()

		case message := <-r.Broadcast:
			r.mu.RLock()
			for client := range r.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(r.Clients, client)
				}
			}
			r.mu.RUnlock()

		case <-ticker.C:
			// Periodic debug log for active rooms
			if len(r.Clients) > 0 {
				log.Printf("[DEBUG] Room %s: %d clients active", r.ID, len(r.Clients))
			}
		}
	}
}

// BroadcastMessage sends a message to all clients in the room
func (r *Room) BroadcastMessage(message []byte, sender *Client) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for client := range r.Clients {
		if client == sender {
			continue // Don't echo back to sender
		}
		select {
		case client.Send <- message:
		default:
			// Client send buffer full, drop message
		}
	}
}
