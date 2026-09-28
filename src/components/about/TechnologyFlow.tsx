import { motion } from 'framer-motion';
import { ArrowRight, Award, Cpu, Info } from 'lucide-react';
import { patents, technology } from '@/data/about';

/** Plain-language technology explainer with a simple visual flow, plus the verified patent list. */
export default function TechnologyFlow() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
      className="card p-6 md:p-8"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand"><Cpu size={17} /></span>
        <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">{technology.heading}</h2>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted md:text-[15px]">{technology.intro}</p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-app p-5 sm:gap-3">
        {technology.flow.map((step, i) => (
          <div key={step} className="flex items-center gap-2 sm:gap-3">
            <span className="rounded-xl border border-line bg-surface px-4 py-2.5 text-center text-xs font-bold text-ink shadow-soft sm:text-sm">{step}</span>
            {i < technology.flow.length - 1 && <ArrowRight size={16} className="shrink-0 text-brand" />}
          </div>
        ))}
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
