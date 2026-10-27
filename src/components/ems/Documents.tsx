import { useRef, useState } from 'react';
import { Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import type { Employee, EmployeeDoc } from '@/types/ems';
import { deleteDocument, documentUrl, errMsg, uploadDocument } from '@/services/emsService';

const size = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Employee documents. Only the employee and HR/admin ever receive this list; downloads go through an authorised endpoint. */
export default function Documents({ employee, canDelete, onChanged, onToast }: { employee: Employee; canDelete: boolean; onChanged: () => void; onToast: (t: 'success' | 'error', m: string) => void }) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const docs: EmployeeDoc[] = employee.documents ?? [];

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!label.trim()) { onToast('error', 'Enter a document name first (for example: ID proof).'); if (file.current) file.current.value = ''; return; }
    if (f.size > 5 * 1024 * 1024) { onToast('error', 'Documents must be 5 MB or smaller.'); if (file.current) file.current.value = ''; return; }
    setBusy(true);
    try { await uploadDocument(employee.id, label.trim(), f); setLabel(''); onToast('success', 'Document uploaded.'); onChanged(); }
    catch (e) { onToast('error', errMsg(e)); } finally { setBusy(false); if (file.current) file.current.value = ''; }
  };
  const remove = async (d: EmployeeDoc) => {
    if (!window.confirm(`Delete "${d.label}"? This cannot be undone.`)) return;
    setRemoving(d.id);
    try { await deleteDocument(d.id); onToast('success', 'Document deleted.'); onChanged(); } catch (e) { onToast('error', errMsg(e)); } finally { setRemoving(null); }
  };

  return (
    <section className="card p-5 md:p-6" aria-labelledby="sec-docs">
      <h2 id="sec-docs" className="text-base font-extrabold">Documents</h2>
      <p className="mb-4 text-sm text-muted">Identity and employment documents. PDF, JPG, PNG or WebP, up to 5 MB. Only you and HR can see these.</p>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[12rem] flex-1 sm:max-w-xs"><span className="mb-1.5 block text-xs font-semibold text-muted">Document name</span><input className="input" value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. ID proof" /></label>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => file.current?.click()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}Choose file</button>
        <input ref={file} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      {docs.length === 0 ? <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No documents uploaded yet.</p> : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <FileText size={18} className="shrink-0 text-brand" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{d.label}</p><p className="truncate text-xs text-muted">{d.original_name} · {size(d.size_bytes)} · {d.created_at.slice(0, 10)}</p></div>
              <a className="icon-btn" href={documentUrl(d.id)} aria-label={`Download ${d.label}`}><Download size={17} /></a>
              {canDelete && <button type="button" className="icon-btn text-red-500" onClick={() => void remove(d)} disabled={removing === d.id} aria-label={`Delete ${d.label}`}>{removing === d.id ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
