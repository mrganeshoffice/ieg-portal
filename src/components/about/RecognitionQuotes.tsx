import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { recognitions } from '@/data/about';

/** Verified testimonials/recognition from external figures, in a premium quote-card treatment. */
export default function RecognitionQuotes() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-xl font-extrabold tracking-tight md:text-2xl">Recognized By The Best</h2>
      <div className="grid gap-5 md:grid-cols-2">
        {recognitions.map((r, i) => (
          <motion.blockquote
            key={r.name}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.35 }}
            className="card relative overflow-hidden p-6 transition duration-300 hover:shadow-glow md:p-7"
          >
            <div className="absolute -right-4 -top-4 text-brand/10"><Quote size={90} /></div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand/20 to-leaf/20 text-brand"><Quote size={16} /></span>
            <p className="relative mt-4 text-sm italic leading-relaxed text-ink md:text-[15px]">"{r.quote}"</p>
            <footer className="relative mt-4 border-t border-line pt-3">
              <p className="text-sm font-bold text-ink">{r.name}</p>
              <p className="text-xs text-muted">{r.role} · {r.period}</p>
            </footer>
          </motion.blockquote>
        ))}
      </div>
    </motion.section>
  );
}
