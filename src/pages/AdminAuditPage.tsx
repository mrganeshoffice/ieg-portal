import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { errMsg, listAudit } from '@/services/emsService';
import type { AuditRow, Paged } from '@/types/ems';

export default function AdminAuditPage() {
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AuditRow> | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { let live = true; setErr(''); listAudit({ q: dq || undefined, page }).then((d) => live && setData(d)).catch((e) => live && setErr(errMsg(e))); return () => { live = false; }; }, [dq, page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div className="min-h-full bg-app">
      <AdminHeader active="audit" subtitle="Audit log" />
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Audit log</h1>
        <p className="mb-5 mt-1 text-sm text-muted">Who signed in, and who changed what. Passwords and tokens are never recorded.</p>
        <label className="relative mb-4 block max-w-sm"><span className="sr-only">Search the log</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by person or action" /></label>
        {err && <div className="card p-6 text-center" role="alert"><p className="font-bold">We could not load the log</p><p className="mt-1 text-sm text-muted">{err}</p></div>}
        {!data && !err && <div className="skeleton h-80" aria-busy="true" />}
        {data && (
          <div className="card overflow-hidden">
            {data.items.length === 0 ? <p className="p-10 text-center text-sm text-muted">No entries found.</p> : (
              <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-app text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">When (UTC)</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">IP</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((r) => (
                    <tr key={r.id}><td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">{r.created_at.replace('T', ' ').slice(0, 19)}</td><td className="px-4 py-2.5 font-semibold">{r.actor_email ?? '—'}</td><td className="px-4 py-2.5"><code className="rounded bg-app px-1.5 py-0.5 text-xs">{r.action}</code></td><td className="px-4 py-2.5 text-xs text-muted">{r.entity ? `${r.entity}${r.entity_id ? ' #' + r.entity_id : ''}` : '—'}</td><td className="px-4 py-2.5 text-xs text-muted">{r.ip ?? '—'}</td></tr>
                  ))}
                </tbody>
              </table></div>
            )}
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
              <span className="text-muted">{data.total} entries · page {data.page} of {pages}</span>
              <div className="flex gap-2"><button className="icon-btn" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button><button className="icon-btn" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
