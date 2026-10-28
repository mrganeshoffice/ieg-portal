import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import { Empty, ErrorBox, Loading, Pill, Spin, Tabs, fmtDate } from '@/components/work/ui';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/services/emsService';
import { decideLeave, leaveBalance, leaveTypes, listHolidays, listLeave, requestLeave } from '@/services/workService';
import type { Holiday, LeaveBalance, LeaveRequest, LeaveType } from '@/types/work';

const range = (l: LeaveRequest) => (l.start_date === l.end_date ? fmtDate(l.start_date) : `${fmtDate(l.start_date)} to ${fmtDate(l.end_date)}`);

function ApplyModal({ types, onClose, onDone, onError }: { types: LeaveType[]; onClose: () => void; onDone: () => void; onError: (m: string) => void }) {
  const today = new Date().toLocaleDateString('en-CA');
  const [f, setF] = useState({ leave_type_id: String(types[0]?.id ?? ''), start_date: today, end_date: today, half_day: false, reason: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await requestLeave({ leave_type_id: Number(f.leave_type_id), start_date: f.start_date, end_date: f.half_day ? f.start_date : f.end_date, half_day: f.half_day, reason: f.reason.trim() || null }); onDone(); }
    catch (e) { onError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Apply for leave" size="sm" description="Your manager (or HR) is notified to approve it.">
      <div className="space-y-4 p-5 sm:p-7">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Leave type</span><select className="input" value={f.leave_type_id} onChange={(e) => setF({ ...f, leave_type_id: e.target.value })} data-autofocus>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.half_day} onChange={(e) => setF({ ...f, half_day: e.target.checked })} />Half day</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">{f.half_day ? 'Date' : 'From'}</span><input type="date" className="input" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value, end_date: e.target.value > f.end_date ? e.target.value : f.end_date })} /></label>
          {!f.half_day && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">To</span><input type="date" className="input" min={f.start_date} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></label>}
        </div>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Reason (optional)</span><textarea className="input min-h-20" maxLength={500} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></label>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !f.leave_type_id} onClick={() => void save()}>{busy && <Spin />}Submit request</button></div>
      </div>
    </Modal>
  );
}

function Requests({ scope, onToast, reloadKey, onDecided }: { scope: 'mine' | 'decide' | 'all'; onToast: (t: 'success' | 'error', m: string) => void; reloadKey: number; onDecided: () => void }) {
  const [rows, setRows] = useState<LeaveRequest[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const load = useCallback(() => { listLeave(scope).then((r) => { setRows(r); setErr(''); }).catch((e) => setErr(errMsg(e))); }, [scope]);
  useEffect(load, [load, reloadKey]);
  const act = async (l: LeaveRequest, a: 'approve' | 'reject' | 'cancel') => {
    let note: string | undefined;
    if (a === 'reject') { const n = window.prompt('Reason for rejecting (shown to the employee):'); if (n === null) return; note = n; }
    if (a === 'cancel' && !window.confirm('Cancel this leave request?')) return;
    setBusy(l.id);
    try { await decideLeave(l.id, a, note); onToast('success', a === 'approve' ? 'Leave approved.' : a === 'reject' ? 'Leave rejected.' : 'Request cancelled.'); load(); onDecided(); } catch (e) { onToast('error', errMsg(e)); } finally { setBusy(null); }
  };
  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!rows) return <Loading />;
  if (!rows.length) return <Empty title={scope === 'decide' ? 'Nothing waiting for you' : 'No leave requests'} hint={scope === 'mine' ? 'Use "Apply for leave" to make a request.' : undefined} />;
  return (
    <ul className="space-y-2.5">
      {rows.map((l) => (
        <li key={l.id} className="card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-bold">{scope !== 'mine' && <>{l.employee.name} · </>}{l.leave_type} <span className="font-normal text-muted">· {l.days} day{l.days === 1 ? '' : 's'}{l.half_day ? ' (half day)' : ''}</span></p>
            <p className="text-sm text-muted">{range(l)}</p>
            {l.reason && <p className="mt-1 text-sm">{l.reason}</p>}
            {l.status !== 'pending' && l.decided_by && <p className="mt-1 text-xs text-muted">{l.status === 'cancelled' ? 'Cancelled' : `${l.status === 'approved' ? 'Approved' : 'Rejected'} by ${l.decided_by}`}{l.decision_note ? ` · ${l.decision_note}` : ''}</p>}
          </div>
          <Pill value={l.status} />
          {l.status === 'pending' && scope === 'mine' && <button className="btn-ghost" disabled={busy === l.id} onClick={() => void act(l, 'cancel')}>Cancel</button>}
          {l.status === 'pending' && scope !== 'mine' && <div className="flex gap-2"><button className="btn-primary" disabled={busy === l.id} onClick={() => void act(l, 'approve')}>{busy === l.id && <Spin />}Approve</button><button className="btn-ghost" disabled={busy === l.id} onClick={() => void act(l, 'reject')}>Reject</button></div>}
        </li>
      ))}
    </ul>
  );
}

