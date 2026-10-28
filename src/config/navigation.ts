import {
  LayoutDashboard, Building2, Users, Zap, Cog, Factory, Briefcase, Wrench, Truck, FlaskConical,
  Map, Ruler, ShieldCheck, Settings, LogOut, Info, Presentation,
  Laptop, Calculator, Globe2, TrendingUp, Megaphone, Waypoints, Clapperboard, Building, UserCircle, UsersRound, BriefcaseBusiness,
  Home, Clock, ListChecks, CalendarDays, MessageSquare, BarChart3, SlidersHorizontal,
} from 'lucide-react';
import type { NavItem } from '@/types';
import { units } from '@/data/common';
import { departments } from '@/data/departments';

const deptIcons = { electrical: Zap, mechanical: Cog, production: Factory, business: Briefcase, service: Wrench, transport: Truck, it: Laptop, account: Calculator, intlbiz: Globe2, finance: TrendingUp, pr: Megaphone, rnd: FlaskConical };

/** Sidebar, breadcrumbs, search and dashboard are all driven from this list. Add an item here to add a page. */
export const navItems: NavItem[] = [
  { id: 'work-home', label: 'My Work', path: '/work', icon: Home, section: 'My Work', description: 'Your day at a glance: attendance, tasks and leave' },
  { id: 'attendance', label: 'Attendance', path: '/attendance', icon: Clock, section: 'My Work', description: 'Check in and out, and see your attendance' },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: ListChecks, section: 'My Work', description: 'Tasks assigned to you and by you' },
  { id: 'leave', label: 'Leave', path: '/leave', icon: CalendarDays, section: 'My Work', description: 'Apply for leave, balances, holidays and approvals' },
  { id: 'chat', label: 'Chat', path: '/chat', icon: MessageSquare, section: 'My Work', description: 'Message your colleagues' },
  { id: 'reports', label: 'Reports', path: '/reports', icon: BarChart3, section: 'My Work', description: 'Attendance, leave and task reports', roles: ['manager', 'admin', 'super_admin'] },
  { id: 'policy', label: 'Policy and Holidays', path: '/policy', icon: SlidersHorizontal, section: 'Administration', description: 'Attendance rules, holidays and leave types', roles: ['admin', 'super_admin'] },
  { full: true, id: 'dashboard', label: 'Company Dashboard', path: '/', icon: LayoutDashboard, section: 'Overview', description: 'Portal overview' },
  { full: true, id: 'about', label: 'About IEG', path: '/about', icon: Info, section: 'Overview', description: 'Journey, board of directors, vision and contact details' },
  { full: true, id: 'group', label: 'IEG Group Structure', path: '/group-structure', icon: Building2, section: 'Organization', description: 'Group reporting hierarchy' },
  { full: true, id: 'organisation-flow', label: 'Organisation Flow', path: '/organisation-flow', icon: Waypoints, section: 'Organization', description: 'All reference infographics for the Group, company and department structures' },
  ...units.map((u): NavItem => ({ full: true, id: `hr${u.n}`, label: u.name, path: `/hr/${u.n}`, icon: Users, section: 'Subsidiary Companies', description: `${u.name} reporting flow` })),
  ...departments.map((d): NavItem => ({ full: true, id: `dept-${d.key}`, label: d.key === 'rnd' ? 'Research & Development' : d.label, path: `/departments/${d.key}`, icon: deptIcons[d.key], section: 'Departments', description: d.description })),
  { full: true, id: 'layout', label: 'Factory Layout', path: '/factory-layout', icon: Map, section: 'Factory', description: 'Vastu-based plant layout and material flow' },
  { full: true, id: 'office-layout', label: 'Office Layout', path: '/office-layout', icon: Building, section: 'Factory', description: 'Corporate office 3D layout, architectural blueprint and office information' },
  { full: true, id: 'dims', label: 'Factory Dimensions', path: '/factory-dimensions', icon: Ruler, section: 'Factory', description: 'Recommended dimensional sizes' },
  { full: true, id: 'ppt', label: 'Our Product PPT', path: '/product-ppt', icon: Presentation, section: 'Products', description: 'Product presentations and technical information' },
  { full: true, id: 'videos', label: 'Videos', path: '/videos', icon: Clapperboard, section: 'Products', description: 'Watch product, training and event videos' },
  { full: true, id: 'admin', label: 'Administration Structure', path: '/administration', icon: ShieldCheck, section: 'Administration', description: 'Administration Team and support functions' },
  { id: 'my-profile', label: 'My Profile', path: '/my-profile', icon: UserCircle, section: 'Account', description: 'Your personal and professional details' },
  { id: 'my-team', label: 'My Team', path: '/my-team', icon: UsersRound, section: 'Account', description: 'People who report to you', roles: ['manager', 'admin', 'super_admin'] },
  { id: 'employee-admin', label: 'Employee Management', path: '/admin/employees', icon: BriefcaseBusiness, section: 'Administration', description: 'Create and manage employee accounts', roles: ['admin', 'super_admin'] },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, section: 'Account', description: 'Theme, data confirmation and session' },
  { id: 'logout', label: 'Logout', path: '#logout', icon: LogOut, section: 'Account', description: 'Sign out', action: 'logout' },
];

export const findNav = (pathname: string) => navItems.find((n) => n.path === pathname);

/** What this person's sidebar, search and routes may show. The server separately enforces every API call. */
export const navFor = (session: { role: string; fullAccess: boolean } | null) =>
  navItems.filter((n) => (!n.roles || (!!session && (n.roles as string[]).includes(session.role))) && (!n.full || !!session?.fullAccess));
