/** A row of the Videos module (server/data/videos.json, or the Netlify "v/" blob namespace). */
export interface Video {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  category: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface VideoInput {
  title: string;
  video_url: string;
  thumbnail_url?: string | null;
  category?: string | null;
  display_order?: number;
  is_published?: boolean;
}

export type VideoPatch = Partial<VideoInput>;
