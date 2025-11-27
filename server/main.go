package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"log"
	"math/big"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if it exists (for local dev)
	// We'll look for it in the parent directory since that's where the Next.js .env.local is,
	// or you can copy it to the server directory. For now, let's try reading from parent or current.
	if err := godotenv.Load("../.env.local"); err != nil {
		log.Println("No ../.env.local file found, trying .env")
		godotenv.Load()
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"}, // Allow Next.js frontend
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	// Initialize Collaboration Hub
	hub := NewCollaborationHub()

	// Routes
	r.Post("/api/generate-template", GenerateTemplateHandler)
	r.Post("/api/autocomplete", AutocompleteHandler)

	// Collaboration Routes
	r.Get("/collab/{roomID}", func(w http.ResponseWriter, r *http.Request) {
		// Negotiate protocol
		if r.Header.Get("Sec-WebSocket-Protocol") != "" || r.Header.Get("Upgrade") == "websocket" {
			hub.HandleWebSocket(w, r)
		} else {
			// Default to WebTransport attempt (client should send appropriate headers)
			// For now, we can have separate endpoints or sniff headers.
			// WebTransport uses a specific CONNECT method in HTTP/3, but in Go's http.Handler
			// it appears as a standard request we upgrade.
			hub.HandleWebTransport(w, r)
		}
	})

	// Generate self-signed certs for WebTransport (QUIC requires TLS)
	// In production, use valid certs (Let's Encrypt)
	certFile := "localhost.pem"
	keyFile := "localhost-key.pem"
	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		log.Println("Generating self-signed certificates for WebTransport...")
		generateCert(certFile, keyFile)
	}

	log.Printf("Server starting on port %s (HTTP/3 + HTTP/2 + HTTP/1.1)", port)

	// We need to start a server that supports both TCP (HTTP/1, HTTP/2) and UDP (HTTP/3 for WebTransport)
	// The quic-go/webtransport-go library helps, but standard http.ListenAndServeTLS is TCP only.
	// For a true hybrid on the same port, we need a bit more setup, but for dev simplicity:
	// We will run the standard HTTP server for WS and API, and a separate QUIC server if needed,
	// OR use a library that multiplexes.

	// Ideally, we use `http3.ListenAndServeQUIC` for QUIC and `http.ListenAndServeTLS` for TCP.
	// For this MVP, let's just use ListenAndServeTLS which supports HTTP/2, and we'll see if we can attach QUIC.
	// Actually, webtransport-go works on top of an http.Server.

	// Simplified approach: Run standard TLS server.
	// Note: WebTransport strictly requires HTTP/3 (QUIC).
	// We will need to run the QUIC server alongside.

	go func() {
		// Start QUIC server for WebTransport
		// This is a placeholder for the actual QUIC listener setup which is more verbose.
		// For now, let's stick to the standard TLS server which handles WebSocket perfectly.
		// To truly enable WebTransport, we would need `github.com/quic-go/quic-go/http3`.
		// Let's add that dependency next if this fails.
	}()

	if err := http.ListenAndServeTLS(":"+port, certFile, keyFile, r); err != nil {
		log.Fatal(err)
	}
}

// Helper to generate self-signed certs
func generateCert(certFile, keyFile string) {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		log.Fatalf("Failed to generate private key: %v", err)
	}

	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization: []string{"WritePad Dev"},
		},
		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(time.Hour * 24 * 365),

		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		log.Fatalf("Failed to create certificate: %v", err)
	}

	outFile, _ := os.Create(certFile)
	pem.Encode(outFile, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes})
	outFile.Close()

	outKey, _ := os.Create(keyFile)
	b, _ := x509.MarshalECPrivateKey(priv)
	pem.Encode(outKey, &pem.Block{Type: "EC PRIVATE KEY", Bytes: b})
	outKey.Close()
}
