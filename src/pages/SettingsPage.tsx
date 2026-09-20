import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { allConfirmations } from '@/data/confirmations';
import { clearRecent } from '@/lib/recent';
import { site } from '@/config/site';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { session, logout } = useAuth();
  const items = useMemo(allConfirmations, []);
  const [cleared, setCleared] = useState(false);
  const groups = useMemo(() => items.reduce<Record<string, typeof items>>((m, i) => { (m[i.source] ||= []).push(i); return m; }, {}), [items]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Settings" description="Appearance, session and the list of items to confirm against the original documents." />

      <section className="card p-6">
        <h2 className="text-lg font-bold">Appearance</h2>
        <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
          {([['light', 'Light', Sun], ['dark', 'Dark', Moon]] as const).map(([k, label, I]) => (
            <button key={k} onClick={() => setTheme(k)} aria-pressed={theme === k} className={`flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold transition ${theme === k ? 'border-brand bg-brand/10' : 'border-line hover:bg-app'}`}><I size={18} />{label}</button>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold">Session</h2>
        <p className="mt-1 text-sm text-muted">Signed in as {session?.email}. Session expires {session ? new Date(session.expiresAt).toLocaleString() : ''}.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => { clearRecent(); setCleared(true); }}><Trash2 size={16} />{cleared ? 'Recent history cleared' : 'Clear recently viewed'}</button>
          <button className="btn-ghost text-red-500" onClick={logout}><LogOut size={16} />Logout</button>
        </div>
      </section>

      <section id="confirmations" className="card scroll-mt-24 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><AlertTriangle size={20} /></span>
          <div>
            <h2 className="text-lg font-bold">Items to confirm ({items.length})</h2>
            <p className="mt-1 text-sm text-muted">Text that was unclear or not present in the photographs. Edit the source data in <code className="rounded bg-app px-1.5 py-0.5 text-xs">src/data</code>, then remove the <code className="rounded bg-app px-1.5 py-0.5 text-xs">confirm</code> field.</p>
          </div>
        </div>
        <div className="mt-5 space-y-5">
          {Object.entries(groups).map(([src, list]) => (
            <div key={src}>
              <h3 className="mb-2 text-sm font-bold">{src}</h3>
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {list.map((i) => (
                  <li key={i.id}>
                    <Link to={i.focus ? `${i.route}?focus=${encodeURIComponent(i.focus)}` : i.route} className="block px-4 py-3 transition hover:bg-app">
                      <span className="text-sm font-semibold">{i.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">{i.reason}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <p className="text-center text-xs text-muted">{site.company} · Internal prototype</p>
    </div>
  );
}
