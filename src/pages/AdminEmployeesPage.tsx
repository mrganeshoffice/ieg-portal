import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Copy, Download, KeyRound, Link2, Loader2, Plus, Search, UserCheck, UserX, Users } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import Modal from '@/components/ui/Modal';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { Avatar, StatusBadge } from '@/components/ems/Fields';
import { createEmployee, employeesCsvUrl, errMsg, getDirectory, getMaster, getSummary, listEmployees, type EmployeeQuery } from '@/services/emsService';
import { ROLE_LABEL, STATUS_LABEL, type DirectoryEntry, type Employee, type Master, type Paged, type Summary } from '@/types/ems';
import { loadSession, type Role } from '@/services/auth';

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number | string; tone: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${tone}22`, color: tone }}><Icon size={22} /></span>
      <div><p className="text-2xl font-extrabold leading-none">{value}</p><p className="mt-1 text-xs font-semibold text-muted">{label}</p></div>
    </div>
  );
}

/** Shows a one-time setup link. It is not stored anywhere after this dialog closes. */
export function SetupLinkModal({ open, onClose, link, hours, name }: { open: boolean; onClose: () => void; link: string | null; hours: number | null; name: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (open) setCopied(false); }, [open]);
  const copy = async () => { try { await navigator.clipboard.writeText(link ?? ''); setCopied(true); } catch { /* the field below can be selected manually */ } };
  return (
    <Modal open={open} onClose={onClose} title="Share the password setup link" size="sm" description={`For ${name}. Valid for ${hours ?? 72} hours and works only once.`}>
      <div className="space-y-4 p-5 sm:p-7">
        <p className="text-sm text-muted">Send this link to the employee privately (for example in a direct message). They open it and choose their own password. <b className="text-ink">It will not be shown again.</b></p>
        <input className="input font-mono text-xs" readOnly value={link ?? ''} onFocus={(e) => e.currentTarget.select()} aria-label="Setup link" />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Done</button>
          <button type="button" className="btn-primary" onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy link'}</button>
        </div>
      </div>
    </Modal>
  );
}

function CreateModal({ open, onClose, master, directory, canMakeAdmins, onCreated, onError }: { open: boolean; onClose: () => void; master: Master | null; directory: DirectoryEntry[]; canMakeAdmins: boolean; onCreated: (r: { employee: Employee; setupUrl: string | null; setupExpiresHours: number | null }) => void; onError: (m: string) => void }) {
  const empty = { email: '', first_name: '', last_name: '', role: 'employee', department_id: '', designation_id: '', manager_id: '', joining_date: '', method: 'link', temporary_password: '' };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setF(empty); setErr(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr('Enter a valid login email address.');
    if (!f.first_name.trim()) return setErr('First name is required.');
    if (f.method === 'password' && f.temporary_password.length < 10) return setErr('Temporary password must be at least 10 characters, with letters and a number.');
    setBusy(true); setErr(null);
    const body: Record<string, unknown> = { email: f.email.trim(), first_name: f.first_name.trim(), last_name: f.last_name.trim() || null, role: f.role };
    for (const k of ['department_id', 'designation_id', 'manager_id', 'joining_date'] as const) if (f[k]) body[k] = f[k];
    if (f.method === 'password') body.temporary_password = f.temporary_password;
    try { onCreated(await createEmployee(body)); } catch (er) { setErr(errMsg(er)); onError(errMsg(er)); } finally { setBusy(false); }
  };
  const active = (list?: { id: number; name: string; is_active: boolean }[]) => (list ?? []).filter((x) => x.is_active);

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title="Add employee" description="Only the essentials are needed now. The employee completes the rest after signing in.">
      <form onSubmit={submit} noValidate className="space-y-5 p-5 sm:p-7">
        {err && <div role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-3 text-sm text-red-500">{err}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-1.5 block text-xs font-semibold text-muted">First name *</span><input className="input" data-autofocus value={f.first_name} onChange={set('first_name')} maxLength={80} /></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-muted">Last name</span><input className="input" value={f.last_name} onChange={set('last_name')} maxLength={80} /></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-muted">Login email *</span><input className="input" type="email" autoComplete="off" value={f.email} onChange={set('email')} placeholder="name@iegautopowergroup.com" /></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-muted">Role</span>
            <select className="input" value={f.role} onChange={set('role')}>
              {(Object.keys(ROLE_LABEL) as Role[]).filter((r) => canMakeAdmins || (r !== 'admin' && r !== 'super_admin')).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-muted">Joining date</span><input className="input" type="date" value={f.joining_date} onChange={set('joining_date')} /></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-muted">Department</span><select className="input" value={f.department_id} onChange={set('department_id')}><option value="">Not set</option>{active(master?.departments).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-muted">Designation</span><select className="input" value={f.designation_id} onChange={set('designation_id')}><option value="">Not set</option>{active(master?.designations).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-muted">Reporting manager</span><select className="input" value={f.manager_id} onChange={set('manager_id')}><option value="">Not set</option>{directory.map((d) => <option key={d.id} value={d.id}>{d.name}{d.employee_code ? ` (${d.employee_code})` : ''}</option>)}</select></label>
        </div>

        <fieldset className="rounded-2xl border border-line p-4">
          <legend className="px-2 text-xs font-bold uppercase tracking-wide text-muted">How will they sign in for the first time?</legend>
          <label className="flex cursor-pointer items-start gap-3 py-1.5"><input type="radio" name="method" className="mt-1 accent-brand" checked={f.method === 'link'} onChange={() => setF({ ...f, method: 'link' })} /><span><span className="flex items-center gap-1.5 text-sm font-bold"><Link2 size={14} />Single-use setup link <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] text-leaf-600">Recommended</span></span><span className="text-xs text-muted">You get a private link to share. The employee chooses their own password, so nobody else ever knows it.</span></span></label>
          <label className="flex cursor-pointer items-start gap-3 py-1.5"><input type="radio" name="method" className="mt-1 accent-brand" checked={f.method === 'password'} onChange={() => setF({ ...f, method: 'password' })} /><span><span className="flex items-center gap-1.5 text-sm font-bold"><KeyRound size={14} />Temporary password</span><span className="text-xs text-muted">You type one now and tell the employee. They must change it at their first sign-in.</span></span></label>
          {f.method === 'password' && <input className="input mt-2" type="text" autoComplete="off" value={f.temporary_password} onChange={set('temporary_password')} placeholder="At least 10 characters, letters and a number" aria-label="Temporary password" />}
        </fieldset>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Create employee</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminEmployeesPage() {
  const [role, setRole] = useState<Role | null>(null);
  const toast = useToasts();
  useEffect(() => { void loadSession().then((s) => setRole(s?.role ?? null)).catch(() => {}); }, []);
  const [q, setQ] = useState(''); const [dq, setDq] = useState('');
  const [filters, setFilters] = useState({ department_id: '', status: '', role: '', active: '' });
  const [sort, setSort] = useState<{ sort: string; dir: 'asc' | 'desc' }>({ sort: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Employee> | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [master, setMaster] = useState<Master | null>(null);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<{ url: string | null; hours: number | null; name: string } | null>(null);

  const query: EmployeeQuery = useMemo(() => ({ q: dq, ...filters, ...sort, page, page_size: 20 }), [dq, filters, sort, page]);
  useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    setState((s) => (s === 'ready' ? s : 'loading'));
    try { setData(await listEmployees(query)); setState('ready'); setError(''); } catch (e) { setError(errMsg(e)); setState('error'); }
  }, [query]);
  useEffect(() => { void load(); }, [load]);
  const refreshSide = useCallback(() => { void getSummary().then(setSummary).catch(() => {}); void getDirectory().then(setDirectory).catch(() => {}); }, []);
  useEffect(() => { refreshSide(); void getMaster().then(setMaster).catch(() => {}); }, [refreshSide]);

  const toggleSort = (col: string) => setSort((s) => (s.sort === col ? { sort: col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { sort: col, dir: 'asc' }));
  const arrow = (col: string) => (sort.sort === col ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '');
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const th = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted';

  return (
    <div className="admin-page min-h-full bg-app">
      <AdminHeader active="employees" subtitle="Employee Management" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Employees</h1><p className="mt-1 text-sm text-muted">Create accounts, assign roles and keep employee records up to date.</p></div>
          <div className="flex flex-wrap gap-2">
            <a className="btn-ghost" href={employeesCsvUrl({ ...query })} download><Download size={16} />Export CSV</a>
            <button type="button" className="btn-primary !px-5" onClick={() => setCreating(true)}><Plus size={18} />Add employee</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Users} label="Total employees" value={summary?.total ?? '–'} tone="#1FA2E8" />
          <Stat icon={UserCheck} label="Can sign in" value={summary?.activeLogins ?? '–'} tone="#34C77B" />
          <Stat icon={UserX} label="Accounts turned off" value={summary ? summary.total - summary.activeLogins : '–'} tone="#94A3B8" />
          <Stat icon={Users} label="On probation" value={summary?.probation ?? '–'} tone="#F59E0B" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[13rem] flex-1 sm:max-w-sm"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input className="input pl-10" placeholder="Search name, ID, email or mobile" aria-label="Search employees" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="input !w-auto" aria-label="Filter by department" value={filters.department_id} onChange={(e) => { setFilters({ ...filters, department_id: e.target.value }); setPage(1); }}><option value="">All departments</option>{master?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <select className="input !w-auto" aria-label="Filter by status" value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className="input !w-auto" aria-label="Filter by role" value={filters.role} onChange={(e) => { setFilters({ ...filters, role: e.target.value }); setPage(1); }}><option value="">All roles</option>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className="input !w-auto" aria-label="Filter by account" value={filters.active} onChange={(e) => { setFilters({ ...filters, active: e.target.value }); setPage(1); }}><option value="">Active and turned off</option><option value="1">Can sign in</option><option value="0">Turned off</option></select>
        </div>

        {state === 'loading' && <div className="space-y-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16" />)}</div>}
        {state === 'error' && <div className="card p-8 text-center" role="alert"><p className="font-bold">We could not load employees</p><p className="mt-1 text-sm text-muted">{error}</p><button className="btn-primary mt-4" onClick={() => void load()}>Try again</button></div>}
        {state === 'ready' && data && (data.items.length === 0 ? (
          <div className="card p-10 text-center"><Users className="mx-auto text-muted" size={32} /><p className="mt-3 font-bold">{dq || Object.values(filters).some(Boolean) ? 'No employees match these filters' : 'No employees yet'}</p><p className="mt-1 text-sm text-muted">{dq || Object.values(filters).some(Boolean) ? 'Try a different search or clear the filters.' : 'Add the first employee to get started.'}</p></div>
        ) : (
          <>
            <div className="card hidden overflow-hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-app"><tr>
                  <th className={th}><button onClick={() => toggleSort('name')}>Employee{arrow('name')}</button></th>
                  <th className={th}><button onClick={() => toggleSort('code')}>ID{arrow('code')}</button></th>
                  <th className={th}><button onClick={() => toggleSort('department')}>Department{arrow('department')}</button></th>
                  <th className={th}><button onClick={() => toggleSort('designation')}>Designation{arrow('designation')}</button></th>
                  <th className={th}>Role</th>
                  <th className={th}><button onClick={() => toggleSort('status')}>Status{arrow('status')}</button></th>
                  <th className={th}>Profile</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((e) => (
                    <tr key={e.id} className="transition hover:bg-app/60">
                      <td className="px-4 py-3"><Link to={`/admin/employees/${e.id}`} className="flex items-center gap-3 font-bold hover:text-brand"><Avatar name={e.full_name} url={e.photo_url} size={36} /><span className="min-w-0"><span className="block truncate">{e.full_name}</span><span className="block truncate text-xs font-normal text-muted">{e.login_email}</span></span></Link></td>
                      <td className="px-4 py-3 font-mono text-xs">{e.employee_code}</td>
                      <td className="px-4 py-3">{e.department ?? '—'}</td>
                      <td className="px-4 py-3">{e.designation ?? '—'}</td>
                      <td className="px-4 py-3">{ROLE_LABEL[e.role]}</td>
                      <td className="px-4 py-3"><div className="flex flex-wrap items-center gap-1.5"><StatusBadge status={e.status} />{!e.is_active && <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-500">Account off</span>}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-app"><div className="h-full bg-gradient-to-r from-brand to-leaf" style={{ width: `${e.profile_completion.percent}%` }} /></div><span className="text-xs text-muted">{e.profile_completion.percent}%</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-3 md:hidden">
              {data.items.map((e) => (
                <li key={e.id}><Link to={`/admin/employees/${e.id}`} className="card flex items-center gap-3 p-4">
                  <Avatar name={e.full_name} url={e.photo_url} size={44} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{e.full_name}</span><span className="block truncate text-xs text-muted">{[e.employee_code, e.designation, e.department].filter(Boolean).join(' · ')}</span><span className="mt-1.5 flex flex-wrap items-center gap-1.5"><StatusBadge status={e.status} />{!e.is_active && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-500">Account off</span>}</span></span>
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </Link></li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 text-sm text-muted">
              <p>{data.total} {data.total === 1 ? 'employee' : 'employees'}</p>
              <div className="flex items-center gap-2"><button className="icon-btn border border-line" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button><span>Page {page} of {pages}</span><button className="icon-btn border border-line" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button></div>
            </div>
          </>
        ))}
      </main>

      <CreateModal open={creating} onClose={() => setCreating(false)} master={master} directory={directory} canMakeAdmins={role === 'super_admin'} onError={() => {}}
        onCreated={(r) => { setCreating(false); toast.success(`Created ${r.employee.full_name} (${r.employee.employee_code}).`); void load(); refreshSide(); if (r.setupUrl) setLink({ url: r.setupUrl, hours: r.setupExpiresHours, name: r.employee.full_name }); }} />
      <SetupLinkModal open={!!link} onClose={() => setLink(null)} link={link?.url ?? null} hours={link?.hours ?? null} name={link?.name ?? ''} />
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
