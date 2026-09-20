import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Presentation, RefreshCw, Search, X } from 'lucide-react';
import ProductPresentationCard from '@/components/presentations/ProductPresentationCard';
import { usePublishedPresentations } from '@/hooks/usePresentations';

type Sort = 'order' | 'newest' | 'oldest';

const Skeletons = () => (
  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="Loading presentations">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="card overflow-hidden"><div className="skeleton aspect-[16/10] !rounded-none" /><div className="space-y-3 p-5"><div className="skeleton h-5 w-3/4" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-1/3" /></div></div>
    ))}
  </div>
);

export default function ProductPresentationsPage() {
  const { items, status, error, reload } = usePublishedPresentations();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('order');

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    const rows = t ? items.filter((p) => p.title.toLowerCase().includes(t)) : [...items];
    if (sort === 'newest') rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === 'oldest') rows.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    return rows; // 'order' keeps the admin-chosen display order from the server
  }, [items, q, sort]);

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="no-print flex items-center gap-1 text-xs text-muted">
        <Link to="/" className="rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Dashboard</Link>
        <ChevronRight size={12} /><span className="font-semibold text-ink" aria-current="page">Our Product PPT</span>
      </nav>

      <section className="relative overflow-hidden rounded-[2rem] bg-navy-900 p-6 text-white shadow-soft md:p-9">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/30 blur-[90px]" />
        <div className="absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-leaf/20 blur-[90px]" />
        <div className="relative flex items-start gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-brand-400 ring-1 ring-white/15 backdrop-blur sm:flex"><Presentation size={28} /></span>
          <div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">Our Product Presentations</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-300">Explore the technology, applications and product range of IEG Auto Power Ltd.</p>
          </div>
        </div>
      </section>

      {status !== 'error' && (
        <div className="no-print flex flex-wrap items-center gap-3">
          <div className="relative min-w-[13rem] flex-1 sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-10 pr-9" placeholder="Search presentations by title" aria-label="Search presentations by title" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink"><X size={15} /></button>}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <span className="sr-only sm:not-sr-only">Sort</span>
            <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort presentations">
              <option value="order">Featured order</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option>
            </select>
          </label>
          {status === 'ready' && <p className="ml-auto text-sm text-muted" aria-live="polite">{visible.length} {visible.length === 1 ? 'presentation' : 'presentations'}</p>}
        </div>
      )}

      {status === 'loading' && <Skeletons />}

      {status === 'error' && (
        <div role="alert" className="card flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><AlertTriangle size={26} /></span>
          <h2 className="mt-4 text-lg font-bold">We could not load the presentations</h2>
          <p className="mt-1 max-w-md text-sm text-muted">{error}</p>
          <button type="button" className="btn-primary mt-5" onClick={reload}><RefreshCw size={16} />Try again</button>
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand/20 to-leaf/20 text-brand"><Presentation size={30} /></span>
          <h2 className="mt-5 text-lg font-bold">No product presentations are currently available.</h2>
          <p className="mt-1 text-sm text-muted">New presentations will appear here as soon as they are published.</p>
        </div>
      )}

      {status === 'ready' && items.length > 0 && visible.length === 0 && (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app text-muted"><Search size={24} /></span>
          <h2 className="mt-4 text-lg font-bold">No presentations match “{q.trim()}”</h2>
          <button type="button" className="btn-ghost mt-4" onClick={() => setQ('')}>Clear search</button>
        </div>
      )}

      {status === 'ready' && visible.length > 0 && (
        <motion.ul layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout" initial>
            {visible.map((p, i) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: Math.min(i, 8) * 0.05 } }} exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}>
                <ProductPresentationCard presentation={p} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
