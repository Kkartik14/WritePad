package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"testing"
	"time"

	"github.com/gobwas/ws"
	"github.com/gobwas/ws/wsutil"
	"github.com/quic-go/webtransport-go"
)

const (
	wsURL = "wss://localhost:8080/collab/bench-room"
	wtURL = "https://localhost:4433/collab/bench-room"
)

// BenchmarkWebSocketLatency measures RTT for WebSocket
func BenchmarkWebSocketLatency(b *testing.B) {
	dialer := ws.Dialer{
		TLSConfig: &tls.Config{InsecureSkipVerify: true},
	}

	conn, _, _, err := dialer.Dial(context.Background(), wsURL)
	if err != nil {
		b.Fatalf("Failed to connect to WebSocket: %v", err)
	}
	defer func() {
		_ = conn.Close()
	}()

	msg := []byte("ping")
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		start := time.Now()
		if err := wsutil.WriteClientBinary(conn, msg); err != nil {
			b.Fatalf("Write failed: %v", err)
		}

		// In a real echo test we'd read back.
		// Our server broadcasts to room. So we should receive it back.
		_, _, err := wsutil.ReadServerData(conn)
		if err != nil {
			b.Fatalf("Read failed: %v", err)
		}

		// Measure RTT
		_ = time.Since(start)
	}
}

// BenchmarkWebTransportLatency measures RTT for WebTransport
func BenchmarkWebTransportLatency(b *testing.B) {
	d := webtransport.Dialer{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}

	_, session, err := d.Dial(context.Background(), wtURL, nil)
	if err != nil {
		b.Skipf("WebTransport dial failed (server might not be running or cert issue): %v", err)
		return
	}
	defer func() {
		_ = session.CloseWithError(0, "bye")
	}()

	// Open a stream
	stream, err := session.OpenStreamSync(context.Background())
	if err != nil {
		b.Fatalf("Failed to open stream: %v", err)
	}
	defer func() {
		_ = stream.Close()
	}()

	// Send stream type (Text = 0x01)
	if _, err := stream.Write([]byte{0x01}); err != nil {
		b.Fatalf("Failed to write stream type: %v", err)
	}

	msg := []byte("ping")
	// Protocol expects 2 bytes length then data
	encoded := make([]byte, 2+len(msg))
	encoded[0] = byte(len(msg) >> 8)
	encoded[1] = byte(len(msg))
	copy(encoded[2:], msg)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		start := time.Now()

		if _, err := stream.Write(encoded); err != nil {
			b.Fatalf("Write failed: %v", err)
		}

		// Read back (broadcast)
		// We expect the same length back
		buf := make([]byte, len(encoded))
		if _, err := stream.Read(buf); err != nil {
			b.Fatalf("Read failed: %v", err)
		}

		_ = time.Since(start)
	}
}

func TestRunBenchmarks(t *testing.T) {
	fmt.Println("Running Benchmarks...")
	fmt.Println("Ensure server is running with: go run .")
	fmt.Println("---------------------------------------------------")

	// We can't easily run 'go test -bench' from inside a test function,
	// but we can simulate a simple run or just instruct user to run 'go test -bench=.'
	t.Log("Run 'go test -bench=.' to see performance results")
}
