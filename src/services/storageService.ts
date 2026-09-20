import { api } from '@/lib/api';

export const MAX_THUMB_MB = 4;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Returns an error message, or null when the file is acceptable. (The server re-checks the real file bytes.) */
export function validateThumbnail(file: File): string | null {
  const nameOk = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type) || !nameOk) return 'Use a JPG, JPEG, PNG or WebP image.';
  if (file.size > MAX_THUMB_MB * 1024 * 1024) return `Image is too large. Maximum size is ${MAX_THUMB_MB} MB.`;
  if (file.size === 0) return 'This file is empty.';
  return null;
}

export interface UploadedThumbnail { url: string; path: string }

const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
  r.onerror = () => reject(new Error('Could not read the image file.'));
  r.readAsDataURL(file);
});

export async function uploadThumbnail(file: File): Promise<UploadedThumbnail> {
  const invalid = validateThumbnail(file);
  if (invalid) throw new Error(invalid);
  return api<UploadedThumbnail>('/api/admin/thumbnails', { method: 'POST', body: { mime: file.type, data: await toBase64(file) } });
}

/** Best effort clean-up of an upload that was never saved. The server refuses to delete an image a presentation still uses. */
export async function deleteThumbnail(urlOrPath: string): Promise<boolean> {
  try {
    const file = urlOrPath.split('/').pop() ?? '';
    await api(`/api/admin/thumbnails/${encodeURIComponent(file)}`, { method: 'DELETE' });
    return true;
  } catch { return false; }
}
