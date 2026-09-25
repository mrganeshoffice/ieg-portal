import {
  LayoutDashboard, Building2, Users, Zap, Cog, Factory, Briefcase, Wrench, Truck, FlaskConical,
  Map, Ruler, ShieldCheck, Settings, LogOut, Info, Presentation,
  Laptop, Calculator, Globe2, TrendingUp, Megaphone, Waypoints,
} from 'lucide-react';
import type { NavItem } from '@/types';
import { units } from '@/data/common';
import { departments } from '@/data/departments';

const deptIcons = { electrical: Zap, mechanical: Cog, production: Factory, business: Briefcase, service: Wrench, transport: Truck, it: Laptop, account: Calculator, intlbiz: Globe2, finance: TrendingUp, pr: Megaphone, rnd: FlaskConical };

/** Sidebar, breadcrumbs, search and dashboard are all driven from this list. Add an item here to add a page. */
export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, section: 'Overview', description: 'Portal overview' },
  { id: 'about', label: 'About IEG', path: '/about', icon: Info, section: 'Overview', description: 'Journey, board of directors, vision and contact details' },
  { id: 'group', label: 'IEG Group Structure', path: '/group-structure', icon: Building2, section: 'Organization', description: 'Group reporting hierarchy' },
  { id: 'organisation-flow', label: 'Organisation Flow', path: '/organisation-flow', icon: Waypoints, section: 'Organization', description: 'All reference infographics for the Group, company and department structures' },
  ...units.map((u): NavItem => ({ id: `hr${u.n}`, label: u.name, path: `/hr/${u.n}`, icon: Users, section: 'Subsidiary Companies', description: `${u.name} reporting flow` })),
  ...departments.map((d): NavItem => ({ id: `dept-${d.key}`, label: d.key === 'rnd' ? 'Research & Development' : d.label, path: `/departments/${d.key}`, icon: deptIcons[d.key], section: 'Departments', description: d.description })),
  { id: 'layout', label: 'Factory Layout', path: '/factory-layout', icon: Map, section: 'Factory', description: 'Vastu-based plant layout and material flow' },
  { id: 'dims', label: 'Factory Dimensions', path: '/factory-dimensions', icon: Ruler, section: 'Factory', description: 'Recommended dimensional sizes' },
  { id: 'ppt', label: 'Our Product PPT', path: '/product-ppt', icon: Presentation, section: 'Products', description: 'Product presentations and technical information' },
  { id: 'admin', label: 'Administration Structure', path: '/administration', icon: ShieldCheck, section: 'Administration', description: 'Administration Team and support functions' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, section: 'Account', description: 'Theme, data confirmation and session' },
  { id: 'logout', label: 'Logout', path: '#logout', icon: LogOut, section: 'Account', description: 'Sign out', action: 'logout' },
];

export const findNav = (pathname: string) => navItems.find((n) => n.path === pathname);
