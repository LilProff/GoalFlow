import React from 'react';
import { X, Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ToastItem } from '../types';

interface ToastProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-amber-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-orange-400" />,
  info: <Bell className="w-4 h-4 text-blue-400" />,
};

export const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              "flex items-start gap-3 p-4 rounded-2xl border shadow-2xl",
              "min-w-[280px] max-w-[320px] pointer-events-auto",
              "bg-zinc-900 border-zinc-800"
            )}
          >
            <div className="mt-0.5 shrink-0">{ICONS[toast.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-200 leading-snug">{toast.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{toast.body}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-zinc-800 rounded-full transition-colors shrink-0"
            >
              <X className="w-3 h-3 text-zinc-500" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
