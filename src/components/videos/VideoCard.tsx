import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, PlayCircle } from 'lucide-react';
import VideoThumbnail from './VideoThumbnail';
import { resolveVideo } from '@/lib/videoUrl';
import type { Video } from '@/types/video';

export const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};

interface Props {
  video: Video;
  /** Opens the in-app player modal for youtube/vimeo/direct-file links. */
  onPlay?: (video: Video) => void;
  /** Non-interactive rendering for admin previews. */
  preview?: boolean;
}

/** One video card. The whole card is a single tab stop: it plays in-app when possible, otherwise it links out. */
export default function VideoCard({ video: v, onPlay, preview = false }: Props) {
  const target = resolveVideo(v.video_url);
  const date = formatDate(v.updated_at);
  const interactive = !preview && target.kind !== 'invalid';
  const cls = `group card relative flex h-full flex-col overflow-hidden text-left transition duration-300 ${interactive ? 'hover:-translate-y-1.5 hover:border-brand/50 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand' : ''}`;

  const body = (
    <>
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-navy-900">
        <VideoThumbnail thumbnailUrl={v.thumbnail_url} videoUrl={v.video_url} title={v.title} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent opacity-70 transition group-hover:opacity-90" />
        {target.kind === 'external' && (
          <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-navy-900 shadow-soft backdrop-blur transition duration-300 group-hover:bg-brand group-hover:text-white">
            <ArrowUpRight size={18} />
          </span>
        )}
        {v.category && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-navy-900 shadow-soft backdrop-blur">{v.category}</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight">{v.title}</h3>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          {interactive || preview ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              <PlayCircle size={16} />{target.kind === 'external' || target.kind === 'internal' ? 'Watch Video' : 'Play Video'}
            </span>
          ) : <span className="text-sm font-semibold text-muted">Link unavailable</span>}
          {date && <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted"><CalendarDays size={13} />{date}</span>}
        </div>
      </div>
    </>
  );

  if (!interactive) return <div className={cls} aria-disabled={!preview || undefined}>{body}</div>;
  if (target.kind === 'youtube' || target.kind === 'vimeo' || target.kind === 'file') {
    return <button type="button" className={cls} onClick={() => onPlay?.(v)} aria-label={`Play video: ${v.title}`}>{body}</button>;
  }
  if (target.kind === 'internal') return <Link to={target.to} className={cls} aria-label={`Watch video: ${v.title}`}>{body}</Link>;
  return <a href={target.kind === 'external' ? target.href : undefined} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`Watch video: ${v.title} (opens in a new tab)`}>{body}</a>;
}
