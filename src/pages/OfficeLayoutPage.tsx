import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Accessibility, ArrowDown, ArrowRight, Briefcase, Building2, ChevronRight, ClipboardList, Coffee, Cpu, Crown, DoorOpen,
  Handshake, Info, Network, Presentation, Route, ShowerHead, Sofa, Sparkles, UserCheck, Users,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import ImageViewer from '@/components/office/ImageViewer';
import { business, connectivity, executive, facilities, meeting, officeViews, overview, philosophy, spaceSummary, zoning } from '@/data/officeLayout';

const TABS = [...officeViews.map((v) => ({ id: v.id as string, label: v.tab })), { id: 'info', label: 'Office Information' }];

function Section({ id, eyebrow, title, icon, children }: { id?: string; eyebrow?: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      id={id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4 }}
      className="scroll-mt-24"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand/15 to-leaf/15 text-brand">{icon}</span>
        <div>
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">{eyebrow}</p>}
          <h2 className="text-lg font-extrabold tracking-tight md:text-xl">{title}</h2>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="mt-3 space-y-1.5">
    {items.map((i) => (
      <li key={i} className="flex items-start gap-2 text-sm text-muted"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{i}</li>
    ))}
  </ul>
);

export default function OfficeLayoutPage() {
  const [tab, setTab] = useState<string>(officeViews[0].id);
  const infoRef = useRef<HTMLDivElement>(null);
  const view = officeViews.find((v) => v.id === tab) ?? officeViews[0];

  const pick = (id: string) => {
    if (id === 'info') { infoRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); return; }
    setTab(id);
  };

  return (
    <div className="space-y-8 overflow-x-hidden">
      {/* header + breadcrumb */}
      <div>
        <nav aria-label="Breadcrumb" className="no-print mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Link to="/" className="hover:text-ink">Dashboard</Link><ChevronRight size={13} /><span className="text-ink">Office Layout</span>
        </nav>
        <div className="relative overflow-hidden rounded-3xl border border-line bg-navy-900 p-5 text-white shadow-soft md:p-8">
          <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl" aria-hidden />
          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-leaf/15 blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-5">
            <Logo size={64} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-brand-400">IEG Group</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-4xl">Corporate Office Layout</h1>
              <p className="mt-1.5 max-w-2xl text-sm text-white/70 md:text-base">IEG Group corporate headquarters — a 7,000 sq. ft. executive office with dedicated director, business, meeting and service zones. Explore the 3D layout and the architectural blueprint below.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-center backdrop-blur">
              <p className="text-3xl font-extrabold leading-none tabular-nums md:text-4xl">7,000</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white/70">Sq. Ft.</p>
            </div>
          </div>
        </div>
      </div>

      {/* viewer */}
      <div>
        <div role="tablist" aria-label="Office views" className="mb-3 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 sm:inline-flex">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id} role="tab" aria-selected={active} onClick={() => pick(t.id)}
                className={`relative shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition sm:px-4 ${active ? 'bg-navy-900 text-white shadow-soft' : 'text-muted hover:text-ink'}`}
              >
                {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-brand to-leaf" aria-hidden />}
                {t.label}
              </button>
            );
          })}
        </div>
        <ImageViewer key={view.id} src={view.src} alt={view.alt} title={view.title} file={view.file} hint={view.hint} />
      </div>

      {/* information */}
      <div ref={infoRef} id="office-information" className="scroll-mt-24 space-y-8">
        <Section eyebrow="Office information" title="Office Overview" icon={<Building2 size={18} />}>
          <div className="card p-5 md:p-6">
            <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
              <Logo size={36} />
              <p className="text-sm font-bold">IEG GROUP — Corporate Office</p>
            </div>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {overview.map(([k, v]) => (
                <div key={k}><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</dt><dd className="mt-1 text-sm font-bold md:text-base">{v}</dd></div>
              ))}
            </dl>
          </div>
        </Section>

        <Section title="Space Summary" icon={<ClipboardList size={18} />}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {spaceSummary.map(([n, l]) => (
              <div key={l} className="card group p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-glow md:p-5">
                <p className="bg-gradient-to-r from-brand to-leaf bg-clip-text text-4xl font-extrabold leading-none tabular-nums text-transparent md:text-5xl">{n}</p>
                <p className="mt-2 text-xs font-semibold text-muted md:text-sm">{l}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Office Zoning" icon={<Network size={18} />}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {zoning.map((z) => (
              <div key={z.name} className="card relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-glow">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: z.accent }} aria-hidden />
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: z.accent }} /><h3 className="text-sm font-extrabold uppercase tracking-wide">{z.name}</h3></div>
                <List items={z.items} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Office Connectivity" icon={<Route size={18} />}>
          <div className="grid gap-3 lg:grid-cols-3">
            {connectivity.map((c) => (
              <div key={c.title} className="card p-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-muted">{c.title}</p>
                <ol className="flex flex-col items-stretch">
                  {c.steps.map((s, i) => (
                    <li key={s} className="flex flex-col items-center">
                      <span className={`w-full rounded-xl border px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide ${i === 0 ? 'border-brand/50 bg-brand/10 text-brand' : i === c.steps.length - 1 ? 'border-leaf/50 bg-leaf/10 text-leaf-600' : 'border-line bg-app'}`}>{s}</span>
                      {i < c.steps.length - 1 && <ArrowDown size={18} className="my-1 text-brand" aria-hidden />}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Executive Area" icon={<Crown size={18} />}>
          <div className="grid gap-3 md:grid-cols-2">
            {executive.map((e, i) => (
              <div key={e.name} className="card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold">{i === 0 ? <Crown size={19} /> : <Briefcase size={19} />}</span>
                  <h3 className="font-extrabold">{e.name}</h3>
                </div>
                <List items={e.points} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Business & Operations" icon={<Briefcase size={18} />}>
          <div className="grid gap-3 md:grid-cols-2">
            {business.map((b, i) => (
              <div key={b.name} className="card flex gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf/15 text-leaf-600">{i === 0 ? <Users size={19} /> : <UserCheck size={19} />}</span>
                <div><h3 className="font-extrabold">{b.name}</h3><p className="mt-1 text-sm text-muted">{b.text}</p></div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Meeting & Collaboration" icon={<Handshake size={18} />}>
          <div className="grid gap-3 md:grid-cols-2">
            {meeting.map((m, i) => (
              <div key={m.name} className="card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand">{i === 0 ? <Presentation size={19} /> : <Sofa size={19} />}</span>
                  <div><h3 className="font-extrabold">{m.name}</h3><p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Designed for</p></div>
                </div>
                <List items={m.points} />
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="Office facilities" title="Facilities" icon={<Cpu size={18} />}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {facilities.map((f, i) => {
              const Icon = [Coffee, ShowerHead, Accessibility, DoorOpen][i];
              return (
                <div key={f.name} className="card p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-glow">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-app text-brand"><Icon size={19} /></span>
                  <h3 className="mt-3 font-extrabold">{f.name}</h3>
                  <p className="mt-1 text-sm text-muted">{f.text}</p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Design Philosophy" icon={<Sparkles size={18} />}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {philosophy.map((p, i) => (
              <div key={p.name} className="card p-5">
                <p className="text-xs font-extrabold tabular-nums text-brand">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-1 font-extrabold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* footer */}
      <footer className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div><p className="text-sm font-extrabold">IEG GROUP</p><p className="text-xs text-muted">Corporate Office · 7,000 sq. ft. headquarters</p></div>
        </div>
        <Link to="/factory-layout" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand"><Info size={14} />Factory Layout <ArrowRight size={13} /></Link>
      </footer>
    </div>
  );
}
