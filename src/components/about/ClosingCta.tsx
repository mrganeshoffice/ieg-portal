import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Phone } from 'lucide-react';
import { closing } from '@/data/about';
import { site } from '@/config/site';

/** Final call-to-action: explore the organization structure, or reach the team directly. */
export default function ClosingCta() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-[2rem] bg-navy-900 p-6 text-white shadow-soft md:p-10"
    >
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-leaf/20 blur-[90px]" />
      <div className="absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-brand/25 blur-[90px]" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand/10 to-leaf/10 blur-[100px]" />

      <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">{closing.heading}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">{closing.text}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to={closing.primaryCta.to} className="btn-primary">{closing.primaryCta.label}<ArrowRight size={16} /></Link>
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-sm text-slate-300">
        <span className="flex items-center gap-2"><Phone size={14} className="text-brand-400" />{site.contact.phone}</span>
        {site.contact.emails.map((e) => <span key={e} className="flex items-center gap-2 break-all"><Mail size={14} className="text-brand-400" />{e}</span>)}
      </div>
    </motion.section>
  );
}
