/**
 * Content for the "About IEG" page. Verified against the IEG Technical Presentation and the
 * company's live website (iegautopower.com). Keep this file as the single source of copy —
 * components read from here rather than hardcoding text.
 */

export const hero = {
  eyebrow: 'About IEG',
  headline: 'Engineering Internal Energy Generation for a Smarter, Cleaner World',
  subline: 'A patent-backed technology enterprise pioneering energy optimization for battery-based and electric applications — thirty years of research behind two government patents.',
};

export const story = {
  heading: 'Our Story',
  lede: '30+ years in the making — one inventor, one vision, a technology built to change how batteries are powered.',
  body: 'IEG Auto Power Limited is an innovation-driven technology enterprise focused on energy efficiency in electric applications through engineered power-generation solutions. Its patented Internal Energy Generating System, developed by Mr. Ajay Choudhary, is designed to enhance energy optimization in battery-based applications such as electric vehicles.',
};

export interface JourneyItem { year: string; title: string; text: string }
export const journey: JourneyItem[] = [
  { year: '1993–94', title: 'Research Begins', text: 'Ajay Choudhary begins independent research into internal energy generation — a concept considered impossible by most.' },
  { year: '2003–04', title: 'Breakthrough', text: 'First self-charging generator created; the invention is presented to Dr. A. P. J. Abdul Kalam, President of India, in 2004, and receives personal recognition from the Presidential Secretariat.' },
  { year: '2011–12', title: 'Prototype & Patent Filed', text: 'The working IEG prototype is developed and tested; Patent Application No. 391051 is filed with the Indian Patent Office.' },
  { year: '2022–23', title: 'Patent Granted', text: 'Indian Patent No. 391051 for Internal Energy Generation is officially granted, effective from 2011.' },
  { year: '2025', title: '2nd Patent Granted & IEG Auto Formalized', text: 'Patent No. 557845 — a System for Regeneration of Internal Energy — is granted, and IEG Auto is formalized as a company.' },
];

export const vision = {
  heading: 'Vision',
  statement: 'Transforming global energy infrastructure to enable a resilient, low-impact energy ecosystem for future generations.',
};

export const mission = {
  heading: 'Mission',
  statement: 'To engineer energy solutions that are low-carbon, value-driven and free of pollution — advancing electric mobility and clean power without compromising the environment.',
};

export interface ValueItem { title: string; text: string }
export const values: ValueItem[] = [
  { title: 'No Pollution', text: 'Zero emissions, zero carbon footprint.' },
  { title: 'Low Carbon', text: 'Promotes a green revolution with carbon credits.' },
  { title: 'No Harm to Nature', text: 'Safe for the environment and the natural world.' },
  { title: 'Value-driven', text: 'Negligible infrastructure and maintenance.' },
];

export const technology = {
  heading: 'Our Technology',
  intro: 'The patented Internal Energy Generating (IEG) System is engineered to improve energy optimization within battery-based applications, such as electric vehicles, by re-using energy within the system rather than drawing solely on an external charge.',
  flow: ['Battery', 'Internal Energy Generating System', 'Optimized Energy Output'],
  note: 'Technical details here are limited to what has been publicly verified; specific performance, range or carbon-saving figures are not published on this page.',
};

export const patents = ['Patent No. 391051', 'Patent No. 557845', 'Application No. 202631019343', 'Application No. 202631015926'];

export const founder = {
  eyebrow: 'The Founder',
  name: 'Ajay Choudhary',
  title: 'Inventor, Scientist & Managing Director',
  photo: '/ajay-choudhary.jpg',
  bio: [
    'In 1993, Ajay Choudhary began independent research into internal energy generation — a concept considered impossible by most. Through a decade of relentless experimentation, he achieved a breakthrough in 2003: a generator that could produce more energy output than its input.',
    'In 2004, he presented his invention to Dr. A.P.J. Abdul Kalam, the President of India, and received personal recognition from the Presidential Secretariat. The working prototype was completed in 2011, the same year Patent No. 391051 was filed.',
    'After a 10-year patent examination process, the patent was officially granted in 2022. IEG Auto Powers Ltd. was formally incorporated, and in January 2025, a second patent (No. 557845) was granted for the System for Regeneration of Internal Energy.',
  ],
  quote: 'From a small workshop to two government patents — the IEG system proves that energy independence is possible.',
};

export interface BoardMember { name: string; role: string }
export const board: BoardMember[] = [
  { name: 'Ajay Choudhary', role: 'Managing Director' },
  { name: 'Vijay Krishna Gupta', role: 'Director' },
  { name: 'Kanchan Singh', role: 'Director' },
];

export interface Recognition { quote: string; name: string; role: string; period: string }
export const recognitions: Recognition[] = [
  { quote: 'Personal recognition of the IEG technology during a presentation at the Presidential Secretariat.', name: 'Dr. A.P.J. Abdul Kalam', role: 'Former President of India', period: '2004–05' },
  { quote: 'We truly appreciate the technology and wish you the best of luck in taking it forward to the nation.', name: 'Dr. Bhimaraya Metri', role: 'Director, IIM Nagpur', period: '2024' },
];

export const applications = ['Electric two-wheeler', 'Electric three-wheeler', 'Laptop & mobile charger', 'Electric car', 'Drones', 'Electric bus', 'Electric chulha', 'Robots', 'Ships & cargo', 'Machines', 'Air conditioner', 'Fridge', 'Eco-house', 'Electric OT', 'Turbine', 'Solar'];

export const closing = {
  heading: 'See IEG in Action',
  text: 'Explore how the IEG technology connects across the organization, or reach out directly to the team.',
  primaryCta: { label: 'Explore Our Structure', to: '/organisation-flow' },
};
