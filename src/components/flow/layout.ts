import type { Edge, Node } from '@xyflow/react';
import type { OrgNode } from '@/types';
import { kindMeta } from './nodeStyles';

export const NODE_W = 240;
export const NODE_H = 84;
const H_GAP = 30, V_GAP = 76, STACK_GAP = 22, INDENT = 48;

export type OrgNodeData = {
  node: OrgNode; depth: number; childCount: number; collapsed: boolean;
  selected?: boolean; match?: boolean; dim?: boolean; lit?: boolean; fade?: boolean; onToggle?: (id: string) => void;
};
export type OrgFlowNode = Node<OrgNodeData, 'org'>;

interface M { w: number; h: number; stack: boolean; kids: { node: OrgNode; m: M }[] }

function measure(n: OrgNode, collapsed: Set<string>, forceStack: boolean): M {
  const open = !!n.children?.length && !collapsed.has(n.id);
  if (!open) return { w: NODE_W, h: NODE_H, stack: false, kids: [] };
  const ch = n.children!;
  const stack = forceStack || n.layout === 'stack' || (ch.length >= 3 && ch.every((c) => !c.children?.length));
  const kids = ch.map((c) => ({ node: c, m: measure(c, collapsed, stack) }));
  if (stack) {
    const w = Math.max(NODE_W, INDENT + Math.max(...kids.map((k) => k.m.w)));
    const h = NODE_H + STACK_GAP + kids.reduce((s, k) => s + k.m.h, 0) + STACK_GAP * (kids.length - 1);
    return { w, h, stack, kids };
  }
  const w = Math.max(NODE_W, kids.reduce((s, k) => s + k.m.w, 0) + H_GAP * (kids.length - 1));
  const h = NODE_H + V_GAP + Math.max(...kids.map((k) => k.m.h));
  return { w, h, stack, kids };
}

/** Tidy top-to-bottom tree layout. Wide leaf lists become an indented "stack" so charts stay readable. */
export function layoutTree(root: OrgNode, collapsed: Set<string>) {
  const nodes: OrgFlowNode[] = [];
  const edges: Edge[] = [];

  function place(n: OrgNode, m: M, left: number, top: number, parentStack: boolean, depth: number, parent?: OrgNode) {
    const x = parentStack || m.stack ? left : left + (m.w - NODE_W) / 2;
    nodes.push({
      id: n.id, type: 'org', position: { x, y: top }, draggable: false,
      data: { node: n, depth, childCount: n.children?.length ?? 0, collapsed: collapsed.has(n.id) },
    });
    if (parent) {
      const color = kindMeta[n.kind].color;
      edges.push({
        id: `${parent.id}->${n.id}`, source: parent.id, target: n.id, type: 'smoothstep',
        ...(parentStack ? { sourceHandle: 'trunk', targetHandle: 'left' } : {}),
        style: { stroke: color, strokeWidth: 1.8, opacity: 0.6, strokeLinecap: 'round' },
        pathOptions: { borderRadius: 18 },
      } as Edge);
    }
    if (m.stack) {
      let y = top + NODE_H + STACK_GAP;
      m.kids.forEach((k) => { place(k.node, k.m, left + INDENT, y, true, depth + 1, n); y += k.m.h + STACK_GAP; });
    } else {
      let cx = left;
      m.kids.forEach((k) => { place(k.node, k.m, cx, top + NODE_H + V_GAP, false, depth + 1, n); cx += k.m.w + H_GAP; });
    }
  }
  place(root, measure(root, collapsed, false), 0, 0, false, 0);
  return { nodes, edges };
}

export interface IndexEntry { node: OrgNode; parent?: OrgNode; path: OrgNode[]; department?: string }

export function indexTree(root: OrgNode) {
  const map = new Map<string, IndexEntry>();
  (function go(n: OrgNode, path: OrgNode[], dept?: string) {
    const d = n.department ?? dept;
    const p = [...path, n];
    map.set(n.id, { node: n, parent: path[path.length - 1], path: p, department: d });
    n.children?.forEach((c) => go(c, p, d));
  })(root, []);
  return map;
}
