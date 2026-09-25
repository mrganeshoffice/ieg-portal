/**
 * Data for the "Organisation Flow" module (sidebar → Organisation Flow).
 * Each entry is one reference infographic. Add, remove or reorder items here —
 * no UI code needs to change. `order` controls both the Structured Flow sequence
 * and the default Gallery order.
 *
 * To add a new image: drop the file into `public/organisation-flow/`, then add
 * an entry below with a unique `id` and the next `order` number in its section.
 */

export type FlowSection = 'group' | 'company' | 'department';

export interface FlowItem {
  id: string;
  title: string;
  /** One line shown on the card and in the lightbox. */
  description: string;
  section: FlowSection;
  order: number;
  /** Path under /public. */
  image: string;
}

export const flowSectionMeta: Record<FlowSection, { label: string; blurb: string }> = {
  group: {
    label: 'Group Structure',
    blurb: 'IEG Auto Power Ltd — Directors, Management, Department Heads, Admin/HR/Compliance and Business Units.',
  },
  company: {
    label: 'Company Structures',
    blurb: 'Per-company reporting line: Director → HR Head → Department Heads and their teams.',
  },
  department: {
    label: 'Department Structures',
    blurb: 'Functional teams under each Department Head, across the Group.',
  },
};

/** Section order for the Structured Flow view. */
export const flowSectionOrder: FlowSection[] = ['group', 'company', 'department'];

export const organisationFlowItems: FlowItem[] = [
  { id: 'group-auto-power-ltd', title: 'IEG Auto Power Ltd — Group Structure', description: 'Directors, Managing Director, Department Heads, Admin/HR/Compliance and Business Units in one view.', section: 'group', order: 1, image: '/organisation-flow/01-group-auto-power-ltd.jpg' },

  { id: 'company-mega-industrial-power', title: 'IEG Mega Industrial Power Pvt.Ltd', description: 'Director 1 → HR Head 1 → Electrical, Mechanical, Production, Business, Service and Transporter Heads with their teams.', section: 'company', order: 1, image: '/organisation-flow/02-company-mega-industrial-power.jpg' },
  { id: 'company-smart-homes-energies', title: 'IEG Smart Homes Energies Pvt. Ltd', description: 'Director 2 → HR Head 2 → Production and Business Heads with their teams.', section: 'company', order: 2, image: '/organisation-flow/03-company-smart-homes-energies.jpg' },
  { id: 'company-ev-urja', title: 'IEG EV Urja Pvt. Ltd', description: 'Director 3 → HR Head 3 → Production and Business Heads with their teams.', section: 'company', order: 3, image: '/organisation-flow/04-company-ev-urja.jpg' },

  { id: 'dept-electrical', title: 'Electrical Department', description: 'Electrical Head with Battery Technology, Power Electronics, Charging Infrastructure, Service & Maintenance and Manufacturing & Testing Engineers.', section: 'department', order: 1, image: '/organisation-flow/05-dept-electrical.jpg' },
  { id: 'dept-mechanical', title: 'Mechanical Department', description: 'Mechanical Head with Mechanical Design, Battery Design, Integration and Thermal Systems Engineers.', section: 'department', order: 2, image: '/organisation-flow/06-dept-mechanical.jpg' },
  { id: 'dept-production', title: 'IEG Group Production Department', description: 'Production Heads and their teams (Production Manager, Supervisor, Line In-charge, Operator) across all five companies.', section: 'department', order: 3, image: '/organisation-flow/07-dept-production.jpg' },
  { id: 'dept-business', title: 'Business Department', description: 'Business Heads and their teams (Sales Manager, Business Development, Key Account Manager, Sales Executive) across all five companies.', section: 'department', order: 4, image: '/organisation-flow/08-dept-business.jpg' },
  { id: 'dept-service', title: 'Service Department', description: 'Service Head with Service Manager, Service Engineer, Customer Support Executive and Warranty & Claims Executive.', section: 'department', order: 5, image: '/organisation-flow/09-dept-service.jpg' },
  { id: 'dept-transport', title: 'Transport Department', description: 'Transporter Head with Transport Manager, Logistics Coordinator, Fleet Supervisor and Dispatch Executive.', section: 'department', order: 6, image: '/organisation-flow/10-dept-transport.jpg' },
  { id: 'dept-it', title: 'IT Department', description: 'IT Head with IT Infrastructure Manager, Software & ERP Systems Manager, Network & Cybersecurity Engineer and IT Support Engineer.', section: 'department', order: 7, image: '/organisation-flow/11-dept-it.jpg' },
  { id: 'dept-account', title: 'Accounts Department', description: 'Account Head with Accounts Manager, Accounts Payable, Accounts Receivable, Payroll and Taxation & Compliance Executives.', section: 'department', order: 8, image: '/organisation-flow/12-dept-account.jpg' },
  { id: 'dept-pr', title: 'Public Relations Department', description: 'PR Head with PR & Communications Manager, Media Relations, Brand & Content and Corporate Events Executives.', section: 'department', order: 9, image: '/organisation-flow/13-dept-pr.jpg' },
  { id: 'dept-finance', title: 'Finance Department', description: 'Finance Head with Finance Manager, Budgeting & MIS, Treasury and Financial Analyst.', section: 'department', order: 10, image: '/organisation-flow/14-dept-finance.jpg' },
  { id: 'dept-rnd', title: 'Research & Development', description: 'R&D (Group) with R&D Manager, Design & Development, Testing & Validation and Product Innovation roles; Director 6 and Head HR alongside.', section: 'department', order: 11, image: '/organisation-flow/15-dept-rnd.jpg' },
  { id: 'dept-intlbiz', title: 'International Business Department', description: 'International Business Head with Export Sales Manager, Overseas Business Development, International Logistics & Documentation and Trade Compliance Executives.', section: 'department', order: 12, image: '/organisation-flow/16-dept-international-business.jpg' },
];

export const flowItemsBySection = (section: FlowSection) =>
  organisationFlowItems.filter((i) => i.section === section).sort((a, b) => a.order - b.order);
