import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { journey, story } from '@/data/about';

/** "Our Story" section: intro paragraph plus the verified year-by-year journey. */
export default function StoryTimeline() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
      className="card p-6 md:p-8"
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand"><BookOpen size={17} /></span>
        <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">{story.heading}</h2>
      </div>
      <p className="max-w-3xl text-sm font-semibold text-brand-600">{story.lede}</p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted md:text-[15px]">{story.body}</p>

      <ol className="mt-8 space-y-6 border-l-2 border-line pl-6">
        {journey.map((j, i) => (
          <motion.li
            key={j.year}
            initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.35 }}
            className="relative"
          >
            <span className="node-pulse absolute -left-[1.72rem] top-1 h-3 w-3 rounded-full bg-gradient-to-br from-brand to-leaf shadow-glow ring-4 ring-surface" style={{ animationDelay: `${i * 0.15}s` }} />
            <span className="inline-block rounded-lg bg-brand/10 px-2.5 py-1 text-xs font-extrabold tracking-wide text-brand-600">{j.year}</span>
            <h3 className="mt-1.5 text-sm font-bold text-ink">{j.title}</h3>
            <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-muted">{j.text}</p>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  );
}
