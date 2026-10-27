import { useMemo, useRef, useState } from 'react';
import { Camera, Loader2, Save } from 'lucide-react';
import type { DirectoryEntry, Employee, Master } from '@/types/ems';
import { STATUS_LABEL } from '@/types/ems';
import { uploadPhoto, updateEmployee, updateMyProfile, errMsg } from '@/services/emsService';
import { Avatar, FieldShell, fieldCls } from './Fields';

type Kind = 'text' | 'date' | 'number' | 'textarea' | 'select' | 'tel' | 'email';
interface Def { key: keyof Employee & string; label: string; kind?: Kind; admin?: boolean; wide?: boolean; options?: 'departments' | 'designations' | 'employment_type' | 'work_location' | 'shift' | 'manager' | 'status' | 'gender'; hint?: string }

const SECTIONS: { id: string; title: string; description: string; fields: Def[] }[] = [
  { id: 'basic', title: 'Basic information', description: 'Your personal and contact details.', fields: [
    { key: 'first_name', label: 'First name', admin: true }, { key: 'middle_name', label: 'Middle name' }, { key: 'last_name', label: 'Last name / surname', admin: true },
    { key: 'date_of_birth', label: 'Date of birth', kind: 'date' }, { key: 'gender', label: 'Gender', kind: 'select', options: 'gender' }, { key: 'blood_group', label: 'Blood group', hint: 'Optional' },
    { key: 'personal_mobile', label: 'Mobile number', kind: 'tel' }, { key: 'official_email', label: 'Official email', kind: 'email', admin: true }, { key: 'personal_email', label: 'Personal email', kind: 'email' },
    { key: 'current_address', label: 'Current address', kind: 'textarea', wide: true }, { key: 'permanent_address', label: 'Permanent address', kind: 'textarea', wide: true },
    { key: 'emergency_name', label: 'Emergency contact name' }, { key: 'emergency_phone', label: 'Emergency contact number', kind: 'tel' },
  ] },
  { id: 'employment', title: 'Employment information', description: 'Managed by HR. Contact HR if something here is wrong.', fields: [
    { key: 'employee_code', label: 'Employee ID', admin: true, hint: 'Leave as generated unless HR policy says otherwise' }, { key: 'joining_date', label: 'Joining date', kind: 'date', admin: true },
    { key: 'department_id', label: 'Department', kind: 'select', options: 'departments', admin: true }, { key: 'designation_id', label: 'Designation', kind: 'select', options: 'designations', admin: true },
    { key: 'manager_id', label: 'Reporting manager', kind: 'select', options: 'manager', admin: true }, { key: 'employment_type_id', label: 'Employment type', kind: 'select', options: 'employment_type', admin: true },
    { key: 'work_location_id', label: 'Work location', kind: 'select', options: 'work_location', admin: true }, { key: 'shift_id', label: 'Shift timing', kind: 'select', options: 'shift', admin: true },
    { key: 'status', label: 'Employee status', kind: 'select', options: 'status', admin: true }, { key: 'probation_end_date', label: 'Probation end date', kind: 'date', admin: true },
    { key: 'confirmation_date', label: 'Confirmation date', kind: 'date', admin: true }, { key: 'employment_end_date', label: 'Employment end date', kind: 'date', admin: true },
  ] },
  { id: 'education', title: 'Education', description: 'Qualifications, certifications and skills.', fields: [
    { key: 'highest_qualification', label: 'Highest qualification' }, { key: 'degree', label: 'Degree / course' }, { key: 'specialization', label: 'Specialization' },
    { key: 'institute', label: 'University / institute' }, { key: 'passing_year', label: 'Passing year', kind: 'number' },
    { key: 'additional_qualifications', label: 'Additional qualifications', kind: 'textarea', wide: true }, { key: 'certifications', label: 'Relevant certifications', kind: 'textarea', wide: true },
    { key: 'skills', label: 'Skills and expertise', kind: 'textarea', wide: true },
  ] },
  { id: 'experience', title: 'Work experience', description: 'Your previous roles.', fields: [
    { key: 'previous_employer', label: 'Previous employer' }, { key: 'total_experience', label: 'Total experience', hint: 'For example: 6 years 3 months' },
    { key: 'previous_experience', label: 'Previous work experience', kind: 'textarea', wide: true },
  ] },
];

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const str = (v: unknown) => (v == null ? '' : String(v));

interface Props { employee: Employee; mode: 'admin' | 'self'; master: Master | null; directory?: DirectoryEntry[]; onSaved: (e: Employee) => void; onToast: (type: 'success' | 'error', msg: string) => void }

