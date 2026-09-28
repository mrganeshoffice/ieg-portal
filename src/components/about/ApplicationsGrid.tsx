import { motion } from 'framer-motion';
import {
  Bike, Bot, Bus, Car, Cog, Flame, Grid3x3, HeartPulse, Home, Laptop, Plane, Refrigerator, Ship, Snowflake, Sun, Truck, Wind,
} from 'lucide-react';
import { applications } from '@/data/about';

const appIcons: Record<string, typeof Bike> = {
  'Electric two-wheeler': Bike,
  'Electric three-wheeler': Truck,
  'Laptop & mobile charger': Laptop,
  'Electric car': Car,
  'Drones': Plane,
  'Electric bus': Bus,
  'Electric chulha': Flame,
  'Robots': Bot,
  'Ships & cargo': Ship,
  'Machines': Cog,
  'Air conditioner': Snowflake,
  'Fridge': Refrigerator,
  'Eco-house': Home,
  'Electric OT': HeartPulse,
  'Turbine': Wind,
  'Solar': Sun,
};

/** Verified application areas, shown as an icon card grid with elevation + glow on hover. */
export default function ApplicationsGrid() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4 }}
      className="card p-6 md:p-8"
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf/10 text-leaf"><Grid3x3 size={17} /></span>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">Applications</h2>
          <p className="text-xs text-muted">Verified industry applications of IEG technology.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {applications.map((a, i) => {
          const Icon = appIcons[a] ?? Grid3x3;
          return (
            <motion.div
              key={a}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 10) * 0.04, duration: 0.3 }}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-app px-3 py-4 text-center transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:bg-surface hover:shadow-glow"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand/15 to-leaf/15 text-brand shadow-soft transition duration-300 group-hover:scale-110 group-hover:from-brand/25 group-hover:to-leaf/25">
                <Icon size={19} />
              </span>
              <span className="text-xs font-semibold leading-tight text-ink">{a}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
