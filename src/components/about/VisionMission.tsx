import { motion } from 'framer-motion';
import { Leaf, Target } from 'lucide-react';
import { mission, values, vision } from '@/data/about';

/** Vision and Mission, presented as two visually distinct cards, plus the four supporting value tags. */
export default function VisionMission() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <motion.section
        initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
        className="card relative overflow-hidden p-6 md:p-7"
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10 blur-2xl" />
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand"><Target size={17} /></span>
        <h2 className="mt-3 text-lg font-extrabold tracking-tight">{vision.heading}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{vision.statement}</p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: 0.08 }}
        className="card relative overflow-hidden p-6 md:p-7"
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-leaf/10 blur-2xl" />
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf/10 text-leaf"><Leaf size={17} /></span>
        <h2 className="mt-3 text-lg font-extrabold tracking-tight">{mission.heading}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{mission.statement}</p>
      </motion.section>

      <div className="grid gap-3 sm:grid-cols-2 md:col-span-2 md:grid-cols-4">
        {values.map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.35 }}
            className="card p-4 transition hover:shadow-glow"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf"><Leaf size={11} />{v.title}</span>
            <p className="mt-2 text-xs leading-relaxed text-muted">{v.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
