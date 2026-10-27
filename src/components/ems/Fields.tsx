import type { ReactNode } from 'react';

export const fieldCls = 'input';

export function FieldShell({ label, hint, readOnly, children, wide }: { label: string; hint?: string; readOnly?: boolean; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted">{label}{readOnly && <span className="rounded-full bg-app px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Set by HR</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = { active: 'bg-leaf/15 text-leaf-600', probation: 'bg-gold/20 text-amber-600', on_leave: 'bg-brand/15 text-brand-600', suspended: 'bg-red-500/15 text-red-500', resigned: 'bg-slate-400/20 text-muted' };
  const label: Record<string, string> = { active: 'Active', probation: 'Probation', on_leave: 'On leave', suspended: 'Suspended', resigned: 'Resigned' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${tone[status] ?? 'bg-app text-muted'}`}>{label[status] ?? status}</span>;
}

export function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  const initials = name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return url
    ? <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-2xl object-cover" style={{ width: size, height: size }} />
    : <span className="flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-leaf font-extrabold text-white" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>{initials}</span>;
}
