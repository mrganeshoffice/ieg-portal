/**
 * Factory data transcribed from the supplied "Factory Layout Plan for 500 pieces per day" (100 ft x 150 ft, Vastu based)
 * and the "Recommended Dimensional Sizes for Factory Layout Areas" sheet.
 * Zone x/y/w/h are a SCHEMATIC placement (units = feet, north at top) — not survey scale. Confirm against the original drawing.
 */
export type ZoneCat = 'storage' | 'production' | 'quality' | 'logistics' | 'utility' | 'admin' | 'worker' | 'site';

export interface Zone {
  id: string; name: string; short: string[]; dims: string; area?: string; remark?: string;
  cat: ZoneCat; vastu: string; x: number; y: number; w: number; h: number; flow?: number;
}

export const catMeta: Record<ZoneCat, { label: string; color: string }> = {
  storage: { label: 'Storage', color: '#F59E0B' },
  production: { label: 'Production', color: '#EAB308' },
  quality: { label: 'Testing & QC', color: '#3B82F6' },
  logistics: { label: 'Dispatch & logistics', color: '#8B5CF6' },
  utility: { label: 'Utilities & maintenance', color: '#EC4899' },
  admin: { label: 'Admin & engineering', color: '#14B8A6' },
  worker: { label: 'Worker facilities', color: '#22C55E' },
  site: { label: 'Site & sacred', color: '#94A3B8' },
};

/** Schematic canvas (units ~ feet). Sheet states 150 ft (E-W) x 100 ft (N-S); the drawing itself is not to scale. */
export const PLOT = { w: 150, h: 142 };

