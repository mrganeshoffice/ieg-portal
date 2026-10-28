import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Empty, ErrorBox, Loading, Spin, fmtDate } from '@/components/work/ui';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { errMsg } from '@/services/emsService';
import { addHoliday, addLeaveType, deleteHoliday, getSettings, leaveTypes, listHolidays, saveSettings, updateLeaveType } from '@/services/workService';
import type { Holiday, LeaveType, WorkSettings } from '@/types/work';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Rules({ s, onSaved, onToast }: { s: WorkSettings; onSaved: (s: WorkSettings) => void; onToast: (t: 'success' | 'error', m: string) => void }) {
  const [f, setF] = useState({ work_start: s.work_start, grace_minutes: s.grace_minutes, full_day_hours: s.full_day_hours, half_day_hours: s.half_day_hours, timezone: s.timezone });
  const [off, setOff] = useState(new Set(s.weekly_off.split(',').filter(Boolean).map(Number)));
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { onSaved(await saveSettings({ ...f, weekly_off: [...off].sort().join(',') })); onToast('success', 'Rules saved.'); } catch (e) { onToast('error', errMsg(e)); } finally { setBusy(false); } };
  const num = (k: 'grace_minutes' | 'full_day_hours' | 'half_day_hours', l: string) => <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">{l}</span><input type="number" min={0} className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>;
  return (
    <section className="card p-5" aria-labelledby="rules-h">
      <h2 id="rules-h" className="text-base font-extrabold">Attendance rules</h2>
      <p className="mb-4 text-sm text-muted">These decide who is marked late, half day or absent. They start with common defaults, so please confirm them with HR.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Work starts at</span><input type="time" className="input" value={f.work_start} onChange={(e) => setF({ ...f, work_start: e.target.value })} /></label>
        {num('grace_minutes', 'Grace period (minutes)')}{num('full_day_hours', 'Full day needs (hours)')}{num('half_day_hours', 'Half day needs (hours)')}
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Time zone</span><input className="input" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></label>
      </div>
      <fieldset className="mt-4"><legend className="mb-1.5 text-xs font-semibold text-muted">Weekly off</legend><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <label key={d} className={`cursor-pointer rounded-xl border px-3 py-1.5 text-sm font-semibold ${off.has(i) ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'}`}><input type="checkbox" className="sr-only" checked={off.has(i)} onChange={() => { const n = new Set(off); n.has(i) ? n.delete(i) : n.add(i); setOff(n); }} />{d}</label>)}</div></fieldset>
      <div className="mt-5 flex justify-end"><button className="btn-primary" disabled={busy} onClick={() => void save()}>{busy && <Spin />}Save rules</button></div>
    </section>
  );
}

function Holidays({ onToast }: { onToast: (t: 'success' | 'error', m: string) => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<Holiday[] | null>(null);
  const [date, setDate] = useState(''); const [name, setName] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => { listHolidays(year).then(setRows).catch(() => setRows([])); }, [year]);
  useEffect(load, [load]);
  const add = async () => { if (!date || !name.trim()) { onToast('error', 'Choose a date and a name.'); return; } setBusy(true); try { await addHoliday(date, name.trim()); setName(''); setDate(''); load(); onToast('success', 'Holiday added.'); } catch (e) { onToast('error', errMsg(e)); } finally { setBusy(false); } };
  return (
    <section className="card p-5" aria-labelledby="hol-h">
      <div className="flex items-center justify-between"><h2 id="hol-h" className="text-base font-extrabold">Holidays</h2><select className="input !w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">{[year - 1, year, year + 1].filter((v, i, a) => a.indexOf(v) === i).map((y) => <option key={y}>{y}</option>)}</select></div>
      <form className="my-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}><input type="date" className="input !w-auto" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Holiday date" /><input className="input min-w-48 flex-1" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Holiday name" aria-label="Holiday name" /><button className="btn-primary" disabled={busy}>{busy ? <Spin /> : <Plus size={16} />}Add</button></form>
      {!rows ? <Loading rows={1} /> : rows.length === 0 ? <Empty title={`No holidays for ${year}`} /> : <ul className="divide-y divide-line rounded-2xl border border-line">{rows.map((h) => <li key={h.id} className="flex items-center gap-3 px-4 py-2.5 text-sm"><span className="flex-1 font-semibold">{h.name}</span><span className="text-muted">{fmtDate(h.date)}</span><button className="icon-btn text-red-500" aria-label={`Delete ${h.name}`} onClick={() => { if (window.confirm(`Delete "${h.name}"?`)) void deleteHoliday(h.id).then(load).catch((e) => onToast('error', errMsg(e))); }}><Trash2 size={16} /></button></li>)}</ul>}
    </section>
  );
}

