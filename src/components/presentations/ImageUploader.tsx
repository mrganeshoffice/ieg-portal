import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { ImagePlus, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { ACCEPTED_TYPES, MAX_THUMB_MB, validateThumbnail } from '@/services/storageService';

interface Props {
  /** Object URL of a newly chosen file, or the saved thumbnail URL. */
  previewUrl: string | null;
  hasNewFile: boolean;
  onSelect: (file: File) => void;
  onClear: () => void;
  error?: string;
  disabled?: boolean;
}

/** Drag-and-drop or browse. Files are validated (type and size) before they are accepted. */
export default function ImageUploader({ previewUrl, hasNewFile, onSelect, onClear, error, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const take = (f?: File | null) => {
    if (!f) return;
    const msg = validateThumbnail(f);
    setLocalError(msg);
    if (!msg) onSelect(f);
  };
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); if (!disabled) take(e.dataTransfer.files?.[0]); };
  const browse = () => !disabled && input.current?.click();
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); browse(); } };
  const shown = localError || error;

  return (
    <div>
      <input ref={input} type="file" hidden accept={ACCEPTED_TYPES.join(',')} onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }} />
      {previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="aspect-[16/10] bg-navy-900"><img src={previewUrl} alt="Selected thumbnail preview" className="h-full w-full object-cover" /></div>
          <div className="flex flex-wrap gap-2 p-3">
            <button type="button" className="btn-ghost !py-2" onClick={browse} disabled={disabled}><RefreshCw size={15} />Replace image</button>
            {hasNewFile && <button type="button" className="btn-ghost !py-2 text-red-500" onClick={() => { setLocalError(null); onClear(); }} disabled={disabled}><Trash2 size={15} />Remove selection</button>}
          </div>
        </div>
      ) : (
        <div role="button" tabIndex={disabled ? -1 : 0} onClick={browse} onKeyDown={key} aria-label="Upload thumbnail image. Drag a file here or press Enter to browse."
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-9 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${over ? 'border-brand bg-brand/10' : 'border-line bg-app/60 hover:border-brand/60'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand">{over ? <UploadCloud size={24} /> : <ImagePlus size={24} />}</span>
          <p className="text-sm font-semibold">Drag and drop an image here</p>
          <p className="text-xs text-muted">or <span className="font-semibold text-brand underline">browse files</span></p>
          <p className="text-xs text-muted">JPG, JPEG, PNG or WebP, up to {MAX_THUMB_MB} MB. Wide 16:10 images look best.</p>
        </div>
      )}
      {shown && <p role="alert" className="mt-1.5 text-xs font-medium text-red-500">{shown}</p>}
    </div>
  );
}
