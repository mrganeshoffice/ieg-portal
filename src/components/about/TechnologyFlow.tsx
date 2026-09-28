import { motion } from 'framer-motion';
import { Award, BatteryCharging, Cpu, Gauge, Info } from 'lucide-react';
import EnergyGraphic from '@/components/about/EnergyGraphic';
import { patents, technology } from '@/data/about';

/** Plain-language technology explainer with an animated radial flow diagram (Battery → IEG core
 * → Optimized Output), plus the verified patent list. */
export default function TechnologyFlow() {
  const [inLabel, , outLabel] = technology.flow;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
      className="card overflow-hidden p-6 md:p-8"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand"><Cpu size={17} /></span>
        <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">{technology.heading}</h2>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted md:text-[15px]">{technology.intro}</p>

      <div className="relative mt-8 overflow-hidden rounded-3xl border border-line bg-app px-4 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

        <div className="relative z-10 flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          <motion.div
            initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface text-brand shadow-soft"><BatteryCharging size={24} /></span>
            <span className="max-w-[7rem] text-xs font-bold text-ink sm:text-sm">{inLabel}</span>
          </motion.div>

          {/* connector: battery -> core */}
          <svg className="hidden h-4 flex-1 sm:block" preserveAspectRatio="none" viewBox="0 0 100 4">
            <line x1="0" y1="2" x2="100" y2="2" stroke="#1FA2E8" strokeWidth="2" strokeDasharray="4 4" className="dashed-flow" opacity="0.7" />
          </svg>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="flex w-40 shrink-0 flex-col items-center gap-2 text-center"
          >
            <EnergyGraphic variant="flow" className="h-24 w-24 sm:h-28 sm:w-28" />
            <span className="text-xs font-bold text-ink sm:text-sm">Internal Energy Generating System</span>
          </motion.div>

          {/* connector: core -> output */}
          <svg className="hidden h-4 flex-1 sm:block" preserveAspectRatio="none" viewBox="0 0 100 4">
            <line x1="0" y1="2" x2="100" y2="2" stroke="#34C77B" strokeWidth="2" strokeDasharray="4 4" className="dashed-flow" opacity="0.7" />
          </svg>

          <motion.div
            initial={{ opacity: 0, x: 14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface text-leaf shadow-soft"><Gauge size={24} /></span>
            <span className="max-w-[7rem] text-xs font-bold text-ink sm:text-sm">{outLabel}</span>
          </motion.div>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-app px-3.5 py-2.5 text-xs leading-relaxed text-muted">
        <Info size={14} className="mt-0.5 shrink-0 text-brand" />
        <span>{technology.note}</span>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink"><Award size={15} className="text-brand" />Patents</h3>
        <div className="flex flex-wrap gap-2">
          {patents.map((p) => <span key={p} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">{p}</span>)}
        </div>
      </div>
    </motion.section>
  );
}
