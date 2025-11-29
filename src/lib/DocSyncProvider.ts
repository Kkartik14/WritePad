import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

// Stream IDs
const STREAM_AWARENESS = 0x00; // Datagrams
const STREAM_TEXT = 0x01;
const STREAM_FORMAT = 0x02;
const STREAM_STRUCTURE = 0x03;

// Op Codes
const OP_INSERT = 0x01;
const OP_DELETE = 0x02;
const OP_BATCH = 0x03;

const OP_FORMAT = 0x10;
const OP_STRUCTURE = 0x20;

class DeltaCompressor {
    private buffer: { type: 'insert', pos: number, text: string }[] = [];
    private timer: any = null;
    private provider: DocSyncProvider;

    constructor(provider: DocSyncProvider) {
        this.provider = provider;
    }

    addInsert(pos: number, text: string) {
        // Check for contiguity
        if (this.buffer.length > 0) {
            const lastOp = this.buffer[this.buffer.length - 1];
            const expectedPos = lastOp.pos + lastOp.text.length;
            if (pos !== expectedPos) {
                this.flush();
            }
        }

        this.buffer.push({ type: 'insert', pos, text });
        if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), 50); // 50ms window
        }
    }

    flush() {
        if (this.buffer.length === 0) return;

        if (this.buffer.length === 1) {
            const op = this.buffer[0];
            this.provider.sendInsertImmediate(op.pos, op.text);
        } else {
            // Send batch
            this.provider.sendBatchImmediate(this.buffer);
        }
        this.buffer = [];
        this.timer = null;
    }
}

export class DocSyncProvider {
    public doc: Y.Doc;
    private transport: any;
    private streams: Map<number, any> = new Map();
    private writers: Map<number, WritableStreamDefaultWriter> = new Map();
    public connected = false;
    private roomID: string;
    private url: string;
    private serverCertificateHashes?: { algorithm: string, value: Uint8Array }[];
    public awareness: Awareness;
    private incomingBuffers: Map<number, Uint8Array> = new Map();
    private compressor: DeltaCompressor;

    constructor(url: string, roomID: string, doc: Y.Doc, options?: { serverCertificateHashes?: { algorithm: string, value: Uint8Array }[] }) {
        this.url = url;
        this.roomID = roomID;
        this.doc = doc;
        this.serverCertificateHashes = options?.serverCertificateHashes;
        this.awareness = new Awareness(doc);
        this.compressor = new DeltaCompressor(this);
    }

    async connect() {
        try {
            // @ts-ignore
            const options = this.serverCertificateHashes ? { serverCertificateHashes: this.serverCertificateHashes } : undefined;
            this.transport = new WebTransport(`${this.url}/collab/${this.roomID}`, options as any);
            await this.transport.ready;
            this.connected = true;
            console.log('DocSync: Connected via WebTransport');

            await this.initializeStreams();

            this.listenDatagrams();
            this.listenIncomingStreams();

            // Note: Y.js listeners are handled by the Bridge, not here directly anymore for text ops
            // But we still need to handle incoming messages and apply to Doc
        } catch (err) {
            console.error('DocSync: Connection failed', err);
            this.connected = false;
        }
    }

    private async initializeStreams() {
        const stream1 = await this.transport.createBidirectionalStream();
        this.setupStream(stream1, STREAM_TEXT);

        const stream2 = await this.transport.createBidirectionalStream();
        this.setupStream(stream2, STREAM_FORMAT);

        const stream3 = await this.transport.createBidirectionalStream();
        this.setupStream(stream3, STREAM_STRUCTURE);
    }

    private async setupStream(stream: any, type: number) {
        console.log(`[DocSync] Setting up stream ${type}...`);
        const writer = stream.writable.getWriter();
        console.log(`[DocSync] Sending stream type identifier: 0x${type.toString(16)}`);
        await writer.write(new Uint8Array([type])); // Send stream type ID
        this.streams.set(type, stream);
        this.writers.set(type, writer);
        console.log(`[DocSync] Stream ${type} ready, starting read loop`);
        this.readStream(stream.readable, type);
    }

