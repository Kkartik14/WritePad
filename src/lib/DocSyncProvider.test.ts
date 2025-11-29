import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocSyncProvider } from './DocSyncProvider';
import * as Y from 'yjs';

// Mock WebTransport
class MockWebTransport {
    ready = Promise.resolve();
    closed = Promise.resolve();
    datagrams = {
        readable: new ReadableStream(),
        writable: new WritableStream()
    };
    incomingBidirectionalStreams = new ReadableStream();

    createBidirectionalStream() {
        return Promise.resolve({
            writable: new WritableStream({
                write: (chunk) => {
                    // Mock write
                }
            }),
            readable: new ReadableStream()
        });
    }
}

global.WebTransport = MockWebTransport as any;

describe('DocSyncProvider', () => {
    let doc: Y.Doc;
    let provider: DocSyncProvider;

    beforeEach(() => {
        doc = new Y.Doc();
        provider = new DocSyncProvider('https://mock', 'room1', doc);
        // Mock connected state to allow sending
        provider.connected = true;
        // Mock writers
        (provider as any).writers.set(0x01, {
            write: vi.fn().mockResolvedValue(undefined)
        });
    });

    it('should encode insert operation correctly', async () => {
        const writer = (provider as any).writers.get(0x01);

        await provider.sendInsertImmediate(0, 'a');

        expect(writer.write).toHaveBeenCalledTimes(2); // Header + Body

        // Check Body
        // [0x01 (op), 0x00 0x00 0x00 0x00 (pos), 0x00 0x01 (len), 0x61 (text)]
        const bodyCall = writer.write.mock.calls[1][0];
        expect(bodyCall[0]).toBe(0x01); // OP_INSERT
        expect(bodyCall[5]).toBe(0x00); // Len MSB
        expect(bodyCall[6]).toBe(0x01); // Len LSB
        expect(bodyCall[7]).toBe(0x61); // 'a'
    });

    it('should batch inserts', async () => {
        const writer = (provider as any).writers.get(0x01);

        // Use the compressor
        provider.sendInsert(0, 'a');
        provider.sendInsert(1, 'b');

        // Wait for flush (50ms)
        await new Promise(resolve => setTimeout(resolve, 60));

        expect(writer.write).toHaveBeenCalledTimes(2); // Header + Body (Batch)

        const bodyCall = writer.write.mock.calls[1][0];
        expect(bodyCall[0]).toBe(0x03); // OP_BATCH
        expect(bodyCall[5]).toBe(0x02); // Count = 2
    });

    it('should handle incoming insert message', () => {
        const ytext = doc.getText('codemirror');

        // Construct message: Insert 'hi' at 0
        // [0x01] [00 00 00 00] [00 02] [68 69]
        const msg = new Uint8Array([
            0x01,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x02,
            0x68, 0x69
        ]);

        // Access private method for testing
        (provider as any).handleMessage(0x01, msg);

        expect(ytext.toString()).toBe('hi');
    });
});
