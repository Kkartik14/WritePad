'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { WebTransportProvider } from 'yjs-webtransport';

interface CollaborationContextType {
    doc: Y.Doc;
    provider: WebTransportProvider | null;
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
    const [protocol, setProtocol] = useState<'WebSocket' | 'WebTransport (QUIC)'>('WebTransport (QUIC)');
    const [stats, setStats] = useState({ ping: 0, packetsIn: 0, packetsOut: 0 });

    const docRef = useRef<Y.Doc>(new Y.Doc());
    const providerRef = useRef<WebTransportProvider | null>(null);
    const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Offline-first: If no roomID, we are offline.
        if (!roomID) {
            setStatus('disconnected');
            setProtocol('WebTransport (QUIC)');
            return;
        }

        const doc = docRef.current;
        // WebTransport server URL (uses HTTPS/QUIC on port 4433)
        // The library adds /collab/{roomName} automatically, so just pass base URL
        const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:4433';

        console.log('Connecting via WebTransport to:', serverUrl, 'room:', roomID);
        setStatus('connecting');

        // Create a proper Awareness instance for cursor positions, user presence, etc.
        const awareness = new Awareness(doc);
        awareness.setLocalStateField('user', {
            name: username,
            color: '#' + Math.floor(Math.random()*16777215).toString(16),
        });

        const provider = new WebTransportProvider(serverUrl, roomID, doc, {
            awareness: awareness,
        });

        providerRef.current = provider;

        provider.on('status', (event: { status: string }) => {
            console.log('WebTransport status:', event.status);
            setStatus(event.status as 'connecting' | 'connected' | 'disconnected');
        });

        provider.on('sync', (isSynced: boolean) => {
            if (isSynced) {
                console.log('Y.js synced via WebTransport');
            }
        });

        // Nerd Stats Logic - track document updates
        doc.on('update', (update: Uint8Array, origin: unknown) => {
            if (origin !== provider) { // Local update
                setStats(prev => ({ ...prev, packetsOut: prev.packetsOut + 1 }));
            } else { // Remote update
                setStats(prev => ({ ...prev, packetsIn: prev.packetsIn + 1 }));
            }
        });

        // Ping loop - placeholder latency (could be enhanced with real measurements)
        statsIntervalRef.current = setInterval(() => {
            if (provider.connected) {
                // TODO: Implement real latency measurement via datagrams
                const latency = Math.floor(Math.random() * 10) + 5;
                setStats(prev => ({ ...prev, ping: latency }));
            }
        }, 1000);

        return () => {
            provider.destroy();
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
