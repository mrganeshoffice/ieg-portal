import { memo, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { kindMeta } from './nodeStyles';
import { NODE_H, NODE_W, type OrgFlowNode } from './layout';

function OrgNodeCardImpl({ data }: NodeProps<OrgFlowNode>) {
  const { node, depth, childCount, collapsed, selected, match, dim, lit, fade, onToggle } = data;
  const meta = kindMeta[node.kind];
  const Icon = meta.icon;
  const hero = depth === 0;
  const c = meta.color;

  const shadow = selected
    ? `0 14px 34px -10px ${c}99, 0 0 0 2px ${c}`
    : match
      ? `0 0 0 4px rgba(233,180,76,.65), 0 10px 26px -10px ${c}88`
      : lit
        ? `0 12px 28px -12px ${c}88, 0 0 0 1.5px ${c}99`
        : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 14 }}
      animate={{ opacity: dim ? 0.3 : fade ? 0.5 : 1, scale: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: Math.min(depth * 0.07, 0.45) }}
      style={{
        width: NODE_W, height: NODE_H, '--c': c, boxShadow: shadow,
        backgroundImage: hero
          ? 'linear-gradient(135deg,#0B1B33 0%,#13375F 100%)'
          : `linear-gradient(135deg, ${c}1F 0%, ${c}0A 38%, transparent 70%)`,
      } as CSSProperties}
      className={`group relative flex cursor-pointer items-center gap-3 overflow-visible rounded-[20px] border pl-3 pr-3 transition-shadow duration-200 hover:shadow-glow
        ${hero ? 'border-white/10 text-white' : 'bg-surface text-ink'} ${selected || match || lit ? 'border-transparent' : hero ? '' : 'border-line'}`}
    >
      {/* icon tile */}
      <span
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
        style={{ background: `linear-gradient(140deg, ${c}, color-mix(in srgb, ${c} 62%, #000))`, boxShadow: `0 8px 16px -8px ${c}` }}
      >
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent" />
        <Icon size={22} className="relative" strokeWidth={2.1} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[9.5px] font-extrabold uppercase leading-none tracking-[0.09em]" style={{ color: hero ? '#7DD3FC' : c }}>{meta.label}</span>
        <span className="mt-1 line-clamp-2 block text-[13.5px] font-extrabold leading-[1.15]" title={node.label}>{node.label}</span>
        {node.subtitle && <span className={`mt-0.5 block truncate text-[11px] leading-tight ${hero ? 'text-white/65' : 'text-muted'}`} title={node.subtitle}>{node.subtitle}</span>}
      </span>

      {node.confirm && (
        <span title="Needs confirmation" className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-gold text-navy-900 shadow">
          <AlertTriangle size={12} />
        </span>
      )}

      {childCount > 0 && (
        <button
          type="button"
          aria-label={collapsed ? `Expand ${node.label}` : `Collapse ${node.label}`}
          onClick={(e) => { e.stopPropagation(); onToggle?.(node.id); }}
          style={collapsed ? { background: c, color: '#fff', borderColor: c } : undefined}
          className="nodrag nopan absolute -bottom-3.5 right-5 z-10 flex h-7 items-center gap-0.5 rounded-full border border-line bg-surface px-2 text-[11px] font-extrabold text-muted shadow-soft transition hover:scale-105 hover:border-[var(--c)] hover:text-ink"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}{childCount}
        </button>
      )}

      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-surface !bg-[var(--c)]" />
      <Handle id="left" type="target" position={Position.Left} className="!h-1 !w-1 !border-0 !bg-transparent" />
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-surface !bg-[var(--c)]" />
      <Handle id="trunk" type="source" position={Position.Bottom} style={{ left: 24 }} className="!h-1 !w-1 !border-0 !bg-transparent" />
    </motion.div>
  );
}
export default memo(OrgNodeCardImpl);
