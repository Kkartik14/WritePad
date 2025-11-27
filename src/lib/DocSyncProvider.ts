import * as Y from 'yjs';

// Stream IDs matching backend
const STREAM_TEXT = 0x01;
const STREAM_FORMAT = 0x02;
const STREAM_STRUCTURE = 0x03;

export class DocSyncProvider {
    private doc: Y.Doc;
    private transport: any; // WebTransport type
    private streams: Map<number, any> = new Map();
    private writers: Map<number, WritableStreamDefaultWriter> = new Map();
    public connected = false;
    private roomID: string;
    private url: string;
    private serverCertificateHashes?: { algorithm: string, value: Uint8Array }[];

    constructor(url: string, roomID: string, doc: Y.Doc, options?: { serverCertificateHashes?: { algorithm: string, value: Uint8Array }[] }) {
        this.url = url;
        this.roomID = roomID;
        this.doc = doc;
        this.serverCertificateHashes = options?.serverCertificateHashes;
    }

    async connect() {
        try {
            // @ts-ignore - WebTransport is experimental
            const options = this.serverCertificateHashes ? { serverCertificateHashes: this.serverCertificateHashes } : undefined;
            this.transport = new WebTransport(`${this.url}/collab/${this.roomID}`, options as any);
            await this.transport.ready;
            this.connected = true;
            console.log('DocSync: Connected via WebTransport');

            // Initialize streams
            await this.initializeStreams();

            // Listen for incoming data
            this.listenDatagrams();
            this.listenIncomingStreams();

            // Setup Y.js listeners
            this.setupYjsListeners();

        } catch (err) {
            console.error('DocSync: Connection failed', err);
            this.connected = false;
        }
    }

    private async initializeStreams() {
        // Create bidirectional streams for each type
        // In a real implementation, we might wait for server to initiate or negotiate
        // For now, we assume we can create them

        // Note: WebTransport stream creation is async
        const stream1 = await this.transport.createBidirectionalStream();
        this.setupStream(stream1, STREAM_TEXT);

        const stream2 = await this.transport.createBidirectionalStream();
        this.setupStream(stream2, STREAM_FORMAT);

        const stream3 = await this.transport.createBidirectionalStream();
        this.setupStream(stream3, STREAM_STRUCTURE);
    }

    private async setupStream(stream: any, type: number) {
        const writer = stream.writable.getWriter();
        // Write stream type byte first
        await writer.write(new Uint8Array([type]));

        this.streams.set(type, stream);
        this.writers.set(type, writer);

        // Listen for reads on this stream
        this.readStream(stream.readable, type);
    }

    private async readStream(readable: ReadableStream, type: number) {
        const reader = readable.getReader();
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                this.handleMessage(type, value);
            }
        } catch (e) {
            console.error(`DocSync: Error reading stream ${type}`, e);
        }
    }

    private async listenDatagrams() {
        const reader = this.transport.datagrams.readable.getReader();
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                // Handle awareness/cursor updates
                this.handleAwareness(value);
            }
        } catch (e) {
            console.error('DocSync: Error reading datagrams', e);
        }
    }

    private async listenIncomingStreams() {
        const reader = this.transport.incomingBidirectionalStreams.getReader();
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                // Handle server-initiated streams if any
            }
        } catch (e) {
            console.error('DocSync: Error accepting streams', e);
        }
    }

    private handleMessage(type: number, data: Uint8Array) {
        // Decode binary message and apply to Y.js doc
        // This is where the binary protocol parsing happens
        console.log(`DocSync: Received ${data.byteLength} bytes on stream ${type}`);

        // Placeholder for binary decoding logic
        // In real implementation:
        // 1. Parse header (length, op type)
        // 2. Decode content
        // 3. Apply to Y.Doc
    }

    private handleAwareness(data: Uint8Array) {
        // Handle cursor updates (unreliable)
        // console.log('DocSync: Awareness update', data);
    }

    private setupYjsListeners() {
        this.doc.on('update', (update: Uint8Array, origin: any) => {
            if (origin === this) return; // Ignore our own updates

            // In a full implementation, we would:
            // 1. Analyze the update to see what changed (text, format, structure)
            // 2. Encode into our custom binary format
            // 3. Send to appropriate stream

            // For MVP, we'll just send raw Y.js updates over Stream 1 (Text)
            // to prove the pipe works
            this.sendUpdate(STREAM_TEXT, update);
        });
    }

    private async sendUpdate(streamType: number, data: Uint8Array) {
        if (!this.connected) return;

        const writer = this.writers.get(streamType);
        if (writer) {
            // Protocol: [Length (2 bytes)] [Data]
            const len = data.byteLength;
            const header = new Uint8Array([(len >> 8) & 0xFF, len & 0xFF]);

            await writer.write(header);
            await writer.write(data);
        }
    }

    // API for Awareness (Cursors)
    sendAwareness(data: Uint8Array) {
        if (!this.connected) return;
        const writer = this.transport.datagrams.writable.getWriter();
        writer.write(data);
        writer.releaseLock();
    }
}
