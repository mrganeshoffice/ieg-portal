import type { Role } from '@/services/auth';

export type EmployeeStatus = 'active' | 'on_leave' | 'probation' | 'suspended' | 'resigned';
export const STATUS_LABEL: Record<EmployeeStatus, string> = { active: 'Active', on_leave: 'On leave', probation: 'Probation', suspended: 'Suspended', resigned: 'Resigned' };
export const ROLE_LABEL: Record<Role, string> = { super_admin: 'Super admin', admin: 'Admin / HR', manager: 'Manager', employee: 'Employee' };

export interface EmployeeDoc { id: number; label: string; original_name: string; mime: string; size_bytes: number; created_at: string }
export interface HistoryRow { field: string; old_value: string | null; new_value: string | null; changed_at: string }

/** Employee as returned by the server. Fields outside a manager's view are absent, so most are optional. */
export interface Employee {
  id: number; employee_code: string | null; first_name: string; middle_name?: string | null; last_name: string | null; full_name: string;
  login_email: string; official_email: string | null; role: Role; is_active: boolean; must_change_password?: boolean; portal_full?: boolean; last_login_at?: string | null;
  photo_url: string | null; status: EmployeeStatus; joining_date: string | null;
  department_id: number | null; department: string | null; designation_id: number | null; designation: string | null;
  manager_id: number | null; manager_name: string | null; employment_type: string | null; work_location: string | null; shift: string | null;
  employment_type_id?: number | null; work_location_id?: number | null; shift_id?: number | null;
  probation_end_date?: string | null; confirmation_date?: string | null; employment_end_date?: string | null;
  date_of_birth?: string | null; gender?: string | null; personal_mobile?: string | null; personal_email?: string | null;
  current_address?: string | null; permanent_address?: string | null; emergency_name?: string | null; emergency_phone?: string | null;
  highest_qualification?: string | null; degree?: string | null; specialization?: string | null; institute?: string | null; passing_year?: number | null;
  additional_qualifications?: string | null; certifications?: string | null; skills?: string | null;
  previous_experience?: string | null; previous_employer?: string | null; total_experience?: string | null; blood_group?: string | null;
  profile_completion: { percent: number; missing: string[] };
  editable: 'all' | 'self' | 'none';
  documents?: EmployeeDoc[]; history?: HistoryRow[];
}
export interface MasterItem { id: number; name: string; is_active: boolean }
export interface Master { departments: MasterItem[]; designations: MasterItem[]; work_location: MasterItem[]; employment_type: MasterItem[]; shift: MasterItem[] }
export type MasterKind = keyof Master;
export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number }
export interface AuditRow { id: number; actor_email: string | null; action: string; entity: string | null; entity_id: string | null; detail: Record<string, unknown> | null; ip: string | null; created_at: string }
export interface Summary { total: number; activeLogins: number; active: number; probation: number; onLeave: number }
export interface DirectoryEntry { id: number; employee_code: string | null; name: string; role: Role }
