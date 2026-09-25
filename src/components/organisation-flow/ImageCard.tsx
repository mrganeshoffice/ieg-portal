import { useState } from 'react';
import { motion } from 'framer-motion';
import { ImageOff, ZoomIn } from 'lucide-react';
import type { FlowItem } from '@/data/organisationFlow';

/** One infographic thumbnail: used by both the Structured Flow view and the Gallery view. */
export default function ImageCard({ item, onOpen, compact }: { item: FlowItem; onOpen: () => void; compact?: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <motion.button
      type="button"
      onClick={failed ? undefined : onOpen}
      disabled={failed}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group card relative block w-full overflow-hidden text-left transition hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-default disabled:hover:shadow-soft"
    >
      <div className={`relative overflow-hidden bg-app ${compact ? 'aspect-[16/10]' : 'aspect-[16/9]'}`}>
        {failed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted">
            <ImageOff size={22} />
            <span className="text-[11px] font-medium">Image failed to load</span>
          </div>
        ) : (
          <>
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/0 to-navy-950/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-navy-900 opacity-0 shadow-soft backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
              <ZoomIn size={16} />
            </span>
          </>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate text-sm font-bold text-ink">{item.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p>
      </div>
    </motion.button>
  );
}
