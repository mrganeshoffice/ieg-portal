import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Grid3x3, LayoutList, Search, Waypoints, X } from 'lucide-react';
import ImageLightbox from '@/components/ui/ImageLightbox';
import Gate, { CardsSkeleton } from '@/components/ui/Gate';
import FlowView from '@/components/organisation-flow/FlowView';
import GalleryView from '@/components/organisation-flow/GalleryView';
import { flowSectionMeta, flowSectionOrder, organisationFlowItems, type FlowSection } from '@/data/organisationFlow';

type View = 'flow' | 'gallery';

export default function OrganisationFlowPage() {
  const [view, setView] = useState<View>('flow');
  const [q, setQ] = useState('');
  const [section, setSection] = useState<FlowSection | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  // Every image lives in public/, served as static assets — nothing here can 404 from a bad
  // network call, so we only model "no results match the filter" as the empty state.
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return organisationFlowItems.filter((i) => {
      if (section !== 'all' && i.section !== section) return false;
      if (!t) return true;
      return i.title.toLowerCase().includes(t) || i.description.toLowerCase().includes(t) || flowSectionMeta[i.section].label.toLowerCase().includes(t);
    });
  }, [q, section]);

  const itemsBySection = useMemo(() => {
    const map = { group: [], company: [], department: [] } as Record<FlowSection, typeof organisationFlowItems>;
    for (const item of filtered) map[item.section].push(item);
    for (const s of flowSectionOrder) map[s].sort((a, b) => a.order - b.order);
    return map;
  }, [filtered]);

  const ordered = useMemo(() => flowSectionOrder.flatMap((s) => itemsBySection[s]), [itemsBySection]);
  const openIndex = openId ? ordered.findIndex((i) => i.id === openId) : -1;
  const openItem = openIndex >= 0 ? ordered[openIndex] : null;

  const goTo = (delta: number) => {
    if (openIndex < 0 || ordered.length === 0) return;
    const next = (openIndex + delta + ordered.length) % ordered.length;
    setOpenId(ordered[next].id);
  };

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="no-print flex items-center gap-1 text-xs text-muted">
        <Link to="/" className="rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Dashboard</Link>
        <ChevronRight size={12} /><span className="font-semibold text-ink" aria-current="page">Organisation Flow</span>
      </nav>

      <section className="relative overflow-hidden rounded-[2rem] bg-navy-900 p-6 text-white shadow-soft md:p-9">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/30 blur-[90px]" />
        <div className="absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-leaf/20 blur-[90px]" />
        <div className="relative flex items-start gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-brand-400 ring-1 ring-white/15 backdrop-blur sm:flex"><Waypoints size={28} /></span>
          <div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">Organisation Flow</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-300">Every reference infographic for the Group, company and department structures, in one place — browse by flow or as a gallery.</p>
          </div>
        </div>
      </section>

      <div className="no-print flex flex-wrap items-center gap-3">
        <div className="relative min-w-[13rem] flex-1 sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10 pr-9" placeholder="Search by title, section or step" aria-label="Search organisation flow" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink"><X size={15} /></button>}
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only sm:not-sr-only">Section</span>
          <select className="input !w-auto" value={section} onChange={(e) => setSection(e.target.value as FlowSection | 'all')} aria-label="Filter by section">
            <option value="all">All sections</option>
            {flowSectionOrder.map((s) => <option key={s} value={s}>{flowSectionMeta[s].label}</option>)}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-1 rounded-xl border border-line bg-surface p-1" role="tablist" aria-label="View">
          <button type="button" role="tab" aria-selected={view === 'flow'} onClick={() => setView('flow')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === 'flow' ? 'bg-gradient-to-r from-brand to-leaf text-white shadow-soft' : 'text-muted hover:text-ink'}`}>
            <LayoutList size={14} />Structured Flow
          </button>
          <button type="button" role="tab" aria-selected={view === 'gallery'} onClick={() => setView('gallery')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === 'gallery' ? 'bg-gradient-to-r from-brand to-leaf text-white shadow-soft' : 'text-muted hover:text-ink'}`}>
            <Grid3x3 size={14} />Gallery
          </button>
        </div>

        <p className="w-full text-sm text-muted sm:w-auto" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'image' : 'images'}</p>
      </div>

      <Gate skeleton={<CardsSkeleton />}>
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-app text-muted"><Search size={26} /></span>
            <h2 className="mt-5 text-lg font-bold">No images match “{q.trim() || flowSectionMeta[section as FlowSection]?.label}”</h2>
            <p className="mt-1 text-sm text-muted">Try a different search term or clear the filter.</p>
            <button type="button" className="btn-ghost mt-4" onClick={() => { setQ(''); setSection('all'); }}>Clear filters</button>
          </div>
        ) : view === 'flow' ? (
          <FlowView itemsBySection={itemsBySection} onOpen={setOpenId} />
        ) : (
          <GalleryView items={ordered} onOpen={setOpenId} />
        )}
      </Gate>

      {openItem && (
        <ImageLightbox
          open={!!openItem}
          onClose={() => setOpenId(null)}
          src={openItem.image}
          title={openItem.title}
          description={openItem.description}
          downloadName={`${openItem.id}.jpg`}
          position={ordered.length > 1 ? `${openIndex + 1} / ${ordered.length}` : undefined}
          onPrev={ordered.length > 1 ? () => goTo(-1) : undefined}
          onNext={ordered.length > 1 ? () => goTo(1) : undefined}
        />
      )}
    </div>
  );
}