export const zones: Zone[] = [
  { id: 'fg', name: 'Finished Goods Store', short: ['Finished', 'Goods Store'], dims: '50 × 40 × 18 ft', area: '2,000 sq ft', remark: 'Rack + pallet storage', cat: 'storage', vastu: 'North-West', x: 0, y: 0, w: 56, h: 24, flow: 8 },
  { id: 'staging', name: 'Dispatch / Staging Area', short: ['Dispatch /', 'Staging'], dims: '40 × 25 × 16 ft', area: '1,000 sq ft', remark: 'Pre-dispatch area', cat: 'logistics', vastu: 'North-West', x: 56, y: 0, w: 36, h: 24 },
  { id: 'temple', name: 'Temple / Prayer Area', short: ['Temple', 'Prayer Area'], dims: '15 × 15 ft', cat: 'site', vastu: 'North-East (NE)', x: 124, y: 0, w: 26, h: 12 },
  { id: 'borewell', name: 'Borewell / Water Tank', short: ['Borewell', 'Water Tank'], dims: '15 × 15 ft', cat: 'site', vastu: 'North-East (NE)', x: 124, y: 12, w: 26, h: 12 },
  { id: 'loading', name: 'Loading / Dispatch Dock', short: ['Loading /', 'Dispatch Dock'], dims: '30 × 15 × 14 ft', area: '450 sq ft', remark: 'Dock height 4 ft', cat: 'logistics', vastu: 'North-West', x: 92, y: 0, w: 32, h: 24, flow: 9 },
  { id: 'accounts', name: 'Accounts Department', short: ['Accounts', 'Dept.'], dims: '15 × 15 ft', cat: 'admin', vastu: 'East / North', x: 133, y: 36, w: 16, h: 22 },
  { id: 'packing', name: 'Packing Area', short: ['Packing', 'Area'], dims: '30 × 20 × 14 ft', area: '600 sq ft', remark: 'Packing tables + material storage', cat: 'logistics', vastu: 'West / North-West', x: 0, y: 32, w: 28, h: 27, flow: 7 },
  { id: 'testing', name: 'Testing & QC Area', short: ['Testing &', 'QC Area'], dims: '40 × 30 × 16 ft', area: '1,200 sq ft', remark: 'Testing stations', cat: 'quality', vastu: 'West / North-West', x: 28, y: 32, w: 39, h: 27, flow: 6 },
  { id: 'rework', name: 'Rework Area', short: ['Rework', 'Area'], dims: '20 × 15 × 14 ft', area: '300 sq ft', remark: 'Rework & rectification', cat: 'quality', vastu: 'West / North-West', x: 67, y: 32, w: 22, h: 27 },
  { id: 'parking', name: 'Parking Area', short: ['Parking'], dims: 'As per site', cat: 'site', vastu: 'North / East', x: 128, y: 26, w: 22, h: 7 },
  { id: 'admin', name: 'Admin & Engineering Block', short: ['Admin &', 'Engineering Block'], dims: '35 × 25 × 14 ft', area: '875 sq ft', remark: 'Offices, meeting room, HOD', cat: 'admin', vastu: 'East / North', x: 90, y: 32, w: 38, h: 27 },
  { id: 'worker', name: 'Worker Facilities', short: ['Worker', 'Facilities'], dims: '30 × 20 × 12 ft', area: '600 sq ft', remark: 'Lockers, washrooms, canteen', cat: 'worker', vastu: 'West / North-West', x: 66, y: 121, w: 53, h: 21 },
  { id: 'assembly', name: 'Assembly / Production Area (4 compact lines)', short: ['Assembly /', 'Production Area'], dims: '55 × 24 × 14 ft per line', area: '1,320 sq ft per line', remark: 'Compact U / straight line; 4 lines', cat: 'production', vastu: 'South / South-West', x: 24, y: 66, w: 87, h: 48, flow: 5 },
  { id: 'scrap', name: 'Scrap Yard / Waste Area', short: ['Scrap Yard', 'Waste Area'], dims: '15 × 15 ft', cat: 'utility', vastu: 'South-West / West', x: 119, y: 123, w: 30, h: 10 },
  { id: 'battery', name: 'Battery Charging Area', short: ['Battery', 'Charging'], dims: '10 × 10 ft', cat: 'utility', vastu: 'To be confirmed', x: 119, y: 133, w: 30, h: 9 },
  { id: 'kitting', name: 'Kitting / Line Feeding Area', short: ['Kitting /', 'Line Feeding'], dims: '30 × 20 × 16 ft', area: '600 sq ft', remark: 'Line-wise kitting', cat: 'storage', vastu: 'South-West', x: 0, y: 121, w: 32, h: 21, flow: 4 },
  { id: 'tool', name: 'Tool Room', short: ['Tool Room'], dims: '20 × 15 × 14 ft', area: '300 sq ft', remark: 'Tools & fixtures', cat: 'utility', vastu: 'South / West', x: 119, y: 68, w: 30, h: 12 },
  { id: 'maintenance', name: 'Maintenance Workshop', short: ['Maintenance', 'Workshop'], dims: '25 × 20 × 16 ft', area: '500 sq ft', remark: 'Mechanical maintenance', cat: 'utility', vastu: 'South / West', x: 119, y: 80, w: 30, h: 17 },
  { id: 'rm', name: 'Raw Material Store', short: ['Raw Material', 'Store'], dims: '40 × 50 × 20 ft', area: '2,000 sq ft', remark: 'Multi-level racking', cat: 'storage', vastu: 'South-West (SW)', x: 0, y: 66, w: 24, h: 48, flow: 3 },
  { id: 'incoming', name: 'Incoming Inspection Area', short: ['Incoming', 'Inspection'], dims: '20 × 20 × 14 ft', area: '400 sq ft', remark: 'Inspection + documentation', cat: 'quality', vastu: 'South-West', x: 32, y: 121, w: 34, h: 21, flow: 2 },
  { id: 'utilities', name: 'Utilities Block', short: ['Utilities Block', 'Elec · Compressor · DG'], dims: '40 × 20 × 16 ft', area: '800 sq ft', remark: 'Electrical room, compressor, DG / panel room', cat: 'utility', vastu: 'South-East (SE)', x: 119, y: 97, w: 30, h: 26 },
];

/** Material flow, in order (image: "Linear flow of material & production"). */
export const flowSteps = ['Incoming', 'Raw Material Store', 'Kitting', 'Assembly', 'Testing', 'Packing', 'Finished Goods Store', 'Dispatch'];
export const flowOrder = ['incoming', 'rm', 'kitting', 'assembly', 'testing', 'packing', 'fg', 'loading'];
export const gate = { x: 40, y: 152 };

