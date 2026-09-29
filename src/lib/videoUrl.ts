import { resolveLink } from './url';

export type VideoTarget =
  | { kind: 'youtube'; embedUrl: string }
  | { kind: 'vimeo'; embedUrl: string }
  | { kind: 'file'; src: string }
  | { kind: 'internal'; to: string }
  | { kind: 'external'; href: string }
  | { kind: 'invalid' };

const YOUTUBE_RE = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{6,})/i;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/i;
const FILE_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;

/** Resolves a stored video link into the right playback strategy: embed, native file, in-app route, or external link. */
export function resolveVideo(raw: string | null | undefined): VideoTarget {
  const link = resolveLink(raw);
  if (link.kind === 'invalid') return { kind: 'invalid' };
  if (link.kind === 'internal') return FILE_RE.test(link.to) ? { kind: 'file', src: link.to } : { kind: 'internal', to: link.to };

  const yt = YOUTUBE_RE.exec(link.href);
  if (yt) return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0` };

  const vm = VIMEO_RE.exec(link.href);
  if (vm) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vm[1]}?autoplay=1` };

  if (FILE_RE.test(link.href)) return { kind: 'file', src: link.href };
  return { kind: 'external', href: link.href };
}

/** A deterministic thumbnail for a recognized provider, used only when the admin left the thumbnail blank. */
export function autoThumbnail(raw: string | null | undefined): string | null {
  const yt = YOUTUBE_RE.exec(String(raw ?? ''));
  return yt ? `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` : null;
}

export const isValidVideoUrl = (raw: string) => resolveVideo(raw).kind !== 'invalid';
