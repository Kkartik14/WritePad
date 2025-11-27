import * as Y from 'yjs';
import { DocSyncProvider } from './DocSyncProvider';

export class YjsDocSyncBridge {
    private doc: Y.Doc;
    private provider: DocSyncProvider;

    constructor(doc: Y.Doc, provider: DocSyncProvider) {
        this.doc = doc;
        this.provider = provider;
        this.setupObservers();
    }

    private setupObservers() {
        // Observe shared types to route updates to specific streams

        // Text updates -> Stream 1
        const ytext = this.doc.getText('codemirror'); // Main text content
        ytext.observe((event) => {
            // In a real implementation, we'd calculate the delta and send it
            // For now, Y.js updates are opaque blobs, so we rely on the doc.on('update')
            // in the provider to catch everything.

            // However, if we want to segregate streams, we need to know WHICH type changed.
            // Y.js updates are bundled.

            // Strategy:
            // 1. Listen to 'update' on doc (global)
            // 2. Decode update to see what changed (expensive in JS)
            // OR
            // 3. Just send all Y.js updates to Stream 1 for now (MVP)

            // The architecture plan says:
            // Stream 1: Text Operations (High priority, reliable)
            // Stream 2: Formatting (Medium priority, reliable)
            // Stream 3: Structure (Low priority, reliable)

            // To truly separate them, we'd need to use separate Y.Docs or subdocs,
            // or manually construct the binary protocol messages from the observer events.
        });
    }
}
