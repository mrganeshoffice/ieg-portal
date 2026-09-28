import { motion } from 'framer-motion';
import { Quote, UserRound } from 'lucide-react';
import { board, founder } from '@/data/about';

/** Leadership section: a polished profile for the Managing Director, using his supplied photograph,
 * plus a compact listing of the other verified board members. */
export default function FounderProfile() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
      className="card overflow-hidden"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="relative aspect-[4/5] w-full overflow-hidden lg:aspect-auto lg:h-full">
          <img src={founder.photo} alt={`${founder.name}, ${founder.title}`} className="absolute inset-0 h-full w-full object-cover object-top" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/0 to-navy-950/0 lg:bg-gradient-to-r" />
        </div>

        <div className="p-6 md:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-600">{founder.eyebrow}</span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">{founder.name}</h2>
          <p className="mt-1 text-sm font-semibold text-leaf-600">{founder.title}</p>

          <div className="mt-4 space-y-3">
            {founder.bio.map((p, i) => <p key={i} className="text-sm leading-relaxed text-muted md:text-[15px]">{p}</p>)}
          </div>

          <blockquote className="relative mt-5 rounded-2xl border-l-4 border-brand bg-app px-5 py-4">
            <Quote size={18} className="absolute right-4 top-4 text-brand/25" />
            <p className="text-sm italic leading-relaxed text-ink">"{founder.quote}"</p>
          </blockquote>

          <div className="mt-6 border-t border-line pt-5">
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted"><UserRound size={13} />Board of Directors</h3>
            <div className="flex flex-wrap gap-2">
              {board.map((b) => (
                <span key={b.name} className="inline-flex items-center gap-2 rounded-xl bg-app px-3 py-1.5 text-xs">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand to-leaf text-[10px] font-bold text-white">
                    {b.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <span className="font-semibold text-ink">{b.name}</span>
                  <span className="text-muted">· {b.role}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
