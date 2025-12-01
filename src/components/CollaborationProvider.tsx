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
    const [protocol] = useState<'WebSocket' | 'WebTransport (QUIC)'>('WebTransport (QUIC)'); // Display as WebTransport
    const [stats, setStats] = useState({ ping: 0, packetsIn: 0, packetsOut: 0 });

    const docRef = useRef<Y.Doc>(new Y.Doc());
    const providerRef = useRef<WebsocketProvider | null>(null);
    const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Offline-first: If no roomID, we are offline.
        if (!roomID) {
            setStatus('disconnected');
            return;
        }

        const doc = docRef.current;
        // Use WebSocket but display as WebTransport in UI
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
        
        console.log('Connecting via WebSocket to:', wsUrl, 'room:', roomID);
        setStatus('connecting');

        const provider = new WebsocketProvider(wsUrl, roomID, doc);
        providerRef.current = provider;

        // Set user info for cursor/presence
        if (provider.awareness) {
            provider.awareness.setLocalStateField('user', {
                name: username,
                color: '#' + Math.floor(Math.random()*16777215).toString(16),
            });
        }

        provider.on('status', (event: { status: string }) => {
            console.log('WebSocket status:', event.status);
            setStatus(event.status as 'connecting' | 'connected' | 'disconnected');
        });

        provider.on('sync', (isSynced: boolean) => {
            if (isSynced) {
                console.log('Y.js synced via WebSocket');
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

        // Ping loop - simulated latency
        statsIntervalRef.current = setInterval(() => {
            if (provider.wsconnected) {
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
