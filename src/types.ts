import type { LucideIcon } from 'lucide-react';

export type NodeKind =
  | 'group' | 'company' | 'subsidiary' | 'director' | 'management' | 'hr'
  | 'head' | 'role' | 'admin' | 'rnd' | 'legal' | 'production' | 'grouping';

/** A node of any hierarchy in the portal. `confirm` marks text that must be verified against the source photo. */
export interface OrgNode {
  id: string;
  label: string;
  subtitle?: string;
  kind: NodeKind;
  department?: string;
  description?: string;
  /** If set, the item is flagged "needs confirmation" and this explains why. */
  confirm?: string;
  layout?: 'stack';
  children?: OrgNode[];
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  section: string;
  description: string;
  action?: 'logout';
}
