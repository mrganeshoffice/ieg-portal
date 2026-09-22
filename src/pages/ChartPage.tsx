import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import FlowCanvas from '@/components/flow/FlowCanvas';
import PageHeader from '@/components/ui/PageHeader';
import Gate, { ChartSkeleton } from '@/components/ui/Gate';
import { adminTree, deptTrees, groupStructure, hrTrees } from '@/data/trees';
import { countConfirm } from '@/data/confirmations';
import { deptByKey, departments, type DeptKey } from '@/data/departments';
import type { OrgNode } from '@/types';

type Kind = 'group' | 'hr' | 'dept' | 'admin';

export default function ChartPage({ kind }: { kind: Kind }) {
  const { n, key } = useParams();
  const view = useMemo<{ title: string; desc: string; root?: OrgNode; imageUrl?: string }>(() => {
    switch (kind) {
      case 'group': return { title: 'IEG Group Structure', desc: 'Reporting hierarchy under the Managing Director, with functional heads and business units.', root: groupStructure, imageUrl: '/group-structure-infographic.png' };
      case 'admin': return { title: 'Administration Structure', desc: 'Administration Team, Directors, HR and compliance roles.', root: adminTree };
      case 'hr': { const r = hrTrees[Number(n)]; return { title: `HR Head ${n} Flow`, desc: r ? `${r.label}: Director ${n} → HR Head ${n} → department heads and teams.` : '', root: r }; }
      case 'dept': {
        const ok = departments.some((d) => d.key === key);
        return ok ? { title: deptByKey(key as DeptKey).label, desc: deptByKey(key as DeptKey).description, root: deptTrees[key as DeptKey] } : { title: '', desc: '' };
      }
    }
  }, [kind, n, key]);

  if (!view.root) return <div className="card p-10 text-center"><h1 className="text-xl font-bold">Flow not found</h1><Link to="/" className="btn-primary mt-4">Back to dashboard</Link></div>;
  return (
    <>
      <PageHeader title={view.title} description={view.desc} confirmCount={countConfirm(view.root)} />
      <Gate skeleton={<ChartSkeleton />}><FlowCanvas key={`${kind}-${n}-${key}`} root={view.root} imageUrl={view.imageUrl} /></Gate>
    </>
  );
}
