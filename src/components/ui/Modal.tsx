import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface Props { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'xl'; dismissible?: boolean; description?: string }

/** Accessible modal: Esc to close, focus trapped and restored, page scroll locked. */
export default function Modal({ open, onClose, title, children, size = 'md', dismissible = true, description }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => { (box.current?.querySelector<HTMLElement>('[data-autofocus]') ?? box.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus(); }, 50);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab' && box.current) {
        const els = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { clearTimeout(t); document.removeEventListener('keydown', key); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open, dismissible]);

  const width = size === 'sm' ? 'max-w-md' : size === 'xl' ? 'max-w-5xl' : 'max-w-2xl';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dismissible && onClose()} />
          <motion.div ref={box} role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: 28, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`relative flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-t-[2rem] border border-line bg-surface text-ink shadow-soft sm:rounded-[2rem]`}>
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
              <div className="min-w-0"><h2 className="text-lg font-extrabold tracking-tight">{title}</h2>{description && <p className="mt-0.5 text-sm text-muted">{description}</p>}</div>
              <button type="button" className="icon-btn -mr-2 -mt-1" onClick={onClose} disabled={!dismissible} aria-label="Close dialog"><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
