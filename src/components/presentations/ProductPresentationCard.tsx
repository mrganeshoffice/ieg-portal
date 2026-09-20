import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ImageOff, Presentation } from 'lucide-react';
import { resolveLink } from '@/lib/url';
import type { ProductPresentation } from '@/types/productPresentation';

export const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};

export function Thumbnail({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-navy-800 to-navy-900 text-slate-400 ${className}`} role="img" aria-label={`${alt} (image unavailable)`}>
        <ImageOff size={28} /><span className="text-xs font-medium">Image unavailable</span>
      </div>
    );
  }
  return (
    <>
      {!loaded && <div className="skeleton absolute inset-0 !rounded-none" aria-hidden />}
      <img src={src} alt={alt} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06] ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`} />
    </>
  );
}

interface Props { presentation: ProductPresentation; /** Non-interactive rendering for admin previews. */ preview?: boolean }

/** One presentation card. The whole card (image, title, button) is a single link, so it is one tab stop. */
export default function ProductPresentationCard({ presentation: p, preview = false }: Props) {
  const target = resolveLink(p.presentation_url);
  const date = formatDate(p.updated_at);
  const interactive = !preview && target.kind !== 'invalid';
  const cls = `group card relative flex h-full flex-col overflow-hidden text-left transition duration-300 ${interactive ? 'hover:-translate-y-1.5 hover:border-brand/50 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand' : ''}`;

  const body: ReactNode = (
    <>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-navy-900">
        <Thumbnail src={p.thumbnail_url} alt={p.title} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent opacity-70 transition group-hover:opacity-90" />
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-navy-900 shadow-soft backdrop-blur transition duration-300 group-hover:bg-brand group-hover:text-white">
          {target.kind === 'internal' ? <Presentation size={17} /> : <ArrowUpRight size={18} />}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight">{p.title}</h3>
        {p.description && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted">{p.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          {interactive || preview ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              View Presentation<ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-1" />
            </span>
          ) : <span className="text-sm font-semibold text-muted">Link unavailable</span>}
          {date && <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted"><CalendarDays size={13} />{date}</span>}
        </div>
      </div>
    </>
  );

  if (!interactive) return <div className={cls} aria-disabled={!preview || undefined}>{body}</div>;
  if (target.kind === 'internal') return <Link to={target.to} className={cls} aria-label={`View presentation: ${p.title}`}>{body}</Link>;
  return (
    <a href={target.kind === 'external' ? target.href : undefined} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`View presentation: ${p.title} (opens in a new tab)`}>{body}</a>
  );
}
