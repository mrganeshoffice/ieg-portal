import { ApiError, api } from '@/lib/api';
import type { AuditRow, DirectoryEntry, Employee, Master, MasterKind, Paged, Summary } from '@/types/ems';

export type EmployeeQuery = { q?: string; department_id?: string; status?: string; role?: string; active?: string; sort?: string; dir?: 'asc' | 'desc'; page?: number; page_size?: number };
const qs = (o: Record<string, unknown>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '' && v !== null) p.set(k, String(v)); const s = p.toString(); return s ? `?${s}` : ''; };

export const listEmployees = (q: EmployeeQuery) => api<Paged<Employee>>(`/api/ems/employees${qs(q)}`);
export const employeesCsvUrl = (q: EmployeeQuery) => `/api/ems/employees/export.csv${qs({ ...q, page: undefined, page_size: undefined })}`;
export const getEmployee = (id: number) => api<Employee>(`/api/ems/employees/${id}`);
export const getMyProfile = () => api<Employee>('/api/ems/me');
export const updateMyProfile = (body: Record<string, unknown>) => api<Employee>('/api/ems/me', { method: 'PATCH', body });
export const updateEmployee = (id: number, body: Record<string, unknown>) => api<Employee>(`/api/ems/employees/${id}`, { method: 'PATCH', body });
export const createEmployee = (body: Record<string, unknown>) => api<{ employee: Employee; setupUrl: string | null; setupExpiresHours: number | null }>('/api/ems/employees', { method: 'POST', body });
export const setEmployeeActive = (id: number, active: boolean) => api<Employee>(`/api/ems/employees/${id}/${active ? 'reactivate' : 'deactivate'}`, { method: 'POST', body: {} });
export const resetEmployeePassword = (id: number) => api<{ setupUrl: string; setupExpiresHours: number }>(`/api/ems/employees/${id}/reset-password`, { method: 'POST', body: {} });
export const getSummary = () => api<Summary>('/api/ems/summary');
export const getDirectory = () => api<DirectoryEntry[]>('/api/ems/directory');
export const getMaster = (all = false) => api<Master>(`/api/ems/master${all ? '?all=1' : ''}`);
export const addMaster = (kind: MasterKind, name: string) => api(`/api/ems/master/${kind}`, { method: 'POST', body: { name } });
export const updateMaster = (kind: MasterKind, id: number, body: { name?: string; is_active?: boolean }) => api(`/api/ems/master/${kind}/${id}`, { method: 'PATCH', body });
export const listAudit = (q: { q?: string; page?: number }) => api<Paged<AuditRow>>(`/api/ems/audit${qs(q)}`);
export const documentUrl = (id: number) => `/api/ems/documents/${id}`;
export const deleteDocument = (id: number) => api(`/api/ems/documents/${id}`, { method: 'DELETE' });

/** Raw-binary upload (the server checks the file's real type and size). */
async function upload<T>(url: string, file: File): Promise<T> {
  let res: Response;
  try { res = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/octet-stream' }, body: file }); }
  catch { throw new ApiError(0, 'Could not reach the server. Check your connection and try again.'); }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? `Upload failed (${res.status}).`);
  return data as T;
}
export const uploadDocument = (employeeId: number, label: string, file: File) => upload<{ id: number }>(`/api/ems/employees/${employeeId}/documents${qs({ label, filename: file.name })}`, file);
export const uploadPhoto = (employeeId: number, file: File) => upload<{ photo_url: string }>(`/api/ems/employees/${employeeId}/photo`, file);

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

export const seedMaster = () => api<{ departments: number; designations: number }>('/api/ems/master/seed', { method: 'POST', body: {} });
