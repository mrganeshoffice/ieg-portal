import type { NodeKind } from '@/types';
import { navItems } from '@/config/navigation';
import { groupStructure, hrTrees, deptTrees, adminTree } from '@/data/trees';
import { walk } from '@/data/confirmations';
import type { OrgNode } from '@/types';

export interface SearchEntry { key: string; label: string; subtitle?: string; kind: 'page' | NodeKind; route: string; focus?: string }

let cache: SearchEntry[] | null = null;

export function searchIndex(): SearchEntry[] {
  if (cache) return cache;
  const out: SearchEntry[] = navItems.filter((n) => !n.action).map((n) => ({ key: `page:${n.id}`, label: n.label, subtitle: n.description, kind: 'page', route: n.path }));
  const add = (root: OrgNode, route: string, where: string) => walk(root, (n) => out.push({ key: `${route}:${n.id}`, label: n.label, subtitle: [n.subtitle, where].filter(Boolean).join(' · '), kind: n.kind, route, focus: n.id }));
  add(groupStructure, '/group-structure', 'Group Structure');
  Object.entries(hrTrees).forEach(([n, t]) => add(t, `/hr/${n}`, t.label));
  Object.entries(deptTrees).forEach(([k, t]) => add(t, `/departments/${k}`, 'Department'));
  add(adminTree, '/administration', 'Administration');
  cache = out;
  return out;
}

export function runSearch(q: string, limit = 12): SearchEntry[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const seen = new Set<string>();
  return searchIndex()
    .filter((e) => `${e.label} ${e.subtitle ?? ''}`.toLowerCase().includes(t))
    .sort((a, b) => Number(b.label.toLowerCase().startsWith(t)) - Number(a.label.toLowerCase().startsWith(t)) || Number(a.kind !== 'page') - Number(b.kind !== 'page'))
    .filter((e) => { const k = `${e.label}|${e.subtitle}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, limit);
}
