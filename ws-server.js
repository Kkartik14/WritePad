const http = require('http');
const WebSocket = require('ws');
const Y = require('yjs');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Y.js WebSocket Server running\n');
});

const wss = new WebSocket.Server({ server });

// Store Y.js documents by room name
const docs = new Map();
const awarenessStates = new Map();

const getYDoc = (docname) => {
  let doc = docs.get(docname);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(docname, doc);
    
    const awareness = new awarenessProtocol.Awareness(doc);
    awarenessStates.set(docname, awareness);
    
    console.log(`Created new document: ${docname}`);
  }
  return doc;
};

wss.on('connection', (conn, req) => {
  const url = new URL(req.url, 'http://localhost');
  const docname = url.pathname.slice(1) || 'default';
  
  console.log(`New connection to room: ${docname} (total clients: ${wss.clients.size})`);
  
  const doc = getYDoc(docname);
  const awareness = awarenessStates.get(docname);
  
  // Send initial sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 0); // messageSync
  syncProtocol.writeSyncStep1(encoder, doc);
  conn.send(encoding.toUint8Array(encoder));

  // Send awareness state
  const awarenessEncoder = encoding.createEncoder();
  encoding.writeVarUint(awarenessEncoder, 1); // messageAwareness
  encoding.writeVarUint8Array(
    awarenessEncoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys()))
  );
  conn.send(encoding.toUint8Array(awarenessEncoder));

  // Handle document updates
  const updateHandler = (update, origin) => {
    if (origin !== conn) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // messageSync
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  };
  
  doc.on('update', updateHandler);

  // Handle awareness updates
  const awarenessUpdateHandler = ({ added, updated, removed }, origin) => {
    const changedClients = added.concat(updated).concat(removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 1); // messageAwareness
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    );
    const message = encoding.toUint8Array(encoder);
    
    wss.clients.forEach((client) => {
      if (client !== conn && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };
  
  awareness.on('update', awarenessUpdateHandler);

  conn.on('message', (message) => {
    try {
      const data = new Uint8Array(message);
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);
      
      if (messageType === 0) { // Sync message
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
        
        const response = encoding.toUint8Array(encoder);
        if (response.length > 1) {
          conn.send(response);
        }
      } else if (messageType === 1) { // Awareness message
        awarenessProtocol.applyAwarenessUpdate(
          awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  conn.on('close', () => {
    doc.off('update', updateHandler);
    awareness.off('update', awarenessUpdateHandler);
    console.log(`Client disconnected from room: ${docname} (remaining: ${wss.clients.size})`);
  });

  conn.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const port = process.env.PORT || 8080;
const host = process.env.HOST || '0.0.0.0'; // Listen on all interfaces
server.listen(port, host, () => {
  console.log(`WebSocket server running on ws://${host}:${port}`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close();
  process.exit(0);
});
