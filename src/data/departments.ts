import { units as unitList } from './common';

export type DeptKey = 'electrical' | 'mechanical' | 'production' | 'business' | 'service' | 'transport' | 'rnd';

export interface Dept { key: DeptKey; label: string; headLabel: string; description: string }

export const departments: Dept[] = [
  { key: 'electrical', label: 'Electrical Department', headLabel: 'Electrical Head', description: 'Battery, power electronics, charging infrastructure, service and manufacturing-test engineering.' },
  { key: 'mechanical', label: 'Mechanical Department', headLabel: 'Mechanical Head', description: 'Mechanical, battery and thermal design plus vehicle integration.' },
  { key: 'production', label: 'Production Department', headLabel: 'Production Head', description: 'Assembly-line production, line supervision and technicians.' },
  { key: 'business', label: 'Business Department', headLabel: 'Business Head', description: 'Sales, business development and key-account management.' },
  { key: 'service', label: 'Service Department', headLabel: 'Service Head', description: 'After-sales service reporting under the HR Head 1 line.' },
  { key: 'transport', label: 'Transport Department', headLabel: 'Transporter Head', description: 'Transport and logistics reporting under the HR Head 1 line.' },
  { key: 'rnd', label: 'Research & Development', headLabel: 'R&D', description: 'Group R&D function and the Director 6 R&D line.' },
];

export interface UnitDept { dept: DeptKey; roles: string[]; confirm?: string }
export interface Unit { n: number; name: string; depts: UnitDept[] }

const NO_ROLES = 'Team roles below this head were not shown in the supplied photographs.';

/** Roles for HR Head 1 (Electric Vehicles) come from the HR Head 1 flow photograph. */
export const units: Unit[] = [
  {
    n: 1, name: unitList[0].name,
    depts: [
      { dept: 'electrical', roles: ['Battery Technology Engineers', 'Power Electronics Engineers', 'Charging Infrastructure Engineer', 'Service & Maintenance Engineer', 'Manufacturing & Testing Engineer'] },
      { dept: 'mechanical', roles: ['Mechanical Design Engineer', 'Battery Design Engineer', 'Vehicle Integration Engineer', 'Thermal Systems Engineer'] },
      { dept: 'production', roles: ['Production Technician', 'Production Incharge', 'Line In-charge', 'Production Operator (Assembly Line)'] },
      { dept: 'business', roles: ['Sales Manager', 'Business Development Manager', 'Key Account Manager', 'Sales Executive'] },
      { dept: 'service', roles: [], confirm: NO_ROLES },
      { dept: 'transport', roles: [], confirm: NO_ROLES },
    ],
  },
  ...unitList.slice(1).map((u) => ({
    n: u.n, name: u.name,
    depts: [
      { dept: 'production' as DeptKey, roles: [] as string[], confirm: NO_ROLES },
      { dept: 'business' as DeptKey, roles: [] as string[], confirm: NO_ROLES },
    ],
  })),
];

export const deptByKey = (k: DeptKey) => departments.find((d) => d.key === k)!;
