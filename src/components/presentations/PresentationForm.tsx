import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ImageUploader from './ImageUploader';
import PresentationPreview from './PresentationPreview';
import { isValidPresentationUrl } from '@/lib/url';
import { addPresentation, updatePresentation } from '@/services/presentationService';
import { deleteThumbnail, uploadThumbnail, type UploadedThumbnail } from '@/services/storageService';
import type { ProductPresentation } from '@/types/productPresentation';

interface Props {
  open: boolean;
  /** Pass a row to edit it; omit to add a new one. */
  presentation?: ProductPresentation | null;
  /** Default display order for a new presentation (last position). */
  nextOrder: number;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

type Errors = Partial<Record<'title' | 'url' | 'thumb' | 'description' | 'order', string>>;

export default function PresentationForm({ open, presentation, nextOrder, onClose, onSaved, onError }: Props) {
  const editing = !!presentation;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [order, setOrder] = useState('');
  const [published, setPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false); // blocks double submits even before React re-renders

  // reset whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setTitle(presentation?.title ?? ''); setDescription(presentation?.description ?? ''); setUrl(presentation?.presentation_url ?? '');
    setOrder(String(presentation?.display_order ?? nextOrder)); setPublished(presentation?.is_published ?? true);
    setFile(null); setErrors({}); setFormError(null); busy.current = false; setSaving(false);
  }, [open, presentation, nextOrder]);

  useEffect(() => {
    if (!file) { setLocalUrl(null); return; }
    const u = URL.createObjectURL(file);
    setLocalUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const previewUrl = localUrl ?? presentation?.thumbnail_url ?? null;

  const validate = (): Errors => {
    const e: Errors = {};
    if (!title.trim()) e.title = 'Enter a presentation title.';
    else if (title.trim().length > 120) e.title = 'Keep the title within 120 characters.';
    if (!url.trim()) e.url = 'Enter the presentation URL.';
    else if (!isValidPresentationUrl(url)) e.url = 'Enter a valid link starting with https:// (or a portal path such as /group-structure).';
    if (!file && !presentation?.thumbnail_url) e.thumb = 'Upload a thumbnail image.';
    if (description.length > 500) e.description = 'Keep the description within 500 characters.';
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
      const payload = {
        title: title.trim(), description: description.trim() || null, presentation_url: url.trim(),
        thumbnail_url: uploaded?.url ?? presentation!.thumbnail_url,
        display_order: order.trim() === '' ? nextOrder : Number(order), is_published: published,
      };
      if (presentation) {
        await updatePresentation(presentation.id, payload);
        onSaved('Presentation updated. It is live in the user panel.');
      } else {
        await addPresentation(payload);
        onSaved(published ? 'Presentation added and published.' : 'Presentation saved as hidden.');
      }
    } catch (err) {
      if (uploaded) await deleteThumbnail(uploaded.path); // no orphaned upload after a failed save
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setFormError(msg); onError(msg);
      busy.current = false; setSaving(false);
    }
  };

  const fieldErr = (id: string, m?: string) => (m ? <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-500">{m}</p> : null);
  const previewProps = useMemo(() => ({ title, description, thumbnailUrl: previewUrl ?? '', presentationUrl: url, updatedAt: presentation?.updated_at }), [title, description, previewUrl, url, presentation]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Product Presentation' : 'Add New Presentation'} description="Changes appear in the user panel as soon as you save." size="xl" dismissible={!saving}>
      <form onSubmit={submit} noValidate className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          {formError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-3.5 py-3 text-sm text-red-600 dark:text-red-300"><AlertCircle size={16} className="mt-0.5 shrink-0" />{formError}</div>}
          <div>
            <label htmlFor="pp-title" className="mb-1.5 block text-sm font-semibold">Presentation title <span className="text-red-500">*</span></label>
            <input id="pp-title" data-autofocus className="input" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} disabled={saving} aria-invalid={!!errors.title} aria-describedby={errors.title ? 'pp-title-err' : undefined} placeholder="e.g. IEG Electric Vehicle Range" />
            {fieldErr('pp-title-err', errors.title)}
          </div>
          <div>
            <label htmlFor="pp-url" className="mb-1.5 block text-sm font-semibold">Presentation URL <span className="text-red-500">*</span></label>
            <input id="pp-url" className="input" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} disabled={saving} aria-invalid={!!errors.url} aria-describedby="pp-url-help" placeholder="https://docs.google.com/presentation/..." />
            <p id="pp-url-help" className="mt-1.5 text-xs text-muted">Google Drive, Canva, PDF or any public https link opens in a new tab. A path like /group-structure opens inside the portal.</p>
            {fieldErr('pp-url-err', errors.url)}
          </div>
          <div>
            <label htmlFor="pp-desc" className="mb-1.5 flex justify-between text-sm font-semibold"><span>Short description <span className="font-normal text-muted">(optional)</span></span><span className="text-xs font-normal text-muted">{description.length}/500</span></label>
            <textarea id="pp-desc" className="input min-h-[92px] resize-y" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} aria-invalid={!!errors.description} />
            {fieldErr('pp-desc-err', errors.description)}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="pp-order" className="mb-1.5 block text-sm font-semibold">Display order <span className="font-normal text-muted">(optional)</span></label>
              <input id="pp-order" className="input" inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} disabled={saving} aria-invalid={!!errors.order} />
              <p className="mt-1.5 text-xs text-muted">Lower numbers appear first.</p>
              {fieldErr('pp-order-err', errors.order)}
            </div>
            <div>
              <label htmlFor="pp-status" className="mb-1.5 block text-sm font-semibold">Status</label>
              <select id="pp-status" className="input" value={published ? 'published' : 'hidden'} onChange={(e) => setPublished(e.target.value === 'published')} disabled={saving}>
                <option value="published">Published (visible to users)</option>
                <option value="hidden">Hidden (admins only)</option>
              </select>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">Thumbnail image <span className="text-red-500">*</span></p>
            <ImageUploader previewUrl={previewUrl} hasNewFile={!!file} onSelect={setFile} onClear={() => setFile(null)} error={errors.thumb} disabled={saving} />
          </div>
        </div>

        <div className="space-y-5 lg:border-l lg:border-line lg:pl-6">
          <PresentationPreview {...previewProps} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:flex-col-reverse xl:flex-row">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <><Loader2 size={17} className="animate-spin" />Saving</> : editing ? 'Save changes' : 'Save presentation'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
