import { BarChart3, BriefcaseBusiness, CalendarDays, Clapperboard, Clock, LayoutDashboard, ListChecks, MessageSquare, Presentation, ScrollText, SlidersHorizontal, SquareCheckBig, type LucideIcon } from 'lucide-react';

export interface AdminNavItem { key: string; to: string; label: string; icon: LucideIcon }
export const ADMIN_NAV: { group: string; items: AdminNavItem[] }[] = [
  { group: 'Overview', items: [{ key: 'home', to: '/admin/home', label: 'Dashboard', icon: LayoutDashboard }] },
  { group: 'People', items: [
    { key: 'employees', to: '/admin/employees', label: 'Employees', icon: BriefcaseBusiness },
    { key: 'attendance', to: '/admin/attendance', label: 'Attendance', icon: Clock },
    { key: 'leave', to: '/admin/leave', label: 'Leave & holidays', icon: CalendarDays },
    { key: 'tasks', to: '/admin/tasks', label: 'Tasks & projects', icon: SquareCheckBig },
    { key: 'chat', to: '/admin/chat', label: 'Chat', icon: MessageSquare },
  ] },
  { group: 'Insights', items: [{ key: 'reports', to: '/admin/reports', label: 'Reports', icon: BarChart3 }] },
  { group: 'Company content', items: [
    { key: 'presentations', to: '/admin/dashboard', label: 'Presentations', icon: Presentation },
    { key: 'videos', to: '/admin/videos', label: 'Videos', icon: Clapperboard },
  ] },
  { group: 'Setup', items: [
    { key: 'policy', to: '/admin/policy', label: 'Work policy', icon: SlidersHorizontal },
    { key: 'master', to: '/admin/master-data', label: 'Master data', icon: ListChecks },
    { key: 'audit', to: '/admin/audit', label: 'Audit log', icon: ScrollText },
  ] },
];
export type AdminTabKey = 'home' | 'employees' | 'attendance' | 'leave' | 'tasks' | 'chat' | 'reports' | 'presentations' | 'videos' | 'policy' | 'master' | 'audit';
