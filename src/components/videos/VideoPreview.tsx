import { Eye } from 'lucide-react';
import VideoCard from './VideoCard';
import type { Video } from '@/types/video';

interface Props { title: string; videoUrl: string; thumbnailUrl: string | null; category: string; updatedAt?: string }

/** Shows exactly how a card will look in the user panel. */
export default function VideoPreview({ title, videoUrl, thumbnailUrl, category, updatedAt }: Props) {
  const v: Video = {
    id: 'preview', title: title.trim() || 'Video title', video_url: videoUrl, thumbnail_url: thumbnailUrl || null,
    category: category.trim() || null, display_order: 0, is_published: true, created_at: updatedAt ?? new Date().toISOString(), updated_at: updatedAt ?? new Date().toISOString(), created_by: null,
  };
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted"><Eye size={14} />Card preview</p>
      <div className="mx-auto max-w-sm"><VideoCard video={v} preview /></div>
    </div>
  );
}
