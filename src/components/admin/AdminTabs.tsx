import { Link } from 'react-router-dom';
import { BarChart3, BriefcaseBusiness, CalendarDays, Clapperboard, Clock, ListChecks, MessageSquare, Presentation, ScrollText, SlidersHorizontal, SquareCheckBig } from 'lucide-react';

const tabs = [
  { key: 'presentations', to: '/admin/dashboard', label: 'Presentations', icon: Presentation },
  { key: 'videos', to: '/admin/videos', label: 'Videos', icon: Clapperboard },
  { key: 'employees', to: '/admin/employees', label: 'Employees', icon: BriefcaseBusiness },
  { key: 'attendance', to: '/admin/attendance', label: 'Attendance', icon: Clock },
  { key: 'tasks', to: '/admin/tasks', label: 'Tasks', icon: SquareCheckBig },
  { key: 'leave', to: '/admin/leave', label: 'Leave', icon: CalendarDays },
  { key: 'reports', to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { key: 'chat', to: '/admin/chat', label: 'Chat', icon: MessageSquare },
  { key: 'policy', to: '/admin/policy', label: 'Policy', icon: SlidersHorizontal },
  { key: 'master', to: '/admin/master-data', label: 'Master data', icon: ListChecks },
  { key: 'audit', to: '/admin/audit', label: 'Audit log', icon: ScrollText },
] as const;

export type AdminTabKey = (typeof tabs)[number]['key'];

/** Switches between the admin sections (Presentations, Videos, Employees, Master data, Audit log). */
export default function AdminTabs({ active }: { active: AdminTabKey }) {
  return (
    <nav aria-label="Admin sections" className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl border border-white/15 bg-white/5 p-1">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link key={t.to} to={t.to} aria-current={isActive ? 'page' : undefined} title={t.label}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
            <t.icon size={14} /><span className={isActive ? '' : 'hidden xl:inline'}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