export const vastuGuide: [string, string][] = [
  ['Temple, Prayer, Borewell, Water Tank', 'North-East (NE)'],
  ['Admin Office, Accounts, Reception', 'East / North'],
  ['Assembly / Production Area', 'South / South-West'],
  ['Raw Material Store, Heavy Machines', 'South-West (SW)'],
  ['Utilities (Electrical, Compressor, DG, Boiler)', 'South-East (SE)'],
  ['Testing & QC Area', 'West / North-West'],
  ['Packing Area', 'West / North-West'],
  ['Finished Goods Store', 'North-West'],
  ['Dispatch / Loading Dock', 'North-West'],
  ['Worker Facilities (Toilet, Pantry, Locker)', 'West / North-West'],
  ['Scrap Yard, Waste Area', 'South-West / West'],
  ['Overhead Water Tank', 'South-West'],
  ['Parking Area', 'North / East'],
];
export const vastuBenefits = ['Enhances stability & strength', 'Brings prosperity & financial growth', 'Supports smooth operations', 'Enhances positive energy flow', 'Reduces accidents & losses', 'Improves employee satisfaction'];
export const vastuTips = [
  'Keep the North-East area clean, light and open.',
  'Avoid heavy storage or machines in the North-East.',
  'Keep heavy items in the South-West.',
  'Avoid toilets, septic tank and fire in the North-East.',
  'Owner / Director should sit in the South-West, facing North or East.',
  'Keep the centre area open and clutter free.',
];

export const CONFIRM_LAYOUT = 'Zone placement is a schematic reading of the supplied 150 ft × 100 ft Vastu plan. Verify positions against the original drawing.';

/* ---------------- Dimension tables ---------------- */
export interface DimSection {
  id: string; num: string; title: string; color: string; columns: string[]; rows: string[][]; total?: string[]; note?: string; confirm?: string;
}
const SZ = ['Section', 'Recommended Size (L × W × H)'];

export const capacities = [
  { pcs: 120, plot: '120 ft × 70 ft', built: '8,000 – 10,000 sq ft', ceiling: '16 – 18 ft' },
  { pcs: 240, plot: '180 ft × 100 ft', built: '16,000 – 20,000 sq ft', ceiling: '18 – 20 ft' },
  { pcs: 500, plot: '250 – 300 ft × 120 – 140 ft', built: '32,000 – 38,000 sq ft', ceiling: '18 – 24 ft' },
];

