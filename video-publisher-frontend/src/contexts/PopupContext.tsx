import React, { createContext, useContext, ReactNode } from 'react';
import { usePopup, UsePopupReturn } from '../hooks/usePopup';
import { Popup, ConfirmDialog, AlertDialog } from '../components/ui/Popup';
import { ToastContainer } from '../components/ui/Toast';

const PopupContext = createContext<UsePopupReturn | null>(null);

export const usePopupContext = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopupContext must be used within a PopupProvider');
  }
  return context;
};

export interface PopupProviderProps {
  children: ReactNode;
}

export const PopupProvider: React.FC<PopupProviderProps> = ({ children }) => {
  const popupHook = usePopup();
  const {
    popupState,
    closePopup,
    confirmState,
    closeConfirm,
    alertState,
    closeAlert,
    toasts,
    closeToast,
  } = popupHook;

  return (
    <PopupContext.Provider value={popupHook}>
      {children}
      
      {/* Generic Popup */}
      {popupState.isOpen && popupState.config && (
        <Popup
          isOpen={popupState.isOpen}
          onClose={closePopup}
          title={popupState.config.title}
          type={popupState.config.type}
          size={popupState.config.size}
          showCloseButton={popupState.config.showCloseButton}
          closeOnOverlayClick={popupState.config.closeOnOverlayClick}
          closeOnEscape={popupState.config.closeOnEscape}
        >
          {popupState.config.content}
        </Popup>
      )}
      
      {/* Confirm Dialog */}
      {confirmState.isOpen && confirmState.config && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          onClose={() => closeConfirm(false)}
          onConfirm={() => closeConfirm(true)}
          onCancel={() => closeConfirm(false)}
          title={confirmState.config.title}
          message={confirmState.config.message}
          confirmText={confirmState.config.confirmText}
          cancelText={confirmState.config.cancelText}
          type={confirmState.config.type}
        />
      )}
      
      {/* Alert Dialog */}
      {alertState.isOpen && alertState.config && (
        <AlertDialog
          isOpen={alertState.isOpen}
          onClose={closeAlert}
          title={alertState.config.title}
          message={alertState.config.message}
          buttonText={alertState.config.buttonText}
          type={alertState.config.type}
        />
      )}
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </PopupContext.Provider>
  );
};
