export type AttStatus = 'present' | 'late' | 'half_day' | 'short' | 'working' | 'missed_checkout' | 'absent' | 'leave' | 'off' | 'upcoming';
export interface AttRecord { id: number; employee_id: number; work_date: string; check_in: string | null; check_out: string | null; hours: number | null; source: 'self' | 'admin'; note: string | null; status: AttStatus }
export interface AttMonth { month: string; employee: { id: number; name: string }; records: AttRecord[]; start_date: string | null; holidays: { date: string; name: string }[]; weekly_off: number[] }
export interface TeamRow { employee_id: number; name: string; employee_code: string | null; department: string | null; status: AttStatus; check_in: string | null; check_out: string | null }
export interface TeamDay { date: string; day_off: boolean; holiday: string | null; rows: TeamRow[] }
export interface HomeSummary { today: string; attendance: AttRecord | null; open_tasks: number; overdue_tasks: number; pending_leave_to_decide: number; unread_notifications: number; unread_messages: number; next_holiday: { holiday_date: string; name: string } | null }
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export interface Task { id: number; title: string; description: string | null; priority: TaskPriority; status: TaskStatus; due_date: string | null; completed_at: string | null; created_at: string; updated_at: string; created_by: { id: number; name: string }; assignee: { id: number; name: string }; overdue: boolean }
export interface TaskComment { id: number; body: string; created_at: string; author: string }
export interface LeaveType { id: number; name: string; annual_quota: number; is_active: boolean }
export interface LeaveBalance { leave_type_id: number; name: string; quota: number; used: number; pending: number; remaining: number }
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface LeaveRequest { id: number; employee: { id: number; name: string; code: string | null }; leave_type: string; leave_type_id: number; start_date: string; end_date: string; days: number; half_day: boolean; reason: string | null; status: LeaveStatus; decided_by: string | null; decided_at: string | null; decision_note: string | null; created_at: string }
export interface Holiday { id: number; date: string; name: string }
export interface Notice { id: number; kind: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }
export interface ChatPerson { user_id: number; name: string; department: string | null; unread: number; has_photo: boolean }
export interface ChatMsg { id: number; mine: boolean; body: string; created_at: string }
export interface WorkSettings { timezone: string; work_start: string; grace_minutes: string; full_day_hours: string; half_day_hours: string; weekly_off: string; defaults: Record<string, string>; can_edit: boolean }
export interface AttReportRow { employee_id: number; name: string; employee_code: string | null; department: string | null; present: number; late: number; half_day: number; short: number; missed_checkout: number; leave: number; absent: number; hours: number }
export interface AdminOverview {
  today: string; employees: number; day_off: boolean; holiday: string | null;
  counts: Record<'present' | 'late' | 'half_day' | 'short' | 'working' | 'missed_checkout' | 'absent' | 'leave' | 'off', number>;
  people: { absent: { id: number; name: string; department: string | null }[]; leave: { id: number; name: string; department: string | null }[]; late: { id: number; name: string; department: string | null }[] };
  trend: { date: string; present: number; late: number; absent: number; leave: number; day_off: boolean }[];
  departments: { name: string; count: number }[];
  tasks: { todo: number; in_progress: number; blocked: number; done: number; overdue: number };
  pending_leave: number; upcoming_holidays: { date: string; name: string }[]; recent_joiners: { id: number; name: string; department: string | null }[];
}
