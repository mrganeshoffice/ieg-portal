import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { isAdminConfigured } from '@/services/adminAuthService';
import { EnergyBackground } from './LoginPage';
import Logo from '@/components/ui/Logo';

export default function AdminLoginPage() {
  const { status, login } = useAdminAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => { void isAdminConfigured().then(setConfigured); }, []);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  if (status === 'authed') return <Navigate to="/admin/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const er: typeof errors = {};
    if (!email.trim()) er.email = 'Enter your admin email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) er.email = 'Enter a valid email address.';
    if (!password) er.password = 'Enter your password.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    const res = await login(email, password, remember);
    setLoading(false);
    if (res.ok) nav('/admin/dashboard', { replace: true });
    else setErrors({ form: res.error });
  };

  const input = 'w-full rounded-xl border border-white/15 bg-navy-950/50 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/30';

  return (
    <div className="relative flex min-h-full items-center justify-center px-4 py-10">
      <EnergyBackground />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative w-full max-w-[26rem] rounded-[2rem] border border-white/15 bg-white/[0.07] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] backdrop-blur-2xl sm:p-9">
        <div className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-leaf to-transparent" />
        <div className="flex flex-col items-center text-center">
          <Logo size={78} className="!rounded-3xl" />
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf/10 px-3 py-1 text-xs font-semibold text-leaf-400"><ShieldCheck size={13} />Authorized personnel</span>
          <h1 className="mt-3 text-[1.65rem] font-extrabold leading-tight tracking-tight text-white">Admin Portal</h1>
          <p className="mt-1.5 text-sm text-slate-300">Manage Product Presentations</p>
        </div>

        <form onSubmit={submit} noValidate className="mt-7 space-y-4">
          {configured === false && <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-200">No admin account exists yet. On the computer running the portal, open Terminal in the project folder and run <code className="rounded bg-white/10 px-1.5 py-0.5">npm run admin:create</code>.</div>}
          {errors.form && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-3 text-sm text-red-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />{errors.form}
            </motion.div>
          )}
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-xs font-semibold text-slate-300">Admin email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'ae-err' : undefined} className={`${input} pr-3`} />
            </div>
            {errors.email && <p id="ae-err" className="mt-1.5 text-xs text-red-300">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="admin-password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'ap-err' : undefined} className={`${input} pr-11`} />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && <p id="ap-err" className="mt-1.5 text-xs text-red-300">{errors.password}</p>}
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-white/30 accent-brand" />
            Remember this session on this device
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 text-[15px]">
            {loading ? <><Loader2 size={18} className="animate-spin" />Signing in</> : 'Sign in to Admin'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
