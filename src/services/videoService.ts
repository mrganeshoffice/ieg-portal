import { api } from '@/lib/api';
import type { Video, VideoInput, VideoPatch } from '@/types/video';

const CACHE_TTL = 60_000;

let publishedCache: { at: number; rows: Video[] } | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Drops cached data and tells every open view in this tab to refetch. (Other tabs and devices hear via server events.) */
export function invalidateVideoCache() {
  publishedCache = null;
  notify();
}

/** Published videos only, in the admin-chosen order. */
export async function fetchPublishedVideos(force = false): Promise<Video[]> {
  if (!force && publishedCache && Date.now() - publishedCache.at < CACHE_TTL) return publishedCache.rows;
  const rows = await api<Video[]>('/api/videos');
  publishedCache = { at: Date.now(), rows };
  return rows;
}

/** Every video, including hidden ones. Requires an admin session. */
export const fetchAllVideos = () => api<Video[]>('/api/admin/videos');

export async function addVideo(input: VideoInput): Promise<Video> {
  const row = await api<Video>('/api/admin/videos', { method: 'POST', body: input });
  invalidateVideoCache();
  return row;
}

export async function updateVideo(id: string, patch: VideoPatch): Promise<Video> {
  const row = await api<Video>(`/api/admin/videos/${id}`, { method: 'PATCH', body: patch });
  invalidateVideoCache();
  return row;
}

/** Deletes the record; the server also removes its thumbnail file when nothing else uses it. */
export async function deleteVideo(row: Pick<Video, 'id' | 'thumbnail_url'>): Promise<void> {
  await api(`/api/admin/videos/${row.id}`, { method: 'DELETE' });
  invalidateVideoCache();
}

export async function updateVideoDisplayOrder(order: { id: string; display_order: number }[]): Promise<void> {
  try { await api('/api/admin/videos/order', { method: 'PUT', body: { order } }); }
  finally { invalidateVideoCache(); }
}

/* One shared EventSource: the server pushes "changed" whenever an admin saves, on any device.
 * Separate from presentationService's connection on purpose (each module owns its own cache). */
let source: EventSource | null = null;
function ensureSource() {
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource('/api/events');
  source.addEventListener('changed', () => { publishedCache = null; notify(); });
}

/** Calls `onChange` whenever data may have changed: in-app changes and live server events. */
export function subscribeToVideos(onChange: () => void): () => void {
  listeners.add(onChange);
  ensureSource();
  return () => {
    listeners.delete(onChange);
    if (!listeners.size && source) { source.close(); source = null; }
  };
}
