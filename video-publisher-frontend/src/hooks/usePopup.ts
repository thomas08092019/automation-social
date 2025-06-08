import { useState, useCallback } from 'react';
import { ToastProps } from '../components/ui/Toast';

export interface UsePopupReturn {
  // Popup state
  showPopup: (config: PopupConfig) => void;
  closePopup: () => void;
  popupState: PopupState;
  
  // Confirm dialog
  showConfirm: (config: ConfirmConfig) => Promise<boolean>;
  confirmState: ConfirmState;
  closeConfirm: (result: boolean) => void;
  
  // Alert dialog
  showAlert: (config: AlertConfig) => Promise<void>;
  alertState: AlertState;
  closeAlert: () => void;
  
  // Toast notifications
  showToast: (config: ToastConfig) => void;
  toasts: ToastProps[];
  closeToast: (id: string) => void;
}

export interface PopupConfig {
  title: string;
  content: React.ReactNode;
  type?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export interface PopupState {
  isOpen: boolean;
  config: PopupConfig | null;
}

export interface ConfirmState {
  isOpen: boolean;
  config: ConfirmConfig | null;
}

export interface AlertState {
  isOpen: boolean;
  config: AlertConfig | null;
}

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger' | 'warning';
}

export interface AlertConfig {
  title: string;
  message: string;
  buttonText?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

let toastIdCounter = 0;

export const usePopup = (): UsePopupReturn => {
  const [popupState, setPopupState] = useState<PopupState>({
    isOpen: false,
    config: null,
  });
  
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    config: null,
  });
  
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    config: null,
  });
  
  const [confirmResolve, setConfirmResolve] = useState<((value: boolean) => void) | null>(null);
  const [alertResolve, setAlertResolve] = useState<(() => void) | null>(null);
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showPopup = useCallback((config: PopupConfig) => {
    setPopupState({
      isOpen: true,
      config,
    });
  }, []);

  const closePopup = useCallback(() => {
    setPopupState({
      isOpen: false,
      config: null,
    });
  }, []);

  const showConfirm = useCallback((config: ConfirmConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmResolve(() => resolve);
      setConfirmState({
        isOpen: true,
        config,
      });
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    setConfirmState({
      isOpen: false,
      config: null,
    });
    if (confirmResolve) {
      confirmResolve(result);
      setConfirmResolve(null);
    }
  }, [confirmResolve]);

  const showAlert = useCallback((config: AlertConfig): Promise<void> => {
    return new Promise((resolve) => {
      setAlertResolve(() => resolve);
      setAlertState({
        isOpen: true,
        config,
      });
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState({
      isOpen: false,
      config: null,
    });
    if (alertResolve) {
      alertResolve();
      setAlertResolve(null);
    }
  }, [alertResolve]);

  const showToast = useCallback((config: ToastConfig) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: ToastProps = {
      id,
      type: config.type,
      title: config.title,
      message: config.message,
      duration: config.duration,
      onClose: (toastId: string) => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      },
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    showPopup,
    closePopup,
    popupState,
    showConfirm,
    confirmState,
    closeConfirm,
    showAlert,
    alertState,
    closeAlert,
    showToast,
    toasts,
    closeToast,
  };
};
