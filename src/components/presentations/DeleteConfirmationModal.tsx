import { Loader2, TriangleAlert } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { ProductPresentation } from '@/types/productPresentation';

interface Props { presentation: ProductPresentation | null; busy: boolean; onCancel: () => void; onConfirm: () => void }

export default function DeleteConfirmationModal({ presentation, busy, onCancel, onConfirm }: Props) {
  return (
    <Modal open={!!presentation} onClose={onCancel} title="Delete Presentation?" size="sm" dismissible={!busy}>
      <div className="p-5 sm:p-7">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><TriangleAlert size={22} /></span>
          <div>
            <p className="text-sm leading-relaxed text-muted">Are you sure you want to delete this product presentation? This action cannot be undone.</p>
            {presentation && <p className="mt-3 rounded-xl bg-app px-3 py-2 text-sm font-semibold">{presentation.title}</p>}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy} data-autofocus>Cancel</button>
          <button type="button" className="btn bg-red-600 text-white hover:bg-red-500" onClick={onConfirm} disabled={busy}>
            {busy ? <><Loader2 size={16} className="animate-spin" />Deleting</> : 'Delete Presentation'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
