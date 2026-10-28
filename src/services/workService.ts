import { api } from '@/lib/api';
import type { AdminOverview, DayLog, LogRange, Project, TeamLog, WorkLog, ProjectStatus, AttMonth, AttRecord, AttReportRow, ChatMsg, ChatPerson, HomeSummary, Holiday, LeaveBalance, LeaveRequest, LeaveType, Notice, Task, TaskComment, TeamDay, WorkSettings } from '@/types/work';

const q = (o: Record<string, unknown>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '' && v !== null) p.set(k, String(v)); const s = p.toString(); return s ? `?${s}` : ''; };
const post = <T,>(url: string, body: unknown = {}) => api<T>(url, { method: 'POST', body });

export const getHome = () => api<HomeSummary>('/api/ems/home');
// attendance
export const attendanceToday = () => api<{ today: string; record: AttRecord | null; work_start: string }>('/api/ems/attendance/today');
export const checkIn = () => post<AttRecord>('/api/ems/attendance/check-in');
export const checkOut = () => post<AttRecord>('/api/ems/attendance/check-out');
export const attendanceMonth = (month: string, employeeId?: number) => api<AttMonth>(`/api/ems/attendance${q({ month, employee_id: employeeId })}`);
export const attendanceTeam = (date: string) => api<TeamDay>(`/api/ems/attendance/team${q({ date })}`);
export const correctAttendance = (employeeId: number, date: string, body: { check_in: string; check_out: string | null; note: string }) => api<AttRecord>(`/api/ems/attendance/${employeeId}/${date}`, { method: 'PUT', body });
// tasks
export const listTasks = (view: string, status?: string, extra: { project_id?: number; employee_id?: number } = {}) => api<Task[]>(`/api/ems/tasks${q({ view, status, ...extra })}`);
export const getTask = (id: number) => api<Task>(`/api/ems/tasks/${id}`);
export const createTask = (body: Record<string, unknown>) => post<Task>('/api/ems/tasks', body);
export const updateTask = (id: number, body: Record<string, unknown>) => api<Task>(`/api/ems/tasks/${id}`, { method: 'PATCH', body });
export const deleteTask = (id: number) => api(`/api/ems/tasks/${id}`, { method: 'DELETE' });
export const taskComments = (id: number) => api<TaskComment[]>(`/api/ems/tasks/${id}/comments`);
export const addTaskComment = (id: number, body: string) => post<{ id: number }>(`/api/ems/tasks/${id}/comments`, { body });
// leave + holidays
export const leaveTypes = () => api<LeaveType[]>('/api/ems/leave/types');
export const addLeaveType = (name: string, annual_quota: number) => post<LeaveType>('/api/ems/leave/types', { name, annual_quota });
export const updateLeaveType = (id: number, body: Record<string, unknown>) => api(`/api/ems/leave/types/${id}`, { method: 'PATCH', body });
export const leaveBalance = (year?: number) => api<{ year: number; balances: LeaveBalance[] }>(`/api/ems/leave/balance${q({ year })}`);
export const listLeave = (scope: 'mine' | 'decide' | 'all', status?: string) => api<LeaveRequest[]>(`/api/ems/leave${q({ scope, status })}`);
export const requestLeave = (body: Record<string, unknown>) => post<LeaveRequest>('/api/ems/leave', body);
export const decideLeave = (id: number, action: 'approve' | 'reject' | 'cancel', note?: string) => post(`/api/ems/leave/${id}/${action}`, { note });
export const listHolidays = (year: number) => api<Holiday[]>(`/api/ems/holidays${q({ year })}`);
export const addHoliday = (date: string, name: string) => post<Holiday>('/api/ems/holidays', { date, name });
export const deleteHoliday = (id: number) => api(`/api/ems/holidays/${id}`, { method: 'DELETE' });
// notifications + chat
export const listNotices = () => api<{ unread: number; items: Notice[] }>('/api/ems/notifications');
export const markNoticesRead = (id?: number) => post('/api/ems/notifications/read', id ? { id } : {});
export const chatPeople = () => api<ChatPerson[]>('/api/ems/chat/people');
export const chatThread = (userId: number, after?: number) => api<ChatMsg[]>(`/api/ems/chat/${userId}${q({ after })}`);
export const chatSend = (userId: number, body: string) => post<ChatMsg>(`/api/ems/chat/${userId}`, { body });
// reports + settings
export const attendanceReport = (month: string) => api<{ month: string; from: string; to: string; rows: AttReportRow[] }>(`/api/ems/reports/attendance${q({ month })}`);
export const reportCsvUrl = (kind: 'attendance' | 'leave' | 'tasks', params: Record<string, unknown> = {}) => `/api/ems/reports/${kind}${q({ ...params, format: 'csv' })}`;
export const leaveReport = (year: number) => api<{ year: number; rows: { employee_id: number; name: string; employee_code: string | null; leave_type: string; days: number }[] }>(`/api/ems/reports/leave${q({ year })}`);
export const taskReport = () => api<{ rows: { employee_id: number; name: string; employee_code: string | null; todo: number; in_progress: number; blocked: number; done: number; overdue: number }[] }>('/api/ems/reports/tasks');
export const getSettings = () => api<WorkSettings>('/api/ems/settings');
export const saveSettings = (body: Record<string, unknown>) => api<WorkSettings>('/api/ems/settings', { method: 'PUT', body });
export const setPortalAccess = (id: number, full: boolean) => post(`/api/ems/employees/${id}/portal-access`, { full });

export const adminOverview = () => api<AdminOverview>('/api/ems/admin/overview');

export const listProjects = () => api<Project[]>('/api/ems/projects');
export const getProject = (id: number) => api<Project>(`/api/ems/projects/${id}`);
export interface ProjectBody { name?: string; description?: string | null; status?: ProjectStatus; start_date?: string | null; due_date?: string | null; members?: { employee_id: number; role: 'lead' | 'member' }[] }
export const createProject = (body: ProjectBody) => post<Project>('/api/ems/projects', body);
export const updateProject = (id: number, body: ProjectBody) => api<Project>(`/api/ems/projects/${id}`, { method: 'PATCH', body });
export const deleteProject = (id: number) => api(`/api/ems/projects/${id}`, { method: 'DELETE' });
export const dayLog = (date: string, employeeId?: number) => api<DayLog>(`/api/ems/worklog${q({ date, employee_id: employeeId })}`);
export const logRange = (from: string, to: string, employeeId?: number) => api<LogRange>(`/api/ems/worklog/range${q({ from, to, employee_id: employeeId })}`);
export const teamLog = (date: string) => api<TeamLog>(`/api/ems/worklog/team${q({ date })}`);
export const addWorkLog = (body: { date?: string; summary: string; hours?: number | null; project_id?: number | null; task_id?: number | null }) => post<WorkLog>('/api/ems/worklog', body);
export const deleteWorkLog = (id: number) => api(`/api/ems/worklog/${id}`, { method: 'DELETE' });
