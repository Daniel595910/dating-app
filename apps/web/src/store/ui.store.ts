import { create } from 'zustand';

interface UIState {
  toasts: Array<{ id: string; message: string; variant: string; duration: number }>;
  isCreatePostOpen: boolean;
  isMatchRequestOpen: boolean;
  isProfileEditOpen: boolean;
  isLoading: boolean;
  showToast: (message: string, variant?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  setCreatePostOpen: (open: boolean) => void;
  setMatchRequestOpen: (open: boolean) => void;
  setProfileEditOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
}

let toastIdCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  isCreatePostOpen: false,
  isMatchRequestOpen: false,
  isProfileEditOpen: false,
  isLoading: false,

  showToast: (message, variant = 'info', duration = 5000) => {
    const id = `toast-${++toastIdCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant, duration }]
    }));
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    })),

  setCreatePostOpen: (open) => set({ isCreatePostOpen: open }),
  setMatchRequestOpen: (open) => set({ isMatchRequestOpen: open }),
  setProfileEditOpen: (open) => set({ isProfileEditOpen: open }),
  setLoading: (loading) => set({ isLoading: loading })
}));
