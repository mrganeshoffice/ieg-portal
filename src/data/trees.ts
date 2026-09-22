import type { OrgNode } from '@/types';
import { PHOTO_CONFIRM, units as unitList } from './common';
import { departments, deptByKey, units, type DeptKey } from './departments';

/* IEG Group reporting structure (source: "IEG Group" photo) */
const head = (id: string, label: string, extra: Partial<OrgNode> = {}): OrgNode => ({ id, label, kind: 'head', ...extra });

export const groupStructure: OrgNode = {
  id: 'g-root', label: 'IEG AUTO POWER LTD (IEG Group)', kind: 'group',
  description: 'Group reporting structure as drawn in the IEG Group chart.',
  children: [
    { id: 'g-dir-a', label: 'Vijay Krishna Gupta', subtitle: 'Director', kind: 'director', description: 'Director on the Board of Directors (IEG Technical Presentation). Drawn beside the Managing Director in the Group chart.' },
    {
      id: 'g-md', label: 'Ajay Choudhary', subtitle: 'Managing Director', kind: 'management', description: 'Managing Director of IEG Group and inventor of the patented Internal Energy Generating (IEG) system.',
      children: [
        {
          id: 'g-heads', label: 'Department Heads', kind: 'grouping', layout: 'stack',
          description: 'Grouping node added for readability. These heads sit on the shared reporting line under the Managing Director in the chart.',
          children: [
            head('g-business', 'Business Head', { department: 'Business' }),
            head('g-electrical', 'Electrical Head', { department: 'Electrical' }),
            head('g-mechanical', 'Mechanical Head', { department: 'Mechanical', confirm: 'Written "Mechnical Head" in the photo; assumed to mean Mechanical Head.' }),
            head('g-it', 'IT Head', { department: 'IT' }),
            head('g-production', 'Production Head', { department: 'Production' }),
            head('g-transport', 'Transport Head', { department: 'Transport', confirm: 'Written "Transpot Head" in the photo; assumed to mean Transport Head.' }),
            head('g-service', 'Service Head', { department: 'Service' }),
            head('g-account', 'Account Head', { department: 'Account' }),
            head('g-intlbiz', 'International Business Head', { department: 'International Business' }),
            head('g-finance', 'Finance Head', { department: 'Finance' }),
            head('g-pr', 'PR Head', { department: 'PR' }),
            { id: 'g-rnd', label: 'R&D', kind: 'rnd', department: 'Research & Development' },
          ],
        },
        {
          id: 'g-support', label: 'Admin, HR & Compliance', kind: 'grouping', layout: 'stack',
          description: 'Grouping node added for readability.',
          children: [
            { id: 'g-admin', label: 'Admin', kind: 'admin' },
            {
              id: 'g-hrdir', label: 'HR Director', kind: 'hr', department: 'HR',
              children: [1, 2, 3].map((n) => ({ id: `g-hr${n}`, label: `HR ${n}`, kind: 'hr' as const, department: 'HR', confirm: n === 1 ? 'HR 1 is circled with handwritten notes in the photo. Meaning to be confirmed.' : undefined })),
            },
            { id: 'g-legal', label: 'Legal', kind: 'legal' },
            { id: 'g-ca', label: 'CA', subtitle: 'Chartered Accountant', kind: 'legal', confirm: 'Abbreviation "CA" expanded from context.' },
            { id: 'g-cs', label: 'CS', subtitle: 'Company Secretary', kind: 'legal', confirm: 'Abbreviation "CS" expanded from context.' },
          ],
        },
        {
          id: 'g-units', label: 'Business Units', kind: 'grouping',
          description: 'Grouping node added for readability. Each unit reports to its Director, with a Head HR beneath.',
          children: [
            ...unitList.map((u) => ({
              id: `g-unit-${u.n}`, label: u.name, kind: 'subsidiary' as const, subtitle: `Subsidiary ${u.n}`,
              children: [{ id: `g-unit-${u.n}-dir`, label: `Director ${u.n}`, kind: 'director' as const, children: [{ id: `g-unit-${u.n}-hr`, label: 'Head HR', kind: 'hr' as const, subtitle: `HR Head ${u.n}` }] }],
            })),
            { id: 'g-unit-6', label: 'R&D', kind: 'rnd' as const, subtitle: 'Director 6 line', children: [{ id: 'g-unit-6-dir', label: 'Director 6', kind: 'director' as const, children: [{ id: 'g-unit-6-hr', label: 'Head HR', kind: 'hr' as const }] }] },
          ],
        },
      ],
    },
    { id: 'g-dir-b', label: 'Kanchan Singh', subtitle: 'Director', kind: 'director', description: 'Director on the Board of Directors (IEG Technical Presentation). Drawn beside the Managing Director in the Group chart.' },
  ],
};

