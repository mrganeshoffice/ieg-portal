import { motion } from 'framer-motion';
import { Award, Cpu, Leaf, Mail, Phone, Target, UserRound } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { site } from '@/config/site';

/** Source: IEG Technical Presentation supplied by the company. */
const board = [
  { name: 'Ajay Choudhary', role: 'Managing Director' },
  { name: 'Vijay Krishna Gupta', role: 'Director' },
  { name: 'Kanchan Singh', role: 'Director' },
];

const journey = [
  { year: '1993–94', text: 'Ajay Choudhary begins research on internal energy generation.' },
  { year: '2003–04', text: 'Breakthrough with a self-charging generator; invention presented to Dr. A. P. J. Abdul Kalam in 2004.' },
  { year: '2011–12', text: 'First working prototype created.' },
  { year: '2022–23', text: 'Patent granted for Internal Energy Generation (effective from 2011).' },
  { year: '2025', text: 'IEG Auto formalized as a company.' },
];

const patents = ['Patent No. 391051', 'Patent No. 557845', 'Application No. 202631019343', 'Application No. 202631015926'];
const apps = ['Electric two-wheeler', 'Electric three-wheeler', 'Laptop & mobile charger', 'Electric car', 'Drones', 'Electric bus', 'Electric chulha', 'Robots', 'Ships & cargo', 'Machines', 'Air conditioner', 'Fridge', 'Eco-house', 'Electric OT', 'Turbine', 'Solar'];

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="About IEG Auto Power Ltd" description="Company background, board of directors, vision and contact details, from the IEG Technical Presentation." />
      <div className="grid gap-5 lg:grid-cols-3">
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5 lg:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Cpu size={18} className="text-brand" />Who we are</h2>
          <p className="text-sm leading-relaxed text-muted">
            IEG Auto Power Limited is an innovation-driven technology enterprise focused on energy efficiency in electric applications through engineered power-generation solutions. Its patented Internal Energy Generating System, developed by Mr. Ajay Choudhary, is designed to enhance energy optimization in battery-based applications such as electric vehicles.
          </p>
        </motion.section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><UserRound size={18} className="text-brand" />Board of Directors</h2>
          <ul className="space-y-2">
            {board.map((b) => (
              <li key={b.name} className="rounded-xl bg-app px-3 py-2">
                <div className="text-sm font-semibold">{b.name}</div>
                <div className="text-xs text-muted">{b.role}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold">IEG journey</h2>
          <ol className="space-y-3">
            {journey.map((j) => (
              <li key={j.year} className="flex gap-3">
                <span className="w-20 shrink-0 rounded-lg bg-brand/10 px-2 py-1 text-center text-xs font-bold text-brand">{j.year}</span>
                <span className="text-sm text-muted">{j.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Award size={18} className="text-brand" />Patents</h2>
          <ul className="space-y-1.5 text-sm text-muted">{patents.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><Target size={18} className="text-brand" />Vision & value proposition</h2>
          <p className="text-sm text-muted">Transforming global energy infrastructure to enable a resilient, low-impact energy ecosystem for future generations.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Low carbon emission', 'Value driven', 'No harm to nature', 'No pollution'].map((v) => (
              <span key={v} className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-3 py-1 text-xs font-semibold"><Leaf size={12} className="text-leaf" />{v}</span>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold">Contact</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2"><Phone size={14} />{site.contact.phone}</li>
            {site.contact.emails.map((e) => <li key={e} className="flex items-center gap-2 break-all"><Mail size={14} />{e}</li>)}
          </ul>
        </section>

        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-3 text-lg font-bold">Industry applications of IEG technology</h2>
          <div className="flex flex-wrap gap-2">{apps.map((a) => <span key={a} className="rounded-full border border-line px-3 py-1 text-xs font-medium">{a}</span>)}</div>
        </section>
      </div>
    </div>
  );
}
