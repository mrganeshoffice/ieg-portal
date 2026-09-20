import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUpRight, X } from 'lucide-react';
import type { OrgNode } from '@/types';
import { kindMeta } from './nodeStyles';
import type { IndexEntry } from './layout';

export default function NodeDrawer({ entry, onClose, onSelect }: { entry: IndexEntry; onClose: () => void; onSelect: (id: string) => void }) {
  const { node, parent, path, department } = entry;
  const meta = kindMeta[node.kind];
  const Icon = meta.icon;
  const kids = node.children ?? [];
  const Row = ({ n }: { n: OrgNode }) => (
    <button onClick={() => onSelect(n.id)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-left text-sm font-medium transition hover:border-brand/60 hover:bg-app">
      <span className="truncate">{n.label}{n.subtitle && <span className="ml-1.5 text-xs font-normal text-muted">{n.subtitle}</span>}</span>
      <ArrowUpRight size={14} className="shrink-0 text-muted" />
    </button>
  );
  return (
    <motion.aside
      initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 32 }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="absolute inset-x-2 bottom-2 z-20 max-h-[72%] overflow-y-auto rounded-3xl border border-line bg-surface/95 p-5 shadow-soft backdrop-blur-xl md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[22rem]"
      aria-label={`${node.label} details`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${meta.color}1F`, color: meta.color }}><Icon size={24} /></span>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${meta.color}1F`, color: meta.color }}>{meta.label}</span>
          <h3 className="mt-1 text-lg font-extrabold leading-tight">{node.label}</h3>
          {node.subtitle && <p className="text-sm text-muted">{node.subtitle}</p>}
        </div>
        <button onClick={onClose} aria-label="Close details" className="icon-btn -mr-2 -mt-2"><X size={18} /></button>
      </div>

      {node.confirm && (
        <div className="mt-4 flex gap-2 rounded-2xl border border-gold/50 bg-gold/10 p-3 text-xs leading-relaxed">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-gold" />
          <p><b>Needs confirmation.</b> {node.confirm}</p>
        </div>
      )}

      <dl className="mt-5 space-y-4 text-sm">
        <div><dt className="mb-1 text-xs font-semibold text-muted">Reports to</dt><dd>{parent ? <Row n={parent} /> : <span className="text-muted">Top of this chart</span>}</dd></div>
        {department && <div><dt className="mb-1 text-xs font-semibold text-muted">Department</dt><dd className="font-medium">{department}</dd></div>}
        <div>
          <dt className="mb-1 text-xs font-semibold text-muted">Direct reports ({kids.length})</dt>
          <dd className="space-y-1.5">{kids.length ? kids.map((k) => <Row key={k.id} n={k} />) : <span className="text-muted">None shown</span>}</dd>
        </div>
        {node.description && <div><dt className="mb-1 text-xs font-semibold text-muted">Description</dt><dd className="leading-relaxed text-ink/90">{node.description}</dd></div>}
        <div>
          <dt className="mb-1 text-xs font-semibold text-muted">Hierarchy</dt>
          <dd className="flex flex-wrap items-center gap-1 text-xs text-muted">
            {path.map((p, i) => <span key={p.id} className={i === path.length - 1 ? 'font-bold text-ink' : ''}>{p.label}{i < path.length - 1 && <span className="mx-1">›</span>}</span>)}
          </dd>
        </div>
      </dl>
    </motion.aside>
  );
}
