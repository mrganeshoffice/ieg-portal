import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, History, KeyRound, Loader2, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import EmployeeEditor from '@/components/ems/EmployeeEditor';
import Documents from '@/components/ems/Documents';
import { StatusBadge } from '@/components/ems/Fields';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { SetupLinkModal } from './AdminEmployeesPage';
import { setPortalAccess } from '@/services/workService';
import { errMsg, getDirectory, getEmployee, getMaster, resetEmployeePassword, setEmployeeActive, updateEmployee } from '@/services/emsService';
import { loadSession, type Role } from '@/services/auth';
import { ROLE_LABEL, type DirectoryEntry, type Employee, type Master } from '@/types/ems';

const FIELD_LABEL: Record<string, string> = { department_id: 'Department', designation_id: 'Designation', manager_id: 'Reporting manager', status: 'Status', employment_type_id: 'Employment type', work_location_id: 'Work location', shift_id: 'Shift', joining_date: 'Joining date' };

export default function AdminEmployeeDetailPage() {
  const id = Number(useParams().id);
  const toast = useToasts();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [master, setMaster] = useState<Master | null>(null);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [me, setMe] = useState<Role | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; hours: number } | null>(null);

  const load = useCallback(async () => {
    try { setEmp(await getEmployee(id)); setState('ready'); }
    catch (e) { const st = (e as { status?: number }).status; if (st === 404) setState('missing'); else { setError(errMsg(e)); setState('error'); } }
  }, [id]);
  useEffect(() => { void load(); void getMaster(true).then(setMaster).catch(() => {}); void getDirectory().then(setDirectory).catch(() => {}); void loadSession().then((s) => setMe(s?.role ?? null)).catch(() => {}); }, [load]);

  const act = async (name: string, fn: () => Promise<void>) => { setBusy(name); try { await fn(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); } };
  const canAdminRoles = me === 'super_admin';

  return (
    <div className="min-h-full bg-app">
      <AdminHeader active="employees" subtitle="Employee Management" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <Link to="/admin/employees" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={16} />All employees</Link>

        {state === 'loading' && <div className="space-y-3" aria-busy="true"><div className="skeleton h-28" /><div className="skeleton h-64" /></div>}
        {state === 'missing' && <div className="card p-10 text-center"><p className="font-bold">Employee not found</p><p className="mt-1 text-sm text-muted">They may have been removed, or the link is wrong.</p></div>}
        {state === 'error' && <div className="card p-8 text-center" role="alert"><p className="font-bold">We could not load this employee</p><p className="mt-1 text-sm text-muted">{error}</p><button className="btn-primary mt-4" onClick={() => void load()}>Try again</button></div>}

        {state === 'ready' && emp && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="space-y-5">
              <EmployeeEditor employee={emp} mode="admin" master={master} directory={directory} onSaved={(e) => { setEmp({ ...emp, ...e, documents: emp.documents, history: emp.history }); void load(); }} onToast={(t, m) => (t === 'success' ? toast.success(m) : toast.error(m))} />
              <Documents employee={emp} canDelete onChanged={() => void load()} onToast={(t, m) => (t === 'success' ? toast.success(m) : toast.error(m))} />
            </div>

            <aside className="space-y-5 xl:sticky xl:top-24">
              <section className="card p-5" aria-labelledby="acct">
                <h2 id="acct" className="flex items-center gap-2 text-base font-extrabold"><ShieldCheck size={18} className="text-brand" />Account and access</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-muted">Login email</dt><dd className="truncate font-semibold">{emp.login_email}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">Status</dt><dd><StatusBadge status={emp.status} /></dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">Account</dt><dd className={`font-semibold ${emp.is_active ? 'text-leaf-600' : 'text-red-500'}`}>{emp.is_active ? 'Can sign in' : 'Turned off'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-muted">Last sign-in</dt><dd className="font-semibold">{emp.last_login_at ? emp.last_login_at.replace('T', ' ').slice(0, 16) + ' UTC' : 'Never'}</dd></div>
                  {emp.must_change_password && <p className="rounded-xl bg-gold/15 px-3 py-2 text-xs text-amber-700">Has not set their own password yet.</p>}
                </dl>
                <label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold text-muted">Role</span>
                  <select className="input" value={emp.role} disabled={busy === 'role' || (!canAdminRoles && (emp.role === 'admin' || emp.role === 'super_admin'))}
                    onChange={(e) => void act('role', async () => { const u = await updateEmployee(emp.id, { role: e.target.value }); setEmp({ ...emp, ...u }); toast.success('Role updated. They will need to sign in again.'); })}>
                    {(Object.keys(ROLE_LABEL) as Role[]).filter((r) => canAdminRoles || (r !== 'admin' && r !== 'super_admin') || r === emp.role).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select></label>
                <div className="mt-4 rounded-xl border border-line p-3 text-sm">
                  <p className="font-semibold">Company portal pages</p>
                  <p className="mb-2 text-xs text-muted">Org charts, layouts and product pages. {emp.portal_full ? 'This person can see them.' : 'This person sees only the work pages (attendance, tasks, leave, chat).'}</p>
                  {me === 'super_admin' && <button type="button" className="btn-ghost w-full justify-center" disabled={!!busy || (emp.portal_full && emp.login_email === 'ieg@ieg.com')} onClick={() => void act('portal', async () => { await setPortalAccess(emp.id, !emp.portal_full); await load(); toast.success(emp.portal_full ? 'Company pages hidden for this person.' : 'Company pages enabled for this person.'); })}>{emp.portal_full ? 'Hide company pages' : 'Allow company pages'}</button>}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button type="button" className="btn-ghost justify-start" disabled={!!busy || !emp.is_active}
                    onClick={() => { if (!window.confirm(`Reset the password for ${emp.full_name}? Their current password stops working immediately and they are signed out.`)) return; void act('reset', async () => { const r = await resetEmployeePassword(emp.id); setLink({ url: r.setupUrl, hours: r.setupExpiresHours }); void load(); }); }}>
                    {busy === 'reset' ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}Reset password
                  </button>
                  {emp.is_active ? (
                    <button type="button" className="btn-ghost justify-start !text-red-500" disabled={!!busy}
                      onClick={() => { if (!window.confirm(`Turn off the account for ${emp.full_name}? They will be signed out and cannot sign in. Their records are kept.`)) return; void act('off', async () => { setEmp({ ...emp, ...(await setEmployeeActive(emp.id, false)) }); toast.success('Account turned off.'); }); }}>
                      {busy === 'off' ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}Turn off account
                    </button>
                  ) : (
                    <button type="button" className="btn-ghost justify-start" disabled={!!busy} onClick={() => void act('on', async () => { setEmp({ ...emp, ...(await setEmployeeActive(emp.id, true)) }); toast.success('Account turned on.'); })}>
                      {busy === 'on' ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}Turn on account
                    </button>
                  )}
                </div>
              </section>

              <section className="card p-5" aria-labelledby="hist">
                <h2 id="hist" className="flex items-center gap-2 text-base font-extrabold"><History size={18} className="text-brand" />Employment history</h2>
                {(emp.history ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">No changes recorded yet.</p> : (
                  <ul className="mt-3 space-y-3">
                    {emp.history!.map((h, i) => (
                      <li key={i} className="border-l-2 border-line pl-3 text-xs"><p className="font-bold">{FIELD_LABEL[h.field] ?? h.field}</p><p className="text-muted">{h.old_value ?? '—'} → {h.new_value ?? '—'}</p><p className="text-[11px] text-muted">{h.changed_at.slice(0, 10)}</p></li>
                    ))}
                  </ul>
                )}
                
              </section>
            </aside>
          </div>
        )}
      </main>
      <SetupLinkModal open={!!link} onClose={() => setLink(null)} link={link?.url ?? null} hours={link?.hours ?? null} name={emp?.full_name ?? ''} />
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
