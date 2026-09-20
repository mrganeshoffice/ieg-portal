import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Boxes, Package, Truck, Church, Droplets, ScanSearch, Wrench, Monitor, Calculator, Warehouse, Settings, Zap, Trash2,
  BatteryCharging, ClipboardCheck, Users, Utensils, Layers, Lock, PackageCheck,
} from 'lucide-react';
import { PLOT, zones, type Zone } from '@/data/factory';

/* ------------------------------------------------------------------ */
/* Look of each room, matched to the supplied drawing (pastel fills).  */
/* ------------------------------------------------------------------ */
interface Look { fill: string; lines: string[]; sub: string; icon?: LucideIcon; extra?: string[] }
const look: Record<string, Look> = {
  fg: { fill: '#E7E7B4', lines: ['FINISHED GOODS', 'STORE'], sub: "50' x 40'", icon: Boxes },
  staging: { fill: '#D5DDF3', lines: ['DISPATCH /', 'STAGING AREA'], sub: "40' x 25'", icon: Package },
  loading: { fill: '#D2D8F2', lines: ['LOADING /', 'DISPATCH DOCK'], sub: "30' x 15'" },
  temple: { fill: '#EFE5C6', lines: ['TEMPLE /', 'PRAYER AREA'], sub: "15' x 15'", icon: Church },
  borewell: { fill: '#CDE3F6', lines: ['BOREWELL /', 'WATER TANK'], sub: "15' x 15'", icon: Droplets },
  packing: { fill: '#F6CDD5', lines: ['PACKING AREA'], sub: "30' x 20'", icon: PackageCheck },
  testing: { fill: '#C9DCF3', lines: ['TESTING & QC AREA'], sub: "40' x 30'", icon: ScanSearch },
  rework: { fill: '#F8D5BF', lines: ['REWORK AREA'], sub: "20' x 15'", icon: Wrench },
  admin: { fill: '#F5D888', lines: ['ADMIN &', 'ENGINEERING BLOCK'], sub: "35' x 25'", icon: Monitor },
  accounts: { fill: '#F6E198', lines: ['ACCOUNTS', 'DEPT.'], sub: "15' x 15'", icon: Calculator },
  rm: { fill: '#F4A65C', lines: ['RAW MATERIAL', 'STORE'], sub: "40' x 50'" },
  assembly: { fill: '#F6E3A2', lines: ['ASSEMBLY / PRODUCTION AREA'], sub: '(4 COMPACT LINES)' },
  tool: { fill: '#CDDCF2', lines: ['TOOL ROOM'], sub: "20' x 15'", icon: Wrench },
  maintenance: { fill: '#DBCEEF', lines: ['MAINTENANCE', 'WORKSHOP'], sub: "25' x 20'", icon: Settings },
  utilities: { fill: '#D8CBEA', lines: ['UTILITIES BLOCK'], sub: "40' x 20'", icon: Zap, extra: ['• ELECTRICAL ROOM', '• COMPRESSOR ROOM', '• DG ROOM', '• PANEL ROOM'] },
  scrap: { fill: '#F2C1C6', lines: ['SCRAP YARD /', 'WASTE AREA'], sub: "15' x 15'", icon: Trash2 },
  battery: { fill: '#F2C1C6', lines: ['BATTERY CHARGING', 'AREA'], sub: "10' x 10'", icon: BatteryCharging },
  kitting: { fill: '#E8EBB8', lines: ['KITTING / LINE', 'FEEDING AREA'], sub: "30' x 20'", icon: Layers },
  incoming: { fill: '#CEDFF3', lines: ['INCOMING INSPECTION', 'AREA'], sub: "20' x 20'", icon: ClipboardCheck },
  worker: { fill: '#DCCFF0', lines: ['WORKER FACILITIES', '(LOCKER, WASHROOM, CANTEEN)'], sub: "30' x 20'" },
};

const INK = '#1E293B';
const BRAND = '#1FA2E8';
const GREEN = '#22A862';

