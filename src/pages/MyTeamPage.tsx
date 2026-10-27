import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Avatar, StatusBadge } from '@/components/ems/Fields';
import { errMsg, listEmployees } from '@/services/emsService';
import type { Employee } from '@/types/ems';

export default function MyTeamPage() {
  const [items, setItems] = useState<Employee[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { listEmployees({ page_size: 100 }).then((r) => setItems(r.items)).catch((e) => setErr(errMsg(e))); }, []);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="My team" description="People who report to you. You see work details only." />
      {err && <div className="card p-8 text-center" role="alert"><p className="font-bold">We could not load your team</p><p className="mt-1 text-sm text-muted">{err}</p></div>}
      {!items && !err && <div className="skeleton h-64" aria-busy="true" />}
      {items && (items.length === 0 ? <div className="card p-10 text-center text-sm text-muted">No one reports to you yet.</div> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((e) => (
            <li key={e.id} className="card flex items-center gap-3 p-4">
              <Avatar name={e.full_name} url={e.photo_url} size={48} />
              <div className="min-w-0 flex-1"><p className="truncate font-bold">{e.full_name}</p><p className="truncate text-xs text-muted">{[e.designation, e.department].filter(Boolean).join(' · ') || e.login_email}</p><p className="truncate text-xs text-muted">{e.official_email ?? e.login_email}</p></div>
              <StatusBadge status={e.status} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
