import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ClipboardCheck, Boxes, Cog, Container, PackageCheck, ScanSearch, Search, Truck, Warehouse } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Gate from '@/components/ui/Gate';
import { CONFIRM_500, capacities, dimSections, plan500, plan500Aisles, plan500Overall, type DimSection } from '@/data/factory';

const flow = [
  { l: 'Truck Unloading', i: Truck }, { l: 'Incoming Inspection', i: ClipboardCheck }, { l: 'Raw Material Store', i: Warehouse }, { l: 'Kitting Area', i: Boxes },
  { l: 'Assembly Lines', i: Cog }, { l: 'Testing & QC', i: ScanSearch }, { l: 'Packing', i: PackageCheck }, { l: 'Finished Goods Store', i: Warehouse }, { l: 'Dispatch Dock', i: Container },
];

function Table({ s, q }: { s: DimSection; q: string }) {
  const rows = q && !s.title.toLowerCase().includes(q) ? s.rows.filter((r) => r.join(' ').toLowerCase().includes(q)) : s.rows;
  if (!rows.length) return null;
  return (
    <motion.section id={s.id} layout initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} className="card scroll-mt-24 overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3.5" style={{ borderTop: `4px solid ${s.color}` }}>
        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-extrabold text-white" style={{ background: s.color }}>{s.num}</span>
        <h2 className="text-[15px] font-bold leading-tight">{s.title}</h2>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-app text-left text-xs text-muted">{s.columns.map((c) => <th key={c} className="px-5 py-2.5 font-semibold">{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className={`px-5 py-2.5 ${j > 0 ? 'whitespace-nowrap font-semibold' : ''}`}>{c}</td>)}</tr>)}
            {s.total && !q && <tr className="border-t-2 bg-app font-bold" style={{ borderColor: s.color }}>{s.total.map((c, j) => <td key={j} className="whitespace-nowrap px-5 py-3">{c}</td>)}</tr>}
          </tbody>
        </table>
      </div>
      {s.confirm && <p className="flex gap-2 border-t border-line px-5 py-3 text-xs"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-gold" />{s.confirm}</p>}
    </motion.section>
  );
}

function Content() {
  const [cap, setCap] = useState(500);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const c = capacities.find((x) => x.pcs === cap)!;
  const all = useMemo(() => [...dimSections, plan500], []);
  const visible = all.filter((s) => !query || s.title.toLowerCase().includes(query) || s.rows.some((r) => r.join(' ').toLowerCase().includes(query)));

  return (
    <>
      <PageHeader title="Factory Dimensions" description="Recommended dimensional sizes for the outsource manufacturing and in-house assembly model. All dimensions are approximate and can be adjusted to site conditions and final engineering." confirmCount={1} />

      <section className="card mb-6 p-5 md:p-6">
        <h2 className="text-lg font-bold">Recommended total factory dimensions</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md" role="tablist" aria-label="Capacity">
          {capacities.map((x) => <button key={x.pcs} role="tab" aria-selected={cap === x.pcs} onClick={() => setCap(x.pcs)} className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${cap === x.pcs ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:text-ink'}`}>{x.pcs} pcs/day</button>)}
        </div>
        <motion.dl key={cap} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 grid gap-4 sm:grid-cols-3">
          {([['Plot size (L × W)', c.plot], ['Built-up area', c.built], ['Ceiling height', c.ceiling]] as const).map(([k, v]) => <div key={k} className="rounded-2xl bg-app p-4"><dt className="text-xs font-semibold text-muted">{k}</dt><dd className="mt-1 text-lg font-extrabold">{v}</dd></div>)}
        </motion.dl>
        {cap === 500 && <p className="mt-4 flex gap-2 rounded-2xl border border-gold/50 bg-gold/10 p-3 text-xs leading-relaxed"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold" /><span><b>Needs confirmation.</b> {CONFIRM_500}</span></p>}
      </section>

      <section className="card mb-6 p-5 md:p-6">
        <h2 className="text-lg font-bold">Recommended layout arrangement (linear flow)</h2>
        <ol className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {flow.map((f, i) => { const I = f.i; return (
            <motion.li key={f.l} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="flex shrink-0 items-center gap-2">
              <span className="flex w-28 flex-col items-center gap-2 rounded-2xl border border-line bg-app px-2 py-3 text-center text-xs font-semibold"><I size={22} className="text-brand" />{f.l}</span>
              {i < flow.length - 1 && <span className="text-brand" aria-hidden>→</span>}
            </motion.li>
          ); })}
        </ol>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Filter areas, for example “forklift”" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter dimension tables" />
        </div>
        <nav className="flex flex-1 gap-1.5 overflow-x-auto" aria-label="Sections">
          {all.slice(0, 8).map((s) => <a key={s.id} href={`#${s.id}`} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand hover:text-ink">{s.num}. {s.title.split(' (')[0].replace(' Area', '')}</a>)}
        </nav>
      </div>

      {!visible.length && <div className="card p-10 text-center text-sm text-muted">No areas match “{q}”. Try “aisle”, “packing” or “power”.</div>}
      <div className="grid gap-5 xl:grid-cols-2">{visible.map((s) => <Table key={s.id} s={s} q={query} />)}</div>

      {!query && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="card overflow-hidden"><h2 className="border-b border-line px-5 py-3.5 text-[15px] font-bold" style={{ borderTop: '4px solid #1FA2E8' }}>500 pcs/day plan: overall recommendation</h2>
            <table className="w-full text-sm"><tbody>{plan500Overall.map(([k, v]) => <tr key={k} className="border-t border-line first:border-0"><td className="px-5 py-2.5 text-muted">{k}</td><td className="px-5 py-2.5 text-right font-semibold">{v}</td></tr>)}</tbody></table></section>
          <section className="card overflow-hidden"><h2 className="border-b border-line px-5 py-3.5 text-[15px] font-bold" style={{ borderTop: '4px solid #1FA2E8' }}>500 pcs/day plan: aisle and movement width</h2>
            <table className="w-full text-sm"><tbody>{plan500Aisles.map(([k, v]) => <tr key={k} className="border-t border-line first:border-0"><td className="px-5 py-2.5 text-muted">{k}</td><td className="px-5 py-2.5 text-right font-semibold">{v}</td></tr>)}</tbody></table></section>
        </div>
      )}
    </>
  );
}

export default function FactoryDimensionsPage() {
  return <Gate ms={300} skeleton={<div className="skeleton h-[70vh]" />}><Content /></Gate>;
}
