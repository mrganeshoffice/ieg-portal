import { api } from '@/lib/api';
import type { PresentationInput, PresentationPatch, ProductPresentation } from '@/types/productPresentation';

const CACHE_TTL = 60_000;

let publishedCache: { at: number; rows: ProductPresentation[] } | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Drops cached data and tells every open view in this tab to refetch. (Other tabs and devices hear via server events.) */
export function invalidatePresentationCache() {
  publishedCache = null;
  notify();
}

/** Published presentations only, in the admin-chosen order. */
export async function fetchPublishedPresentations(force = false): Promise<ProductPresentation[]> {
  if (!force && publishedCache && Date.now() - publishedCache.at < CACHE_TTL) return publishedCache.rows;
  const rows = await api<ProductPresentation[]>('/api/presentations');
  publishedCache = { at: Date.now(), rows };
  return rows;
}

/** Every presentation, including hidden ones. Requires an admin session. */
export const fetchAllPresentations = () => api<ProductPresentation[]>('/api/admin/presentations');

export async function addPresentation(input: PresentationInput): Promise<ProductPresentation> {
  const row = await api<ProductPresentation>('/api/admin/presentations', { method: 'POST', body: input });
  invalidatePresentationCache();
  return row;
}

export async function updatePresentation(id: string, patch: PresentationPatch): Promise<ProductPresentation> {
  const row = await api<ProductPresentation>(`/api/admin/presentations/${id}`, { method: 'PATCH', body: patch });
  invalidatePresentationCache();
  return row;
}

/** Deletes the record; the server also removes its thumbnail file when nothing else uses it. */
export async function deletePresentation(row: Pick<ProductPresentation, 'id' | 'thumbnail_url'>): Promise<void> {
  await api(`/api/admin/presentations/${row.id}`, { method: 'DELETE' });
  invalidatePresentationCache();
}

export async function updateDisplayOrder(order: { id: string; display_order: number }[]): Promise<void> {
  try { await api('/api/admin/presentations/order', { method: 'PUT', body: { order } }); }
  finally { invalidatePresentationCache(); }
}

/* One shared EventSource: the server pushes "changed" whenever an admin saves, on any device. */
let source: EventSource | null = null;
function ensureSource() {
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource('/api/events');
  source.addEventListener('changed', () => { publishedCache = null; notify(); });
}

/** Calls `onChange` whenever data may have changed: in-app changes and live server events. */
export function subscribeToPresentations(onChange: () => void): () => void {
  listeners.add(onChange);
  ensureSource();
  return () => {
    listeners.delete(onChange);
    if (!listeners.size && source) { source.close(); source = null; }
  };
}
