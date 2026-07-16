/**
 * Global toast queue. Call toast.success/error/info from anywhere — the
 * ToastHost in the root layout renders them.
 */
import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

const AUTO_DISMISS_MS = 3500;
let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/** Imperative API — usable outside React components too. */
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'success', title, ...(message !== undefined && { message }) }),
  error: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'error', title, ...(message !== undefined && { message }) }),
  info: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'info', title, ...(message !== undefined && { message }) }),
};
