import { create } from 'zustand';

const useModalStore = create((set) => ({
  isOpen: false,
  title: '',
  message: '',
  type: 'alert',
  confirmText: 'OK',
  cancelText: 'Cancel',
  onConfirm: null,
  onCancel: null,

  showAlert: (title, message, confirmText = 'OK') => set({
    isOpen: true,
    title,
    message,
    type: 'alert',
    confirmText,
    onConfirm: () => set({ isOpen: false })
  }),

  showConfirm: (title, message, onConfirm, onCancel = null, confirmText = 'Confirm', cancelText = 'Cancel') => set({
    isOpen: true,
    title,
    message,
    type: 'confirm',
    confirmText,
    cancelText,
    onConfirm: () => {
      if (onConfirm) onConfirm();
      set({ isOpen: false });
    },
    onCancel: () => {
      if (onCancel) onCancel();
      set({ isOpen: false });
    }
  }),

  closeModal: () => set({ isOpen: false })
}));

export default useModalStore;
