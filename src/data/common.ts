export const PHOTO_CONFIRM = 'Read from a photographed chart. Please confirm the wording against the original.';

/** Business units in the order used by the Group chart (Director n / HR Head n). */
export const units = [
  { n: 1, name: 'Electric Vehicles' },
  { n: 2, name: 'Home Appliances' },
  { n: 3, name: 'Consumer Electronics' },
  { n: 4, name: 'Commercial Power Solutions' },
  { n: 5, name: 'Motor Efficiency' },
] as const;

export const subsidiaryCount = units.length;
export const directorCount = 6;
