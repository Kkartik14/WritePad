// src/app/components/Modal.tsx
'use client';
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; // Optional size prop
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'xl' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl', // Default
    full: 'max-w-full h-full max-h-full rounded-none',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out"
         onClick={onClose} // Close on overlay click
    >
      <div
        className={`bg-[var(--background)] p-0 rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-[var(--border-color)]">
          {title && <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>}
          <button
            onClick={onClose}
            className="text-[var(--foreground)] hover:text-[var(--accent-color)] text-2xl font-light leading-none p-1 rounded-full hover:bg-[var(--hover-bg)]"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto scrollbar-hide flex-grow">
          {children}
        </div>
      </div>
      {/* Animation for modal show - add to your globals.css or a style tag */}
      <style jsx global>{`
        @keyframes modalShow {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-modalShow {
          animation: modalShow 0.3s forwards;
        }
      `}</style>
    </div>
  );
};