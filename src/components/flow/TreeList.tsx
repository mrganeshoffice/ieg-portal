import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { OrgNode } from '@/types';
import { kindMeta } from './nodeStyles';

/** Mobile-friendly collapsible tree, used when the graphical chart is too wide. */
function Item({ n, depth, selectedId, onSelect, forceOpen }: { n: OrgNode; depth: number; selectedId: string | null; onSelect: (id: string) => void; forceOpen?: Set<string> }) {
  const [open, setOpen] = useState(depth < 2);
  const meta = kindMeta[n.kind]; const Icon = meta.icon;
  const has = !!n.children?.length;
  const isOpen = open || !!forceOpen?.has(n.id);
  return (
    <li>
      <div className={`flex items-center gap-2 rounded-xl border px-2 py-2 transition ${selectedId === n.id ? 'border-brand bg-brand/5' : 'border-transparent hover:bg-app'}`}>
        <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted disabled:opacity-0" disabled={!has} onClick={() => setOpen(!isOpen)} aria-label={isOpen ? 'Collapse' : 'Expand'} aria-expanded={isOpen}>
          <ChevronRight size={16} className={`transition ${isOpen ? 'rotate-90' : ''}`} />
        </button>
        <button onClick={() => onSelect(n.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${meta.color}1F`, color: meta.color }}><Icon size={16} /></span>
          <span className="min-w-0"><span className="block truncate text-sm font-semibold">{n.label}</span>{n.subtitle && <span className="block truncate text-xs text-muted">{n.subtitle}</span>}</span>
          {n.confirm && <AlertTriangle size={14} className="shrink-0 text-gold" />}
        </button>
        {has && <span className="text-[11px] font-semibold text-muted">{n.children!.length}</span>}
      </div>
      <AnimatePresence initial={false}>
        {has && isOpen && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="ml-4 space-y-0.5 overflow-hidden border-l border-line pl-2">
            {n.children!.map((c) => <Item key={c.id} n={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} forceOpen={forceOpen} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function TreeList({ root, selectedId, onSelect, forceOpen }: { root: OrgNode; selectedId: string | null; onSelect: (id: string) => void; forceOpen?: Set<string> }) {
  return <ul className="p-3"><Item n={root} depth={0} selectedId={selectedId} onSelect={onSelect} forceOpen={forceOpen} /></ul>;
}
