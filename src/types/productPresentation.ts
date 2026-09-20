/** A row of the `product_presentations` table. */
export interface ProductPresentation {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  presentation_url: string;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PresentationInput {
  title: string;
  description?: string | null;
  thumbnail_url: string;
  presentation_url: string;
  display_order?: number;
  is_published?: boolean;
}

export type PresentationPatch = Partial<PresentationInput>;

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface AdminUser { id: string; email: string }
