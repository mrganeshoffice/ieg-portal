import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { recognitions } from '@/data/about';

/** Verified testimonials/recognition from external figures. */
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
            className="card relative p-6"
          >
            <Quote size={22} className="text-brand/20" />
            <p className="mt-3 text-sm italic leading-relaxed text-ink md:text-[15px]">"{r.quote}"</p>
            <footer className="mt-4 border-t border-line pt-3">
              <p className="text-sm font-bold text-ink">{r.name}</p>
              <p className="text-xs text-muted">{r.role} · {r.period}</p>
            </footer>
          </motion.blockquote>
        ))}
      </div>
    </motion.section>
  );
}