/** One form for both "HR edits an employee" and "employee completes their own profile". Only changed fields are sent; the server re-checks every one. */
export default function EmployeeEditor({ employee, mode, master, directory = [], onSaved, onToast }: Props) {
  const initial = useMemo(() => { const o: Record<string, string> = {}; for (const s of SECTIONS) for (const f of s.fields) o[f.key] = str(employee[f.key]); return o; }, [employee]);
  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastId, setLastId] = useState(employee.id + ':' + employee.profile_completion.percent);
  const sig = employee.id + ':' + employee.profile_completion.percent + ':' + JSON.stringify(initial).length;
  if (sig !== lastId) { setLastId(sig); setDraft(initial); } // reset when a fresh copy arrives from the server

  const changed = Object.keys(draft).filter((k) => draft[k] !== initial[k]);
  const dirty = changed.length > 0;
  const canEdit = (f: Def) => mode === 'admin' || !f.admin;

  const optionList = (o: NonNullable<Def['options']>): { value: string; label: string }[] => {
    if (o === 'gender') return GENDERS.map((g) => ({ value: g, label: g }));
    if (o === 'status') return Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));
    if (o === 'manager') return directory.filter((d) => d.id !== employee.id).map((d) => ({ value: String(d.id), label: `${d.name}${d.employee_code ? ` (${d.employee_code})` : ''}` }));
    return (master?.[o] ?? []).filter((m) => m.is_active || String(m.id) === draft[o === 'departments' ? 'department_id' : o === 'designations' ? 'designation_id' : `${o}_id`]).map((m) => ({ value: String(m.id), label: m.name }));
  };
  const readValue = (f: Def): string => {
    const lookup: Record<string, unknown> = { department_id: employee.department, designation_id: employee.designation, manager_id: employee.manager_name, employment_type_id: employee.employment_type, work_location_id: employee.work_location, shift_id: employee.shift, status: STATUS_LABEL[employee.status] };
    return f.key in lookup ? str(lookup[f.key]) || '—' : str(employee[f.key]) || '—';
  };

  const save = async () => {
    if (!dirty) return;
    const body: Record<string, unknown> = {};
    for (const k of changed) body[k] = draft[k] === '' ? null : draft[k];
    setSaving(true);
    try { const e = await (mode === 'admin' ? updateEmployee(employee.id, body) : updateMyProfile(body)); onSaved(e); onToast('success', 'Saved.'); }
    catch (er) { onToast('error', errMsg(er)); }
    finally { setSaving(false); }
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusyPhoto(true);
    try { const r = await uploadPhoto(employee.id, file); onSaved({ ...employee, photo_url: r.photo_url }); onToast('success', 'Photo updated.'); }
    catch (er) { onToast('error', errMsg(er)); } finally { setBusyPhoto(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <div className="relative">
          <Avatar name={employee.full_name} url={employee.photo_url} size={72} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busyPhoto} aria-label="Change photo" className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-soft transition hover:text-brand">{busyPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}</button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold leading-tight">{employee.full_name}</p>
          <p className="text-sm text-muted">{[employee.designation, employee.department].filter(Boolean).join(' · ') || employee.login_email}</p>
          <div className="mt-3 max-w-md">
            <div className="mb-1 flex justify-between text-xs font-semibold"><span>Profile completion</span><span>{employee.profile_completion.percent}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-app" role="progressbar" aria-valuenow={employee.profile_completion.percent} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gradient-to-r from-brand to-leaf transition-all duration-500" style={{ width: `${employee.profile_completion.percent}%` }} /></div>
            {employee.profile_completion.missing.length > 0 && <p className="mt-1.5 text-[11px] text-muted">Still to fill: {employee.profile_completion.missing.slice(0, 5).join(', ')}{employee.profile_completion.missing.length > 5 ? ` and ${employee.profile_completion.missing.length - 5} more` : ''}</p>}
          </div>
        </div>
      </div>

      {SECTIONS.map((sec) => (
        <section key={sec.id} className="card p-5 md:p-6" aria-labelledby={`sec-${sec.id}`}>
          <h2 id={`sec-${sec.id}`} className="text-base font-extrabold">{sec.title}</h2>
          <p className="mb-4 text-sm text-muted">{sec.description}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sec.fields.map((f) => {
              const editable = canEdit(f);
              const val = draft[f.key] ?? '';
              const wide = f.wide ? 'sm:col-span-2 xl:col-span-3' : '';
              return (
                <div key={f.key} className={wide}>
                  <FieldShell label={f.label} hint={f.hint} readOnly={!editable}>
                    {!editable ? <p className="input !cursor-default !bg-app !text-ink/80">{readValue(f)}</p>
                      : f.kind === 'textarea' ? <textarea className={`${fieldCls} min-h-[5rem]`} value={val} maxLength={1500} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                      : f.kind === 'select' ? (
                        <select className={fieldCls} value={val} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                          {f.options !== 'status' && <option value="">{f.options === 'gender' ? 'Select' : 'Not set'}</option>}
                          {optionList(f.options!).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : <input className={fieldCls} type={f.kind === 'number' ? 'number' : f.kind ?? 'text'} value={val} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />}
                  </FieldShell>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 px-4 py-3 shadow-soft backdrop-blur">
        <p className="text-sm text-muted" aria-live="polite">{dirty ? `${changed.length} unsaved ${changed.length === 1 ? 'change' : 'changes'}` : 'All changes saved'}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" disabled={!dirty || saving} onClick={() => setDraft(initial)}>Discard</button>
          <button type="button" className="btn-primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Save changes</button>
        </div>
      </div>
    </div>
  );
}
