'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface CollaborationContextType {
    doc: Y.Doc;
    provider: WebsocketProvider | null;
    status: 'connecting' | 'connected' | 'disconnected';
    protocol: 'WebSocket' | 'WebTransport (QUIC)';
    stats: {
        ping: number;
        packetsIn: number;
        packetsOut: number;
    };
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export const useCollaboration = () => {
    const context = useContext(CollaborationContext);
    if (!context) {
        throw new Error('useCollaboration must be used within a CollaborationProvider');
    }
    return context;
};

interface CollaborationProviderProps {
    children: React.ReactNode;
    roomID?: string;
    username: string;
}

export const CollaborationProvider = ({ children, roomID, username }: CollaborationProviderProps) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const [protocol, setProtocol] = useState<'WebSocket' | 'WebTransport (QUIC)'>('WebSocket');
    const [stats, setStats] = useState({ ping: 0, packetsIn: 0, packetsOut: 0 });

    const docRef = useRef<Y.Doc>(new Y.Doc());
    const providerRef = useRef<WebsocketProvider | any>(null);
    const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Offline-first: If no roomID, we are offline.
        if (!roomID) {
            setStatus('disconnected');
            setProtocol('WebSocket'); // Default
            return;
        }

        const doc = docRef.current;
        // Use HTTP for local dev to avoid cert issues with the API itself
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

        // Try WebTransport first (experimental)
        // We assume WebTransport server is on port 4433 as per our backend setup
        const wtUrl = 'https://localhost:4433';

        const connectWebTransport = async () => {
            try {
                // Dynamic import to avoid SSR issues if any
                const { DocSyncProvider } = await import('../lib/DocSyncProvider');

                // Fetch cert hash to bypass browser flag requirement
                let options;
                try {
                    const res = await fetch(`${apiUrl}/api/cert-hash`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.hash) {
                            const binaryString = window.atob(data.hash);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            options = {
                                serverCertificateHashes: [{ algorithm: 'sha-256', value: bytes }]
                            };
                            console.log('Using server certificate hash for WebTransport');
                        }
                    }
                } catch (e) {
                    console.warn('Failed to fetch cert hash, trying without...', e);
                }

                console.log('Attempting WebTransport connection...');
                const provider = new DocSyncProvider(wtUrl, roomID, doc, options);
                await provider.connect();

                if (provider.connected) {
                    console.log('WebTransport connected successfully');
                    providerRef.current = provider;
                    setProtocol('WebTransport (QUIC)');
                    setStatus('connected');
                    return true;
                }
            } catch (e) {
                console.warn('WebTransport failed, falling back to WebSocket', e);
            }
            return false;
        };

        const connectWebSocket = () => {
            // Determine WS scheme based on API URL
            const scheme = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
            const wsUrl = apiUrl.replace(/^http:/, scheme).replace(/^https:/, scheme) + '/collab/' + roomID;
            console.log('Connecting via WebSocket:', wsUrl);

            const provider = new WebsocketProvider(wsUrl, roomID, doc, {
                connect: true,
                params: {},
            });

            providerRef.current = provider;
            setProtocol('WebSocket');

            provider.on('status', (event: { status: string }) => {
                setStatus(event.status as 'connecting' | 'connected' | 'disconnected');
            });

            provider.on('sync', (isSynced: boolean) => {
                if (isSynced) console.log('Y.js synced via WebSocket');
            });
        };

        // Connection Logic
        setStatus('connecting');

        // Attempt WebTransport then WebSocket
        connectWebTransport().then(success => {
            if (!success) connectWebSocket();
        });


        // Nerd Stats Logic
        doc.on('update', (update: Uint8Array, origin: unknown) => {
            if (origin !== providerRef.current) { // Local update
                setStats(prev => ({ ...prev, packetsOut: prev.packetsOut + 1 }));
            } else { // Remote update
                setStats(prev => ({ ...prev, packetsIn: prev.packetsIn + 1 }));
            }
        });

        // Ping loop
        statsIntervalRef.current = setInterval(() => {
            if (status === 'connected') {
                // Simulate ping for now
                setStats(prev => ({ ...prev, ping: Math.floor(Math.random() * 10) + 5 }));
            }
        }, 1000);

        return () => {
            if (providerRef.current) {
                // Handle different destroy methods
                if (providerRef.current.destroy) providerRef.current.destroy();
                // if (providerRef.current.disconnect) providerRef.current.disconnect();
            }
            if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
            setStatus('disconnected');
        };
    }, [roomID]);

    return (
        <CollaborationContext.Provider value={{
            doc: docRef.current,
            provider: providerRef.current,
            status,
            protocol,
            stats
        }}>
            {children}
        </CollaborationContext.Provider>
    );
};
