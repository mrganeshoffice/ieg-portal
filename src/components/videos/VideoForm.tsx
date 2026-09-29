import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ImageUploader from '@/components/presentations/ImageUploader';
import VideoPreview from './VideoPreview';
import { isValidVideoUrl } from '@/lib/videoUrl';
import { addVideo, updateVideo } from '@/services/videoService';
import { deleteThumbnail, uploadThumbnail, type UploadedThumbnail } from '@/services/storageService';
import type { Video } from '@/types/video';

interface Props {
  open: boolean;
  /** Pass a row to edit it; omit to add a new one. */
  video?: Video | null;
  /** Default display order for a new video (last position). */
  nextOrder: number;
  /** Categories already used by other videos, offered as suggestions. */
  existingCategories: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

type Errors = Partial<Record<'title' | 'url' | 'category' | 'order', string>>;

export default function VideoForm({ open, video, nextOrder, existingCategories, onClose, onSaved, onError }: Props) {
  const editing = !!video;
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [order, setOrder] = useState('');
  const [published, setPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [clearThumb, setClearThumb] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false); // blocks double submits even before React re-renders

  // reset whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setTitle(video?.title ?? ''); setUrl(video?.video_url ?? ''); setCategory(video?.category ?? '');
    setOrder(String(video?.display_order ?? nextOrder)); setPublished(video?.is_published ?? true);
    setFile(null); setClearThumb(false); setErrors({}); setFormError(null); busy.current = false; setSaving(false);
  }, [open, video, nextOrder]);

  useEffect(() => {
    if (!file) { setLocalUrl(null); return; }
    const u = URL.createObjectURL(file);
    setLocalUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const previewUrl = localUrl ?? (clearThumb ? null : video?.thumbnail_url ?? null);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!title.trim()) e.title = 'Enter a video title.';
    else if (title.trim().length > 120) e.title = 'Keep the title within 120 characters.';
    if (!url.trim()) e.url = 'Enter the video URL.';
    else if (!isValidVideoUrl(url)) e.url = 'Enter a valid link: YouTube, Vimeo, a direct video file, or a portal path.';
    if (category.length > 60) e.category = 'Keep the category within 60 characters.';
    if (order.trim() !== '' && !/^\d{1,6}$/.test(order.trim())) e.order = 'Use a whole number, 0 or higher.';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (busy.current) return;
    const e = validate();
    setErrors(e); setFormError(null);
    if (Object.keys(e).length) return;
    busy.current = true; setSaving(true);
    let uploaded: UploadedThumbnail | null = null;
    try {
      if (file) uploaded = await uploadThumbnail(file);
      const thumbnail_url = uploaded ? uploaded.url : clearThumb ? null : video?.thumbnail_url ?? null;
      const payload = {
        title: title.trim(), video_url: url.trim(), category: category.trim() || null, thumbnail_url,
        display_order: order.trim() === '' ? nextOrder : Number(order), is_published: published,
      };
      if (video) {
        await updateVideo(video.id, payload);
        onSaved('Video updated. It is live in the user panel.');
      } else {
        await addVideo(payload);
        onSaved(published ? 'Video added and published.' : 'Video saved as hidden.');
      }
    } catch (err) {
      if (uploaded) await deleteThumbnail(uploaded.path); // no orphaned upload after a failed save
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setFormError(msg); onError(msg);
      busy.current = false; setSaving(false);
    }
  };

  const fieldErr = (id: string, m?: string) => (m ? <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-500">{m}</p> : null);
  const previewProps = useMemo(() => ({ title, videoUrl: url, thumbnailUrl: previewUrl, category, updatedAt: video?.updated_at }), [title, url, previewUrl, category, video]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Video' : 'Add New Video'} description="Changes appear in the user panel as soon as you save." size="xl" dismissible={!saving}>
      <form onSubmit={submit} noValidate className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          {formError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-3 text-sm text-red-600 dark:text-red-300"><AlertCircle size={16} className="mt-0.5 shrink-0" />{formError}</div>}
          <div>
            <label htmlFor="v-title" className="mb-1.5 block text-sm font-semibold">Video title <span className="text-red-500">*</span></label>
            <input id="v-title" data-autofocus className="input" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} disabled={saving} aria-invalid={!!errors.title} aria-describedby={errors.title ? 'v-title-err' : undefined} placeholder="e.g. IEG Battery Technology Explained" />
            {fieldErr('v-title-err', errors.title)}
          </div>
          <div>
            <label htmlFor="v-url" className="mb-1.5 block text-sm font-semibold">Video URL <span className="text-red-500">*</span></label>
            <input id="v-url" className="input" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} disabled={saving} aria-invalid={!!errors.url} aria-describedby="v-url-help" placeholder="https://www.youtube.com/watch?v=..." />
            <p id="v-url-help" className="mt-1.5 text-xs text-muted">YouTube, Vimeo or a direct .mp4/.webm link plays inside the portal. Any other public https link opens in a new tab.</p>
            {fieldErr('v-url-err', errors.url)}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="v-category" className="mb-1.5 block text-sm font-semibold">Category <span className="font-normal text-muted">(optional)</span></label>
              <input id="v-category" className="input" list="v-category-options" value={category} maxLength={60} onChange={(e) => setCategory(e.target.value)} disabled={saving} aria-invalid={!!errors.category} placeholder="e.g. Product, Training, Event" />
              <datalist id="v-category-options">{existingCategories.map((c) => <option key={c} value={c} />)}</datalist>
              {fieldErr('v-category-err', errors.category)}
            </div>
            <div>
              <label htmlFor="v-order" className="mb-1.5 block text-sm font-semibold">Display order <span className="font-normal text-muted">(optional)</span></label>
              <input id="v-order" className="input" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} disabled={saving} aria-invalid={!!errors.order} />
              <p className="mt-1.5 text-xs text-muted">Lower numbers appear first.</p>
              {fieldErr('v-order-err', errors.order)}
            </div>
          </div>
          <div>
            <label htmlFor="v-status" className="mb-1.5 block text-sm font-semibold">Status</label>
            <select id="v-status" className="input" value={published ? 'published' : 'hidden'} onChange={(e) => setPublished(e.target.value === 'published')} disabled={saving}>
              <option value="published">Published (visible to users)</option>
              <option value="hidden">Hidden (admins only)</option>
            </select>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">Thumbnail image <span className="font-normal text-muted">(optional)</span></p>
            <ImageUploader previewUrl={previewUrl} hasNewFile={!!file} onSelect={(f) => { setFile(f); setClearThumb(false); }} onClear={() => { setFile(null); setClearThumb(true); }} disabled={saving} />
            <p className="mt-1.5 text-xs text-muted">Leave blank to use an automatic YouTube thumbnail (when available) or a generic placeholder.</p>
          </div>
        </div>

        <div className="space-y-5 lg:border-l lg:border-line lg:pl-6">
          <VideoPreview {...previewProps} thumbnailUrl={previewProps.thumbnailUrl ?? null} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:flex-col-reverse xl:flex-row">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <><Loader2 size={17} className="animate-spin" />Saving</> : editing ? 'Save changes' : 'Save video'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
