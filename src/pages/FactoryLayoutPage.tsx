import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Box, Compass, Pause, Play, RotateCcw, Route, X, Zap } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Gate from '@/components/ui/Gate';
import FactoryPlan, { STEP_LABELS, type Seek } from '@/components/factory/FactoryPlan';
import { CONFIRM_LAYOUT, catMeta, flowOrder, flowSteps, vastuBenefits, vastuGuide, vastuTips, zones } from '@/data/factory';

function Content() {
  const [sel, setSel] = useState<string | null>(null);
  const [showFlow, setShowFlow] = useState(true);
  const [showVastu, setShowVastu] = useState(false);
  const [tab, setTab] = useState<'plan' | 'vastu'>('plan');
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [playing, setPlaying] = useState(!reduce);
  const [speed, setSpeed] = useState(1);
  const [seek, setSeek] = useState<Seek | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [depth, setDepth] = useState(false);
  const jump = (i: number) => { setSel(flowOrder[i]); setSeek({ step: i, n: Date.now() }); setPlaying(false); };
  const zone = zones.find((z) => z.id === sel);

  const facts: [string, string][] = [['Plot size', '150 ft × 100 ft'], ['Output target', '500 pcs/day'], ['Assembly', '4 compact lines'], ['Built-up area', '12,945 – 15,000 sq ft']];

  return (
    <>
      <PageHeader title="Factory Layout" description="Vastu-based layout for 500 pieces per day, product size 650 mm (L) × 300 mm (W) × 300 mm (H). Select a zone to see its size and preferred direction." confirmCount={1} />
      <div className="mb-4 flex flex-wrap gap-2">
        {facts.map(([k, v]) => <span key={k} className="card !rounded-2xl px-4 py-2.5 text-sm"><span className="text-muted">{k}: </span><b>{v}</b></span>)}
      </div>
      <div role="tablist" className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
        {([['plan', 'Plan & flow'], ['vastu', 'Vastu guide']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === k ? 'bg-navy-900 text-white' : 'text-muted hover:text-ink'}`}>{l}</button>
        ))}
      </div>

      {tab === 'plan' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="card p-4 md:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button onClick={() => setPlaying(!playing)} disabled={!showFlow} aria-pressed={playing} className={`tool-btn ${playing ? '!border-brand !text-brand' : ''}`}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? 'Pause flow' : 'Play flow'}</button>
              <button onClick={() => { setSeek({ step: 0, n: Date.now() }); setPlaying(true); }} disabled={!showFlow} className="tool-btn"><RotateCcw size={15} />Restart</button>
              <button onClick={() => setSpeed(speed === 1 ? 2 : 1)} disabled={!showFlow} className="tool-btn"><Zap size={15} />{speed}× speed</button>
              <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
              <button onClick={() => setShowFlow(!showFlow)} aria-pressed={showFlow} className={`tool-btn ${showFlow ? '!border-brand !text-brand' : ''}`}><Route size={15} />Material flow</button>
              <button onClick={() => setShowVastu(!showVastu)} aria-pressed={showVastu} className={`tool-btn ${showVastu ? '!border-brand !text-brand' : ''}`}><Compass size={15} />Vastu directions</button>
              <button onClick={() => setDepth(!depth)} aria-pressed={depth} className={`tool-btn ${depth ? '!border-brand !text-brand' : ''}`}><Box size={15} />3D view</button>
            </div>
            <ol className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              {STEP_LABELS.map((l, i) => (
                <li key={l} className="flex items-center gap-1.5">
                  <button onClick={() => jump(i)} className={`rounded-lg border px-2.5 py-1 transition ${activeStep === i && showFlow ? 'border-brand bg-brand text-white shadow' : activeStep > i && showFlow ? 'border-leaf/50 bg-leaf/10' : 'border-line bg-app'}`}>{i + 1}. {l}</button>
                  {i < STEP_LABELS.length - 1 && <span className="text-muted">→</span>}
                </li>
              ))}
            </ol>
            <div className="overflow-hidden rounded-2xl border border-line bg-[#FBFAF6] shadow-inner" style={depth ? { perspective: '1500px' } : undefined}>
              <div style={{ transform: depth ? 'rotateX(36deg) scale(1.02) translateY(-7%)' : 'none', transformOrigin: '50% 40%', transition: 'transform .8s ease' }}>
                <FactoryPlan selected={sel} onSelect={setSel} showFlow={showFlow} showVastu={showVastu} playing={playing && showFlow} speed={speed} seek={seek} activeStep={activeStep} onStep={setActiveStep} depth={depth} />
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-gold/50 bg-gold/10 p-3 text-xs leading-relaxed"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold" /><p><b>Needs confirmation.</b> {CONFIRM_LAYOUT}</p></div>
          </div>

          <aside className="space-y-4">
            <AnimatePresence mode="wait">
              {zone ? (
                <motion.div key={zone.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div><span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-ink" style={{ background: `${catMeta[zone.cat].color}33` }}>{catMeta[zone.cat].label}</span><h2 className="mt-2 text-lg font-extrabold leading-tight">{zone.name}</h2></div>
                    <button className="icon-btn -mr-2 -mt-1" onClick={() => setSel(null)} aria-label="Clear selection"><X size={18} /></button>
                  </div>
                  <dl className="mt-4 space-y-3 text-sm">
                    {([['Size (L × W × H)', zone.dims], ['Area', zone.area], ['Remarks', zone.remark], ['Best Vastu direction', zone.vastu], ['Flow step', zone.flow ? `${zone.flow - 1} of ${flowSteps.length}` : undefined]] as const).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 border-b border-line pb-2 last:border-0"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
                    ))}
                  </dl>
                </motion.div>
              ) : (
                <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5 text-sm text-muted">Select a zone on the plan to see its size, area and preferred direction.</motion.div>
              )}
            </AnimatePresence>
            <div className="card p-5">
              <h2 className="text-sm font-bold">Material and production flow</h2>
              <ol className="mt-3 space-y-1.5">
                {flowSteps.map((s, i) => (
                  <li key={s}><button onClick={() => jump(i)} className={`flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm transition hover:bg-app ${activeStep === i && showFlow ? 'bg-brand/10 font-semibold' : ''}`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${activeStep >= i && showFlow ? 'bg-leaf' : 'bg-navy-900'}`}>{i + 1}</span>{s}
                  </button></li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="card overflow-hidden lg:col-span-2">
            <h2 className="border-b border-line px-5 py-4 text-lg font-bold">Vastu directional guide</h2>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-app text-left text-xs text-muted"><th className="px-5 py-2.5 font-semibold">Area</th><th className="px-5 py-2.5 font-semibold">Best direction</th></tr></thead>
              <tbody>{vastuGuide.map(([a, d]) => <tr key={a} className="border-t border-line"><td className="px-5 py-2.5">{a}</td><td className="px-5 py-2.5 font-semibold">{d}</td></tr>)}</tbody></table></div>
          </section>
          <section className="card p-5"><h2 className="text-lg font-bold">Vastu benefits</h2><ul className="mt-3 space-y-2 text-sm">{vastuBenefits.map((b) => <li key={b} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />{b}</li>)}</ul></section>
          <section className="card p-5"><h2 className="text-lg font-bold">Important Vastu tips</h2><ul className="mt-3 space-y-2 text-sm">{vastuTips.map((b) => <li key={b} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{b}</li>)}</ul></section>
          <p className="text-xs text-muted lg:col-span-2">Directions were read from a photographed table. Please confirm them against the original.</p>
        </div>
      )}
    </>
  );
}

export default function FactoryLayoutPage() {
  return <Gate ms={300} skeleton={<div className="skeleton h-[70vh]" />}><Content /></Gate>;
}
