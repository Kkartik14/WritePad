# WritePad

> Real-time collaborative text editor using WebTransport and QUIC.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What Is This?

WritePad is a collaborative text editor that uses **WebTransport** instead of WebSocket for real-time synchronization. This enables:

- **19ms round-trip latency** for cursor updates
- **QUIC unreliable datagrams** for cursor sync (no head-of-line blocking)
- **QUIC reliable streams** for document sync

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           WritePad                                   │
│                                                                      │
│   Browser A                   Server (Go)              Browser B     │
│   ┌─────────┐                ┌─────────┐              ┌─────────┐   │
│   │ Next.js │◄──WebTransport─│  QUIC   │─WebTransport►│ Next.js │   │
│   │ + Y.js  │                │  Relay  │              │ + Y.js  │   │
│   │ + TipTap│                │         │              │ + TipTap│   │
│   └─────────┘                └─────────┘              └─────────┘   │
│                                                                      │
│   Document edits ──► QUIC Stream (reliable) ──► Other users         │
│   Cursor moves ──► QUIC Datagram (unreliable) ──► Other users       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **Next.js 14** — React framework
- **TipTap** — Rich text editor
- **Y.js** — CRDT for collaboration
- **Tailwind CSS** — Styling

### Backend
- **Go** — Server language
- **quic-go** — QUIC implementation
- **webtransport-go** — WebTransport server

## Project Structure

```
WritePad/
├── src/                    # Next.js frontend
│   ├── app/               # App router
│   └── components/        # React components
│       ├── Editor/        # TipTap editor
│       └── ...
├── server/                # Go WebTransport server
│   ├── main.go           # Server code (~400 lines)
│   ├── go.mod
│   └── README.md         # Deployment guide
└── package.json
```

## Quick Start

### 1. Run the Frontend

```bash
npm install
npm run dev
```

### 2. Run the Server

```bash
cd server
go run .
```

See [server/README.md](./server/README.md) for TLS certificate setup.

## Benchmark Results

Tested over real network (India → Oracle Cloud):

| Metric | Value |
|--------|-------|
| Average RTT | 19.4ms |
| P50 | 17.7ms |
| P99 | 46.1ms |
| Delivery | 99.8% |

## Related Packages

This project led to the creation of two open-source packages:

- **[yjs-webtransport](https://www.npmjs.com/package/yjs-webtransport)** — WebTransport provider for Y.js
- **[y-webtransport-go](https://github.com/Kkartik14/y-webtransport-go)** — Go WebTransport server

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ 97+ |
| Edge | ✅ 97+ |
| Firefox | ✅ 114+ |
| Safari | ⏳ Coming soon |

## License

MIT © Kartik Gupta
