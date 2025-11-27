'use client';

import React from 'react';
import { Activity, Wifi, Zap } from 'lucide-react';
import { useCollaboration } from './CollaborationProvider';

export const NerdStats = () => {
    const { status, protocol, stats } = useCollaboration();

    if (status === 'disconnected') return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 font-mono text-xs">
            <div className="bg-black/80 backdrop-blur-md text-green-400 p-3 rounded-lg border border-green-500/30 shadow-lg shadow-green-500/10 flex flex-col gap-2 min-w-[200px]">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-green-500/20 pb-2 mb-1">
                    <span className="flex items-center gap-2 font-bold uppercase tracking-wider">
                        <Activity size={12} />
                        Nerd Stats
                    </span>
                    <span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                </div>

                {/* Protocol */}
                <div className="flex items-center justify-between">
                    <span className="text-gray-400">Protocol</span>
                    <span className="flex items-center gap-1 text-white font-bold">
                        <Zap size={10} className="text-yellow-400" />
                        {protocol}
                    </span>
                </div>

                {/* Ping */}
                <div className="flex items-center justify-between">
                    <span className="text-gray-400">Latency</span>
                    <span className="flex items-center gap-1">
                        <Wifi size={10} />
                        {stats.ping}ms
                    </span>
                </div>

                {/* Packets */}
                <div className="flex items-center justify-between">
                    <span className="text-gray-400">Packets/sec</span>
                    <div className="flex gap-2">
                        <span className="text-blue-400">↓{stats.packetsIn}</span>
                        <span className="text-orange-400">↑{stats.packetsOut}</span>
                    </div>
                </div>

                {/* Graph Placeholder (CSS Animation) */}
                <div className="h-8 flex items-end gap-[1px] mt-1 opacity-50">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-green-500 w-1 rounded-t-sm transition-all duration-300"
                            style={{
                                height: `${Math.random() * 100}%`,
                                opacity: 0.3 + (i / 20) * 0.7
                            }}
                        />
                    ))}
                </div>

            </div>
        </div>
    );
};
