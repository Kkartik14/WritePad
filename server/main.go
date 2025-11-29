package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"log"
	"math/big"
	"net"
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
		_ = godotenv.Load() // Ignore error if .env also doesn't exist
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
		AllowedOrigins:   []string{"http://localhost:3000", "https://localhost:3000"}, // Allow Next.js frontend
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "Sec-WebSocket-Protocol"},
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
		// Negotiate protocol based on headers
		if r.Header.Get("Sec-WebSocket-Protocol") != "" || r.Header.Get("Upgrade") == "websocket" {
			hub.HandleWebSocket(w, r)
		} else {
			// For WebTransport, the client should connect to the HTTP/3 port (4433) directly.
			// Or we can inform them to switch ports.
			// Since we are running two separate servers, this endpoint on the HTTP/2 server
			// handles WebSockets. The WebTransport endpoint is on the HTTP/3 server.
			http.Error(w, "For WebTransport, connect to port 4433", http.StatusUpgradeRequired)
		}
	})

	// Generate self-signed certs for WebTransport (QUIC requires TLS)
	certFile := "localhost.pem"
	keyFile := "localhost-key.pem"
	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		log.Println("Generating self-signed certificates for WebTransport...")
		generateCert(certFile, keyFile)
	}

	// Calculate Certificate Hash for WebTransport
	// This allows the frontend to connect without browser flags if we pass this hash
	certPEM, err := os.ReadFile(certFile)
	if err != nil {
		log.Fatalf("Failed to read cert file: %v", err)
	}
	block, _ := pem.Decode(certPEM)
	if block == nil {
		log.Fatal("Failed to decode cert PEM")
	}
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		log.Fatal("Failed to parse cert")
	}
	sha256Hash := sha256.Sum256(cert.Raw)
	// WebTransport expects the hash as a byte array, but we'll send it as base64 or hex to frontend
	// Actually, the API expects Uint8Array. We'll send a JSON array of numbers or hex string.
	// Let's send the raw bytes as base64.
	certHashBase64 := base64.StdEncoding.EncodeToString(sha256Hash[:])

	log.Printf("Server Certificate Hash (SHA-256): %x", sha256Hash)

	// Add endpoint to serve the hash
	r.Get("/api/cert-hash", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"hash": certHashBase64,
		})
	})

	log.Printf("Server starting on ports %s (HTTP + WebSocket) and 4433 (HTTP/3 + WebTransport)", port)

	// Start HTTP/3 server for WebTransport on port 4433
	go func() {
		if err := StartWebTransportServer("4433", hub, certFile, keyFile); err != nil {
			log.Printf("[ERROR] HTTP/3 server error: %v", err)
		}
	}()

	// Start HTTP server for WebSocket and API routes (No TLS for signaling/API to avoid cert issues)
	// WebTransport on port 4433 will still use TLS as required.
	if err := http.ListenAndServe(":"+port, r); err != nil {
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
		// WebTransport with serverCertificateHashes requires short-lived certs (max 14 days)
		NotAfter: time.Now().Add(time.Hour * 24 * 10),

		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")},
		DNSNames:              []string{"localhost"},
	}

	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		log.Fatalf("Failed to create certificate: %v", err)
	}

	outFile, _ := os.Create(certFile)
	if err := pem.Encode(outFile, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes}); err != nil {
		log.Fatalf("Failed to write cert: %v", err)
	}
	_ = outFile.Close()

	outKey, _ := os.Create(keyFile)
	b, _ := x509.MarshalECPrivateKey(priv)
	if err := pem.Encode(outKey, &pem.Block{Type: "EC PRIVATE KEY", Bytes: b}); err != nil {
		log.Fatalf("Failed to write key: %v", err)
	}
	_ = outKey.Close()
}