/* HR Head flows */
export function buildHrTree(n: number): OrgNode | undefined {
  const unit = units.find((u) => u.n === n);
  if (!unit) return undefined;
  return {
    id: `hr${n}-unit`, label: unit.name, subtitle: `Subsidiary ${n}`, kind: 'subsidiary',
    description: `${unit.name} reporting flow: Director ${n} → HR Head ${n} → department heads.`,
    children: [{
      id: `hr${n}-dir`, label: `Director ${n}`, kind: 'director', description: `Director ${n} oversees ${unit.name}.`,
      children: [{
        id: `hr${n}-hr`, label: `HR Head ${n}`, subtitle: `(${unit.name})`, kind: 'hr',
        description: `HR Head ${n} of ${unit.name}. Department heads report to this role.`,
        children: unit.depts.map((ud) => {
          const d = deptByKey(ud.dept);
          const id = `hr${n}-${ud.dept}`;
          return {
            id, label: d.headLabel, kind: 'head' as const, department: d.label, confirm: ud.confirm,
            description: `${d.headLabel} in ${unit.name}. ${d.description}`,
            children: ud.roles.map((r, i) => ({ id: `${id}-r${i}`, label: r, kind: 'role' as const, department: d.label, description: `${r} reports to the ${d.headLabel} (${unit.name}).` })),
          };
        }),
      }],
    }],
  };
}
export const hrTrees: Record<number, OrgNode> = Object.fromEntries(units.map((u) => [u.n, buildHrTree(u.n)!]));

/* Department pages */
export function buildDeptTree(key: DeptKey): OrgNode {
  const d = deptByKey(key);
  if (key === 'rnd') {
    return {
      id: 'dept-rnd', label: 'Research & Development', kind: 'rnd', department: d.label, description: d.description,
      children: [
        { id: 'rnd-group', label: 'R&D (Group)', kind: 'rnd', department: d.label, description: 'R&D box on the organization chart and Group chart.', confirm: 'Internal R&D roles were not supplied.' },
        {
          id: 'rnd-dir6', label: 'Director 6', kind: 'director', department: d.label, description: 'Director 6 is linked to R&D in the Group chart.',
          children: [{ id: 'rnd-hr6', label: 'Head HR', kind: 'hr', department: d.label, confirm: 'The Head HR under Director 6 is shown in the Group chart without a number.' }],
        },
      ],
    };
  }
  return {
    id: `dept-${key}`, label: d.label, kind: 'head', department: d.label, description: d.description,
    children: units.flatMap((u): OrgNode[] => {
      const ud = u.depts.find((x) => x.dept === key);
      if (!ud) return [];
      const id = `dept-${key}-${u.n}`;
      return [{
        id, label: d.headLabel, subtitle: u.name, kind: 'head', department: d.label, confirm: ud.confirm,
        description: `${d.headLabel} under HR Head ${u.n} (${u.name}).`,
        children: ud.roles.map((r, i) => ({ id: `${id}-r${i}`, label: r, kind: 'role' as const, department: d.label })),
      }];
    }),
  };
}
export const deptTrees = Object.fromEntries(departments.map((d) => [d.key, buildDeptTree(d.key)])) as Record<DeptKey, OrgNode>;

/* Administration structure */
export const adminTree: OrgNode = {
  id: 'adm-root', label: 'Administration Team', kind: 'admin', layout: 'stack',
  description: 'Administration Team from the organization chart, with the Admin, HR and compliance roles shown in the Group chart.',
  children: [
    ...[1, 2, 3, 4, 5, 6].map((n) => ({
      id: `adm-dir-${n}`, label: `Director ${n}`, kind: 'director' as const, subtitle: n <= 5 ? unitList[n - 1].name : 'R&D',
      description: 'Director drawn under the Administration Team in the organization chart.',
    })),
    { id: 'adm-admin', label: 'Admin', kind: 'admin' as const, description: 'Admin box in the Group chart.' },
    {
      id: 'adm-hrdir', label: 'HR Director', kind: 'hr' as const, description: 'HR Director in the Group chart.',
      children: [1, 2, 3].map((n) => ({ id: `adm-hr${n}`, label: `HR ${n}`, kind: 'hr' as const, confirm: n === 1 ? PHOTO_CONFIRM : undefined })),
    },
    { id: 'adm-legal', label: 'Legal', kind: 'legal' as const },
    { id: 'adm-ca', label: 'CA', subtitle: 'Chartered Accountant', kind: 'legal' as const, confirm: 'Abbreviation expanded from context.' },
    { id: 'adm-cs', label: 'CS', subtitle: 'Company Secretary', kind: 'legal' as const, confirm: 'Abbreviation expanded from context.' },
  ],
};
