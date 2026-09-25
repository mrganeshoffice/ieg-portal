import { AnimatePresence, motion } from 'framer-motion';
import type { FlowItem } from '@/data/organisationFlow';
import ImageCard from './ImageCard';

/** Simple responsive grid of every visible flow item, in `items` order. */
export default function GalleryView({ items, onOpen }: { items: FlowItem[]; onOpen: (id: string) => void }) {
  return (
    <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item) => (
          <motion.li key={item.id} layout exit={{ opacity: 0, scale: 0.96 }}>
            <ImageCard item={item} onOpen={() => onOpen(item.id)} compact />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
