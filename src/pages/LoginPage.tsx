import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { site } from '@/config/site';
import Logo from '@/components/ui/Logo';

export function EnergyBackground() {
  const reduce = useReducedMotion();
  const lines = [
    'M-50 620 C 200 520, 320 760, 620 600 S 1000 380, 1500 520',
    'M-50 200 C 250 320, 420 60, 720 220 S 1100 420, 1500 180',
    'M-50 420 C 300 300, 520 560, 840 400 S 1200 250, 1500 400',
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-navy-900" aria-hidden>
      <div className="absolute inset-0 bg-grid" />
      <motion.div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand/35 blur-[120px]" animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-leaf/30 blur-[130px]" animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -50, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="lg" x1="0" x2="1"><stop offset="0" stopColor="#1FA2E8" stopOpacity="0" /><stop offset=".5" stopColor="#1FA2E8" /><stop offset="1" stopColor="#34C77B" /></linearGradient>
        </defs>
        {lines.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke="rgba(120,170,255,.12)" strokeWidth="1.5" />
            <motion.path d={d} fill="none" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round" strokeDasharray="90 900"
              animate={reduce ? undefined : { strokeDashoffset: [0, -990] }} transition={{ duration: 7 + i * 2, repeat: Infinity, ease: 'linear', delay: i * 1.2 }} />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const { session, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  if (session) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: typeof errors = {};
    if (!email.trim()) er.email = 'Enter your email address.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) er.email = 'Enter a valid email address, for example name@company.com.';
    if (!password) er.password = 'Enter your password.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    const res = await login(email, password, remember);
    setLoading(false);
    if (res.ok) nav((loc.state as { from?: string } | null)?.from || '/', { replace: true });
    else setErrors({ form: res.error });
  };

  return (
    <div className="relative flex min-h-full items-center justify-center px-4 py-10">
      <EnergyBackground />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative w-full max-w-[26rem] rounded-[2rem] border border-white/15 bg-white/[0.07] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] backdrop-blur-2xl sm:p-9">
        <div className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
        <div className="flex flex-col items-center text-center">
          <Logo size={84} className="!rounded-3xl" />
          <h1 className="mt-6 text-[1.65rem] font-extrabold leading-tight tracking-tight text-white">{site.portalName}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{site.subtitle}</p>
        </div>

        <form onSubmit={submit} noValidate className="mt-7 space-y-4">
          {errors.form && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-3 text-sm text-red-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />{errors.form}
            </motion.div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-slate-300">Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined}
                className="w-full rounded-xl border border-white/15 bg-navy-950/50 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/30" />
            </div>
            {errors.email && <p id="email-err" className="mt-1.5 text-xs text-red-300">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'pw-err' : undefined}
                className="w-full rounded-xl border border-white/15 bg-navy-950/50 py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/30" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-white">
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && <p id="pw-err" className="mt-1.5 text-xs text-red-300">{errors.password}</p>}
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-white/30 accent-brand" />
            Keep me signed in for 30 days
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 text-[15px]">
            {loading ? <><Loader2 size={18} className="animate-spin" />Signing in</> : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">Internal use only. {site.company}</p>
      </motion.div>
    </div>
  );
}
