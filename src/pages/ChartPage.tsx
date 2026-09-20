import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import FlowCanvas from '@/components/flow/FlowCanvas';
import PageHeader from '@/components/ui/PageHeader';
import Gate, { ChartSkeleton } from '@/components/ui/Gate';
import { adminTree, deptTrees, groupStructure, hrTrees, orgChart } from '@/data/trees';
import { countConfirm } from '@/data/confirmations';
import { deptByKey, departments, type DeptKey } from '@/data/departments';
import type { OrgNode } from '@/types';
import { indexTree } from '@/components/flow/layout';
import { kindMeta } from '@/components/flow/nodeStyles';

const singular: Record<string, string> = { admin: 'Administration Team', subsidiary: 'Subsidiary' };
const plural: Record<string, string> = { admin: 'Administration Teams', subsidiary: 'Subsidiaries', director: 'Directors', company: 'Companies' };

type Kind = 'org' | 'group' | 'hr' | 'dept' | 'admin';

export default function ChartPage({ kind }: { kind: Kind }) {
  const { n, key } = useParams();
  const view = useMemo<{ title: string; desc: string; root?: OrgNode }>(() => {
    switch (kind) {
      case 'org': return { title: 'Company Organization Chart', desc: 'IEG Group, Parent Company, subsidiaries and R&D. Each subsidiary has its own Administration Team and Director. The Production Manager reports from the Group.', root: orgChart };
      case 'group': return { title: 'IEG Group Structure', desc: 'Reporting hierarchy under the Managing Director, with functional heads and business units.', root: groupStructure };
      case 'admin': return { title: 'Administration Structure', desc: 'Administration Team, Directors, HR and compliance roles.', root: adminTree };
      case 'hr': { const r = hrTrees[Number(n)]; return { title: `HR Head ${n} Flow`, desc: r ? `${r.label}: Director ${n} → HR Head ${n} → department heads and teams.` : '', root: r }; }
      case 'dept': {
        const ok = departments.some((d) => d.key === key);
        return ok ? { title: deptByKey(key as DeptKey).label, desc: deptByKey(key as DeptKey).description, root: deptTrees[key as DeptKey] } : { title: '', desc: '' };
      }
    }
  }, [kind, n, key]);

  const stats = useMemo(() => {
    if (!view.root) return [];
    const counts = new Map<string, number>();
    indexTree(view.root).forEach(({ node }) => { if (node.kind !== 'grouping') counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1); });
    return [...counts.entries()].filter(([, c]) => c > 0).slice(0, 6) as [keyof typeof kindMeta, number][];
  }, [view.root]);

  if (!view.root) return <div className="card p-10 text-center"><h1 className="text-xl font-bold">Flow not found</h1><Link to="/" className="btn-primary mt-4">Back to dashboard</Link></div>;
  return (
    <>
      <PageHeader title={view.title} description={view.desc} confirmCount={countConfirm(view.root)} />
      {kind === 'org' && (
        <div className="no-print mb-4 flex flex-wrap gap-2">
          {stats.map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2 text-sm shadow-soft">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: kindMeta[k].color }} />
              <b className="text-base">{c}</b><span className="text-muted">{(c === 1 ? singular : plural)[k] ?? kindMeta[k].label}</span>
            </span>
          ))}
          <span className="inline-flex items-center rounded-2xl border border-dashed border-line px-3.5 py-2 text-xs text-muted">Hover a box to light up its reporting line · click for details</span>
        </div>
      )}
      <Gate skeleton={<ChartSkeleton />}><FlowCanvas key={`${kind}-${n}-${key}`} root={view.root} /></Gate>
    </>
  );
}
