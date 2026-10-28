import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ListChecks, MessageSquare, PartyPopper } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import PunchCard from '@/components/work/PunchCard';
import { ErrorBox, fmtDate } from '@/components/work/ui';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { errMsg } from '@/services/emsService';
import { getHome } from '@/services/workService';
import type { HomeSummary } from '@/types/work';

function Tile({ to, icon: Icon, label, value, tone }: { to: string; icon: typeof ListChecks; label: string; value: string | number; tone?: string }) {
  return (
    <Link to={to} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone ?? 'bg-brand/10 text-brand'}`}><Icon size={20} /></span>
      <span><span className="block text-2xl font-extrabold leading-none">{value}</span><span className="text-xs font-semibold text-muted">{label}</span></span>
    </Link>
  );
}

export default function WorkHomePage() {
  const { session } = useAuth();
  const toast = useToasts();
  const [h, setH] = useState<HomeSummary | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { getHome().then((x) => { setH(x); setErr(''); }).catch((e) => setErr(errMsg(e))); }, []);
  useEffect(load, [load]);
  const first = (session?.name ?? '').split(' ')[0];
  const mgr = session?.role !== 'employee';
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={`Hello${first ? `, ${first}` : ''}`} description="Your day at a glance." />
      {err && <ErrorBox message={err} onRetry={load} />}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <PunchCard onChange={load} onToast={(t, m) => (t === 'success' ? toast.success(m) : toast.error(m))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Tile to="/tasks" icon={ListChecks} label="Open tasks" value={h?.open_tasks ?? '–'} />
          <Tile to="/tasks" icon={CheckCircle2} label="Overdue" value={h?.overdue_tasks ?? '–'} tone={h && h.overdue_tasks > 0 ? 'bg-red-500/10 text-red-500' : 'bg-leaf/10 text-leaf-600'} />
          <Tile to="/chat" icon={MessageSquare} label="Unread messages" value={h?.unread_messages ?? '–'} />
          {mgr ? <Tile to="/leave" icon={CalendarDays} label="Leave to decide" value={h?.pending_leave_to_decide ?? '–'} tone="bg-gold/20 text-amber-700" /> : <Tile to="/leave" icon={CalendarDays} label="Apply for leave" value="Open" />}
        </div>
      </div>
      {h?.next_holiday && <div className="card mt-5 flex items-center gap-3 p-4 text-sm"><PartyPopper size={18} className="text-gold" /><span><b>Next holiday:</b> {h.next_holiday.name}, {fmtDate(h.next_holiday.holiday_date)}</span></div>}
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
