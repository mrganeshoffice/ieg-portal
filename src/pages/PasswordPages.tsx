import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSetupInfo } from '@/services/auth';
import Logo from '@/components/ui/Logo';
import { EnergyBackground } from './LoginPage';

const RULES = 'At least 10 characters, with letters and at least one number.';

function problem(pw: string): string | null {
  if (pw.length < 10) return 'Use at least 10 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include letters and at least one number.';
  return null;
}

function Field({ id, label, value, onChange, autoComplete, error }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</label>
      <div className="relative">
        <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error}
          className="w-full rounded-xl border border-white/15 bg-navy-950/50 py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/30" />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-white">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
    </div>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full items-center justify-center px-4 py-10">
      <EnergyBackground />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-[26rem] rounded-[2rem] border border-white/15 bg-white/[0.07] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] backdrop-blur-2xl sm:p-9">
        <div className="flex flex-col items-center text-center">
          <Logo size={72} className="!rounded-3xl" />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{subtitle}</p>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

const ErrorBox = ({ msg }: { msg: string }) => <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-3 text-sm text-red-200"><AlertCircle size={16} className="mt-0.5 shrink-0" />{msg}</div>;

/** Public page opened from the single-use link HR shares: the employee chooses their own password. */
export function SetupPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { setupPassword } = useAuth();
  const nav = useNavigate();
  const [info, setInfo] = useState<{ email: string; name: string | null } | { error: string } | null>(null);
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<{ pw?: string; pw2?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!token) { setInfo({ error: 'This link is not complete. Ask HR for a new one.' }); return; } void getSetupInfo(token).then(setInfo); }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: typeof err = {};
    const p = problem(pw); if (p) er.pw = p;
    if (pw2 !== pw) er.pw2 = 'The two passwords do not match.';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    const res = await setupPassword(token, pw);
    setBusy(false);
    if (res.ok) nav('/', { replace: true }); else setErr({ form: res.error });
  };

  if (!info) return <Shell title="Set your password" subtitle="Checking your link…"><div className="mt-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div></Shell>;
  if ('error' in info) return <Shell title="Link not valid" subtitle="Setup links work once and expire after 72 hours."><div className="mt-6"><ErrorBox msg={info.error} /></div></Shell>;
  return (
    <Shell title={info.name ? `Welcome, ${info.name}` : 'Set your password'} subtitle={`Choose a password for ${info.email}. ${RULES}`}>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        {err.form && <ErrorBox msg={err.form} />}
        <Field id="pw" label="New password" value={pw} onChange={setPw} autoComplete="new-password" error={err.pw} />
        <Field id="pw2" label="Repeat password" value={pw2} onChange={setPw2} autoComplete="new-password" error={err.pw2} />
        <button type="submit" disabled={busy} className="btn-primary w-full !py-3.5 text-[15px]">{busy ? <><Loader2 size={18} className="animate-spin" />Saving</> : 'Save password and sign in'}</button>
      </form>
    </Shell>
  );
}

/** Signed-in page: used when HR requires a new password, and for anyone changing theirs. */
export function ChangePasswordPage() {
  const { session, changePassword, status } = useAuth();
  const nav = useNavigate();
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<{ cur?: string; pw?: string; pw2?: string; form?: string }>({});
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  if (status === 'anon') return <Navigate to="/login" replace />;
  const forced = !!session?.mustChangePassword;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: typeof err = {};
    if (!cur) er.cur = 'Enter your current password.';
    const p = problem(pw); if (p) er.pw = p;
    if (pw2 !== pw) er.pw2 = 'The two passwords do not match.';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    const res = await changePassword(cur, pw);
    setBusy(false);
    if (res.ok) { setDone(true); setTimeout(() => nav('/', { replace: true }), 900); } else setErr({ form: res.error });
  };

  return (
    <Shell title={forced ? 'Set a new password' : 'Change password'} subtitle={forced ? `Your account needs a new password before you continue. ${RULES}` : RULES}>
      {done ? <div className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-leaf"><CheckCircle2 size={18} />Password updated</div> : (
        <form onSubmit={submit} noValidate className="mt-7 space-y-4">
          {err.form && <ErrorBox msg={err.form} />}
          <Field id="cur" label="Current password" value={cur} onChange={setCur} autoComplete="current-password" error={err.cur} />
          <Field id="pw" label="New password" value={pw} onChange={setPw} autoComplete="new-password" error={err.pw} />
          <Field id="pw2" label="Repeat new password" value={pw2} onChange={setPw2} autoComplete="new-password" error={err.pw2} />
          <button type="submit" disabled={busy} className="btn-primary w-full !py-3.5 text-[15px]">{busy ? <><Loader2 size={18} className="animate-spin" />Saving</> : 'Update password'}</button>
          {!forced && <button type="button" onClick={() => nav(-1)} className="w-full text-center text-sm text-slate-300 hover:text-white">Cancel</button>}
        </form>
      )}
    </Shell>
  );
}
