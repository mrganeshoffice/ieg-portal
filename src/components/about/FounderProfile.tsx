import { motion } from 'framer-motion';
import { Quote, UserRound } from 'lucide-react';
import { board, founder } from '@/data/about';

/** Leadership section: an editorial profile for the Managing Director, using his supplied
 * photograph with a glowing gradient frame, plus a compact listing of the other board members. */
export default function FounderProfile() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
      className="card overflow-hidden"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,23rem)_1fr]">
        <div className="relative flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-25" />
          <div className="relative w-full max-w-xs">
            <div className="absolute -inset-1.5 rounded-[1.75rem] bg-gradient-to-br from-brand via-leaf to-brand opacity-70 blur-md" aria-hidden="true" />
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl ring-1 ring-white/20">
              <img src={founder.photo} alt={`${founder.name}, ${founder.title}`} className="absolute inset-0 h-full w-full object-cover object-top" loading="lazy" decoding="async" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy-950/80 to-transparent" />
            </div>
          </div>
        </div>

        <div className="relative p-6 md:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-600">{founder.eyebrow}</span>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">{founder.name}</h2>
          <p className="mt-1 bg-gradient-to-r from-brand-600 to-leaf-600 bg-clip-text text-sm font-bold text-transparent">{founder.title}</p>

          <div className="mt-4 space-y-3">
            {founder.bio.map((p, i) => <p key={i} className="text-sm leading-relaxed text-muted md:text-[15px]">{p}</p>)}
          </div>

          <motion.blockquote
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
            className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand/10 via-app to-leaf/10 px-5 py-4 shadow-soft"
          >
            <div className="absolute -right-3 -top-3 text-brand/15"><Quote size={56} /></div>
            <p className="relative text-sm font-medium italic leading-relaxed text-ink md:text-[15px]">"{founder.quote}"</p>
          </motion.blockquote>

          <div className="mt-6 border-t border-line pt-5">
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted"><UserRound size={13} />Board of Directors</h3>
            <div className="flex flex-wrap gap-2">
              {board.map((b) => (
                <span key={b.name} className="inline-flex items-center gap-2 rounded-xl bg-app px-3 py-1.5 text-xs transition hover:shadow-soft">
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
