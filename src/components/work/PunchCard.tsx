import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { attendanceToday, checkIn, checkOut } from '@/services/workService';
import { errMsg } from '@/services/emsService';
import type { AttRecord } from '@/types/work';
import { Pill, Spin, fmtTime } from './ui';

/** Big check-in / check-out card with a live clock. Time is always taken from the server, never from this device. */
export default function PunchCard({ onChange, onToast }: { onChange?: () => void; onToast: (t: 'success' | 'error', m: string) => void }) {
  const [rec, setRec] = useState<AttRecord | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const [err, setErr] = useState('');
  const load = useCallback(() => { attendanceToday().then((r) => { setRec(r.record); setErr(''); }).catch((e) => setErr(errMsg(e))); }, []);
  useEffect(() => { load(); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, [load]);
  const act = async (fn: typeof checkIn, ok: string) => { setBusy(true); try { setRec(await fn()); onToast('success', ok); onChange?.(); } catch (e) { onToast('error', errMsg(e)); load(); } finally { setBusy(false); } };
  const done = !!rec?.check_out;
  return (
    <section className="card relative overflow-hidden p-6" aria-labelledby="punch-h">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-3xl" />
      <h2 id="punch-h" className="text-sm font-bold text-muted">Today</h2>
      <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
      <p className="text-sm text-muted">{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      {err ? <p className="mt-4 text-sm text-red-500" role="alert">{err}</p> : rec === undefined ? <div className="skeleton mt-4 h-12" /> : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span><span className="text-muted">In </span><b>{fmtTime(rec?.check_in ?? null)}</b></span>
            <span><span className="text-muted">Out </span><b>{fmtTime(rec?.check_out ?? null)}</b></span>
            {rec && <Pill value={rec.status} />}
            {rec?.hours != null && <span className="text-muted">{rec.hours} h</span>}
          </div>
          <div className="mt-5">
            {!rec ? <button className="btn-primary" disabled={busy} onClick={() => void act(checkIn, 'Checked in. Have a good day!')}>{busy ? <Spin /> : <LogIn size={16} />}Check in</button>
              : !done ? <button className="btn-primary" disabled={busy} onClick={() => void act(checkOut, 'Checked out. See you tomorrow!')}>{busy ? <Spin /> : <LogOut size={16} />}Check out</button>
              : <p className="text-sm font-semibold text-leaf-600">You are done for today.</p>}
          </div>
        </>
      )}
    </section>
  );
}
