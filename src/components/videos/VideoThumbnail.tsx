import { useState } from 'react';
import { ImageOff, PlayCircle } from 'lucide-react';
import { autoThumbnail } from '@/lib/videoUrl';

interface Props { thumbnailUrl: string | null; videoUrl: string; title: string; className?: string }

/** Thumbnail with graceful fallbacks: saved image -> provider auto-thumbnail (YouTube) -> generic placeholder.
 * Always shows a centered play affordance so the card reads as "click to play". */
export default function VideoThumbnail({ thumbnailUrl, videoUrl, title, className = '' }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = !failed ? thumbnailUrl || autoThumbnail(videoUrl) : null;

  return (
    <div className={`relative h-full w-full bg-gradient-to-br from-navy-800 to-navy-900 ${className}`}>
      {src ? (
        <>
          {!loaded && <div className="skeleton absolute inset-0 !rounded-none" aria-hidden />}
          <img src={src} alt={title} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06] ${loaded ? 'opacity-100' : 'opacity-0'}`} />
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400" role="img" aria-label={`${title} (no thumbnail)`}>
          <ImageOff size={26} /><span className="text-xs font-medium">No thumbnail</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-navy-950/25 opacity-0 transition duration-300 group-hover:opacity-100">
        <PlayCircle size={52} className="text-white drop-shadow-lg transition duration-300 group-hover:scale-110" />
      </div>
    </div>
  );
}
