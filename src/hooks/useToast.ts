import { useState, useCallback } from 'react';
import { ToastItem, ToastType } from '../types';

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((title: string, body: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, title, body, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /**
   * Tries browser Notification first, falls back to in-app toast.
   */
  const notify = useCallback((title: string, body: string, type: ToastType = 'info') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          silent: false,
        });
        return;
      } catch {
        // Fall through to in-app toast
      }
    }
    addToast(title, body, type);
  }, [addToast]);

  return { toasts, addToast, removeToast, notify };
}
