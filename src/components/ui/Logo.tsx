import { site } from '@/config/site';

/** The logo is shown unaltered on a light tile so its navy lettering stays legible on dark surfaces. */
export default function Logo({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-soft ${className}`} style={{ width: size, height: size }}>
      <img src={site.logo} alt="IEG Auto Power Ltd logo" className="h-full w-full object-contain" draggable={false} />
    </span>
  );
}
