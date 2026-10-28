import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { addMaster, errMsg, getMaster, seedMaster, updateMaster } from '@/services/emsService';
import type { Master, MasterKind } from '@/types/ems';

const KINDS: { kind: MasterKind; title: string; hint: string }[] = [
  { kind: 'departments', title: 'Departments', hint: 'Used for employees and reporting.' },
  { kind: 'designations', title: 'Designations', hint: 'Job titles.' },
  { kind: 'employment_type', title: 'Employment types', hint: 'For example Permanent, Contract.' },
  { kind: 'work_location', title: 'Work locations', hint: 'Plants, offices, sites.' },
  { kind: 'shift', title: 'Shifts', hint: 'Shift timings.' },
];

function Block({ kind, title, hint, items, reload, toast }: { kind: MasterKind; title: string; hint: string; items: Master[MasterKind]; reload: () => void; toast: ReturnType<typeof useToasts> }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>) => { setBusy(key); try { await fn(); reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); } };
  return (
    <section className="card p-5" aria-labelledby={`m-${kind}`}>
      <h2 id={`m-${kind}`} className="text-base font-extrabold">{title}</h2>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (!n) return; void run('add', async () => { await addMaster(kind, n); setName(''); toast.success('Added.'); }); }}>
        <input className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder={`Add to ${title.toLowerCase()}`} aria-label={`New ${title}`} />
        <button className="btn-primary shrink-0" disabled={busy === 'add' || !name.trim()}>{busy === 'add' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Add</button>
      </form>
      {items.length === 0 ? <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">Nothing here yet.</p> : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-2 px-3 py-2">
              {editing?.id === m.id ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); const n = editing.name.trim(); if (!n) return; void run(`n${m.id}`, async () => { await updateMaster(kind, m.id, { name: n }); setEditing(null); toast.success('Renamed.'); }); }}>
                  <input className="input !py-1.5" autoFocus value={editing.name} maxLength={120} onChange={(e) => setEditing({ id: m.id, name: e.target.value })} aria-label="New name" />
                  <button className="btn-primary !py-1.5">Save</button>
                  <button type="button" className="btn-ghost !py-1.5" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : (
                <>
                  <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${m.is_active ? '' : 'text-muted line-through'}`}>{m.name}</span>
                  <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={() => setEditing({ id: m.id, name: m.name })}>Rename</button>
                  <button type="button" disabled={busy === `a${m.id}`} className="text-xs font-semibold text-muted hover:text-ink" onClick={() => void run(`a${m.id}`, async () => { await updateMaster(kind, m.id, { is_active: !m.is_active }); })}>{m.is_active ? 'Hide' : 'Show'}</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted">Items are hidden, not deleted, so existing employee records stay intact.</p>
    </section>
  );
}

export default function AdminMasterDataPage() {
  const toast = useToasts();
  const [master, setMaster] = useState<Master | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { getMaster(true).then((m) => { setMaster(m); setErr(''); }).catch((e) => setErr(errMsg(e))); }, []);
  useEffect(load, [load]);
  const [seeding, setSeeding] = useState(false);
  const seed = async () => { setSeeding(true); try { const r = await seedMaster(); toast.success(`Added ${r.departments} departments and ${r.designations} designations.`); load(); } catch (e) { toast.error(errMsg(e)); } finally { setSeeding(false); } };
  return (
    <div className="admin-page min-h-full bg-app">
      <AdminHeader active="master" subtitle="Master data" />
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Master data</h1>
        <p className="mt-1 text-sm text-muted">The lists employees are organised by. Changes appear in the employee forms straight away.</p>
        <div className="mb-6 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white/60 p-4">
          <button type="button" className="btn-primary" disabled={seeding} onClick={() => void seed()}>{seeding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Load IEG standard lists</button>
          <p className="min-w-0 flex-1 text-xs text-muted">Adds the departments and designations from the IEG organisation charts. Existing items are kept and nothing is duplicated. Please confirm the sub-roles with HR.</p>
        </div>
        {err && <div className="card p-6 text-center" role="alert"><p className="font-bold">We could not load the lists</p><p className="mt-1 text-sm text-muted">{err}</p><button className="btn-primary mt-3" onClick={load}>Try again</button></div>}
        {!master && !err && <div className="grid gap-4 md:grid-cols-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-56" />)}</div>}
        {master && <div className="grid gap-5 md:grid-cols-2">{KINDS.map((k) => <Block key={k.kind} {...k} items={master[k.kind]} reload={load} toast={toast} />)}</div>}
      </main>
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
