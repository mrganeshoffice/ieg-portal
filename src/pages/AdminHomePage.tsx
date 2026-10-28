import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlarmClock, ArrowRight, BriefcaseBusiness, CalendarClock, CalendarDays, CheckCircle2, Clock, ClipboardList, FileBarChart, Plane, UserCheck, UserPlus, UserX, Users } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import Avatar from '@/components/work/Avatar';
import { ErrorBox, fmtDate, fmtDay } from '@/components/work/ui';
import { errMsg } from '@/services/emsService';
import { adminOverview } from '@/services/workService';
import type { AdminOverview } from '@/types/work';

const C = { present: '#34C77B', late: '#E9B44C', half: '#8BD5B0', absent: '#EF4444', leave: '#8B5CF6', brand: '#1FA2E8', muted: '#94A3B8' };

function Stat({ icon: Icon, label, value, hint, color, to, delay }: { icon: typeof Users; label: string; value: number | string; hint?: string; color: string; to?: string; delay: number }) {
  const body = (
    <div className="group relative h-full overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.12] transition group-hover:scale-125" style={{ background: color }} />
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ background: color }}><Icon size={19} /></span>
      <p className="text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="text-sm font-semibold text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}>{to ? <Link to={to} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-3xl">{body}</Link> : body}</motion.div>;
}

function Card({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-surface p-5 shadow-soft ${className}`}><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-extrabold">{title}</h2>{action}</div>{children}</section>;
}

function Donut({ parts, centre, sub }: { parts: { label: string; value: number; color: string }[]; centre: string; sub: string }) {
  const total = parts.reduce((a, b) => a + b.value, 0) || 1; const R = 52, L = 2 * Math.PI * R; let off = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" className="text-line" strokeWidth="16" />
        {parts.filter((p) => p.value > 0).map((p) => { const len = (p.value / total) * L; const el = <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${Math.max(len - 2, 0)} ${L}`} strokeDashoffset={-off} strokeLinecap="round" />; off += len; return el; })}
        <g className="rotate-90" style={{ transformOrigin: '70px 70px' }}><text x="70" y="70" textAnchor="middle" fontSize="26" fontWeight="800" fill="currentColor">{centre}</text><text x="70" y="88" textAnchor="middle" fontSize="9.5" fill="rgb(100 116 139)">{sub}</text></g>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">{parts.map((p) => <li key={p.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} /><span className="flex-1 text-muted">{p.label}</span><span className="font-extrabold">{p.value}</span></li>)}</ul>
    </div>
  );
}

