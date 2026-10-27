import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import EmployeeEditor from '@/components/ems/EmployeeEditor';
import Documents from '@/components/ems/Documents';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { errMsg, getMaster, getMyProfile } from '@/services/emsService';
import type { Employee, Master } from '@/types/ems';

export default function MyProfilePage() {
  const toast = useToasts();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [master, setMaster] = useState<Master | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { getMyProfile().then((e) => { setEmp(e); setErr(''); }).catch((e) => setErr(errMsg(e))); }, []);
  useEffect(() => { load(); getMaster().then(setMaster).catch(() => {}); }, [load]);
  const t = (k: 'success' | 'error', m: string) => (k === 'success' ? toast.success(m) : toast.error(m));
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="My profile" description="Keep your details up to date. Employment details are managed by HR." actions={<Link to="/change-password" className="btn-ghost"><KeyRound size={16} />Change password</Link>} />
      {err && <div className="card p-8 text-center" role="alert"><p className="font-bold">We could not load your profile</p><p className="mt-1 text-sm text-muted">{err}</p><p className="mt-2 text-xs text-muted">If you are the portal administrator, your account may not have an employee record yet. Ask HR to add one.</p><button className="btn-primary mt-4" onClick={load}>Try again</button></div>}
      {!emp && !err && <div className="space-y-3" aria-busy="true"><div className="skeleton h-28" /><div className="skeleton h-64" /></div>}
      {emp && (
        <div className="space-y-5">
          <EmployeeEditor employee={emp} mode="self" master={master} onSaved={(e) => { setEmp({ ...emp, ...e, documents: emp.documents }); load(); }} onToast={t} />
          <Documents employee={emp} canDelete={false} onChanged={load} onToast={t} />
        </div>
      )}
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
