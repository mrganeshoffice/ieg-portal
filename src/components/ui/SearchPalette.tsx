import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import { runSearch } from '@/lib/search';
import { kindMeta } from '@/components/flow/nodeStyles';

export default function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const ref = useRef<HTMLInputElement>(null);
  const results = useMemo(() => runSearch(q), [q]);

  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => ref.current?.focus(), 50); } }, [open]);
  useEffect(() => setI(0), [q]);

  const go = (idx: number) => {
    const r = results[idx]; if (!r) return;
    nav(r.focus ? `${r.route}?focus=${encodeURIComponent(r.focus)}` : r.route);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center bg-navy-950/60 px-4 pt-[12vh] backdrop-blur-sm no-print" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label="Search" className="card w-full max-w-xl overflow-hidden" initial={{ y: -16, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -10, opacity: 0 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-muted" />
              <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search departments, roles and pages"
                className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onClose();
                  if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(v + 1, results.length - 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(v - 1, 0)); }
                  if (e.key === 'Enter') go(i);
                }} />
              <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted sm:block">Esc</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
              {!q && <li className="px-3 py-6 text-center text-sm text-muted">Type a department, role or page name.</li>}
              {q && !results.length && <li className="px-3 py-6 text-center text-sm text-muted">No matches for “{q}”. Try a shorter word such as “sales” or “director”.</li>}
              {results.map((r, idx) => {
                const meta = r.kind === 'page' ? null : kindMeta[r.kind];
                const Icon = meta?.icon;
                return (
                  <li key={r.key} role="option" aria-selected={idx === i}>
                    <button onMouseEnter={() => setI(idx)} onClick={() => go(idx)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${idx === i ? 'bg-brand/10' : ''}`}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${meta?.color ?? '#1FA2E8'}1F`, color: meta?.color ?? '#1FA2E8' }}>{Icon ? <Icon size={16} /> : <Search size={16} />}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.label}</span><span className="block truncate text-xs text-muted">{r.subtitle}</span></span>
                      {idx === i && <CornerDownLeft size={14} className="text-muted" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
