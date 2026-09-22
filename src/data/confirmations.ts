import type { OrgNode } from '@/types';
import { groupStructure, hrTrees, deptTrees, adminTree } from './trees';
import { CONFIRM_500, CONFIRM_LAYOUT } from './factory';

export interface Confirmation { id: string; source: string; label: string; reason: string; route: string; focus?: string }

function walk(n: OrgNode, fn: (n: OrgNode) => void) { fn(n); n.children?.forEach((c) => walk(c, fn)); }

function collect(source: string, route: string, root: OrgNode, out: Confirmation[]) {
  walk(root, (n) => { if (n.confirm) out.push({ id: `${route}:${n.id}`, source, label: n.label + (n.subtitle ? ` (${n.subtitle})` : ''), reason: n.confirm, route, focus: n.id }); });
}

/** Everything flagged "needs confirmation" across the portal. */
export function allConfirmations(): Confirmation[] {
  const out: Confirmation[] = [];
  collect('IEG Group Structure', '/group-structure', groupStructure, out);
  Object.entries(hrTrees).forEach(([n, t]) => collect(`HR Head ${n} Flow`, `/hr/${n}`, t, out));
  Object.entries(deptTrees).forEach(([k, t]) => collect('Department', `/departments/${k}`, t, out));
  collect('Administration Structure', '/administration', adminTree, out);
  out.push({ id: 'factory-layout', source: 'Factory Layout', label: 'Zone placement', reason: CONFIRM_LAYOUT, route: '/factory-layout' });
  out.push({ id: 'factory-500', source: 'Factory Dimensions', label: '500 pcs/day totals', reason: CONFIRM_500, route: '/factory-dimensions' });
  return out;
}

export function countConfirm(root: OrgNode): number { let c = 0; walk(root, (n) => { if (n.confirm) c++; }); return c; }
export { walk };
