/** Content for the Office Layout module. Edit here to change what the page shows. */
export type OfficeView = { id: 'layout' | 'blueprint'; tab: string; title: string; src: string; file: string; alt: string; hint: string };

export const officeViews: OfficeView[] = [
  {
    id: 'layout', tab: '3D Office Layout', title: '3D Office Layout',
    src: '/office-layout/office-layout-3d.png', file: 'IEG-Group-Office-Layout.png',
    alt: 'IEG Group corporate headquarters — 3D isometric office floor plan',
    hint: 'Rendered floor plan with furniture, zones and key features',
  },
  {
    id: 'blueprint', tab: 'Architectural Blueprint', title: 'Architectural Blueprint',
    src: '/office-layout/office-blueprint.png', file: 'IEG-Group-Office-Blueprint.png',
    alt: 'IEG Group corporate headquarters — architectural blueprint floor plan, drawing A-01',
    hint: 'Dimensioned floor plan with area schedule and legend (Drawing A-01)',
  },
];

export const overview: [string, string][] = [
  ['Company', 'IEG GROUP'],
  ['Facility Type', 'Corporate Headquarters'],
  ['Total Office Area', '7,000 SQ. FT.'],
  ['Office Type', 'Executive Corporate Office'],
  ['Design Style', 'Modern Luxury Corporate + Technology'],
  ['Purpose', 'Headquarters / Corporate Management / Business Operations'],
];

export const spaceSummary: [string, string][] = [
  ['01', 'MD Office'],
  ['07', 'Director Cabins'],
  ['05', 'Subsidiary Offices'],
  ['01', 'Conference Room'],
  ['01', 'Common Hall'],
  ['01', 'HR Area'],
  ['01', 'Kitchen / Pantry'],
  ['02+', 'Washroom Facilities'],
];

export type Zone = { name: string; accent: string; items: string[] };
export const zoning: Zone[] = [
  { name: 'Public Zone', accent: '#E9B44C', items: ['Reception', 'Waiting', 'Conference Room'] },
  { name: 'Executive Zone', accent: '#1FA2E8', items: ['MD Room', '7 Director Rooms'] },
  { name: 'Business Zone', accent: '#34C77B', items: ['5 Subsidiary Offices', 'HR'] },
  { name: 'Common & Service Zone', accent: '#8B5CF6', items: ['Common Hall', 'Kitchen', 'Washrooms', 'Circulation'] },
];

export const connectivity: { title: string; steps: string[] }[] = [
  { title: 'Visitor route', steps: ['Main Entrance', 'Reception', 'Waiting', 'Conference'] },
  { title: 'Executive route', steps: ['Common Area', 'Executive Corridor', 'MD + Directors'] },
  { title: 'Business & service route', steps: ['Common Area', 'Subsidiary Offices', 'HR / Pantry / Washrooms'] },
];

export const executive = [
  { name: 'Managing Director Office', points: ['Private executive office', 'Executive workstation', 'Visitor seating', 'Private meeting area'] },
  { name: 'Director Cabins', points: ['7 independent director rooms', 'Individual workstations', 'Visitor seating', 'Private executive access'] },
];

export const business = [
  { name: '5 Subsidiary Offices', text: 'Each office provides dedicated space for individual group companies / business units.' },
  { name: 'HR Area', text: 'Dedicated HR workstation and employee interaction area.' },
];

export const meeting = [
  { name: 'Conference Room', points: ['Executive meetings', 'Management discussions', 'Client meetings', 'Presentations', 'Video conferences'] },
  { name: 'Common Hall', points: ['Informal discussions', 'Employee interaction', 'Lounge', 'Collaboration', 'Common activities'] },
];

export const facilities = [
  { name: 'Kitchen / Pantry', text: 'Modern employee pantry and refreshment area.' },
  { name: 'Washrooms', text: 'Conveniently accessible from the common circulation area.' },
  { name: 'Accessibility', text: 'Wheelchair-friendly circulation and accessible facilities.' },
  { name: 'Emergency Access', text: 'Clearly defined emergency circulation and exit routes.' },
];

export const philosophy = [
  { name: 'Modern Corporate Identity', text: "A sophisticated workplace reflecting IEG Group's professional identity." },
  { name: 'Executive Privacy', text: 'Dedicated private areas for MD and Directors.' },
  { name: 'Efficient Connectivity', text: 'Logical circulation connecting executive, business, common and service areas.' },
  { name: 'Visitor Friendly', text: 'Conference facilities accessible without entering private executive zones.' },
  { name: 'Employee Convenience', text: 'Easy access to HR, pantry, common areas and washrooms.' },
  { name: 'Technology Ready', text: 'Designed to support modern corporate operations, presentations and digital collaboration.' },
];
