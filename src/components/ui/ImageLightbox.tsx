import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Minus, Plus, RotateCcw, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  src: string;
  title: string;
  downloadName?: string;
  /** Optional one-line caption shown under the title, e.g. for the Organisation Flow module. */
  description?: string;
  /** Optional prev/next navigation (e.g. when browsing a gallery). Omit for a single-image lightbox. */
  onPrev?: () => void;
  onNext?: () => void;
  /** "3 / 16" style position indicator, shown next to the title when navigation is enabled. */
  position?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const STEP = 0.6;

/**
 * Full-screen image viewer: pinch/wheel/button zoom, drag to pan once zoomed in, optional
 * prev/next navigation (buttons + arrow keys), and a direct download.
 * Used to show designed reference infographics (Group Structure, Department flows, etc.) at full resolution.
 */
export default function ImageLightbox({ open, onClose, src, title, downloadName, description, onPrev, onNext, position }: Props) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const closeRef = useRef(onClose);
  const prevRef = useRef(onPrev);
  const nextRef = useRef(onNext);
  closeRef.current = onClose;
  prevRef.current = onPrev;
  nextRef.current = onNext;

  const reset = () => { setScale(1); setPos({ x: 0, y: 0 }); };
  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
  const zoomIn = () => setScale((s) => clampScale(s + STEP));
  const zoomOut = () => setScale((s) => { const next = clampScale(s - STEP); if (next === 1) setPos({ x: 0, y: 0 }); return next; });

  useEffect(() => {
    if (!open) return;
    reset();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === '0') reset();
      if (e.key === 'ArrowLeft' && prevRef.current) prevRef.current();
      if (e.key === 'ArrowRight' && nextRef.current) nextRef.current();
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset zoom/pan whenever the image itself changes (e.g. navigating to the next item).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reset(); }, [src]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const next = clampScale(s + (e.deltaY < 0 ? STEP : -STEP));
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
  };
  const onPointerUp = () => { drag.current = null; };

  const onDoubleClick = () => { if (scale > 1) reset(); else setScale(2.5); };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[80] flex flex-col bg-navy-950/95 backdrop-blur-sm">
          {/* toolbar */}
          <div className="no-print flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="truncate text-sm font-bold text-white/90 sm:text-base">{title}</h2>
                {position && <span className="shrink-0 text-[11px] font-semibold tabular-nums text-white/50">{position}</span>}
              </div>
              {description && <p className="mt-0.5 hidden max-w-2xl truncate text-xs text-white/50 sm:block">{description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={zoomOut} disabled={scale <= MIN_SCALE} className="icon-btn !bg-white/10 !text-white hover:!bg-white/20 disabled:opacity-40" aria-label="Zoom out" title="Zoom out"><Minus size={17} /></button>
              <span className="min-w-[3.2rem] text-center text-xs font-semibold tabular-nums text-white/80">{Math.round(scale * 100)}%</span>
              <button type="button" onClick={zoomIn} disabled={scale >= MAX_SCALE} className="icon-btn !bg-white/10 !text-white hover:!bg-white/20 disabled:opacity-40" aria-label="Zoom in" title="Zoom in"><Plus size={17} /></button>
              <button type="button" onClick={reset} className="icon-btn !bg-white/10 !text-white hover:!bg-white/20" aria-label="Reset zoom" title="Reset"><RotateCcw size={16} /></button>
              <a href={src} download={downloadName ?? true} className="icon-btn !bg-white/10 !text-white hover:!bg-white/20" aria-label="Download image" title="Download"><Download size={17} /></a>
              <button type="button" onClick={onClose} className="icon-btn !bg-white/10 !text-white hover:!bg-white/20" aria-label="Close" title="Close (Esc)"><X size={19} /></button>
            </div>
          </div>

          {/* image stage */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
            style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
            onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onDoubleClick={onDoubleClick}
          >
            {onPrev && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onPrev(); }} className="icon-btn absolute left-2 top-1/2 z-10 -translate-y-1/2 !bg-white/10 !text-white hover:!bg-white/20 sm:left-4" aria-label="Previous image" title="Previous (←)">
                <ChevronLeft size={22} />
              </button>
            )}
            <motion.img
              key={src}
              src={src} alt={title} draggable={false}
              animate={{ x: pos.x, y: pos.y, scale }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="pointer-events-none max-h-[85dvh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            />
            {onNext && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onNext(); }} className="icon-btn absolute right-2 top-1/2 z-10 -translate-y-1/2 !bg-white/10 !text-white hover:!bg-white/20 sm:right-4" aria-label="Next image" title="Next (→)">
                <ChevronRight size={22} />
              </button>
            )}
          </motion.div>

          <p className="no-print shrink-0 pb-3 text-center text-[11px] text-white/50">
            {onPrev || onNext ? '← → to browse · ' : ''}Scroll or pinch to zoom · drag to pan · double-click to reset
          </p>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
