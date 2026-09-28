import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, ChevronRight, Sparkles } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import EnergyGraphic from '@/components/about/EnergyGraphic';
import { hero } from '@/data/about';

const stats = [
  { label: 'Years of R&D', value: '30+' },
  { label: 'Government Patents', value: '2' },
  { label: 'Founder-led Innovation', value: '1993' },
];

/** Full-width intro banner with an animated energy-core graphic, matching the hero pattern
 * used elsewhere in the portal but elevated with a custom visual and floating stat chips. */
export default function AboutHero() {
  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="no-print flex items-center gap-1 text-xs text-muted">
        <Link to="/" className="rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Dashboard</Link>
        <ChevronRight size={12} /><span className="font-semibold text-ink" aria-current="page">About IEG</span>
      </nav>

      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2rem] bg-navy-900 text-white shadow-soft"
      >
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-brand/30 blur-[110px]" />
        <div className="absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-leaf/20 blur-[110px]" />

        <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6">
          <div className="flex flex-col items-start gap-5">
            <div className="flex items-center gap-3">
              <Logo size={48} />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-400 ring-1 ring-white/15 backdrop-blur">
                <Sparkles size={12} />{hero.eyebrow}
              </span>
            </div>
            <h1 className="max-w-xl text-2xl font-extrabold leading-[1.1] tracking-tight md:text-4xl lg:text-[2.9rem]">
              Engineering{' '}
              <span className="bg-gradient-to-r from-brand-400 via-brand-400 to-leaf-400 bg-clip-text text-transparent">Internal Energy Generation</span>
              {' '}for a Smarter, Cleaner World
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-slate-300 md:text-base">{hero.subline}</p>

            <div className="mt-1 flex flex-wrap gap-3">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 backdrop-blur"
                >
                  <div className="text-lg font-extrabold leading-none text-white">{s.value}</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="relative mx-auto aspect-square w-full max-w-[22rem]"
          >
            <EnergyGraphic className="h-full w-full" />
            <span className="absolute right-2 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
              <Award size={11} className="text-gold" />Patented System
            </span>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
