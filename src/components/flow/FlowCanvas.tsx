import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ReactFlow, ReactFlowProvider, MiniMap, Background, BackgroundVariant, Panel, useReactFlow,
  getNodesBounds, getViewportForBounds, type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AnimatePresence, motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import {
  ChevronRight, ChevronsDownUp, ChevronsUpDown, Download, Image as ImageIcon, ListTree, Maximize2, Minimize2, Printer, RotateCcw, Scan, Search, Workflow, ZoomIn, ZoomOut,
} from 'lucide-react';
import type { OrgNode } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import OrgNodeCard from './OrgNodeCard';
import NodeDrawer from './NodeDrawer';
import ImageLightbox from '@/components/ui/ImageLightbox';
import TreeList from './TreeList';
import { NODE_H, NODE_W, indexTree, layoutTree, type OrgFlowNode } from './layout';
import { kindMeta } from './nodeStyles';

const nodeTypes = { org: OrgNodeCard };

interface Props { root: OrgNode; defaultCollapsed?: string[]; imageUrl?: string }

function Inner({ root, defaultCollapsed = [], imageUrl }: Props) {
  const rf = useReactFlow();
  const { theme } = useTheme();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [params] = useSearchParams();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(defaultCollapsed));
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'graph' | 'list'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'graph'));
  const [fullscreen, setFullscreen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const index = useMemo(() => indexTree(root), [root]);
  const { nodes: baseNodes, edges: baseEdges } = useMemo(() => layoutTree(root, collapsed), [root, collapsed]);

  // Lineage highlight: path from the root to the hovered (or selected) node lights up.
  const focusId = hover ?? selected;
  const litPath = useMemo(() => (focusId && index.has(focusId) ? new Set(index.get(focusId)!.path.map((p) => p.id)) : null), [focusId, index]);
  const edges = useMemo(() => baseEdges.map((e) => {
    const lit = !!litPath && ((litPath.has(e.source) && litPath.has(e.target)) || e.source === focusId);
    const st = e.style as Record<string, unknown>;
    return { ...e, animated: lit, className: lit ? 'flow-edge' : '', zIndex: lit ? 10 : 0, style: { ...st, strokeWidth: lit ? 3 : 1.8, opacity: litPath ? (lit ? 1 : 0.18) : 0.6 } };
  }), [baseEdges, litPath, focusId]);

  const matches = useMemo(() => {
    const t = query.trim().toLowerCase();
    const s = new Set<string>();
    if (!t) return s;
    index.forEach(({ node }, id) => { if (`${node.label} ${node.subtitle ?? ''}`.toLowerCase().includes(t)) s.add(id); });
    return s;
  }, [query, index]);

  const toggle = useCallback((id: string) => setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);

  const nodes = useMemo<OrgFlowNode[]>(() => baseNodes.map((n) => ({
    ...n, data: { ...n.data, onToggle: toggle, selected: n.id === selected, match: matches.has(n.id), dim: matches.size > 0 && !matches.has(n.id),
      lit: !!litPath && litPath.has(n.id),
      fade: !!hover && !!litPath && !litPath.has(n.id) && index.get(n.id)?.parent?.id !== hover },
  })), [baseNodes, toggle, selected, matches, litPath, hover, index]);

  const expandAncestors = useCallback((ids: string[]) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => index.get(id)?.path.slice(0, -1).forEach((p) => next.delete(p.id)));
      return next.size === prev.size ? prev : next;
    });
  }, [index]);

  const centerOn = useCallback((id: string) => {
    setTimeout(() => {
      const n = rf.getNode(id);
      if (n) rf.setCenter(n.position.x + NODE_W / 2, n.position.y + NODE_H / 2, { zoom: 1, duration: 600 });
    }, 350);
  }, [rf]);

  useEffect(() => { if (matches.size) expandAncestors([...matches]); }, [matches, expandAncestors]);

  // Deep-link from search: /route?focus=<nodeId>
  useEffect(() => {
    const f = params.get('focus');
    if (f && index.has(f)) { expandAncestors([f]); setSelected(f); centerOn(f); }
  }, [params, index, expandAncestors, centerOn]);

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const fit = useCallback(() => rf.fitView({ duration: 500, padding: 0.08 }), [rf]);
  useEffect(() => { const t = setTimeout(fit, 120); return () => clearTimeout(t); }, [root, fit, view]);

  const onNodeClick: NodeMouseHandler = useCallback((_, n) => setSelected(n.id), []);
  const select = useCallback((id: string) => { expandAncestors([id]); setSelected(id); if (view === 'graph') centerOn(id); }, [expandAncestors, centerOn, view]);
  const selectedEntry = selected ? index.get(selected) : undefined;

  const collapseAll = () => setCollapsed(new Set([...index.values()].filter((e) => e.node.children?.length && e.node.id !== root.id).map((e) => e.node.id)));
  const reset = () => { setCollapsed(new Set(defaultCollapsed)); setQuery(''); setSelected(null); setTimeout(fit, 200); };
  const toggleFullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else wrapRef.current?.requestFullscreen?.(); };
  const print = () => { setView('graph'); setTimeout(() => { fit(); setTimeout(() => window.print(), 600); }, 100); };

  const exportPng = async () => {
    const el = wrapRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!el) return;
    const b = getNodesBounds(rf.getNodes());
    const pad = 80;
    const w = Math.min(Math.ceil(b.width + pad * 2), 6000), h = Math.min(Math.ceil(b.height + pad * 2), 6000);
    const vp = getViewportForBounds(b, w, h, 0.1, 2, 0.05);
    const url = await toPng(el, { backgroundColor: theme === 'dark' ? '#080F1C' : '#F1F4F9', width: w, height: h, style: { width: `${w}px`, height: `${h}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` } });
    const a = document.createElement('a'); a.download = `${root.label.replace(/\W+/g, '-').toLowerCase()}-chart.png`; a.href = url; a.click();
  };

  const kindsPresent = useMemo(() => [...new Set([...index.values()].map((e) => e.node.kind))], [index]);
  const crumbs = (selectedEntry ?? index.get(root.id)!).path;
  const firstMatch = [...matches][0];

  return (
    <div ref={wrapRef} className={`flex flex-col overflow-hidden border border-line bg-surface shadow-soft ${fullscreen ? 'h-screen rounded-none' : 'h-[calc(100dvh-12.5rem)] min-h-[540px] rounded-3xl'}`}>
      {/* toolbar */}
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <div className="relative min-w-[12rem] flex-1 md:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !py-2 pl-9" placeholder="Find a role or department" value={query} aria-label="Find in chart"
            onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && firstMatch) { setTimeout(() => centerOn(firstMatch), 60); } }} />
          {matches.size > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted">{matches.size} found</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {view === 'graph' && <>
            <button className="tool-btn" onClick={() => rf.zoomIn({ duration: 200 })} aria-label="Zoom in" title="Zoom in"><ZoomIn size={15} /></button>
            <button className="tool-btn" onClick={() => rf.zoomOut({ duration: 200 })} aria-label="Zoom out" title="Zoom out"><ZoomOut size={15} /></button>
            <button className="tool-btn" onClick={fit} aria-label="Fit to screen" title="Fit to screen"><Scan size={15} /></button>
          </>}
          <button className="tool-btn" onClick={reset} aria-label="Reset chart" title="Reset"><RotateCcw size={15} /></button>
          <button className="tool-btn" onClick={() => setCollapsed(new Set())} title="Expand all"><ChevronsUpDown size={15} /><span className="hidden lg:inline">Expand</span></button>
          <button className="tool-btn" onClick={collapseAll} title="Collapse all"><ChevronsDownUp size={15} /><span className="hidden lg:inline">Collapse</span></button>
          <button className="tool-btn" onClick={() => setView(view === 'graph' ? 'list' : 'graph')} title="Switch view">{view === 'graph' ? <ListTree size={15} /> : <Workflow size={15} />}<span className="hidden sm:inline">{view === 'graph' ? 'List view' : 'Chart view'}</span></button>
          <button className="tool-btn hidden sm:inline-flex" onClick={print} title="Print or save as PDF"><Printer size={15} /><span className="hidden xl:inline">Print</span></button>
          <button className="tool-btn hidden sm:inline-flex" onClick={exportPng} title="Export PNG"><Download size={15} /><span className="hidden xl:inline">PNG</span></button>
          {imageUrl && (
            <button className="tool-btn" onClick={() => setImageOpen(true)} aria-label="View reference image" title="View reference image"><ImageIcon size={15} /><span className="hidden lg:inline">View Image</span></button>
          )}
          <button className="tool-btn" onClick={toggleFullscreen} aria-label="Fullscreen" title="Fullscreen">{fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
        </div>
      </div>

      {/* hierarchy breadcrumb */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-app/60 px-3 py-1.5 text-xs" aria-label="Hierarchy">
        <AnimatePresence mode="popLayout" initial={false}>
          {crumbs.map((c, i) => (
            <motion.button key={c.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} onClick={() => select(c.id)}
              className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 transition hover:bg-line/60 ${i === crumbs.length - 1 ? 'font-bold text-ink' : 'text-muted'}`}>
              {c.label}{i < crumbs.length - 1 && <ChevronRight size={12} />}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative min-h-0 flex-1">
        {view === 'graph' ? (
          <ReactFlow
            nodes={nodes} edges={edges} nodeTypes={nodeTypes} colorMode={theme} onNodeClick={onNodeClick} onPaneClick={() => setSelected(null)} onNodeMouseEnter={(_, n) => setHover(n.id)} onNodeMouseLeave={() => setHover(null)} className="org-canvas"
            nodesDraggable={false} nodesConnectable={false} elementsSelectable minZoom={0.1} maxZoom={2} fitView fitViewOptions={{ padding: 0.08 }} proOptions={{ hideAttribution: false }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color={theme === 'dark' ? 'rgba(148,163,184,.22)' : 'rgba(100,116,139,.28)'} />
            <MiniMap pannable zoomable className="!hidden md:!block" nodeColor={(n) => kindMeta[(n as OrgFlowNode).data.node.kind].color} maskColor={theme === 'dark' ? 'rgba(8,15,28,.7)' : 'rgba(241,244,249,.7)'} />
            <Panel position="bottom-left" className="no-print !m-3 hidden max-w-[70%] flex-wrap gap-x-3 gap-y-1 rounded-2xl border border-line bg-surface/90 px-3 py-2 text-[11px] backdrop-blur md:flex">
              {kindsPresent.map((k) => <span key={k} className="flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold" style={{ background: `${kindMeta[k].color}18`, color: kindMeta[k].color }}><span className="h-2 w-2 rounded-full" style={{ background: kindMeta[k].color }} />{kindMeta[k].label}</span>)}
            </Panel>
          </ReactFlow>
        ) : (
          <div className="h-full overflow-y-auto"><TreeList root={root} selectedId={selected} onSelect={setSelected} forceOpen={matches.size ? new Set([...matches].flatMap((m) => index.get(m)!.path.map((p) => p.id))) : undefined} /></div>
        )}
        <AnimatePresence>
          {selectedEntry && <NodeDrawer key="drawer" entry={selectedEntry} onClose={() => setSelected(null)} onSelect={select} />}
        </AnimatePresence>
      </div>
      {imageUrl && (
        <ImageLightbox open={imageOpen} onClose={() => setImageOpen(false)} src={imageUrl} title={`${root.label} — reference image`} downloadName={`${root.label.replace(/\W+/g, '-').toLowerCase()}.png`} />
      )}
    </div>
  );
}

export default function FlowCanvas(props: Props) {
  return <ReactFlowProvider><Inner {...props} /></ReactFlowProvider>;
}