export const dimSections: DimSection[] = [
  { id: 'assembly', num: '1', title: 'Assembly Line Area (per line)', color: '#EAB308', columns: SZ, rows: [
    ['Main assembly work zone', '40 × 18 × 16 ft'], ['Operator movement aisle', '40 × 6 × 16 ft'], ['Line-side material racks', '40 × 5 × 16 ft'], ['WIP buffer area', '12 × 8 × 16 ft'],
    ['Testing / QC station', '12 × 10 × 14 ft'], ['Packing station', '12 × 10 × 14 ft'], ['Tool station', '10 × 8 × 12 ft'], ['Reject / Rework area', '8 × 6 × 12 ft'],
  ], total: ['Total recommended footprint per line', '50 × 40 × 16 ft'] },
  { id: 'rm', num: '2', title: 'Raw Material Storage Area', color: '#15803D', columns: ['Storage Type', 'Recommended Size (L × W × H)'], rows: [
    ['Heavy material rack zone', '50 × 30 × 20 ft'], ['Fastener / bin storage', '25 × 20 × 12 ft'], ['Incoming inspection area', '20 × 20 × 14 ft'], ['Vendor staging area', '30 × 20 × 16 ft'], ['Kitting / pre-dispatch area', '20 × 15 × 14 ft'],
  ], total: ['Total RM store', '70 × 50 × 20 ft'] },
  { id: 'fg', num: '3', title: 'Finished Goods Storage Area', color: '#16A34A', columns: SZ, rows: [
    ['Packed FG storage', '60 × 30 × 18 ft'], ['Dispatch staging', '30 × 20 × 16 ft'], ['Loading dock area', '25 × 15 × 16 ft'], ['Export pallet holding area', '20 × 15 × 16 ft'],
  ], total: ['Total FG area', '70 × 40 × 18 ft'] },
  { id: 'qc', num: '4', title: 'Testing & QC Area', color: '#3B82F6', columns: SZ, rows: [
    ['Testing stations', '50 × 25 × 16 ft'], ['QC inspection', '25 × 20 × 14 ft'], ['Calibration room', '15 × 12 × 12 ft'], ['Rework zone', '20 × 15 × 14 ft'],
  ], total: ['Total QC area', '60 × 40 × 16 ft'] },
  { id: 'packing', num: '5', title: 'Packing Area', color: '#F97316', columns: SZ, rows: [
    ['Packing tables', '30 × 20 × 14 ft'], ['Packing material storage', '20 × 15 × 12 ft'], ['Barcode / label station', '10 × 8 × 10 ft'],
  ], total: ['Total packing area', '35 × 25 × 14 ft'] },
  { id: 'tool', num: '6', title: 'Tool Room & Utility Area', color: '#7C3AED', columns: SZ, rows: [
    ['Tool room', '25 × 20 × 12 ft'], ['Maintenance room', '20 × 15 × 12 ft'], ['Compressor room', '20 × 12 × 12 ft'], ['Electrical panel room', '15 × 12 × 12 ft'], ['DG room', '25 × 15 × 14 ft'],
  ], total: ['Total utility area', '45 × 35 × 14 ft'] },
  { id: 'admin', num: '7', title: 'Admin & Engineering Area', color: '#0EA5A4', columns: SZ, rows: [
    ['Production office', '25 × 15 × 10 ft'], ['Engineering office', '20 × 15 × 10 ft'], ['Meeting room', '15 × 15 × 10 ft'], ['HR / Admin', '20 × 12 × 10 ft'], ['Server / IT room', '10 × 8 × 10 ft'],
  ], total: ['Total admin area', '50 × 30 × 10 ft'] },
  { id: 'worker', num: '8', title: 'Worker Facility Area', color: '#22C55E', columns: SZ, rows: [
    ['Locker / changing room', '25 × 20 × 10 ft'], ['Washrooms', '20 × 12 × 10 ft'], ['Pantry / canteen', '30 × 20 × 10 ft'], ['Drinking water area', '10 × 8 × 10 ft'],
  ], total: ['Total worker facility', '40 × 30 × 10 ft'] },
  { id: 'aisles', num: '9', title: 'Main Movement & Aisles', color: '#92400E', columns: ['Aisle Type', 'Recommended Width'], rows: [
    ['Main forklift aisle', '12 – 14 ft'], ['Secondary forklift aisle', '10 – 12 ft'], ['Material trolley aisle', '6 – 8 ft'], ['Operator aisle', '3 – 4 ft'], ['Emergency aisle', '5 – 6 ft'], ['Dock maneuvering area', '25 – 35 ft'],
  ] },
  { id: 'spacing', num: '12', title: 'Assembly Line Spacing', color: '#B91C1C', columns: ['Between Items', 'Recommended Gap'], rows: [
    ['Between assembly lines', '8 – 10 ft'], ['Line to wall', '5 – 6 ft'], ['Testing station clearance', '4 – 5 ft'], ['Rack to aisle', '3 – 4 ft'], ['Forklift turning clearance', '12 – 15 ft'],
  ] },
  { id: 'structural', num: '13', title: 'Structural Parameters', color: '#0F766E', columns: ['Parameter', 'Recommendation'], rows: [
    ['Structural type', 'PEB'], ['Column grid', '25 × 25 ft'], ['Floor type', 'Tremix / VDF'], ['Floor load capacity', '3 – 5 ton/sq m'], ['Roof height', '18 – 24 ft'], ['Dock height', '4 ft'],
  ] },
  { id: 'modular', num: '14', title: 'Modular Block Strategy', color: '#15803D', columns: ['Standard production module contains', 'Detail'], rows: [
    ['Assembly lines', '4 nos.'], ['Testing cell', '1'], ['QC room', '1'], ['Line-side storage', 'Included'], ['Supervisor desk', 'Included'], ['WIP staging', 'Included'],
  ], total: ['Recommended module size', '90 × 70 × 18 ft'] },
  { id: 'additional', num: '15', title: 'Additional Recommended Areas', color: '#7C3AED', columns: ['Area', 'Recommended Size (L × W)'], rows: [
    ['Scrap segregation', '15 × 15 ft'], ['Battery charging area', '12 × 10 ft'], ['Training room', '20 × 15 ft'], ['ESD-safe room', '20 × 15 ft'], ['Safety equipment room', '10 × 8 ft'],
  ] },
  { id: 'utility', num: '16', title: 'Utility Requirements (approx.)', color: '#15803D', columns: ['Utility', 'Approx. Requirement'], rows: [
    ['Electrical connected load', '150 – 250 kW'], ['Compressor capacity', '15 – 25 HP'], ['DG backup', '125 – 200 kVA'], ['Air piping ring main', '1 – 1.5 inch'], ['Ventilation air changes', '8 – 12 ACH'],
  ] },
  { id: 'fire', num: '17', title: 'Fire & Safety Standards', color: '#DC2626', columns: ['Requirement', 'Recommendation'], rows: [
    ['Emergency exits', 'Every 100 ft'], ['Fire hydrant loop', 'Full perimeter'], ['Emergency evacuation path', 'Marked, 5 ft'], ['Fire extinguishers', 'Every 50 ft'], ['Compressor isolation room', 'Mandatory'],
  ] },
];

