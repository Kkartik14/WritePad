'use client';

import React, { useState } from 'react';
import { Share2, Check, Lock, Globe } from 'lucide-react';

interface ShareButtonProps {
    isShared: boolean;
    onShare: () => void;
}

export const ShareButton = ({ isShared, onShare }: ShareButtonProps) => {
    const [copied, setCopied] = useState(false);

    const handleShareClick = () => {
        if (!isShared) {
            onShare();
        } else {
            // Copy link
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            onClick={handleShareClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${isShared
                    ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20'
                    : 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)]'
                }`}
            title={isShared ? "Click to copy link" : "Go Live"}
        >
            {isShared ? (
                <>
                    {copied ? <Check size={16} /> : <Globe size={16} />}
                    <span>{copied ? 'Copied!' : 'Live'}</span>
                </>
            ) : (
                <>
                    <Share2 size={16} />
                    <span>Share</span>
                </>
            )}
        </button>
    );
};
