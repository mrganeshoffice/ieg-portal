import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { Download, ImageOff, Maximize2, Minimize2, Minus, Plus, RotateCcw, ScanLine } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const MIN = 1;
const MAX = 8;
const STEP = 1.4;

type View = { s: number; x: number; y: number };
const FIT: View = { s: 1, x: 0, y: 0 };

function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy-950 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-soft transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100">{label}</span>
    </span>
  );
}

/**
 * Technical-drawing style viewer. The image is always shown whole (never stretched or cropped) and zoomed with a CSS
 * transform, so the full-resolution file stays crisp. Wheel (Ctrl/⌘), pinch, buttons, double-click and keyboard zoom;
 * drag pans when zoomed. Download serves the original file.
 */
export default function ImageViewer({ src, alt, title, file, hint }: { src: string; alt: string; title: string; file: string; hint?: string }) {
  const shell = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(FIT);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [full, setFull] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; s: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => { setStatus('loading'); setView(FIT); }, [src]);

  const clamp = useCallback((v: View): View => {
    const el = box.current;
    const s = Math.min(MAX, Math.max(MIN, v.s));
    if (!el) return { ...v, s };
    const { width, height } = el.getBoundingClientRect();
    return { s, x: Math.min(0, Math.max(width * (1 - s), v.x)), y: Math.min(0, Math.max(height * (1 - s), v.y)) };
  }, []);

  /** Zoom by `factor`, keeping the point (px, py) — in viewer coordinates — fixed under the cursor. */
  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = px ?? r.width / 2, cy = py ?? r.height / 2;
    setView((v) => {
      const s = Math.min(MAX, Math.max(MIN, v.s * factor));
      const k = s / v.s;
      return clamp({ s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
    });
  }, [clamp]);

  const reset = useCallback(() => setView(FIT), []);

  // Ctrl/⌘ + wheel (and trackpad pinch) zooms; a plain wheel keeps scrolling the page.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0025 * (e.ctrlKey ? 2 : 1)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Fullscreen: native where available, with a CSS fixed-position fallback (iOS Safari has no element fullscreen).
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setFull((f) => (document.fullscreenEnabled ? false : f)); };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [full]);
  const toggleFull = async () => {
    const next = !full;
    setFull(next);
    setView(FIT);
    try {
      if (next && shell.current?.requestFullscreen) await shell.current.requestFullscreen();
      else if (!next && document.fullscreenElement) await document.exitFullscreen();
    } catch { /* the CSS fallback already covers the screen */ }
  };

  const onPointerDown = (e: RPointerEvent) => {
    if (status !== 'ready') return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
    }
    if (view.s > 1) setDragging(true);
  };
  const onPointerMove = (e: RPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const target = gesture.current.s * (dist / gesture.current.dist);
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      setView((v) => { const s = Math.min(MAX, Math.max(MIN, target)); const k = s / v.s; return clamp({ s, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k }); });
      moved.current = true;
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) moved.current = true;
      setView((v) => (v.s > 1 ? clamp({ ...v, x: v.x + dx, y: v.y + dy }) : v));
    }
  };
  const onPointerUp = (e: RPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    if (view.s > 1.05) reset(); else zoomAt(2.5, e.clientX - r.left, e.clientY - r.top);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(STEP); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / STEP); }
    else if (e.key === '0') { e.preventDefault(); reset(); }
    else if (view.s > 1 && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const d = 60;
      setView((v) => clamp({ ...v, x: v.x + (e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0), y: v.y + (e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0) }));
    }
  };

  const pct = Math.round(view.s * 100);
  const btn = 'flex h-9 w-9 items-center justify-center rounded-xl text-white/85 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 disabled:pointer-events-none disabled:opacity-35';

  return (
    <div
      ref={shell}
      className={full ? 'fixed inset-0 z-[100] flex flex-col bg-navy-950' : 'overflow-hidden rounded-3xl border border-line bg-navy-950 shadow-soft'}
    >
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-navy-900/80 px-3 py-2.5 backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={30} className="!rounded-lg !p-0.5" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{title}</p>
            {hint && <p className="hidden truncate text-[11px] text-white/55 sm:block">{hint}</p>}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white/70" aria-live="polite">{pct}%</span>
      </div>

      {/* canvas */}
      <div className={full ? 'relative min-h-0 flex-1' : 'relative aspect-[16/9] w-full'}>
        <div
          ref={box}
          tabIndex={0}
          role="group"
          aria-label={`${title} viewer. Use plus and minus to zoom, zero to reset, arrow keys to pan.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
          className={`absolute inset-0 select-none overflow-hidden bg-grid outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/60 ${view.s > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
          style={{ touchAction: view.s > 1 ? 'none' : 'pan-y' }}
        >
          <div
            className="absolute inset-0 origin-top-left will-change-transform"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, transition: dragging || pointers.current.size > 0 ? 'none' : 'transform 220ms cubic-bezier(.2,.8,.2,1)' }}
          >
            <img
              src={src} alt={alt} draggable={false} decoding="async"
              onLoad={() => setStatus('ready')} onError={() => setStatus('error')}
              className={`h-full w-full object-contain transition-opacity duration-300 ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>

          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-900/60" role="status" aria-label="Loading drawing">
              <div className="relative h-16 w-28 overflow-hidden rounded-lg border border-brand/40">
                <div className="absolute inset-0 bg-grid opacity-60" />
                <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
              </div>
              <p className="text-xs font-semibold tracking-wide text-white/60">Loading drawing…</p>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy-900 p-6 text-center">
              <ImageOff size={30} className="text-white/45" />
              <p className="text-sm font-bold text-white">{title}</p>
              <p className="text-xs text-white/60">Image currently unavailable</p>
            </div>
          )}
        </div>

        {/* floating toolbar */}
        {status !== 'error' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
            <div role="toolbar" aria-label="Viewer controls" className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-white/15 bg-navy-900/75 p-1 shadow-soft backdrop-blur-md">
              <Tip label="Zoom in"><button type="button" className={btn} onClick={() => zoomAt(STEP)} disabled={view.s >= MAX} aria-label="Zoom in"><Plus size={18} /></button></Tip>
              <Tip label="Zoom out"><button type="button" className={btn} onClick={() => zoomAt(1 / STEP)} disabled={view.s <= MIN} aria-label="Zoom out"><Minus size={18} /></button></Tip>
              <Tip label="Fit to screen"><button type="button" className={btn} onClick={reset} disabled={view.s === 1} aria-label="Fit to screen"><ScanLine size={18} /></button></Tip>
              <Tip label="Reset"><button type="button" className={btn} onClick={reset} disabled={view.s === 1} aria-label="Reset"><RotateCcw size={17} /></button></Tip>
              <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
              <Tip label={full ? 'Exit fullscreen' : 'Fullscreen'}><button type="button" className={btn} onClick={toggleFull} aria-label={full ? 'Exit fullscreen' : 'Fullscreen'}>{full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button></Tip>
              <Tip label="Download original"><a className={btn} href={src} download={file} aria-label={`Download ${file}`}><Download size={18} /></a></Tip>
            </div>
          </div>
        )}
      </div>

      <p className="border-t border-white/10 bg-navy-900/60 px-4 py-2 text-center text-[11px] text-white/50">
        Drag to pan when zoomed · Ctrl / ⌘ + scroll, pinch or double-click to zoom · <span className="font-semibold">{file}</span> downloads in original quality
      </p>
    </div>
  );
}
