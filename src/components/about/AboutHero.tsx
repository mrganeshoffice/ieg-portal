import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { hero } from '@/data/about';

/** Full-width intro banner, matching the hero pattern used on Organisation Flow / Product PPT pages. */
export default function AboutHero() {
  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="no-print flex items-center gap-1 text-xs text-muted">
        <Link to="/" className="rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Dashboard</Link>
        <ChevronRight size={12} /><span className="font-semibold text-ink" aria-current="page">About IEG</span>
      </nav>

      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2rem] bg-navy-900 p-6 text-white shadow-soft md:p-10"
      >
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-brand/30 blur-[100px]" />
        <div className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-leaf/20 blur-[100px]" />

        <div className="relative flex flex-col items-start gap-5">
          <div className="flex items-center gap-3">
            <Logo size={48} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-400 ring-1 ring-white/15 backdrop-blur">
              <Sparkles size={12} />{hero.eyebrow}
            </span>
          </div>
          <h1 className="max-w-3xl text-2xl font-extrabold leading-tight tracking-tight md:text-4xl lg:text-[2.75rem]">{hero.headline}</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-slate-300 md:text-base">{hero.subline}</p>
        </div>
      </motion.section>
    </div>
  );
}
