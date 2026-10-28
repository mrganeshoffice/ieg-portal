import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Columns3, List, Plus, Search } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Empty, ErrorBox, Loading, Tabs } from '@/components/work/ui';
import { TaskBoard, TaskDetail, TaskForm, TaskRow } from '@/components/work/TaskParts';
import { usePeople } from '@/components/work/people';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import ProjectsPanel from '@/pages/work/ProjectsPanel';
import DailyPanel from '@/pages/work/DailyPanel';
import { errMsg } from '@/services/emsService';
import { getTask, listProjects, listTasks, updateTask } from '@/services/workService';
import type { Project, Task, TaskStatus } from '@/types/work';

type Section = 'tasks' | 'projects' | 'daily';

export default function TasksPage() {
  const { session } = useAuth();
  const toast = useToasts();
  const [params, setParams] = useSearchParams();
  const lead = session?.role !== 'employee'; const admin = session?.role === 'admin' || session?.role === 'super_admin';
  const selfId = session?.employeeId ?? null;
  const [section, setSection] = useState<Section>(params.get('project') ? 'projects' : (params.get('tab') as Section) || 'tasks');
  const [view, setView] = useState<'mine' | 'assigned' | 'team' | 'all'>(admin ? 'all' : 'mine');
  const [layout, setLayout] = useState<'list' | 'board'>('list');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [projectFilter, setProjectFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [items, setItems] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Task | null>(null);
  const [form, setForm] = useState<null | { task?: Task; project?: number }>(null);
  const [bump, setBump] = useState(0);
  const [openProject, setOpenProject] = useState<number | null>(params.get('project') ? Number(params.get('project')) : null);
  const people = usePeople(session?.role, selfId);
  const t = useCallback((k: 'success' | 'error', m: string) => (k === 'success' ? toast.success(m) : toast.error(m)), [toast]);

  const loadProjects = useCallback(() => { listProjects().then(setProjects).catch(() => {}); }, []);
  useEffect(loadProjects, [loadProjects, bump]);
  const load = useCallback(() => {
    setItems(null);
    const extra = view === 'all' || view === 'team' ? { project_id: projectFilter ? Number(projectFilter) : undefined, employee_id: personFilter ? Number(personFilter) : undefined } : {};
    listTasks(view, filter === 'open' ? 'open' : undefined, extra).then((r) => { setItems(r); setErr(''); }).catch((e) => setErr(errMsg(e)));
  }, [view, filter, projectFilter, personFilter]);
  useEffect(load, [load, bump]);

  // deep links from notifications: /tasks?task=12
  const deepTask = params.get('task');
  useEffect(() => {
    if (!deepTask) return;
    getTask(Number(deepTask)).then((x) => { setSection('tasks'); setOpen(x); }).catch(() => toast.error('That task is no longer available.'));
    const n = new URLSearchParams(params); n.delete('task'); setParams(n, { replace: true });
  }, [deepTask]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => setBump((b) => b + 1);
  const setStatus = async (task: Task, status: TaskStatus) => { try { await updateTask(task.id, { status }); setItems((xs) => xs && xs.map((x) => (x.id === task.id ? { ...x, status } : x))); setBump((b) => b + 1); } catch (e) { toast.error(errMsg(e)); load(); } };
  const projectOf = (task: Task) => projects.find((p) => p.id === task.project?.id);
  const canManage = (task: Task) => admin || task.created_by.id === selfId || !!projectOf(task)?.can_manage;
  const canStatus = (task: Task) => canManage(task) || task.assignee.id === selfId || (session?.role === 'manager' && people.some((p) => p.id === task.assignee.id));
  const shown = useMemo(() => (items ?? []).filter((x) => !search.trim() || `${x.title} ${x.assignee.name} ${x.created_by.name} ${x.project?.name ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())), [items, search]);
  const tabs = [{ id: 'mine' as const, label: 'My tasks' }, { id: 'assigned' as const, label: 'Assigned by me' }, ...(lead ? [{ id: (admin ? 'all' : 'team') as 'team' | 'all', label: admin ? 'Everyone' : 'My team' }] : [])];
  const sections = [{ id: 'tasks' as const, label: 'Tasks' }, { id: 'projects' as const, label: 'Projects' }, { id: 'daily' as const, label: 'Daily updates' }];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Tasks & projects" description="Plan projects with your team, assign work, and follow progress day by day." actions={section !== 'daily' ? <button className="btn-primary" onClick={() => setForm({})}><Plus size={16} />New task</button> : undefined} />
      <div><Tabs value={section} onChange={(v) => { setSection(v); const n = new URLSearchParams(); if (v !== 'tasks') n.set('tab', v); setParams(n, { replace: true }); }} tabs={sections} /></div>

      {section === 'tasks' && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Tabs value={view} onChange={setView} tabs={tabs} />
            <div className="mb-5 flex items-center gap-2">
              <div className="inline-flex gap-1 rounded-2xl border border-line bg-surface p-1 text-sm font-semibold">{(['open', 'all'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-xl px-3 py-1.5 ${filter === f ? 'bg-app text-ink' : 'text-muted'}`}>{f === 'open' ? 'Open' : 'All'}</button>)}</div>
              <div className="inline-flex gap-1 rounded-2xl border border-line bg-surface p-1">{([['list', List], ['board', Columns3]] as const).map(([k, I]) => <button key={k} onClick={() => setLayout(k)} aria-label={`${k} view`} aria-pressed={layout === k} className={`rounded-xl px-2.5 py-1.5 ${layout === k ? 'bg-app text-ink' : 'text-muted'}`}><I size={16} /></button>)}</div>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="relative min-w-52 flex-1 sm:max-w-xs"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input className="input !pl-10" placeholder="Search tasks or people" aria-label="Search tasks" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
            {(view === 'all' || view === 'team') && <>
              <select className="input !w-auto" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Project"><option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select className="input !w-auto" value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} aria-label="Employee"><option value="">All employees</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </>}
          </div>
          {err ? <ErrorBox message={err} onRetry={load} /> : !items ? <Loading /> : shown.length === 0 ? <Empty title={filter === 'open' ? 'No open tasks' : 'No tasks yet'} hint="Create a task to get started." action={<button className="btn-primary" onClick={() => setForm({})}><Plus size={16} />New task</button>} /> : layout === 'board' ? <TaskBoard tasks={shown} onOpen={setOpen} /> : (
            <ul className="space-y-2.5">{shown.map((x) => <TaskRow key={x.id} task={x} showWho={view === 'mine' ? 'creator' : 'assignee'} onOpen={() => setOpen(x)} onStatus={(s) => void setStatus(x, s)} />)}</ul>
          )}
        </>
      )}

      {section === 'projects' && <ProjectsPanel canCreate={lead} people={people} selfId={selfId} isAdmin={admin} onToast={t} onOpenTask={setOpen} onNewTask={(project) => setForm({ project })} openId={openProject} onOpened={() => setOpenProject(null)} reloadKey={bump} />}
      {section === 'daily' && <DailyPanel lead={lead} hasEmployee={selfId != null} people={people} selfId={selfId} onToast={t} />}

      {open && <TaskDetail key={open.id} task={open} canManage={canManage(open)} canStatus={canStatus(open)} onClose={() => setOpen(null)} onChanged={refresh} onToast={t} onEdit={() => { setForm({ task: open }); setOpen(null); }} />}
      {form && <TaskForm people={people} projects={projects} selfId={selfId} task={form.task} defaultProject={form.project} onClose={() => setForm(null)} onError={(m) => toast.error(m)} onDone={() => { setForm(null); toast.success('Saved.'); refresh(); }} />}
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