function Types({ onToast }: { onToast: (t: 'success' | 'error', m: string) => void }) {
  const [rows, setRows] = useState<LeaveType[] | null>(null);
  const [name, setName] = useState(''); const [quota, setQuota] = useState('12'); const [busy, setBusy] = useState(false);
  const load = useCallback(() => { leaveTypes().then(setRows).catch(() => setRows([])); }, []);
  useEffect(load, [load]);
  const add = async () => { if (!name.trim()) { onToast('error', 'Enter a leave type name.'); return; } setBusy(true); try { await addLeaveType(name.trim(), Number(quota)); setName(''); load(); onToast('success', 'Leave type added.'); } catch (e) { onToast('error', errMsg(e)); } finally { setBusy(false); } };
  const patch = (id: number, b: Record<string, unknown>) => void updateLeaveType(id, b).then(load).catch((e) => onToast('error', errMsg(e)));
  return (
    <section className="card p-5" aria-labelledby="lt-h">
      <h2 id="lt-h" className="text-base font-extrabold">Leave types</h2>
      <p className="mb-4 text-sm text-muted">Create the kinds of leave your company gives, with yearly days for each. Use 0 days for leave without a limit.</p>
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}><input className="input min-w-48 flex-1" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Casual leave" aria-label="Leave type name" /><input type="number" min={0} max={366} className="input !w-28" value={quota} onChange={(e) => setQuota(e.target.value)} aria-label="Days per year" /><button className="btn-primary" disabled={busy}>{busy ? <Spin /> : <Plus size={16} />}Add</button></form>
      {!rows ? <Loading rows={1} /> : rows.length === 0 ? <Empty title="No leave types yet" hint="Employees cannot apply for leave until you add at least one." /> : (
        <ul className="divide-y divide-line rounded-2xl border border-line">{rows.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm"><span className={`flex-1 font-semibold ${t.is_active ? '' : 'text-muted line-through'}`}>{t.name}</span>
            <label className="flex items-center gap-1.5 text-muted">Days/year <input type="number" min={0} max={366} className="input !w-20 !py-1" defaultValue={t.annual_quota} onBlur={(e) => { if (Number(e.target.value) !== t.annual_quota) patch(t.id, { annual_quota: Number(e.target.value) }); }} /></label>
            <button className="text-xs font-semibold text-muted hover:text-ink" onClick={() => patch(t.id, { is_active: !t.is_active })}>{t.is_active ? 'Hide' : 'Show'}</button></li>
        ))}</ul>
      )}
    </section>
  );
}

export default function PolicyPage() {
  const toast = useToasts();
  const [s, setS] = useState<WorkSettings | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { getSettings().then((x) => { setS(x); setErr(''); }).catch((e) => setErr(errMsg(e))); }, []);
  useEffect(load, [load]);
  const t = (k: 'success' | 'error', m: string) => (k === 'success' ? toast.success(m) : toast.error(m));
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Policy and Holidays" description="Attendance rules, the holiday list and leave types. Changes apply straight away." />
      {err ? <ErrorBox message={err} onRetry={load} /> : !s ? <Loading /> : <Rules s={s} onSaved={setS} onToast={t} />}
      <Holidays onToast={t} />
      <Types onToast={t} />
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
