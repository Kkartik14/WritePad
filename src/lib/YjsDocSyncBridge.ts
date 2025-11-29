import * as Y from 'yjs';
import { DocSyncProvider } from './DocSyncProvider';

export class YjsDocSyncBridge {
    private doc: Y.Doc;
    private provider: DocSyncProvider;
    private updateHandler: (update: Uint8Array, origin: any) => void;

    constructor(doc: Y.Doc, provider: DocSyncProvider) {
        console.log('[Bridge] Creating YjsDocSyncBridge');
        console.log('[Bridge] Doc clientID:', doc.clientID);
        this.doc = doc;
        this.provider = provider;
        this.updateHandler = this.handleUpdate.bind(this);
        this.setupObservers();
        console.log('[Bridge] Bridge initialized and observing Y.Doc updates');
    }

    private setupObservers() {
        // Listen to ALL Y.Doc updates (works with any Y.js type: Text, XmlFragment, etc.)
        console.log('[Bridge] Setting up Y.Doc update observer');
        this.doc.on('update', this.updateHandler);
    }

    private handleUpdate(update: Uint8Array, origin: any) {
        console.log('[Bridge] Y.Doc update event! Origin:', origin, 'Update size:', update.byteLength);
        
        // Ignore updates from the provider (remote updates we applied)
        if (origin === this.provider) {
            console.log('[Bridge] Ignoring remote update (origin is provider)');
            return;
        }

        console.log('[Bridge] Sending local Y.js update via DocSync');
        // Send raw Y.js update with opCode 0x00 prefix
        this.provider.sendYjsUpdate(update);
    }

    destroy() {
        console.log('[Bridge] Destroying YjsDocSyncBridge');
        this.doc.off('update', this.updateHandler);
    }
}
