import { useState } from 'react';

export function useCustomAlert() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null,
    confirmText: '确定',
    cancelText: '取消',
    showCancel: false
  });

  const showAlert = (title, message, type = 'info', options = {}) => {
    setAlertConfig({
      title,
      message,
      type,
      onConfirm: options.onConfirm || (() => setAlertVisible(false)),
      onCancel: options.onCancel || (() => setAlertVisible(false)),
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      showCancel: options.showCancel || false
    });
    setAlertVisible(true);
  };

  const showConfirm = (title, message, onConfirm, options = {}) => {
    showAlert(title, message, 'confirm', {
      ...options,
      onConfirm: () => {
        setAlertVisible(false);
        if (onConfirm) onConfirm();
      },
      showCancel: true
    });
  };

  const hideAlert = () => {
    setAlertVisible(false);
  };

  return {
    alertVisible,
    alertConfig,
    showAlert,
    showConfirm,
    hideAlert
  };
} 