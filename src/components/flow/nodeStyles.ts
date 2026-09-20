import { Network, Building2, Building, Crown, UserCog, Users, Briefcase, User, ShieldCheck, FlaskConical, Scale, Factory, Layers, type LucideIcon } from 'lucide-react';
import type { NodeKind } from '@/types';

export const kindMeta: Record<NodeKind, { label: string; icon: LucideIcon; color: string }> = {
  group: { label: 'Group', icon: Network, color: '#1FA2E8' },
  company: { label: 'Company', icon: Building2, color: '#6366F1' },
  subsidiary: { label: 'Subsidiary', icon: Building, color: '#14B8A6' },
  director: { label: 'Director', icon: Crown, color: '#F59E0B' },
  management: { label: 'Management', icon: UserCog, color: '#8B5CF6' },
  hr: { label: 'HR', icon: Users, color: '#EC4899' },
  head: { label: 'Department head', icon: Briefcase, color: '#22A862' },
  role: { label: 'Role', icon: User, color: '#64748B' },
  admin: { label: 'Administration', icon: ShieldCheck, color: '#0EA5A4' },
  rnd: { label: 'R&D', icon: FlaskConical, color: '#10B981' },
  legal: { label: 'Legal & finance', icon: Scale, color: '#A16207' },
  production: { label: 'Production', icon: Factory, color: '#F97316' },
  grouping: { label: 'Grouping', icon: Layers, color: '#94A3B8' },
};
