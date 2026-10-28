import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, ChevronLeft, ChevronRight, Download, Pencil, Search, Eye } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import Modal from '@/components/ui/Modal';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import Avatar from '@/components/work/Avatar';
import PunchCard from '@/components/work/PunchCard';
import { Empty, ErrorBox, Loading, Pill, Tabs, fmtDay, fmtTime, monthLabel, monthOf, shiftMonth } from '@/components/work/ui';
import { CorrectModal, MyMonth } from '@/pages/AttendancePage';
import { errMsg } from '@/services/emsService';
import { attendanceReport, attendanceTeam, reportCsvUrl } from '@/services/workService';
import type { AttReportRow, TeamDay, TeamRow } from '@/types/work';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const shiftDay = (d: string, n: number) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); };
const hoursOf = (r: TeamRow) => (r.check_in && r.check_out ? Math.round(((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 3600000) * 10) / 10 : null);
type Bucket = 'all' | 'present' | 'late' | 'short' | 'absent' | 'leave';
const bucketOf = (s: string): Bucket | 'off' => (s === 'present' || s === 'working' ? 'present' : s === 'late' ? 'late' : s === 'half_day' || s === 'short' || s === 'missed_checkout' ? 'short' : s === 'absent' ? 'absent' : s === 'leave' ? 'leave' : 'off');
const csvCell = (v: unknown) => { let t = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

const TILES: { id: Bucket; label: string; color: string }[] = [
  { id: 'all', label: 'Everyone', color: '#1FA2E8' }, { id: 'present', label: 'Present', color: '#34C77B' }, { id: 'late', label: 'Late', color: '#E9B44C' },
  { id: 'short', label: 'Half / short', color: '#8BD5B0' }, { id: 'absent', label: 'Absent', color: '#EF4444' }, { id: 'leave', label: 'On leave', color: '#8B5CF6' },
];

function DateBar({ children, label, onPrev, onNext, nextDisabled }: { children?: React.ReactNode; label: React.ReactNode; onPrev: () => void; onNext: () => void; nextDisabled: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-2xl border border-line bg-surface p-1 shadow-soft">
        <button className="icon-btn !h-9 !w-9" aria-label="Previous" onClick={onPrev}><ChevronLeft size={18} /></button>
        <div className="min-w-44 px-2 text-center text-sm font-extrabold">{label}</div>
        <button className="icon-btn !h-9 !w-9" aria-label="Next" disabled={nextDisabled} onClick={onNext}><ChevronRight size={18} /></button>
      </div>
      {children}
    </div>
  );
}

function Daily({ onToast }: { onToast: (t: 'success' | 'error', m: string) => void }) {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<TeamDay | null>(null);
  const [err, setErr] = useState('');
  const [bucket, setBucket] = useState<Bucket>('all');
  const [dept, setDept] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<TeamRow | null>(null);
  const [view, setView] = useState<TeamRow | null>(null);
  const load = useCallback((quiet = false) => { if (!quiet) setData(null); attendanceTeam(date).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(errMsg(e))); }, [date]);
  useEffect(() => { load(); if (date !== todayStr()) return; const t = window.setInterval(() => load(true), 60000); return () => window.clearInterval(t); }, [load, date]);

  const rows = data?.rows ?? [];
  const counts = useMemo(() => { const c: Record<string, number> = { all: rows.length, present: 0, late: 0, short: 0, absent: 0, leave: 0 }; for (const r of rows) { const b = bucketOf(r.status); if (b in c) c[b]++; } return c; }, [rows]);
  const depts = useMemo(() => [...new Set(rows.map((r) => r.department).filter(Boolean) as string[])].sort(), [rows]);
  const shown = useMemo(() => rows.filter((r) => (bucket === 'all' || bucketOf(r.status) === bucket) && (!dept || r.department === dept) && (!q.trim() || `${r.name} ${r.employee_code ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))), [rows, bucket, dept, q]);
  const attended = counts.present + counts.late + counts.short;
  const expected = attended + counts.absent;
  const isToday = date === todayStr();

  const exportCsv = () => {
    const head = ['Employee ID', 'Name', 'Department', 'Check-in', 'Check-out', 'Hours', 'Status'];
    const body = shown.map((r) => [r.employee_code, r.name, r.department, r.check_in ? fmtTime(r.check_in) : '', r.check_out ? fmtTime(r.check_out) : '', hoursOf(r) ?? '', r.status]);
    const blob = new Blob([[head, ...body].map((l) => l.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `attendance-${date}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <DateBar label={<>{fmtDay(date)}{isToday && <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand-600">TODAY</span>}</>} onPrev={() => setDate(shiftDay(date, -1))} onNext={() => setDate(shiftDay(date, 1))} nextDisabled={isToday}>
          <input type="date" className="input !w-auto" aria-label="Pick a date" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          {!isToday && <button className="btn-ghost" onClick={() => setDate(todayStr())}>Today</button>}
        </DateBar>
        <button className="btn-ghost" onClick={exportCsv} disabled={!shown.length}><Download size={16} />Export list</button>
      </div>

      {err ? <ErrorBox message={err} onRetry={() => load()} /> : !data ? <Loading rows={4} /> : (
        <>
          {data.day_off && <div className="mb-4 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-amber-700">This is a day off{data.holiday ? ` — ${data.holiday}` : ''}. Attendance is optional.</div>}
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {TILES.map((t, i) => (
              <motion.button key={t.id} type="button" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} onClick={() => setBucket(t.id)} aria-pressed={bucket === t.id}
                className={`relative overflow-hidden rounded-2xl border bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 ${bucket === t.id ? 'border-brand ring-2 ring-brand/30' : 'border-line'}`}>
                <span className="absolute inset-y-0 left-0 w-1" style={{ background: t.color }} />
                <p className="text-2xl font-extrabold">{counts[t.id]}</p><p className="text-xs font-semibold text-muted">{t.label}</p>
              </motion.button>
            ))}
          </div>

          <div className="card mb-5 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted"><span>{isToday ? 'Attendance so far' : 'Attendance'}</span><span>{expected ? `${Math.round((attended / expected) * 100)}% of expected staff` : 'No working staff'}</span></div>
            <div className="flex h-3 overflow-hidden rounded-full bg-app" role="img" aria-label="Attendance split">
              {[[counts.present, '#34C77B'], [counts.late, '#E9B44C'], [counts.short, '#8BD5B0'], [counts.leave, '#8B5CF6'], [counts.absent, '#EF4444']].map(([n, c], i) => <motion.div key={i} initial={{ width: 0 }} animate={{ width: `${(Number(n) / Math.max(1, rows.length)) * 100}%` }} transition={{ duration: 0.6 }} style={{ background: c as string }} />)}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-56 flex-1"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input className="input !pl-10" placeholder="Search name or employee ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search employees" /></label>
            <select className="input !w-auto" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department"><option value="">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}</select>
          </div>

          {rows.length === 0 ? <Empty title="No employees yet" hint="Add employees to start tracking attendance." /> : shown.length === 0 ? <Empty title="No one matches" hint="Try a different filter or search." action={<button className="btn-ghost" onClick={() => { setBucket('all'); setDept(''); setQ(''); }}>Clear filters</button>} /> : (
            <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-app text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Check-in</th><th className="px-4 py-3">Check-out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-line">
                {shown.map((r) => (
                  <tr key={r.employee_id} className="transition hover:bg-app/60">
                    <td className="px-4 py-2.5"><div className="flex items-center gap-3"><Avatar name={r.name} /><div className="min-w-0"><p className="truncate font-bold">{r.name}</p><p className="text-xs text-muted">{r.employee_code ?? 'No ID'}</p></div></div></td>
                    <td className="px-4 py-2.5 text-muted">{r.department ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold">{fmtTime(r.check_in)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold">{r.check_out ? fmtTime(r.check_out) : r.check_in && isToday ? <span className="text-brand-600">Working…</span> : '—'}</td>
                    <td className="px-4 py-2.5">{hoursOf(r) ?? '—'}</td>
                    <td className="px-4 py-2.5"><Pill value={r.status} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right"><button className="icon-btn" title="View month" aria-label={`View month for ${r.name}`} onClick={() => setView(r)}><Eye size={16} /></button><button className="icon-btn" title="Correct" aria-label={`Correct attendance for ${r.name}`} onClick={() => setEdit(r)}><Pencil size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table></div><p className="border-t border-line px-4 py-2.5 text-xs text-muted">Showing {shown.length} of {rows.length}</p></div>
          )}
        </>
      )}
      {edit && <CorrectModal row={edit} date={date} onClose={() => setEdit(null)} onDone={() => { setEdit(null); onToast('success', 'Attendance corrected.'); load(true); }} onError={(m) => onToast('error', m)} />}
      {view && <Modal open onClose={() => setView(null)} title={view.name} size="xl" description={`${view.department ?? 'No department'} · ${view.employee_code ?? ''}`}><MyMonth employeeId={view.employee_id} initialMonth={date.slice(0, 7)} refreshKey={0} onToast={onToast} /></Modal>}
    </>
  );
}

function Monthly({ onToast }: { onToast: (t: 'success' | 'error', m: string) => void }) {
  const [month, setMonth] = useState(monthOf());
  const [rows, setRows] = useState<AttReportRow[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [view, setView] = useState<AttReportRow | null>(null);
  const load = useCallback(() => { setRows(null); attendanceReport(month).then((d) => { setRows(d.rows); setErr(''); }).catch((e) => setErr(errMsg(e))); }, [month]);
  useEffect(load, [load]);
  const pct = (r: AttReportRow) => { const att = r.present + r.late + r.half_day + r.short + r.missed_checkout; const tot = att + r.absent; return tot ? Math.round((att / tot) * 100) : null; };
  const depts = useMemo(() => [...new Set((rows ?? []).map((r) => r.department).filter(Boolean) as string[])].sort(), [rows]);
  const shown = (rows ?? []).filter((r) => (!dept || r.department === dept) && (!q.trim() || `${r.name} ${r.employee_code ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())));
  const tot = shown.reduce((a, r) => ({ present: a.present + r.present, late: a.late + r.late, absent: a.absent + r.absent, leave: a.leave + r.leave }), { present: 0, late: 0, absent: 0, leave: 0 });
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <DateBar label={monthLabel(month)} onPrev={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} nextDisabled={month >= monthOf()} />
        <a className="btn-ghost" href={reportCsvUrl('attendance', { month })}><Download size={16} />Download CSV</a>
      </div>
      {err ? <ErrorBox message={err} onRetry={load} /> : !rows ? <Loading rows={4} /> : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">{[['Days present', tot.present, '#34C77B'], ['Late days', tot.late, '#E9B44C'], ['Leave days', tot.leave, '#8B5CF6'], ['Absent days', tot.absent, '#EF4444']].map(([l, v, c]) => <div key={l as string} className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-soft"><span className="absolute inset-y-0 left-0 w-1" style={{ background: c as string }} /><p className="text-2xl font-extrabold">{v}</p><p className="text-xs font-semibold text-muted">{l}</p></div>)}</div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-56 flex-1"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input className="input !pl-10" placeholder="Search name or employee ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search employees" /></label>
            <select className="input !w-auto" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department"><option value="">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}</select>
          </div>
          {shown.length === 0 ? <Empty title="No one to show" hint="Try a different month or filter." /> : (
            <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-app text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Present</th><th className="px-4 py-3">Late</th><th className="px-4 py-3">Half/short</th><th className="px-4 py-3">Leave</th><th className="px-4 py-3">Absent</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Attendance</th><th className="px-4 py-3"><span className="sr-only">Open</span></th></tr></thead>
              <tbody className="divide-y divide-line">
                {shown.map((r) => { const p = pct(r); return (
                  <tr key={r.employee_id} className="cursor-pointer transition hover:bg-app/60" onClick={() => setView(r)}>
                    <td className="px-4 py-2.5"><div className="flex items-center gap-3"><Avatar name={r.name} /><div className="min-w-0"><p className="truncate font-bold">{r.name}</p><p className="text-xs text-muted">{r.department ?? 'No department'}</p></div></div></td>
                    <td className="px-4 py-2.5 font-semibold text-leaf-600">{r.present}</td><td className="px-4 py-2.5 font-semibold text-amber-600">{r.late}</td><td className="px-4 py-2.5">{r.half_day + r.short + r.missed_checkout}</td><td className="px-4 py-2.5 text-violet-600">{r.leave}</td><td className="px-4 py-2.5 font-semibold text-red-600">{r.absent}</td><td className="px-4 py-2.5">{r.hours}</td>
                    <td className="min-w-36 px-4 py-2.5">{p === null ? <span className="text-muted">—</span> : <div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-app"><div className="h-full rounded-full" style={{ width: `${p}%`, background: p >= 90 ? '#34C77B' : p >= 75 ? '#E9B44C' : '#EF4444' }} /></div><span className="w-9 text-right text-xs font-extrabold">{p}%</span></div>}</td>
                    <td className="px-4 py-2.5 text-right"><button className="icon-btn" aria-label={`Open ${r.name}`}><CalendarCheck size={16} /></button></td>
                  </tr>); })}
              </tbody>
            </table></div></div>
          )}
        </>
      )}
      {view && <Modal open onClose={() => setView(null)} title={view.name} size="xl" description={`${view.department ?? 'No department'} · ${view.employee_code ?? ''}`}><MyMonth employeeId={view.employee_id} initialMonth={month} refreshKey={0} onToast={onToast} /></Modal>}
    </>
  );
}

export default function AdminAttendancePage() {
  const toast = useToasts();
  const [tab, setTab] = useState<'daily' | 'monthly' | 'mine'>('daily');
  const t = (k: 'success' | 'error', m: string) => (k === 'success' ? toast.success(m) : toast.error(m));
  return (
    <div className="admin-page min-h-full bg-app">
      <AdminHeader active="attendance" subtitle="Attendance" />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Attendance</h1>
        <p className="mb-5 mt-1 text-sm text-muted">See who is in, late or absent, employee by employee. Times come from the server clock.</p>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'daily', label: 'Daily view' }, { id: 'monthly', label: 'Monthly summary' }, { id: 'mine', label: 'My check-in' }]} />
        {tab === 'daily' && <Daily onToast={t} />}
        {tab === 'monthly' && <Monthly onToast={t} />}
        {tab === 'mine' && <div className="grid gap-6 lg:grid-cols-[22rem_1fr]"><PunchCard onToast={t} /><MyMonth refreshKey={0} onToast={t} /></div>}
      </main>
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
