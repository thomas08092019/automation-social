import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Popup.css';

export interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export const Popup: React.FC<PopupProps> = ({
  isOpen,
  onClose,
  title,
  children,
  type = 'default',
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div 
        ref={popupRef}
        className={`popup-container popup-${type} popup-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="popup-header">
          <h3 className="popup-title">{title}</h3>
          {showCloseButton && (
            <button className="popup-close-btn" onClick={onClose}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="popup-content">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Confirmation Dialog Component
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger' | 'warning';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const popupType = type === 'danger' ? 'error' : type === 'warning' ? 'warning' : 'default';

  return (
    <Popup
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type={popupType}
      size="small"
      showCloseButton={false}
      closeOnOverlayClick={false}
    >
      <div className="confirm-dialog-content">
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            {cancelText}
          </button>
          <button 
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Popup>
  );
};

// Alert Dialog Component
export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  type = 'info',
}) => {
  return (
    <Popup
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      type={type}
      size="small"
      showCloseButton={false}
    >
      <div className="alert-dialog-content">
        <p className="alert-message">{message}</p>
        <div className="alert-actions">
          <button 
            className={`btn ${
              type === 'success' ? 'btn-success' :
              type === 'error' ? 'btn-danger' :
              type === 'warning' ? 'btn-warning' :
              'btn-primary'
            }`}
            onClick={onClose}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </Popup>
  );
};