export default function LeavePage() {
  const { session } = useAuth();
  const toast = useToasts();
  const lead = session?.role !== 'employee'; const admin = session?.role === 'admin' || session?.role === 'super_admin';
  const [tab, setTab] = useState<'mine' | 'decide' | 'all' | 'holidays'>('mine');
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [bal, setBal] = useState<LeaveBalance[] | null>(null);
  const [hol, setHol] = useState<Holiday[] | null>(null);
  const [apply, setApply] = useState(false);
  const [key, setKey] = useState(0);
  const [pending, setPending] = useState(0);
  const t = (k: 'success' | 'error', m: string) => (k === 'success' ? toast.success(m) : toast.error(m));
  const year = new Date().getFullYear();
  const reload = useCallback(() => { setKey((k) => k + 1); leaveBalance().then((r) => setBal(r.balances)).catch(() => setBal([])); if (lead) listLeave('decide').then((r) => setPending(r.length)).catch(() => {}); }, [lead]);
  useEffect(() => { leaveTypes().then(setTypes).catch(() => {}); listHolidays(year).then(setHol).catch(() => setHol([])); reload(); }, [reload, year]);
  const active = types.filter((x) => x.is_active);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Leave" description="Apply for leave, see your balance and the company holidays." actions={<button className="btn-primary" disabled={!active.length} onClick={() => setApply(true)}><Plus size={16} />Apply for leave</button>} />
      {types.length === 0 && <div className="card mb-5 p-4 text-sm"><b>No leave types are set up yet.</b> {admin ? <>Add them under <Link className="font-semibold text-brand underline" to="/policy">Policy and Holidays</Link>.</> : 'HR will add them soon.'}</div>}
      {bal && bal.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bal.map((b) => <div key={b.leave_type_id} className="card p-4"><p className="text-sm font-bold">{b.name}</p><p className="mt-1 text-2xl font-extrabold">{b.remaining}<span className="text-sm font-semibold text-muted"> / {b.quota} days left</span></p><p className="text-xs text-muted">{b.used} used{b.pending ? ` · ${b.pending} pending` : ''} in {year}</p></div>)}
        </div>
      )}
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'mine', label: 'My requests' }, ...(lead ? [{ id: 'decide' as const, label: 'To decide', badge: pending }, ...(admin ? [{ id: 'all' as const, label: 'All requests' }] : [])] : []), { id: 'holidays', label: 'Holidays' }]} />
      {tab === 'holidays' ? (
        !hol ? <Loading rows={2} /> : hol.length === 0 ? <Empty title={`No holidays added for ${year}`} hint={admin ? 'Add them under Policy and Holidays.' : 'HR has not added the holiday list yet.'} /> : (
          <ul className="card divide-y divide-line overflow-hidden">{hol.map((h) => <li key={h.id} className="flex items-center justify-between px-4 py-3 text-sm"><span className="font-semibold">{h.name}</span><span className="text-muted">{new Date(`${h.date}T00:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span></li>)}</ul>
        )
      ) : <Requests scope={tab} onToast={t} reloadKey={key} onDecided={reload} />}
      {apply && <ApplyModal types={active} onClose={() => setApply(false)} onError={(m) => toast.error(m)} onDone={() => { setApply(false); toast.success('Leave request sent.'); reload(); }} />}
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