/* ------------------------------------------------------------------ */
/* Material route (units are the schematic feet of the plan)          */
/* ------------------------------------------------------------------ */
const route: [number, number][] = [
  [40, 152], [40, 132], [40, 119.6], [9, 119.6], [9, 98], [15, 98], [15, 119.6], [15, 134], [27, 134], [27, 119.6], [34, 119.6],
  [34, 92], [67, 92], [90, 92], [90, 64], [47, 64], [47, 45], [14, 45], [14, 30], [20, 30], [20, 14], [40, 14], [40, 30], [108, 30], [108, 12],
];
/** index in `route` where each of the 8 steps is reached */
const stopIdx = [1, 4, 7, 12, 16, 17, 20, 24];

export const STEP_LABELS = ['Incoming', 'Raw Material Store', 'Kitting', 'Assembly', 'Testing & QC', 'Packing', 'Finished Goods Store', 'Dispatch'];
export const STEP_ZONES = ['incoming', 'rm', 'kitting', 'assembly', 'testing', 'packing', 'fg', 'loading'];

const geo = (() => {
  const cum = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
  return { cum, total: cum[cum.length - 1], stopDist: stopIdx.map((i) => cum[i]) };
})();

function pointAt(d: number) {
  const { cum } = geo;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = route[i - 1], b = route[i];
  const seg = cum[i] - cum[i - 1] || 1;
  const t = Math.min(1, Math.max(0, (d - cum[i - 1]) / seg));
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
}

export interface Seek { step: number; n: number }

