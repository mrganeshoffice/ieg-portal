import type { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
export const monthOf = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const shiftMonth = (m: string, delta: number) => { const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + delta, 1); return monthOf(d); };
export const monthLabel = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });

const TONES: Record<string, string> = {
  present: 'bg-leaf/15 text-leaf-600', late: 'bg-gold/20 text-amber-700', half_day: 'bg-gold/20 text-amber-700', short: 'bg-red-500/10 text-red-600', working: 'bg-brand/15 text-brand-600',
  missed_checkout: 'bg-red-500/10 text-red-600', absent: 'bg-red-500/10 text-red-600', leave: 'bg-violet-500/15 text-violet-600', off: 'bg-app text-muted', upcoming: 'bg-app text-muted',
  pending: 'bg-gold/20 text-amber-700', approved: 'bg-leaf/15 text-leaf-600', rejected: 'bg-red-500/10 text-red-600', cancelled: 'bg-app text-muted',
  todo: 'bg-app text-muted', in_progress: 'bg-brand/15 text-brand-600', blocked: 'bg-red-500/10 text-red-600', done: 'bg-leaf/15 text-leaf-600',
  high: 'bg-red-500/10 text-red-600', medium: 'bg-gold/20 text-amber-700', low: 'bg-app text-muted',
};
const LABELS: Record<string, string> = { half_day: 'Half day', missed_checkout: 'No check-out', in_progress: 'In progress', short: 'Short day', working: 'Working', off: 'Day off' };
export function Pill({ value }: { value: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[value] ?? 'bg-app text-muted'}`}>{LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1)}</span>;
}
export function Loading({ rows = 3 }: { rows?: number }) { return <div className="space-y-3" aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-20" />)}</div>; }
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center"><p className="font-bold">{title}</p>{hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{hint}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="card p-8 text-center" role="alert"><AlertTriangle className="mx-auto mb-2 text-gold" size={26} /><p className="font-bold">We could not load this</p><p className="mt-1 text-sm text-muted">{message}</p>{onRetry && <button className="btn-primary mt-4" onClick={onRetry}>Try again</button>}</div>;
}
export function Spin() { return <Loader2 size={16} className="animate-spin" />; }
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string; badge?: number }[] }) {
  return (
    <div role="tablist" className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1">
      {tabs.map((t) => <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={`whitespace-nowrap rounded-xl px-4 py-1.5 text-sm font-semibold transition ${value === t.id ? 'bg-brand text-white shadow-soft' : 'text-muted hover:text-ink'}`}>{t.label}{!!t.badge && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{t.badge}</span>}</button>)}
    </div>
  );
}