export const plan500: DimSection = {
  id: 'plan500', num: 'P1', title: '500 pcs/day plan: recommended dimensional sizes', color: '#1FA2E8',
  columns: ['#', 'Area', 'Size (L × W × H)', 'Area (sq ft)', 'Remarks'],
  rows: zones.filter((z) => ['assembly', 'rm', 'incoming', 'kitting', 'testing', 'rework', 'packing', 'fg', 'staging', 'loading', 'tool', 'maintenance', 'utilities', 'admin', 'worker'].includes(z.id))
    .sort((a, b) => ['assembly', 'rm', 'incoming', 'kitting', 'testing', 'rework', 'packing', 'fg', 'staging', 'loading', 'tool', 'maintenance', 'utilities', 'admin', 'worker'].indexOf(a.id) - ['assembly', 'rm', 'incoming', 'kitting', 'testing', 'rework', 'packing', 'fg', 'staging', 'loading', 'tool', 'maintenance', 'utilities', 'admin', 'worker'].indexOf(b.id))
    .map((z, i) => [String(i + 1), z.name, z.dims, z.area ?? '', z.remark ?? '']),
  total: ['', 'Total built-up area (approx.)', '', '12,945 – 15,000 sq ft', ''],
  confirm: 'Small print on the photographed sheet. Sizes were read from the table and drawing; please verify.',
};

export const plan500Overall: [string, string][] = [
  ['Recommended plot size', '150 ft × 100 ft (15,000 sq ft) minimum'],
  ['Built-up area', '12,945 – 15,000 sq ft'],
  ['Ceiling height', '16 – 20 ft'],
  ['Structure', 'PEB with 25 × 25 ft column grid'],
  ['Floor load', '3 – 5 ton/sq m'],
  ['Power requirement', '150 – 250 kVA (approx.)'],
  ['DG backup', '125 – 200 kVA (approx.)'],
  ['No. of assembly lines', '4 compact lines'],
  ['Output per line', '120 – 140 pcs/day (approx.)'],
];
export const plan500Aisles: [string, string][] = [
  ['Main forklift aisle', '14 – 16 ft'], ['Secondary forklift aisle', '10 – 12 ft'], ['Material trolley aisle', '6 – 8 ft'], ['Operator movement aisle', '3 – 4 ft'], ['Emergency aisle', '5 – 6 ft'], ['Dock maneuvering area', '20 – 30 ft'],
];
export const CONFIRM_500 = 'The two supplied sheets give different totals for 500 pcs/day: the layout plan shows a 150 × 100 ft plot (12,945 – 15,000 sq ft), while the dimension sheet lists 250 – 300 × 120 – 140 ft (32,000 – 38,000 sq ft). Aisle widths also differ. Confirm which is authoritative.';
