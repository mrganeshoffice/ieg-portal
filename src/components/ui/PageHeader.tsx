import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function PageHeader({ title, description, actions, confirmCount }: { title: string; description?: string; actions?: ReactNode; confirmCount?: number }) {
  return (
    <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {!!confirmCount && (
          <Link to="/settings#confirmations" className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs font-semibold" title="Review flagged items">
            <AlertTriangle size={13} className="text-gold" />{confirmCount} to confirm
          </Link>
        )}
        {actions}
      </div>
    </div>
  );
}
