import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { resolveVideo } from '@/lib/videoUrl';
import type { Video } from '@/types/video';

interface Props { video: Video | null; onClose: () => void }

/** Full playback modal: embeds YouTube/Vimeo, plays direct video files natively. Esc / backdrop click closes it. */
export default function VideoPlayerModal({ video, onClose }: Props) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!video) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; };
  }, [video]);

  if (!video) return null;
  const target = resolveVideo(video.video_url);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
        <motion.div className="absolute inset-0 bg-navy-950/85 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div
          role="dialog" aria-modal="true" aria-label={video.title}
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-soft"
        >
          <button type="button" onClick={onClose} aria-label="Close player" className="absolute right-2.5 top-2.5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <X size={20} />
          </button>
          <div className="aspect-video w-full bg-black">
            {(target.kind === 'youtube' || target.kind === 'vimeo') && (
              <iframe key={target.embedUrl} src={target.embedUrl} title={video.title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            )}
            {target.kind === 'file' && (
              <video key={target.src} src={target.src} title={video.title} className="h-full w-full" controls autoPlay playsInline />
            )}
          </div>
          <div className="px-4 py-3"><p className="truncate text-sm font-semibold text-white">{video.title}</p></div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
