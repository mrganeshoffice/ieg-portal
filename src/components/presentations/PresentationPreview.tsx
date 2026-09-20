import { Eye } from 'lucide-react';
import ProductPresentationCard from './ProductPresentationCard';
import type { ProductPresentation } from '@/types/productPresentation';

interface Props { title: string; description?: string; thumbnailUrl: string; presentationUrl: string; updatedAt?: string }

/** Shows exactly how a card will look in the user panel. */
export default function PresentationPreview({ title, description, thumbnailUrl, presentationUrl, updatedAt }: Props) {
  const p: ProductPresentation = {
    id: 'preview', title: title.trim() || 'Presentation title', description: description?.trim() || null, thumbnail_url: thumbnailUrl,
    presentation_url: presentationUrl, display_order: 0, is_published: true, created_at: updatedAt ?? new Date().toISOString(), updated_at: updatedAt ?? new Date().toISOString(), created_by: null,
  };
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted"><Eye size={14} />Card preview</p>
      <div className="mx-auto max-w-sm"><ProductPresentationCard presentation={p} preview /></div>
    </div>
  );
}
