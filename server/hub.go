package main

import (
	"log"
	"sync"
)

// CollaborationHub manages all active rooms
type CollaborationHub struct {
	Rooms map[string]*Room
	mu    sync.RWMutex
}

// NewCollaborationHub creates a new collaboration hub
func NewCollaborationHub() *CollaborationHub {
	return &CollaborationHub{
		Rooms: make(map[string]*Room),
	}
}

// GetOrCreateRoom returns an existing room or creates a new one
func (h *CollaborationHub) GetOrCreateRoom(id string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, exists := h.Rooms[id]; exists {
		return room
	}

	room := &Room{
		ID:         id,
		Hub:        h,
		Clients:    make(map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan []byte, 256),
	}

	h.Rooms[id] = room
	go room.Run()
	log.Printf("[INFO] Created new room: %s", id)
	return room
}