/** Animated layer: trail, carrier and step badges. Owns its own frame loop so the static plan does not re-render. */
function FlowLayer({ playing, speed, seek, onStep }: { playing: boolean; speed: number; seek: Seek | null; onStep: (s: number) => void }) {
  const DURATION = 24; // seconds for a full pass at 1x
  const distRef = useRef(0);
  const holdRef = useRef(0);
  const lastStep = useRef(-2);
  const [dist, setDist] = useState(0);

  const publish = (d: number) => {
    setDist(d);
    let s = -1;
    geo.stopDist.forEach((sd, i) => { if (d >= sd - 0.01) s = i; });
    if (s !== lastStep.current) { lastStep.current = s; onStep(s); }
  };

  useEffect(() => {
    if (!seek) return;
    distRef.current = geo.stopDist[seek.step];
    holdRef.current = 0;
    publish(distRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seek]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (holdRef.current > 0) {
        holdRef.current -= dt;
        if (holdRef.current <= 0) distRef.current = 0;
      } else {
        distRef.current += dt * speed * (geo.total / DURATION);
        if (distRef.current >= geo.total) { distRef.current = geo.total; holdRef.current = 2; }
      }
      publish(distRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  const pos = pointAt(dist);
  const pts = route.map((p) => p.join(',')).join(' ');
  return (
    <g pointerEvents="none">
      <polyline points={pts} fill="none" stroke="#0B1B33" strokeOpacity=".22" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts} fill="none" stroke={BRAND} strokeWidth=".7" strokeLinejoin="round" strokeLinecap="round" className="dashed-flow" opacity=".75" />
      <polyline points={pts} fill="none" stroke={BRAND} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={`${dist} ${geo.total + 10}`} filter="url(#glow)" />
      {/* carrier */}
      <g transform={`translate(${pos.x} ${pos.y})`}>
        <circle r="4.4" fill={BRAND} opacity=".22"><animate attributeName="r" values="3.2;5.2;3.2" dur="1.4s" repeatCount="indefinite" /></circle>
        <circle r="2.5" fill="#fff" stroke={BRAND} strokeWidth=".8" />
        <Package x={-1.4} y={-1.4} width={2.8} height={2.8} color={BRAND} strokeWidth={2.2} />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Static drawing pieces                                               */
/* ------------------------------------------------------------------ */
function Tree({ x, y, r = 2.3 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <ellipse cx={x + 0.5} cy={y + r * 0.85} rx={r} ry={r * 0.4} fill="#000" opacity=".16" />
      <circle cx={x} cy={y} r={r} fill="url(#tree)" />
      <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill="#9BE39F" opacity=".7" />
    </g>
  );
}

function AisleLabel({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const cx = (x1 + x2) / 2;
  return (
    <g pointerEvents="none" fill="#334155">
      <line x1={x1 + 3} x2={cx - 25} y1={y} y2={y} stroke="#64748B" strokeWidth=".3" strokeDasharray="1.4 1" markerStart="url(#tip)" />
      <line x1={cx + 25} x2={x2 - 3} y1={y} y2={y} stroke="#64748B" strokeWidth=".3" strokeDasharray="1.4 1" markerEnd="url(#tip)" />
      <text x={cx} y={y + 0.8} textAnchor="middle" fontSize="2.2" fontWeight="800">MAIN FORKLIFT AISLE 14 – 16 FT WIDE</text>
    </g>
  );
}

function Rack({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const rows = 3, cols = 4;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx=".4" fill="#8A4B14" opacity=".9" />
      {Array.from({ length: rows }).map((_, r) => Array.from({ length: cols }).map((__, c) => (
        <rect key={`${r}${c}`} x={x + 0.7 + c * ((w - 1.4) / cols)} y={y + 0.7 + r * ((h - 1.4) / rows)} width={(w - 1.4) / cols - 0.5} height={(h - 1.4) / rows - 0.6} rx=".2" fill={(r + c) % 2 ? '#F2C98B' : '#E5A55A'} />
      )))}
    </g>
  );
}

function Line({ x, y, w, h, n }: { x: number; y: number; w: number; h: number; n: number }) {
  const beltY = y + h - 10;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx="1" fill="#FFF8DC" fillOpacity=".7" stroke="#B59A45" strokeWidth=".3" strokeDasharray="1.2 .9" />
      <text x={x + w / 2} y={y + 3.4} textAnchor="middle" fontSize="2.1" fontWeight="800" fill={INK}>LINE-{n}</text>
      {/* stations */}
      {[0.28, 0.72].map((f) => (
        <g key={f}>
          <rect x={x + w * f - 1.1} y={beltY - 6.5} width="2.2" height="6.5" rx=".5" fill="#475569" />
          <circle cx={x + w * f} cy={beltY - 7.4} r="1.5" fill="#94A3B8" stroke="#334155" strokeWidth=".3" />
          <circle cx={x + w * f} cy={beltY - 7.4} r=".5" fill="#EF4444"><animate attributeName="opacity" values="1;.2;1" dur={`${1.1 + n * 0.15}s`} repeatCount="indefinite" /></circle>
        </g>
      ))}
      {/* conveyor belt */}
      <rect x={x + 1.6} y={beltY} width={w - 3.2} height="3.4" rx="1.6" fill="#334155" />
      <rect x={x + 2.2} y={beltY + 0.7} width={w - 4.4} height="2" rx="1" fill="#64748B" />
      {[0, 1, 2].map((k) => (
        <rect key={k} y={beltY + 0.4} width="2" height="2.6" rx=".4" fill="#FBBF24" stroke="#B45309" strokeWidth=".2">
          <animate attributeName="x" from={x + 1.4} to={x + w - 3.4} dur={`${3.4 + n * 0.3}s`} begin={`${-k * 1.1}s`} repeatCount="indefinite" />
        </rect>
      ))}
    </g>
  );
}

function Labels({ z, l, small }: { z: Zone; l: Look; small: boolean }) {
  const iconRow = z.id === 'worker' || z.id === 'loading';
  const maxLen = Math.max(...l.lines.map((t) => t.length), l.sub.length);
  const size = Math.max(1.35, Math.min(2.35, (z.w - 3) / (maxLen * 0.63)));
  const gap = size * 1.3;
  const rows = l.lines.length + 1;
  const hasIcon = !!l.icon && z.h >= 17;
  const shift = hasIcon ? -size * 1.4 : iconRow ? -size * 2.1 : 0;
  const y0 = z.y + z.h / 2 - ((rows - 1) * gap) / 2 + shift + (l.extra ? -3 : 0);
  return (
    <g pointerEvents="none">
      {l.lines.map((t, i) => <text key={t} x={z.x + z.w / 2} y={y0 + i * gap + size * 0.35} textAnchor="middle" fontSize={size} fontWeight="800" fill={INK} stroke={l.fill} strokeWidth=".7" paintOrder="stroke">{t}</text>)}
      <text x={z.x + z.w / 2} y={y0 + l.lines.length * gap + size * 0.3} textAnchor="middle" fontSize={size * 0.92} fontWeight="700" fill="#334155" stroke={l.fill} strokeWidth=".7" paintOrder="stroke">{l.sub}</text>
      {l.extra && l.extra.map((t, i) => <text key={t} x={z.x + 3} y={y0 + (rows - 1) * gap + 4 + i * 2.1} fontSize="1.55" fontWeight="700" fill="#475569">{t}</text>)}
      {hasIcon && l.icon && (() => { const Ic = l.icon!; const s = Math.min(6.2, z.h * 0.24); return <Ic x={z.x + z.w / 2 - s / 2} y={z.y + z.h - s - 1.6} width={s} height={s} color="#1E293B" strokeWidth={1.5} />; })()}
      {!hasIcon && l.icon && !small && (() => { const Ic = l.icon!; return <Ic x={z.x + z.w - 5} y={z.y + 1.2} width={3.8} height={3.8} color="#1E293B" strokeWidth={1.6} opacity={0.75} />; })()}
    </g>
  );
}

/* ------------------------------------------------------------------ */
export default function FactoryPlan({ selected, onSelect, showFlow, showVastu, playing, speed, seek, activeStep, onStep, depth }: {
  selected: string | null; onSelect: (id: string | null) => void; showFlow: boolean; showVastu: boolean;
  playing: boolean; speed: number; seek: Seek | null; activeStep: number; onStep: (s: number) => void; depth: boolean;
}) {
  const list = useMemo(() => zones.filter((z) => z.id !== 'parking'), []);
  const byId = useMemo(() => Object.fromEntries(list.map((z) => [z.id, z])), [list]);
  const activeZoneId = activeStep >= 0 ? STEP_ZONES[activeStep] : null;
  const cells = [['NW', 'N', 'NE'], ['W', 'Centre', 'E'], ['SW', 'S', 'SE']];
  const W = PLOT.w, H = PLOT.h;
  const leftTrees = [3, 8.5, 14, 19.5, 25, 30];
  const rightTrees = [52, 58, 64, 70, 76, 82, 88, 94, 100, 106, 112, 118];

  return (
    <svg viewBox="-14 -21 178 196" className="h-auto w-full select-none" role="img" aria-label="Factory layout plan for 500 pieces per day, 150 feet by 100 feet">
      <defs>
        <marker id="tip" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 1 L10 5 L0 9 z" fill="#64748B" /></marker>
        <marker id="dimtip" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 1 L10 5 L0 9 z" fill="#0F172A" /></marker>
        <radialGradient id="tree" cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#5FCB6B" /><stop offset="1" stopColor="#1E7B34" /></radialGradient>
        <filter id="shadow" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx=".35" dy=".6" stdDeviation=".45" floodColor="#0F172A" floodOpacity=".28" /></filter>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <pattern id="floor" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#F4F2EB" /><path d="M10 0H0V10" fill="none" stroke="#E2DFD3" strokeWidth=".18" /></pattern>
        <pattern id="hatch" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="2" fill="none" /><line x1="0" y1="0" x2="0" y2="2" stroke="#000" strokeOpacity=".05" strokeWidth=".5" /></pattern>
      </defs>

      {/* paper */}
      <rect x="-14" y="-21" width="178" height="196" fill="#FBFAF6" />

      {/* dimensions */}
      <g pointerEvents="none" fill="#0F172A" fontWeight="800">
        <text x="75" y="-12.4" textAnchor="middle" fontSize="3.1">NORTH (मुख्य उत्तर दिशा)</text>
        <line x1="0" x2="66" y1="-7.5" y2="-7.5" stroke="#0F172A" strokeWidth=".35" markerStart="url(#dimtip)" />
        <line x1="84" x2="150" y1="-7.5" y2="-7.5" stroke="#0F172A" strokeWidth=".35" markerEnd="url(#dimtip)" />
        <text x="75" y="-6.5" textAnchor="middle" fontSize="3.2">150 ft</text>
        <line x1="-6.5" x2="-6.5" y1="0" y2="60" stroke="#0F172A" strokeWidth=".35" markerStart="url(#dimtip)" />
        <line x1="-6.5" x2="-6.5" y1="80" y2="142" stroke="#0F172A" strokeWidth=".35" markerEnd="url(#dimtip)" />
        <text x="-7.6" y="70.6" textAnchor="middle" fontSize="3.2" transform="rotate(-90 -7.6 70)">100 ft</text>
      </g>

      {/* site floor and boundary wall */}
      <rect x="0" y="0" width={W} height={H} fill="url(#floor)" />
      <rect x="0" y="0" width={W} height={H} fill="url(#hatch)" />

      {showVastu && cells.flatMap((row, r) => row.map((c, k) => (
        <g key={c} pointerEvents="none">
          <rect x={k * (W / 3)} y={r * (H / 3)} width={W / 3} height={H / 3} fill={c === 'NE' ? '#34C77B' : c === 'SW' ? '#F59E0B' : c === 'SE' ? '#EF4444' : c === 'NW' ? '#8B5CF6' : '#1FA2E8'} opacity={c === 'Centre' ? 0.05 : 0.12} />
          <text x={k * (W / 3) + W / 6} y={r * (H / 3) + H / 6 + 1.5} textAnchor="middle" fontSize="7" fontWeight="900" fill="#0F172A" opacity=".13">{c}</text>
        </g>
      )))}

      <AisleLabel x1={0} x2={W} y={26.4} />
      <AisleLabel x1={0} x2={W} y={60.9} />
      <AisleLabel x1={0} x2={111} y={115.7} />
      {/* secondary aisle */}
      <g pointerEvents="none" fill="#334155">
        <line x1="115" x2="115" y1="70" y2="84" stroke="#64748B" strokeWidth=".3" strokeDasharray="1.4 1" markerStart="url(#tip)" />
        <line x1="115" x2="115" y1="104" y2="117" stroke="#64748B" strokeWidth=".3" strokeDasharray="1.4 1" markerEnd="url(#tip)" />
        <text x="115.8" y="94" textAnchor="middle" fontSize="1.9" fontWeight="800" transform="rotate(-90 115.8 94)">SECONDARY AISLE 10 – 12 FT WIDE</text>
      </g>

      {/* rooms */}
      {list.map((z) => {
        const l = look[z.id];
        const active = selected === z.id;
        const running = activeZoneId === z.id && showFlow;
        const chamfer = z.id === 'admin' || z.id === 'borewell';
        const c = 5;
        const d = chamfer
          ? (z.id === 'admin'
            ? `M${z.x} ${z.y} H${z.x + z.w - c} L${z.x + z.w} ${z.y + c} V${z.y + z.h} H${z.x} Z`
            : `M${z.x} ${z.y} H${z.x + z.w} V${z.y + z.h - c} L${z.x + z.w - c} ${z.y + z.h} H${z.x} Z`)
          : undefined;
        const common = { fill: l.fill, stroke: active ? BRAND : '#475569', strokeWidth: active ? 0.9 : 0.32 } as const;
        return (
          <g key={z.id} tabIndex={0} role="button" aria-label={`${z.name}, ${z.dims}`} className="cursor-pointer outline-none" style={{ transition: 'filter .2s' }}
            onClick={() => onSelect(active ? null : z.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(active ? null : z.id); } }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.06) saturate(1.1)')} onMouseLeave={(e) => (e.currentTarget.style.filter = '')}>
            <title>{`${z.name} · ${z.dims}`}</title>
            {depth && (d ? <path d={d} transform="translate(1 1.8)" fill="#0F172A" opacity=".35" /> : <rect x={z.x + 1} y={z.y + 1.8} width={z.w} height={z.h} rx=".8" fill="#0F172A" opacity=".35" />)}
            {d ? <path d={d} {...common} filter="url(#shadow)" /> : <rect x={z.x} y={z.y} width={z.w} height={z.h} rx=".8" {...common} filter="url(#shadow)" />}
            {running && (d ? <path d={d} fill="none" stroke={BRAND} strokeWidth="1.1" className="zone-pulse" /> : <rect x={z.x} y={z.y} width={z.w} height={z.h} rx=".8" fill={BRAND} fillOpacity=".12" stroke={BRAND} strokeWidth="1.1" className="zone-pulse" />)}
            {z.id === 'assembly' ? (
              <g pointerEvents="none">
                {[0, 1, 2, 3].map((i) => <Line key={i} n={i + 1} x={z.x + 3 + i * 20.9} y={z.y + 12} w={19.3} h={32} />)}
              </g>
            ) : (
              <>
                {z.id === 'rm' && <Rack x={z.x + 3.5} y={z.y + z.h - 17} w={17} h={13} />}
                {z.id === 'loading' && (
                  <g pointerEvents="none" style={{ transform: `translateX(${activeStep === 7 && showFlow ? 0 : 4}px)`, transition: 'transform 1.2s ease' }}>
                    <Truck x={z.x + z.w / 2 - 4.5} y={z.y + z.h - 9.6} width={9} height={9} color="#1E293B" strokeWidth={1.5} />
                  </g>
                )}
                {z.id === 'worker' && (
                  <g pointerEvents="none" color="#1E293B">
                    <Lock x={z.x + 15} y={z.y + z.h - 8} width={5.2} height={5.2} strokeWidth={1.5} />
                    <Users x={z.x + z.w / 2 - 2.6} y={z.y + z.h - 8} width={5.2} height={5.2} strokeWidth={1.5} />
                    <Utensils x={z.x + z.w - 20} y={z.y + z.h - 8} width={5.2} height={5.2} strokeWidth={1.5} />
                  </g>
                )}

              </>
            )}
          </g>
        );
      })}

      {/* material flow */}
      {showFlow && (
        <>
          <FlowLayer playing={playing} speed={speed} seek={seek} onStep={onStep} />
          {STEP_ZONES.map((id, i) => {
            const z = byId[id];
            const done = activeStep >= i;
            return (
              <g key={id} pointerEvents="none">
                <circle cx={z.x + 2.6} cy={z.y + 2.6} r="2" fill={done ? GREEN : '#0D1728'} stroke="#fff" strokeWidth=".45" />
                <text x={z.x + 2.6} y={z.y + 3.4} textAnchor="middle" fontSize="2.2" fontWeight="900" fill="#fff">{i + 1}</text>
              </g>
            );
          })}
        </>
      )}

      {/* room text sits above the route so labels stay readable */}
      {list.map((z) => {
        const l = look[z.id];
        if (z.id === 'assembly') return (
          <g key={z.id} pointerEvents="none">
            <text x={z.x + z.w / 2} y={z.y + 4.6} textAnchor="middle" fontSize="2.7" fontWeight="800" fill={INK} stroke={l.fill} strokeWidth=".7" paintOrder="stroke">ASSEMBLY / PRODUCTION AREA</text>
            <text x={z.x + z.w / 2} y={z.y + 8.2} textAnchor="middle" fontSize="2.2" fontWeight="700" fill="#334155" stroke={l.fill} strokeWidth=".7" paintOrder="stroke">(4 COMPACT LINES)</text>
          </g>
        );
        if (z.id === 'rm') return (
          <g key={z.id} pointerEvents="none">
            <text x={z.x + z.w / 2} y={z.y + 5} textAnchor="middle" fontSize="2.2" fontWeight="800" fill={INK} stroke={l.fill} strokeWidth=".7" paintOrder="stroke">RAW MATERIAL</text>
            <text x={z.x + z.w / 2} y={z.y + 8} textAnchor="middle" fontSize="2.2" fontWeight="800" fill={INK} stroke={l.fill} strokeWidth=".7" paintOrder="stroke">STORE</text>
            <text x={z.x + z.w / 2} y={z.y + 11.2} textAnchor="middle" fontSize="2.1" fontWeight="700" fill="#334155" stroke={l.fill} strokeWidth=".7" paintOrder="stroke">40' x 50'</text>
            <Warehouse x={z.x + z.w / 2 - 3} y={z.y + 13} width={6} height={6} color="#1E293B" strokeWidth={1.5} />
          </g>
        );
        return <Labels key={z.id} z={z} l={l} small={z.h < 13} />;
      })}

      {/* boundary wall with gate opening */}
      <path d={`M0 ${H} V0 H${W} V${H} H46.6 M33.4 ${H} H0`} fill="none" stroke="#1F2937" strokeWidth="1.1" strokeLinejoin="round" pointerEvents="none" />

      {/* gate, guard hut, trees */}
      <g pointerEvents="none">
        <rect x="32.4" y={H - 1.2} width="3" height="7" rx=".5" fill="#6B7280" stroke="#374151" strokeWidth=".3" />
        <rect x="44.6" y={H - 1.2} width="3" height="7" rx=".5" fill="#6B7280" stroke="#374151" strokeWidth=".3" />
        <rect x="26" y={H + 1.4} width="5" height="4.6" rx=".6" fill="#CBD5E1" stroke="#64748B" strokeWidth=".3" />
        <rect x="49" y={H + 1.4} width="5" height="4.6" rx=".6" fill="#CBD5E1" stroke="#64748B" strokeWidth=".3" />
        {leftTrees.slice(0, 5).map((x) => <Tree key={x} x={x} y={H + 3.2} />)}
        {rightTrees.slice(2).map((x) => <Tree key={x} x={x} y={H + 3.2} />)}
        <path d={`M40 ${H + 9} V${H + 1.5}`} stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" />
        <path d={`M36.8 ${H + 3.8} L40 ${H} L43.2 ${H + 3.8}`} fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="40" y={H + 14} textAnchor="middle" fontSize="2.8" fontWeight="900" fill="#0F172A">MAIN GATE</text>
        <text x="40" y={H + 17.2} textAnchor="middle" fontSize="2.1" fontWeight="700" fill="#334155">(NORTH / EAST PREFERRED)</text>
      </g>

      {/* compass */}
      <g transform={`translate(${W - 8} ${H + 13})`} pointerEvents="none" fill="#0F172A" fontWeight="900" fontSize="3">
        <path d="M0 -7 L1.6 0 L0 -1.6 L-1.6 0 Z" fill="#0F172A" />
        <path d="M0 7 L1.6 0 L0 1.6 L-1.6 0 Z" fill="#94A3B8" />
        <path d="M-7 0 L0 -1.6 L-1.6 0 L0 1.6 Z" fill="#94A3B8" />
        <path d="M7 0 L0 -1.6 L1.6 0 L0 1.6 Z" fill="#94A3B8" />
        <text y="-8.6" textAnchor="middle">N</text><text y="11.4" textAnchor="middle">S</text><text x="-10.4" y="1" textAnchor="middle">W</text><text x="10.4" y="1" textAnchor="middle">E</text>
      </g>
    </svg>
  );
}
