import { units as unitList } from './common';

export type DeptKey = 'electrical' | 'mechanical' | 'production' | 'business' | 'service' | 'transport' | 'it' | 'account' | 'intlbiz' | 'finance' | 'pr' | 'rnd';

export interface Dept { key: DeptKey; label: string; headLabel: string; description: string; groupRoles?: string[] }

export const departments: Dept[] = [
  { key: 'electrical', label: 'Electrical Department', headLabel: 'Electrical Head', description: 'Battery, power electronics, charging infrastructure, service and manufacturing-test engineering.' },
  { key: 'mechanical', label: 'Mechanical Department', headLabel: 'Mechanical Head', description: 'Mechanical, battery and thermal design plus vehicle integration.' },
  { key: 'production', label: 'Production Department', headLabel: 'Production Head', description: 'Assembly-line production, line supervision and technicians.' },
  { key: 'business', label: 'Business Department', headLabel: 'Business Head', description: 'Sales, business development and key-account management.' },
  { key: 'service', label: 'Service Department', headLabel: 'Service Head', description: 'After-sales service reporting under the HR Head 1 line.' },
  { key: 'transport', label: 'Transport Department', headLabel: 'Transporter Head', description: 'Transport and logistics reporting under the HR Head 1 line.' },
  {
    key: 'it', label: 'IT Department', headLabel: 'IT Head',
    description: 'Group IT infrastructure, business systems and cybersecurity. A corporate function reporting to the Managing Director (Group Structure).',
    groupRoles: ['IT Infrastructure Manager', 'Software & ERP Systems Manager', 'Network & Cybersecurity Engineer', 'IT Support Engineer'],
  },
  {
    key: 'account', label: 'Account Department', headLabel: 'Account Head',
    description: 'Group accounting, payables/receivables, payroll and taxation. A corporate function reporting to the Managing Director (Group Structure).',
    groupRoles: ['Accounts Manager', 'Accounts Payable Executive', 'Accounts Receivable Executive', 'Payroll Executive', 'Taxation & Compliance Executive'],
  },
  {
    key: 'intlbiz', label: 'International Business Department', headLabel: 'International Business Head',
    description: 'Export sales, overseas partnerships and international trade compliance. A corporate function reporting to the Managing Director (Group Structure).',
    groupRoles: ['Export Sales Manager', 'Overseas Business Development Executive', 'International Logistics & Documentation Executive', 'Trade Compliance Executive'],
  },
  {
    key: 'finance', label: 'Finance Department', headLabel: 'Finance Head',
    description: 'Group financial planning, budgeting, treasury and MIS. A corporate function reporting to the Managing Director (Group Structure).',
    groupRoles: ['Finance Manager', 'Budgeting & MIS Executive', 'Treasury Executive', 'Financial Analyst'],
  },
  {
    key: 'pr', label: 'PR Department', headLabel: 'PR Head',
    description: 'Corporate communications, media relations and brand management for the Group. Reports to the Managing Director (Group Structure).',
    groupRoles: ['PR & Communications Manager', 'Media Relations Executive', 'Brand & Content Executive', 'Corporate Events Executive'],
  },
  { key: 'rnd', label: 'Research & Development', headLabel: 'R&D', description: 'Group R&D function and the Director 6 R&D line.' },
];

export interface UnitDept { dept: DeptKey; roles: string[]; confirm?: string }
export interface Unit { n: number; name: string; depts: UnitDept[] }

/** Standard team used to complete a department's flow where the supplied photographs did not show individual roles. */
const STANDARD_PRODUCTION_TEAM = ['Production Manager', 'Production Supervisor', 'Line In-charge', 'Production Operator (Assembly Line)'];
const STANDARD_BUSINESS_TEAM = ['Sales Manager', 'Business Development Executive', 'Key Account Manager', 'Sales Executive'];

/** Roles for HR Head 1 (Electric Vehicles) come from the HR Head 1 flow photograph; Service and Transport below complete the standard corporate structure for that function. */
export const units: Unit[] = [
  {
    n: 1, name: unitList[0].name,
    depts: [
      { dept: 'electrical', roles: ['Battery Technology Engineers', 'Power Electronics Engineers', 'Charging Infrastructure Engineer', 'Service & Maintenance Engineer', 'Manufacturing & Testing Engineer'] },
      { dept: 'mechanical', roles: ['Mechanical Design Engineer', 'Battery Design Engineer', 'Vehicle Integration Engineer', 'Thermal Systems Engineer'] },
      { dept: 'production', roles: ['Production Technician', 'Production Incharge', 'Line In-charge', 'Production Operator (Assembly Line)'] },
      { dept: 'business', roles: ['Sales Manager', 'Business Development Manager', 'Key Account Manager', 'Sales Executive'] },
      { dept: 'service', roles: ['Service Manager', 'Service Engineer', 'Customer Support Executive', 'Warranty & Claims Executive'] },
      { dept: 'transport', roles: ['Transport Manager', 'Logistics Coordinator', 'Fleet Supervisor', 'Dispatch Executive'] },
    ],
  },
  ...unitList.slice(1).map((u) => ({
    n: u.n, name: u.name,
    depts: [
      { dept: 'production' as DeptKey, roles: STANDARD_PRODUCTION_TEAM },
      { dept: 'business' as DeptKey, roles: STANDARD_BUSINESS_TEAM },
    ],
  })),
];

export const deptByKey = (k: DeptKey) => departments.find((d) => d.key === k)!;
