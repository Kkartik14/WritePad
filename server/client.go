package main

import (
	"github.com/google/uuid"
)

// Client represents a connected client (WebSocket or WebTransport)
type Client struct {
	ID       string
	Room     *Room
	Send     chan []byte
	Protocol string // "WebSocket" or "WebTransport"
}

// NewClient creates a new client
func NewClient(room *Room, protocol string) *Client {
	return &Client{
		ID:       uuid.New().String(),
		Room:     room,
		Send:     make(chan []byte, 256),
		Protocol: protocol,
	}
}
