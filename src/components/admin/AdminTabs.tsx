import { Link } from 'react-router-dom';
import { Clapperboard, Presentation } from 'lucide-react';

const tabs = [
  { to: '/admin/dashboard', label: 'Presentations', icon: Presentation },
  { to: '/admin/videos', label: 'Videos', icon: Clapperboard },
] as const;

/** Switches between the Videos and Product Presentations admin sections. */
export default function AdminTabs({ active }: { active: 'presentations' | 'videos' }) {
  return (
    <nav aria-label="Admin sections" className="flex gap-1.5 rounded-xl border border-white/15 bg-white/5 p-1">
      {tabs.map((t, i) => {
        const isActive = (i === 0 && active === 'presentations') || (i === 1 && active === 'videos');
        return (
          <Link key={t.to} to={t.to} aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
            <t.icon size={14} />{t.label}
          </Link>
        );
      })}
    </nav>
  );
}
