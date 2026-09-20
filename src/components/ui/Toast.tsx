import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastItem { id: number; type: 'success' | 'error'; message: string }

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type: ToastItem['type'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000);
  }, [dismiss]);
  return { toasts, dismiss, success: (m: string) => push('success', m), error: (m: string) => push('error', m) };
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24 }}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-soft backdrop-blur ${t.type === 'error' ? 'border-red-400/40 bg-red-50 text-red-800 dark:bg-red-950/80 dark:text-red-200' : 'border-leaf/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100'}`}>
            {t.type === 'error' ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            <span className="min-w-0 flex-1">{t.message}</span>
            <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss notification" className="shrink-0 opacity-60 hover:opacity-100"><X size={16} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
