import React from 'react';
import { createPortal } from 'react-dom';
import '../../styles/metadata-modal.css';

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  metadata: any;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  metadata 
}) => {
  // Format JSON with proper indentation and syntax highlighting
  const formatJSON = (data: any): string => {
    return JSON.stringify(data, null, 2);
  };
  // Simplified scroll lock implementation with better position handling
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      // Simply prevent body scroll without position manipulation
      document.body.classList.add('modal-open');
      document.addEventListener('keydown', handleEscape);
      
      // Prevent scrolling on mobile devices
      const preventScroll = (e: TouchEvent) => {
        e.preventDefault();
      };
      document.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('touchmove', preventScroll);
        document.body.classList.remove('modal-open');
      };
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="metadata-modal-overlay" 
      onClick={handleBackdropClick}
    >
      <div className="metadata-modal-container">
        <div className="metadata-modal-header">
          <h3 className="metadata-modal-title">{title}</h3>
          <button 
            className="metadata-modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        <div className="metadata-modal-content">
          <pre className="metadata-json">
            {formatJSON(metadata)}
          </pre>
        </div>
        
        <div className="metadata-modal-footer">
          <button 
            className="metadata-modal-btn metadata-modal-btn-secondary" 
            onClick={onClose}
          >
            Close
          </button>
          <button 
            className="metadata-modal-btn metadata-modal-btn-primary"
            onClick={() => {
              navigator.clipboard.writeText(formatJSON(metadata));
              // You could add a toast notification here
            }}
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
