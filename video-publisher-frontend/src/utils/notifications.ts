import { usePopupContext } from '../contexts/PopupContext';

// Utility functions for easy popup usage
export const useNotifications = () => {
  const { showConfirm, showAlert, showToast } = usePopupContext();

  const confirm = async (
    title: string,
    message: string,
    type: 'default' | 'danger' | 'warning' = 'default'
  ): Promise<boolean> => {
    return showConfirm({ title, message, type });
  };

  const alert = async (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ): Promise<void> => {
    return showAlert({ title, message, type });
  };

  const toast = {
    success: (title: string, message: string, duration?: number) => {
      showToast({ type: 'success', title, message, duration });
    },
    error: (title: string, message: string, duration?: number) => {
      showToast({ type: 'error', title, message, duration });
    },
    warning: (title: string, message: string, duration?: number) => {
      showToast({ type: 'warning', title, message, duration });
    },
    info: (title: string, message: string, duration?: number) => {
      showToast({ type: 'info', title, message, duration });
    },
  };

  return {
    confirm,
    alert,
    toast,
  };
};

// Global notification functions (can be used outside React components)
export const notifications = {
  toast: {
    success: (title: string, message: string) => {
      console.log(`✅ ${title}: ${message}`);
      // Will be enhanced to work with the global popup system
    },
    error: (title: string, message: string) => {
      console.error(`❌ ${title}: ${message}`);
      // Will be enhanced to work with the global popup system
    },
    warning: (title: string, message: string) => {
      console.warn(`⚠️ ${title}: ${message}`);
      // Will be enhanced to work with the global popup system
    },
    info: (title: string, message: string) => {
      console.info(`ℹ️ ${title}: ${message}`);
      // Will be enhanced to work with the global popup system
    },
  },
  confirm: async (title: string, message: string): Promise<boolean> => {
    return window.confirm(`${title}\n\n${message}`);
  },
  alert: async (title: string, message: string): Promise<void> => {
    window.alert(`${title}\n\n${message}`);
  },
};