function Trend({ data }: { data: AdminOverview['trend'] }) {
  const max = Math.max(1, ...data.map((d) => d.present + d.late + d.absent + d.leave)); const H = 150, W = 360, bw = 28, gap = (W - bw * data.length) / (data.length + 1);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 26}`} className="w-full" role="img" aria-label="Attendance over the last 7 days">
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1="0" x2={W} y1={H - H * g} y2={H - H * g} stroke="currentColor" className="text-line" strokeDasharray="3 4" />)}
        {data.map((d, i) => {
          const x = gap + i * (bw + gap); let y = H; const seg = (v: number, color: string, k: string) => { const h = (v / max) * H; y -= h; return h > 0 ? <rect key={k} x={x} y={y} width={bw} height={h} fill={color} rx="3" /> : null; };
          return <g key={d.date}>{d.day_off ? <rect x={x} y={H - 6} width={bw} height="6" rx="3" fill={C.muted} opacity="0.35" /> : <>{seg(d.present, C.present, 'p')}{seg(d.late, C.late, 'l')}{seg(d.leave, C.leave, 'v')}{seg(d.absent, C.absent, 'a')}</>}
            <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize="10" fill="rgb(100 116 139)">{new Date(`${d.date}T00:00:00`).toLocaleDateString([], { weekday: 'short' })}</text></g>;
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">{[['On time', C.present], ['Late', C.late], ['Leave', C.leave], ['Absent', C.absent]].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{l}</span>)}<span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400/50" />Day off</span></div>
    </div>
  );
}

function PeopleList({ title, icon: Icon, tone, items, empty }: { title: string; icon: typeof Users; tone: string; items: { id: number; name: string; department: string | null }[]; empty: string }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted"><Icon size={14} className={tone} />{title}</p>
      {items.length === 0 ? <p className="rounded-xl bg-app px-3 py-2.5 text-sm text-muted">{empty}</p> : <ul className="space-y-1.5">{items.map((p) => <li key={p.id} className="flex items-center gap-3 rounded-xl bg-app px-3 py-2"><Avatar name={p.name} size={30} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{p.name}</p><p className="truncate text-xs text-muted">{p.department ?? 'No department'}</p></div></li>)}</ul>}
    </div>
  );
}

export default function AdminHomePage() {
  const [d, setD] = useState<AdminOverview | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { adminOverview().then((x) => { setD(x); setErr(''); }).catch((e) => setErr(errMsg(e))); }, []);
  useEffect(() => { load(); const t = window.setInterval(load, 60000); return () => window.clearInterval(t); }, [load]);
  const hour = new Date().getHours(); const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const present = d ? d.counts.present + d.counts.working + d.counts.late + d.counts.half_day + d.counts.short + d.counts.missed_checkout : 0;
  const working = d ? d.counts.present + d.counts.working + d.counts.late + d.counts.half_day + d.counts.short + d.counts.missed_checkout + d.counts.absent + d.counts.leave : 0;
  const rate = d && working ? Math.round((present / working) * 100) : 0;
  const taskTotal = d ? d.tasks.todo + d.tasks.in_progress + d.tasks.blocked + d.tasks.done : 0;
  const maxDept = d ? Math.max(1, ...d.departments.map((x) => x.count)) : 1;

  return (
    <div className="admin-page min-h-full bg-app">
      <AdminHeader active="home" subtitle="Dashboard" />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mb-6 overflow-hidden rounded-3xl bg-navy-900 p-6 text-white shadow-soft md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand/30 blur-3xl" /><div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-leaf/25 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-brand-400">{new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">{hello}, welcome back</h1>
              <p className="mt-1.5 max-w-xl text-sm text-slate-300">{!d ? 'Loading today’s picture…' : d.day_off ? `Today is a day off${d.holiday ? ` (${d.holiday})` : ''}.` : `${present} of ${working} people are in today. ${d.pending_leave ? `${d.pending_leave} leave request${d.pending_leave > 1 ? 's' : ''} waiting for a decision.` : 'No leave requests are waiting.'}`}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/employees" className="btn-primary"><UserPlus size={16} />Add employee</Link>
              <Link to="/admin/attendance" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><Clock size={16} />Open attendance</Link>
            </div>
          </div>
        </motion.section>

        {err && <ErrorBox message={err} onRetry={load} />}
        {!d && !err && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-36" />)}</div>}
        {d && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat delay={0} icon={Users} label="Total employees" value={d.employees} hint="Active accounts" color={C.brand} to="/admin/employees" />
              <Stat delay={0.05} icon={UserCheck} label="Present today" value={d.day_off ? '—' : present} hint={d.day_off ? 'Day off' : `${rate}% attendance`} color={C.present} to="/admin/attendance" />
              <Stat delay={0.1} icon={AlarmClock} label="Late arrivals" value={d.day_off ? '—' : d.counts.late} hint="After the grace period" color={C.late} to="/admin/attendance" />
              <Stat delay={0.15} icon={UserX} label="Absent today" value={d.day_off ? '—' : d.counts.absent} hint="No check-in, no leave" color={C.absent} to="/admin/attendance" />
              <Stat delay={0.2} icon={Plane} label="On leave" value={d.counts.leave} hint="Approved leave today" color={C.leave} to="/admin/leave" />
              <Stat delay={0.25} icon={CalendarClock} label="Leave to approve" value={d.pending_leave} hint="Waiting for a decision" color="#F97316" to="/admin/leave" />
              <Stat delay={0.3} icon={ClipboardList} label="Open tasks" value={d.tasks.todo + d.tasks.in_progress + d.tasks.blocked} hint={`${d.tasks.overdue} overdue`} color="#0EA5E9" to="/admin/tasks" />
              <Stat delay={0.35} icon={CheckCircle2} label="Tasks completed" value={d.tasks.done} hint={taskTotal ? `${Math.round((d.tasks.done / taskTotal) * 100)}% of all tasks` : 'No tasks yet'} color="#22A862" to="/admin/tasks" />
            </div>

            <div className="mb-6 grid gap-5 lg:grid-cols-5">
              <Card title="Today at a glance" className="lg:col-span-2" action={<Link to="/admin/attendance" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">Details<ArrowRight size={13} /></Link>}>
                <Donut centre={d.day_off ? 'Off' : `${rate}%`} sub="attendance" parts={[{ label: 'On time', value: d.counts.present + d.counts.working, color: C.present }, { label: 'Late', value: d.counts.late, color: C.late }, { label: 'Half day / short', value: d.counts.half_day + d.counts.short + d.counts.missed_checkout, color: C.half }, { label: 'On leave', value: d.counts.leave, color: C.leave }, { label: 'Absent', value: d.counts.absent, color: C.absent }]} />
              </Card>
              <Card title="Last 7 days" className="lg:col-span-3"><Trend data={d.trend} /></Card>
            </div>

            <div className="mb-6 grid gap-5 lg:grid-cols-3">
              <Card title="Headcount by department" action={<span className="text-xs text-muted">{d.departments.length} groups</span>}>
                {d.departments.length === 0 ? <p className="text-sm text-muted">Add employees to see this.</p> : (
                  <ul className="space-y-3">{d.departments.slice(0, 8).map((x) => <li key={x.name}><div className="mb-1 flex justify-between text-sm"><span className="truncate font-semibold">{x.name}</span><span className="font-extrabold">{x.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-app"><motion.div initial={{ width: 0 }} animate={{ width: `${(x.count / maxDept) * 100}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-gradient-to-r from-brand to-leaf" /></div></li>)}</ul>
                )}
              </Card>
              <Card title="Task progress" action={<Link to="/admin/tasks" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">All tasks<ArrowRight size={13} /></Link>}>
                {taskTotal === 0 ? <p className="text-sm text-muted">No tasks have been assigned yet.</p> : (
                  <>
                    <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-app">{[['done', C.present], ['in_progress', C.brand], ['blocked', C.absent], ['todo', C.muted]].map(([k, c]) => <div key={k} style={{ width: `${(d.tasks[k as 'done'] / taskTotal) * 100}%`, background: c }} />)}</div>
                    <ul className="space-y-2 text-sm">{[['Done', d.tasks.done, C.present], ['In progress', d.tasks.in_progress, C.brand], ['To do', d.tasks.todo, C.muted], ['Blocked', d.tasks.blocked, C.absent]].map(([l, v, c]) => <li key={l as string} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c as string }} /><span className="flex-1 text-muted">{l}</span><span className="font-extrabold">{v}</span></li>)}</ul>
                    {d.tasks.overdue > 0 && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600">{d.tasks.overdue} task{d.tasks.overdue > 1 ? 's are' : ' is'} overdue</p>}
                  </>
                )}
              </Card>
              <Card title="Coming up">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted"><CalendarDays size={14} />Holidays</p>
                {d.upcoming_holidays.length === 0 ? <p className="mb-4 rounded-xl bg-app px-3 py-2.5 text-sm text-muted">None added yet. Add them in Leave & holidays.</p> : <ul className="mb-4 space-y-1.5">{d.upcoming_holidays.map((h) => <li key={h.date} className="flex items-center justify-between rounded-xl bg-app px-3 py-2 text-sm"><span className="font-semibold">{h.name}</span><span className="text-xs text-muted">{fmtDay(h.date)}</span></li>)}</ul>}
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted"><BriefcaseBusiness size={14} />Newest team members</p>
                {d.recent_joiners.length === 0 ? <p className="rounded-xl bg-app px-3 py-2.5 text-sm text-muted">No employees yet.</p> : <ul className="space-y-1.5">{d.recent_joiners.slice(0, 4).map((p) => <li key={p.id} className="flex items-center gap-3"><Avatar name={p.name} size={28} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span><span className="truncate text-xs text-muted">{p.department ?? ''}</span></li>)}</ul>}
              </Card>
            </div>

            <div className="mb-6 grid gap-5 lg:grid-cols-3">
              <Card title="Needs attention today" className="lg:col-span-2">
                {d.day_off ? <p className="text-sm text-muted">No one is expected today.</p> : (
                  <div className="grid gap-5 md:grid-cols-3">
                    <PeopleList title="Absent" icon={UserX} tone="text-red-500" items={d.people.absent} empty="Nobody is absent." />
                    <PeopleList title="Late" icon={AlarmClock} tone="text-gold" items={d.people.late} empty="Nobody is late." />
                    <PeopleList title="On leave" icon={Plane} tone="text-violet-500" items={d.people.leave} empty="Nobody is on leave." />
                  </div>
                )}
              </Card>
              <Card title="Quick actions">
                <div className="grid gap-2">
                  {[['/admin/employees', UserPlus, 'Add or edit employees'], ['/admin/leave', CalendarClock, 'Approve leave requests'], ['/admin/tasks', ClipboardList, 'Assign a task'], ['/admin/reports', FileBarChart, 'Download reports'], ['/admin/policy', Clock, 'Work hours and policy']].map(([to, Icon, label]) => {
                    const I = Icon as typeof Users; return <Link key={to as string} to={to as string} className="group flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm font-semibold transition hover:border-brand hover:bg-brand/5"><I size={17} className="text-brand" /><span className="flex-1">{label as string}</span><ArrowRight size={15} className="text-muted transition group-hover:translate-x-1 group-hover:text-brand" /></Link>;
                  })}
                </div>
              </Card>
            </div>
            <p className="text-center text-xs text-muted">Updated {fmtDate(d.today)} · refreshes every minute</p>
          </>
        )}
      </main>
    </div>
  );
}
