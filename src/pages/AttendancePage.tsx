import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import PunchCard from '@/components/work/PunchCard';
import { Empty, ErrorBox, Loading, Pill, Spin, Tabs, fmtDay, fmtTime, monthLabel, monthOf, shiftMonth } from '@/components/work/ui';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/services/emsService';
import { attendanceMonth, attendanceTeam, correctAttendance } from '@/services/workService';
import type { AttMonth, AttStatus, TeamDay, TeamRow } from '@/types/work';

const toLocalInput = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

export function MyMonth({ onToast, refreshKey, employeeId, initialMonth }: { onToast: (t: 'success' | 'error', m: string) => void; refreshKey: number; employeeId?: number; initialMonth?: string }) {
  const [month, setMonth] = useState(initialMonth ?? monthOf());
  const [data, setData] = useState<AttMonth | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { setData(null); attendanceMonth(month, employeeId).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(errMsg(e))); }, [month, employeeId]);
  useEffect(load, [load, refreshKey]);
  void onToast;

  const days = useMemo(() => {
    if (!data) return [];
    const [y, m] = month.split('-').map(Number); const n = new Date(y, m, 0).getDate(); const today = new Date().toLocaleDateString('en-CA');
    const rec = new Map(data.records.map((r) => [r.work_date, r])); const hol = new Map(data.holidays.map((h) => [h.date, h.name]));
    return Array.from({ length: n }, (_, i) => {
      const d = `${month}-${String(i + 1).padStart(2, '0')}`; const wd = new Date(`${d}T00:00:00`).getDay(); const r = rec.get(d);
      const status: AttStatus = r ? r.status : data.start_date && d < data.start_date ? 'off' : data.weekly_off.includes(wd) || hol.has(d) ? 'off' : d > today ? 'upcoming' : 'absent';
      return { d, r, status, holiday: hol.get(d) };
    });
  }, [data, month]);
  const count = (s: AttStatus[]) => days.filter((x) => s.includes(x.status)).length;

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button>
        <p className="min-w-40 text-center font-bold">{monthLabel(month)}</p>
        <button className="icon-btn" aria-label="Next month" disabled={month >= monthOf()} onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button>
      </div>
      {err ? <ErrorBox message={err} onRetry={load} /> : !data ? <Loading /> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Present', count(['present', 'working'])], ['Late', count(['late'])], ['Half / short', count(['half_day', 'short'])], ['Absent', count(['absent', 'missed_checkout'])]].map(([l, v]) => <div key={l as string} className="card p-4"><p className="text-2xl font-extrabold">{v}</p><p className="text-xs font-semibold text-muted">{l}</p></div>)}
          </div>
          <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-app text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {days.map(({ d, r, status, holiday }) => (
                <tr key={d} className={status === 'off' || status === 'upcoming' ? 'text-muted' : ''}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold">{fmtDay(d)}{holiday && <span className="ml-2 text-xs font-normal">{holiday}</span>}</td>
                  <td className="px-4 py-2.5">{fmtTime(r?.check_in ?? null)}</td><td className="px-4 py-2.5">{fmtTime(r?.check_out ?? null)}</td><td className="px-4 py-2.5">{r?.hours ?? '—'}</td>
                  <td className="px-4 py-2.5"><Pill value={status} />{r?.source === 'admin' && <span className="ml-2 text-[11px] text-muted" title={r.note ?? ''}>corrected by HR</span>}</td>
                </tr>
              ))}
            </tbody>
          </table></div></div>
        </>
      )}
    </>
  );
}

function Team({ canCorrect, onToast }: { canCorrect: boolean; onToast: (t: 'success' | 'error', m: string) => void }) {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [data, setData] = useState<TeamDay | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<TeamRow | null>(null);
  const load = useCallback(() => { setData(null); attendanceTeam(date).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(errMsg(e))); }, [date]);
  useEffect(load, [load]);
  return (
    <>
      <label className="mb-4 flex items-center gap-3 text-sm font-semibold"><span>Date</span><input type="date" className="input !w-auto" value={date} max={new Date().toLocaleDateString('en-CA')} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
      {err ? <ErrorBox message={err} onRetry={load} /> : !data ? <Loading /> : data.rows.length === 0 ? <Empty title="No one to show" hint="People who report to you appear here." /> : (
        <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-app text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Status</th>{canCorrect && <th className="px-4 py-3"><span className="sr-only">Actions</span></th>}</tr></thead>
          <tbody className="divide-y divide-line">
            {data.rows.map((r) => (
              <tr key={r.employee_id}><td className="px-4 py-2.5"><p className="font-semibold">{r.name}</p><p className="text-xs text-muted">{r.employee_code}</p></td><td className="px-4 py-2.5 text-muted">{r.department ?? '—'}</td><td className="px-4 py-2.5">{fmtTime(r.check_in)}</td><td className="px-4 py-2.5">{fmtTime(r.check_out)}</td><td className="px-4 py-2.5"><Pill value={r.status} /></td>
                {canCorrect && <td className="px-4 py-2.5 text-right"><button className="icon-btn" aria-label={`Correct attendance for ${r.name}`} onClick={() => setEdit(r)}><Pencil size={16} /></button></td>}</tr>
            ))}
          </tbody>
        </table></div></div>
      )}
      {edit && <CorrectModal row={edit} date={date} onClose={() => setEdit(null)} onDone={() => { setEdit(null); onToast('success', 'Attendance corrected.'); load(); }} onError={(m) => onToast('error', m)} />}
    </>
  );
}

export function CorrectModal({ row, date, onClose, onDone, onError }: { row: TeamRow; date: string; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const [ci, setCi] = useState(toLocalInput(row.check_in) || `${date}T09:30`);
  const [co, setCo] = useState(toLocalInput(row.check_out));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!note.trim()) { onError('Add a short reason. It is kept in the audit log.'); return; }
    setBusy(true);
    try { await correctAttendance(row.employee_id, date, { check_in: new Date(ci).toISOString(), check_out: co ? new Date(co).toISOString() : null, note: note.trim() }); onDone(); }
    catch (e) { onError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Correct attendance" size="sm" description={`${row.name} · ${date}. The employee is notified and the change is logged.`}>
      <div className="space-y-4 p-5 sm:p-7">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Check-in</span><input type="datetime-local" className="input" value={ci} onChange={(e) => setCi(e.target.value)} data-autofocus /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Check-out (optional)</span><input type="datetime-local" className="input" value={co} onChange={(e) => setCo(e.target.value)} /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Reason</span><input className="input" value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Forgot to punch out" /></label>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy} onClick={() => void save()}>{busy && <Spin />}Save</button></div>
      </div>
    </Modal>
  );
}

export default function AttendancePage() {
  const { session } = useAuth();
  const toast = useToasts();
  const [tab, setTab] = useState<'mine' | 'team'>('mine');
  const [key, setKey] = useState(0);
  const t = (k: 'success' | 'error', m: string) => (k === 'success' ? toast.success(m) : toast.error(m));
  const isLead = session?.role !== 'employee';
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Attendance" description="Check in when you start and check out when you finish." />
      <div className="mb-6 max-w-md"><PunchCard onChange={() => setKey((k) => k + 1)} onToast={t} /></div>
      {isLead && <Tabs value={tab} onChange={setTab} tabs={[{ id: 'mine', label: 'My attendance' }, { id: 'team', label: session?.role === 'manager' ? 'My team' : 'Everyone' }]} />}
      {tab === 'mine' ? <MyMonth onToast={t} refreshKey={key} /> : <Team canCorrect={session?.role === 'admin' || session?.role === 'super_admin'} onToast={t} />}
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