    private async readStream(readable: ReadableStream, type: number) {
        const reader = readable.getReader();
        console.log(`[DocSync] 👂 Started reading from stream ${type} (clientID: ${this.doc.clientID})`);
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    console.log(`[DocSync] Stream ${type} closed (done=true)`);
                    break;
                }
                console.log(`[DocSync] 📨 Received ${value?.byteLength || 0} bytes on stream ${type} (clientID: ${this.doc.clientID})`);
                this.processIncomingChunk(type, value);
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
                this.handleAwarenessMessage(value);
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
            }
        } catch (e) {
            console.error('DocSync: Error accepting streams', e);
        }
    }

    private processIncomingChunk(type: number, chunk: Uint8Array) {
        console.log(`[DocSync] Processing chunk on stream ${type}: ${chunk.byteLength} bytes`);
        let buffer = this.incomingBuffers.get(type) || new Uint8Array(0);
        const newBuffer = new Uint8Array(buffer.length + chunk.length);
        newBuffer.set(buffer);
        newBuffer.set(chunk, buffer.length);
        buffer = newBuffer;

        console.log(`[DocSync] Buffer now has ${buffer.length} bytes`);

        while (true) {
            if (buffer.length < 2) {
                console.log(`[DocSync] Buffer too small for length header (${buffer.length} < 2)`);
                break;
            }
            const msgLen = (buffer[0] << 8) | buffer[1];
            console.log(`[DocSync] Expected message length: ${msgLen}, buffer has: ${buffer.length}`);
            if (buffer.length < 2 + msgLen) {
                console.log(`[DocSync] Incomplete message, waiting for more data`);
                break;
            }
            const msg = buffer.slice(2, 2 + msgLen);
            buffer = buffer.slice(2 + msgLen);
            console.log(`[DocSync] Extracted complete message: ${msgLen} bytes, calling handleMessage`);
            this.handleMessage(type, msg);
        }
        this.incomingBuffers.set(type, buffer);
    }

    private handleMessage(type: number, data: Uint8Array) {
        console.log(`[DocSync] 📥 handleMessage: type=${type}, length=${data.byteLength}, clientID=${this.doc.clientID}`);
        
        if (type === STREAM_TEXT) {
            const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
            const opCode = view.getUint8(0);
            console.log(`[DocSync] OpCode: 0x${opCode.toString(16)}`);

            // OpCode 0x00 = Raw Y.js update (relay mode)
            if (opCode === 0x00) {
                const yjsUpdate = data.slice(1); // Skip the opCode byte
                console.log(`[DocSync] 🔄 Applying raw Y.js update: ${yjsUpdate.byteLength} bytes to doc ${this.doc.clientID}`);
                try {
                    Y.applyUpdate(this.doc, yjsUpdate, this); // 'this' as origin to avoid echo
                    console.log(`[DocSync] ✅ Y.js update applied successfully!`);
                } catch (e) {
                    console.error(`[DocSync] ❌ Failed to apply Y.js update:`, e);
                }
            } else {
                console.log(`[DocSync] ⚠️ Unknown TEXT opCode: 0x${opCode.toString(16)}`);
            }
        } else if (type === STREAM_FORMAT) {
            console.log(`[DocSync] Formatting message received (not fully implemented)`);
        }
    }

    private handleAwarenessMessage(data: Uint8Array) {
        // [0x00] [clientID: u16] [cursorPos: u32] [selectionStart: u32] [selectionEnd: u32]
        if (data.byteLength < 13) return;
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        // const op = view.getUint8(0); // 0x00
        const clientID = view.getUint16(1);
        const cursorPos = view.getUint32(3);
        const selStart = view.getUint32(7);
        const selEnd = view.getUint32(11);

        // Update Y.js awareness
        // We need to map u16 clientID back to Y.js clientID if possible, or just use it as is.
        // Since Y.js uses uint, we can just use the u16 value.
        this.awareness.setLocalStateField('cursor', {
            pos: cursorPos,
            selStart,
            selEnd,
            user: { name: `User ${clientID}`, color: '#ffb61e' } // Placeholder
        });

        // Actually, we should update REMOTE state, not local.
        // Awareness protocol usually syncs states.
        // Here we are manually setting state for a client.
        const state = {
            cursor: { pos: cursorPos, anchor: selStart, head: selEnd },
            user: { name: `User ${clientID}`, color: '#ff0000' }
        };
        this.awareness.states.set(clientID, state);
        this.awareness.emit('change', [{ added: [clientID], updated: [clientID], removed: [] }, 'remote']);
    }

    // Public API for Bridge - Send raw Y.js updates
    sendYjsUpdate(update: Uint8Array) {
        // Prefix with 0x00 opCode to indicate raw Y.js update
        const buffer = new Uint8Array(1 + update.byteLength);
        buffer[0] = 0x00; // OpCode for raw Y.js update
        buffer.set(update, 1);
        console.log(`[DocSync] 📤 Sending Y.js update from clientID ${this.doc.clientID}: ${buffer.byteLength} bytes`);
        this.sendToStream(STREAM_TEXT, buffer);
    }

    // Legacy API (kept for potential future use)
    sendInsert(pos: number, text: string) {
        this.compressor.addInsert(pos, text);
    }

    sendFormat(start: number, end: number, format: { [key: string]: any }) {
        // [0x10] [formatType: u8] [start: u32] [end: u32] [value: bytes]

        // Map Y.js attributes to protocol types
        // 0x01: Bold, 0x02: Italic, 0x03: Underline, 0x04: Link, 0x05: Color

        Object.entries(format).forEach(([key, value]) => {
            let type = 0;
            let valBytes = new Uint8Array(0);

            if (key === 'bold') {
                type = 0x01;
                valBytes = new Uint8Array([value ? 1 : 0]);
            } else if (key === 'italic') {
                type = 0x02;
                valBytes = new Uint8Array([value ? 1 : 0]);
            } else if (key === 'underline') {
                type = 0x03;
                valBytes = new Uint8Array([value ? 1 : 0]);
            } else if (key === 'link') {
                type = 0x04;
                valBytes = new TextEncoder().encode(value as string);
            } else if (key === 'color') {
                type = 0x05;
                valBytes = new TextEncoder().encode(value as string); // Assume hex string or similar
            }

            if (type !== 0) {
                const buffer = new Uint8Array(1 + 1 + 4 + 4 + valBytes.length);
                const view = new DataView(buffer.buffer);

                view.setUint8(0, OP_FORMAT);
                view.setUint8(1, type);
                view.setUint32(2, start);
                view.setUint32(6, end);
                buffer.set(valBytes, 10);

                this.sendToStream(STREAM_FORMAT, buffer);
            }
        });
    }

    sendInsertImmediate(pos: number, text: string) {
        const textBytes = new TextEncoder().encode(text);
        const len = textBytes.length;
        const buffer = new Uint8Array(1 + 4 + 2 + len);
        const view = new DataView(buffer.buffer);

        view.setUint8(0, OP_INSERT);
        view.setUint32(1, pos);
        view.setUint16(5, len);
        buffer.set(textBytes, 7);

        return this.sendToStream(STREAM_TEXT, buffer);
    }

    sendBatchImmediate(ops: { pos: number, text: string }[]) {
        // [0x03] [position: u32] [count: u8] [lengths: u16[]] [texts: utf8[]]
        // Simplified: We assume ops are sequential or we just send the first pos?
        // The protocol says: "Insert 'Hello' as 5 operations" -> 5 chars.
        // We'll assume the batch starts at ops[0].pos

        const startPos = ops[0].pos;
        const count = ops.length;

        let totalTextLen = 0;
        ops.forEach(op => totalTextLen += new TextEncoder().encode(op.text).length);

        // Header: 1(op) + 4(pos) + 1(count) = 6 bytes
        // Per op: 2(len) + textLen
        const totalSize = 6 + (2 * count) + totalTextLen;
        const buffer = new Uint8Array(totalSize);
        const view = new DataView(buffer.buffer);

        view.setUint8(0, OP_BATCH);
        view.setUint32(1, startPos);
        view.setUint8(5, count);

        let offset = 6;
        ops.forEach(op => {
            const bytes = new TextEncoder().encode(op.text);
            view.setUint16(offset, bytes.length);
            offset += 2;
            buffer.set(bytes, offset);
            offset += bytes.length;
        });

        return this.sendToStream(STREAM_TEXT, buffer);
    }

    sendDelete(pos: number, length: number) {
        const buffer = new Uint8Array(1 + 4 + 2);
        const view = new DataView(buffer.buffer);
        view.setUint8(0, OP_DELETE);
        view.setUint32(1, pos);
        view.setUint16(5, length);
        this.sendToStream(STREAM_TEXT, buffer);
    }

    sendAwarenessUpdate(cursorPos: number, selStart: number, selEnd: number) {
        // [0x00] [clientID: u16] [cursorPos: u32] [selectionStart: u32] [selectionEnd: u32]
        const buffer = new Uint8Array(13);
        const view = new DataView(buffer.buffer);
        view.setUint8(0, 0x00);
        view.setUint16(1, this.doc.clientID % 65535);
        view.setUint32(3, cursorPos);
        view.setUint32(7, selStart);
        view.setUint32(11, selEnd);

        if (this.connected) {
            const writer = this.transport.datagrams.writable.getWriter();
            writer.write(buffer);
            writer.releaseLock();
        }
    }

    private async sendToStream(type: number, data: Uint8Array) {
        if (!this.connected) {
            console.warn('[DocSync] Cannot send: Not connected');
            return;
        }
        const writer = this.writers.get(type);
        if (writer) {
            console.log(`[DocSync] Sending ${data.byteLength} bytes to stream ${type}`);
            const len = data.byteLength;
            const header = new Uint8Array([(len >> 8) & 0xFF, len & 0xFF]);
            await writer.write(header);
            await writer.write(data);
            console.log(`[DocSync] Sent successfully`);
        } else {
            console.error(`[DocSync] No writer for stream ${type}`);
        }
    }
}
