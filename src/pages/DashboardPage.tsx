import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Presentation, Briefcase, Building2, Crown, FlaskConical, Factory, Map, Search, ShieldCheck, Users } from 'lucide-react';
import { navItems } from '@/config/navigation';
import { directorCount, subsidiaryCount, units as unitList } from '@/data/common';
import { departments, units } from '@/data/departments';
import { zones } from '@/data/factory';
import { getRecent } from '@/lib/recent';
import { runSearch } from '@/lib/search';
import { kindMeta } from '@/components/flow/nodeStyles';
import Gate, { CardsSkeleton } from '@/components/ui/Gate';

const cards = [
  { title: 'Factory Layout', desc: 'Vastu-based plant plan with zones and linear material flow.', stat: `${zones.length} mapped zones`, icon: Map, path: '/factory-layout', color: '#34C77B' },
  { title: 'IEG Group Companies', desc: 'Group companies under the Parent Company and their Directors.', stat: `${subsidiaryCount} companies`, icon: Building2, path: '/group-structure', color: '#14B8A6' },
  { title: 'HR Heads', desc: 'One reporting flow per business unit, from Director to team roles.', stat: `${units.length} HR Head flows`, icon: Users, path: '/hr/1', color: '#EC4899' },
  { title: 'Directors', desc: 'Directors 1 to 6 and the business unit each one oversees.', stat: `${directorCount} directors`, icon: Crown, path: '/administration', color: '#F59E0B' },
  { title: 'Departments', desc: 'Functional departments across each business unit and the corporate office.', stat: `${departments.length} departments`, icon: Briefcase, path: '/departments/electrical', color: '#22A862' },
  { title: 'Production Units', desc: 'Production heads and line roles across every business unit.', stat: 'View Structure', icon: Factory, path: '/departments/production', color: '#F97316' },
  { title: 'R&D', desc: 'Group R&D function and the Director 6 line.', stat: 'View Structure', icon: FlaskConical, path: '/departments/rnd', color: '#10B981' },
  { title: 'Our Product PPT', desc: 'Explore product presentations and technical information.', stat: 'Presentations', icon: Presentation, path: '/product-ppt', color: '#1FA2E8', cta: 'View Presentations' },
  { title: 'Administration Team', desc: 'Administration, HR Director, Legal, CA and CS.', stat: 'View Structure', icon: ShieldCheck, path: '/administration', color: '#0EA5A4' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function Dashboard() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const results = useMemo(() => runSearch(q, 6), [q]);
  const recent = getRecent().map((p) => navItems.find((n) => n.path === p)).filter(Boolean) as typeof navItems;
  const quick = ['/group-structure', '/hr/1', '/factory-layout', '/factory-dimensions', '/administration', '/product-ppt'].map((p) => navItems.find((n) => n.path === p)!);

  const distribution = departments.map((d) => {
    if (d.key === 'rnd' || d.groupRoles) return { d, count: 1, roles: d.groupRoles?.length ?? 0 };
    const present = units.filter((u) => u.depts.some((x) => x.dept === d.key));
    const roles = present.reduce((s, u) => s + (u.depts.find((x) => x.dept === d.key)?.roles.length ?? 0), 0);
    return { d, count: present.length, roles };
  });

  return (
    <div className="space-y-6">
      {/* hero */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-navy-900 p-7 text-white shadow-soft md:p-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/30 blur-[90px]" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-leaf/20 blur-[90px]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">Welcome to IEG Organization Portal</h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300">See who reports to whom across the Group, each business unit and the factory floor.</p>
            <Link to="/group-structure" className="btn-primary mt-7 !px-6 !py-3">View Complete Organization<ArrowRight size={17} /></Link>
          </div>
          <div className="relative">
            <label htmlFor="dash-search" className="mb-1.5 block text-xs font-semibold text-slate-300">Find a department or role</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
              <input id="dash-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “sales”, “battery” or “Director 3”"
                className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-10 pr-3 text-sm text-white outline-none backdrop-blur placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30" />
            </div>
            {q && (
              <ul className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-soft">
                {!results.length && <li className="px-3 py-3 text-sm text-muted">No matches. Try a shorter word.</li>}
                {results.map((r) => (
                  <li key={r.key}><button onClick={() => nav(r.focus ? `${r.route}?focus=${encodeURIComponent(r.focus)}` : r.route)} className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left hover:bg-app">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{r.label}</span><span className="block truncate text-xs text-muted">{r.subtitle}</span></span>
                    <ArrowRight size={14} className="shrink-0 text-muted" />
                  </button></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </motion.section>

      {/* summary cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.title} variants={item}>
              <Link to={c.path} className="group card relative flex h-full flex-col overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <span className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition group-hover:opacity-30" style={{ background: c.color }} />
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${c.color}1F`, color: c.color }}><Icon size={24} /></span>
                  <span className="rounded-full bg-app px-2.5 py-1 text-xs font-semibold text-muted">{c.stat}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">{c.desc}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: c.color }}>
                  {c.cta ?? 'Explore Flow'}<ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1.5" />
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* structure overview */}
        <section className="card p-6">
          <h2 className="text-lg font-bold">Company structure</h2>
          <p className="mt-1 text-sm text-muted">From the Group down to each business unit.</p>
          <Link to="/group-structure" className="mt-5 block rounded-2xl border border-line bg-app/60 p-4 transition hover:border-brand/50" aria-label="Open organization chart">
            <div className="flex flex-col items-center">
              <span className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-white">IEG AUTO POWER LTD (IEG Group)</span>
              <span className="h-4 w-px bg-line" />
              <span className="rounded-xl border border-indigo-400/50 bg-indigo-500/10 px-4 py-2 text-sm font-semibold">Parent Company · Public Limited Co.</span>
              <span className="h-4 w-px bg-line" />
              <div className="flex flex-wrap justify-center gap-2">
                {unitList.map((u) => <span key={u.n} className="rounded-lg border border-teal-400/50 bg-teal-500/10 px-2.5 py-1.5 text-xs font-medium">{u.name}</span>)}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-medium">
                <span className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-2.5 py-1.5">R&D</span>
                <span className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-2.5 py-1.5">Administration Team</span>
              </div>
            </div>
          </Link>
        </section>

        {/* distribution */}
        <section className="card p-6">
          <h2 className="text-lg font-bold">Department distribution</h2>
          <p className="mt-1 text-sm text-muted">Business units where each department appears in the supplied charts.</p>
          <ul className="mt-5 space-y-3">
            {distribution.map(({ d, count, roles }) => (
              <li key={d.key}>
                <Link to={`/departments/${d.key}`} className="group block">
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-semibold group-hover:text-brand">{d.key === 'rnd' ? 'Research & Development' : d.label.replace(' Department', '')}</span>
                    <span className="text-xs text-muted">{d.key === 'rnd' ? 'Group + Director 6' : d.groupRoles ? 'Group function' : `${count} of ${units.length} units`}{roles ? ` · ${roles} roles mapped` : ''}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line/70">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-leaf" initial={{ width: 0 }} animate={{ width: `${(d.key === 'rnd' || d.groupRoles ? 1 : count / units.length) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* recent */}
        <section className="card p-6">
          <h2 className="text-lg font-bold">Recently viewed</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Flows you open will appear here. Start with the Group Structure.</p>
          ) : (
            <ul className="mt-4 space-y-1.5">
              {recent.slice(0, 5).map((r) => { const I = r.icon; return (
                <li key={r.id}><Link to={r.path} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-app"><I size={18} className="text-brand" /><span className="text-sm font-semibold">{r.label}</span><span className="ml-auto text-xs text-muted">{r.section}</span></Link></li>
              ); })}
            </ul>
          )}
        </section>

        {/* quick access */}
        <section className="card p-6">
          <h2 className="text-lg font-bold">Quick access</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {quick.map((qk) => { const I = qk.icon; return (
              <Link key={qk.id} to={qk.path} className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm font-medium transition hover:border-brand hover:bg-brand/5"><I size={15} className="text-brand" />{qk.label}</Link>
            ); })}
          </div>
          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {(['director', 'hr', 'head', 'role'] as const).map((k) => <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: kindMeta[k].color }} />{kindMeta[k].label}</span>)}
          </p>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <Gate ms={450} skeleton={<CardsSkeleton />}><Dashboard /></Gate>;
}
