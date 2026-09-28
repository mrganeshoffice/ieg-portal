import { motion } from 'framer-motion';
import { Leaf, Target } from 'lucide-react';
import { mission, values, vision } from '@/data/about';

/** Vision and Mission, presented as two visually distinct gradient-framed cards, plus the four
 * supporting value tags. */
export default function VisionMission() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <motion.section
        initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
        className="group relative overflow-hidden rounded-3xl p-[1.5px]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand/60 via-brand/10 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="card relative h-full overflow-hidden !rounded-[calc(1.5rem-1.5px)] p-6 md:p-7">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10 blur-2xl" />
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 text-brand shadow-soft ring-1 ring-brand/20"><Target size={19} /></span>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight">{vision.heading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{vision.statement}</p>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: 0.08 }}
        className="group relative overflow-hidden rounded-3xl p-[1.5px]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-leaf/60 via-leaf/10 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="card relative h-full overflow-hidden !rounded-[calc(1.5rem-1.5px)] p-6 md:p-7">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-leaf/10 blur-2xl" />
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf/20 to-leaf/5 text-leaf shadow-soft ring-1 ring-leaf/20"><Leaf size={19} /></span>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight">{mission.heading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{mission.statement}</p>
        </div>
      </motion.section>

      <div className="grid gap-3 sm:grid-cols-2 md:col-span-2 md:grid-cols-4">
        {values.map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.35 }}
            className="card p-4 transition duration-300 hover:-translate-y-1 hover:shadow-glow"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf-600"><Leaf size={11} />{v.title}</span>
            <p className="mt-2 text-xs leading-relaxed text-muted">{v.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
