import type { NodeKind } from '@/types';
import { navItems } from '@/config/navigation';
import { groupStructure, hrTrees, deptTrees, adminTree } from '@/data/trees';
import { walk } from '@/data/confirmations';
import type { OrgNode } from '@/types';

export interface SearchEntry { key: string; label: string; subtitle?: string; kind: 'page' | NodeKind; route: string; focus?: string }

const cache: Record<string, SearchEntry[]> = {};

/** `full` = the person may see the company portal (org charts, layouts, products). Others only get their work pages. */
export function searchIndex(full = true): SearchEntry[] {
  const ck = full ? 'full' : 'work';
  if (cache[ck]) return cache[ck];
  const out: SearchEntry[] = navItems.filter((n) => !n.action && !n.roles && (full || !n.full)).map((n) => ({ key: `page:${n.id}`, label: n.label, subtitle: n.description, kind: 'page', route: n.path }));
  if (!full) return (cache[ck] = out);
  const add = (root: OrgNode, route: string, where: string) => walk(root, (n) => out.push({ key: `${route}:${n.id}`, label: n.label, subtitle: [n.subtitle, where].filter(Boolean).join(' · '), kind: n.kind, route, focus: n.id }));
  add(groupStructure, '/group-structure', 'Group Structure');
  Object.entries(hrTrees).forEach(([n, t]) => add(t, `/hr/${n}`, t.label));
  Object.entries(deptTrees).forEach(([k, t]) => add(t, `/departments/${k}`, 'Department'));
  add(adminTree, '/administration', 'Administration');
  cache[ck] = out;
  return out;
}

export function runSearch(q: string, limit = 12, full = true): SearchEntry[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const seen = new Set<string>();
  return searchIndex(full)
    .filter((e) => `${e.label} ${e.subtitle ?? ''}`.toLowerCase().includes(t))
    .sort((a, b) => Number(b.label.toLowerCase().startsWith(t)) - Number(a.label.toLowerCase().startsWith(t)) || Number(a.kind !== 'page') - Number(b.kind !== 'page'))
    .filter((e) => { const k = `${e.label}|${e.subtitle}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, limit);
}
