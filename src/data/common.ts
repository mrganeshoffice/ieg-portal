export const PHOTO_CONFIRM = 'Read from a photographed chart. Please confirm the wording against the original.';

/** Business units in the order used by the Group chart (Director n / HR Head n). */
export const units = [
  { n: 1, name: 'IEG Mega Industrial Power Pvt.Ltd' },
  { n: 2, name: 'IEG Smart Homes Energies Pvt.Ltd' },
  { n: 3, name: 'IEG Mega Industrial Power Pvt.Ltd' },
  { n: 4, name: 'IEG Universal Energies Pvt.Ltd' },
  { n: 5, name: 'IEG Retro Energies Productions Pvt.Ltd' },
] as const;

export const subsidiaryCount = units.length;
export const directorCount = 6;
