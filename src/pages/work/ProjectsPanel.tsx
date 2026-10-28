import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, FolderKanban, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/work/Avatar';
import type { Person } from '@/components/work/people';
import { TaskRow } from '@/components/work/TaskParts';
import { Empty, ErrorBox, Loading, Pill, Spin, fmtDate } from '@/components/work/ui';
import { errMsg } from '@/services/emsService';
import { createProject, deleteProject, getProject, listProjects, listTasks, updateProject, updateTask } from '@/services/workService';
import type { Project, ProjectStatus, Task, TaskStatus } from '@/types/work';

const STATUS: { v: ProjectStatus; l: string }[] = [{ v: 'planning', l: 'Planning' }, { v: 'active', l: 'Active' }, { v: 'on_hold', l: 'On hold' }, { v: 'completed', l: 'Completed' }];

function Faces({ members, max = 4 }: { members: { name: string }[]; max?: number }) {
  return <div className="flex -space-x-2">{members.slice(0, max).map((m, i) => <span key={i} className="rounded-full ring-2 ring-surface" title={m.name}><Avatar name={m.name} size={28} /></span>)}{members.length > max && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-app text-[10px] font-bold ring-2 ring-surface">+{members.length - max}</span>}</div>;
}

function ProjectForm({ project, people, selfId, onClose, onDone, onError }: { project?: Project; people: Person[]; selfId: number | null; onClose: () => void; onDone: (p: Project) => void; onError: (m: string) => void }) {
  const [f, setF] = useState({ name: project?.name ?? '', description: project?.description ?? '', status: (project?.status ?? 'active') as ProjectStatus, start_date: project?.start_date ?? '', due_date: project?.due_date ?? '' });
  const [sel, setSel] = useState<Map<number, 'lead' | 'member'>>(new Map(project?.members.map((m) => [m.id, m.role]) ?? []));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const known = useMemo(() => { const m = new Map<number, string>(); for (const p of people) m.set(p.id, p.name); for (const p of project?.members ?? []) m.set(p.id, p.name); return m; }, [people, project]);
  const list = [...known].map(([id, name]) => ({ id, name })).filter((p) => p.id !== selfId && (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase())));
  const toggle = (id: number) => setSel((s) => { const n = new Map(s); if (n.has(id)) n.delete(id); else n.set(id, 'member'); return n; });
  const flip = (id: number) => setSel((s) => { const n = new Map(s); n.set(id, n.get(id) === 'lead' ? 'member' : 'lead'); return n; });
  const save = async () => {
    if (!f.name.trim()) { onError('Give the project a name.'); return; }
    setBusy(true);
    try {
      const members = [...sel].map(([employee_id, role]) => ({ employee_id, role }));
      const body = { name: f.name.trim(), description: f.description.trim() || null, status: f.status, start_date: f.start_date || null, due_date: f.due_date || null, members };
      onDone(project ? await updateProject(project.id, body) : await createProject(body));
    } catch (e) { onError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={project ? 'Edit project' : 'New project'} size="md" description="Add the people who will work on it. They can all see the project and its tasks.">
      <div className="space-y-4 p-5 sm:p-7">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Project name</span><input className="input" value={f.name} maxLength={140} onChange={(e) => setF({ ...f, name: e.target.value })} data-autofocus /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Description</span><textarea className="input min-h-20" value={f.description} maxLength={4000} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Status</span><select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectStatus })}>{STATUS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Start date</span><input type="date" className="input" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Due date</span><input type="date" className="input" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></label>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-muted">Team members ({sel.size} chosen)</span><span className="text-[11px] text-muted">You are added as lead automatically</span></div>
          <label className="relative mb-2 block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input !pl-9" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" /></label>
          <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-2xl border border-line">
            {list.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">No people found.</li>}
            {list.map((p) => { const on = sel.has(p.id); return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <input type="checkbox" className="h-4 w-4 accent-brand" checked={on} onChange={() => toggle(p.id)} aria-label={`Add ${p.name}`} />
                <Avatar name={p.name} size={28} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                {on && <button type="button" onClick={() => flip(p.id)} className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sel.get(p.id) === 'lead' ? 'bg-gold/25 text-amber-700' : 'bg-app text-muted hover:text-ink'}`}>{sel.get(p.id) === 'lead' ? 'Lead' : 'Make lead'}</button>}
              </li>); })}
          </ul>
        </div>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy} onClick={() => void save()}>{busy && <Spin />}{project ? 'Save project' : 'Create project'}</button></div>
      </div>
    </Modal>
  );
}

function ProjectDetail({ id, selfId, isAdmin, onClose, onChanged, onToast, onOpenTask, onNewTask, onEdit, reloadKey }: { id: number; selfId: number | null; isAdmin: boolean; onClose: () => void; onChanged: () => void; onToast: (t: 'success' | 'error', m: string) => void; onOpenTask: (t: Task) => void; onNewTask: (projectId: number) => void; onEdit: (p: Project) => void; reloadKey: number }) {
  const [p, setP] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [who, setWho] = useState<number | 'all'>('all');
  const load = useCallback(() => { getProject(id).then(setP).catch((e) => onToast('error', errMsg(e))); listTasks('project', undefined, { project_id: id }).then(setTasks).catch(() => setTasks([])); }, [id, onToast]);
  useEffect(load, [load, reloadKey]);
  const setStatus = async (t: Task, status: TaskStatus) => { try { await updateTask(t.id, { status }); load(); onChanged(); } catch (e) { onToast('error', errMsg(e)); } };
  const remove = async () => { if (!p || !window.confirm(`Delete “${p.name}”? Its tasks stay but are no longer part of a project.`)) return; try { await deleteProject(p.id); onToast('success', 'Project deleted.'); onChanged(); onClose(); } catch (e) { onToast('error', errMsg(e)); } };
  const shown = (tasks ?? []).filter((t) => who === 'all' || t.assignee.id === who);
  return (
    <Modal open onClose={onClose} title={p?.name ?? 'Project'} size="xl" description={p ? `Led by ${p.members.filter((m) => m.role === 'lead').map((m) => m.name).join(', ') || p.created_by.name}` : undefined}>
      {!p ? <div className="p-5"><Loading rows={2} /></div> : (
        <div className="space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3"><Pill value={p.status} />{p.start_date && <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted"><CalendarDays size={13} />{fmtDate(p.start_date)}{p.due_date ? ` → ${fmtDate(p.due_date)}` : ''}</span>}{!p.start_date && p.due_date && <span className="text-xs font-semibold text-muted">Due {fmtDate(p.due_date)}</span>}</div>
          {p.description && <p className="whitespace-pre-wrap text-sm">{p.description}</p>}
          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold text-muted"><span>Overall progress</span><span>{p.tasks.done} of {p.tasks.total} tasks done{p.tasks.overdue ? ` · ${p.tasks.overdue} overdue` : ''}</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-app"><div className="h-full rounded-full bg-gradient-to-r from-brand to-leaf transition-all" style={{ width: `${p.progress}%` }} /></div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted"><Users size={13} />Team ({p.members.length})</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {p.members.map((m) => { const pct = m.total ? Math.round(((m.done ?? 0) / m.total) * 100) : 0; const sel = who === m.id; return (
                <button key={m.id} type="button" onClick={() => setWho(sel ? 'all' : m.id)} aria-pressed={sel} className={`rounded-2xl border p-3 text-left transition hover:border-brand ${sel ? 'border-brand bg-brand/5' : 'border-line bg-surface'}`}>
                  <div className="flex items-center gap-2.5"><Avatar name={m.name} size={32} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{m.name}{m.id === selfId ? ' (you)' : ''}</p><p className="text-[11px] text-muted">{m.role === 'lead' ? 'Project lead' : 'Member'} · {m.total ?? 0} task{m.total === 1 ? '' : 's'}</p></div></div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-app"><div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} /></div>
                  <p className="mt-1 text-[11px] text-muted">{m.done ?? 0} done · {m.in_progress ?? 0} in progress{m.blocked ? ` · ${m.blocked} blocked` : ''}{m.overdue ? ` · ${m.overdue} overdue` : ''}</p>
                </button>); })}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-muted">Tasks {who !== 'all' && <button className="ml-2 normal-case text-brand hover:underline" onClick={() => setWho('all')}>show all</button>}</p><button className="btn-primary !py-1.5 !text-xs" onClick={() => onNewTask(p.id)}><Plus size={14} />Add task</button></div>
            {!tasks ? <Loading rows={2} /> : shown.length === 0 ? <Empty title="No tasks yet" hint="Add a task and assign it to a team member." /> : <ul className="space-y-2.5">{shown.map((t) => <TaskRow key={t.id} task={t} showWho="assignee" onOpen={() => onOpenTask(t)} onStatus={(s) => void setStatus(t, s)} />)}</ul>}
          </div>
          {p.can_manage && <div className="flex justify-between border-t border-line pt-3">{(isAdmin || p.created_by.id === selfId) ? <button className="btn-ghost !text-red-500" onClick={() => void remove()}><Trash2 size={16} />Delete project</button> : <span />}<button className="btn-ghost" onClick={() => onEdit(p)}><Pencil size={16} />Edit project &amp; team</button></div>}
        </div>
      )}
    </Modal>
  );
}

export default function ProjectsPanel({ canCreate, people, selfId, isAdmin, onToast, onOpenTask, onNewTask, openId, onOpened, reloadKey }: { canCreate: boolean; people: Person[]; selfId: number | null; isAdmin: boolean; onToast: (t: 'success' | 'error', m: string) => void; onOpenTask: (t: Task) => void; onNewTask: (projectId: number) => void; openId: number | null; onOpened: () => void; reloadKey: number }) {
  const [items, setItems] = useState<Project[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<number | null>(openId);
  const [form, setForm] = useState<null | 'new' | Project>(null);
  const [q, setQ] = useState('');
  const [show, setShow] = useState<'open' | 'all'>('open');
  const load = useCallback(() => { listProjects().then((r) => { setItems(r); setErr(''); }).catch((e) => setErr(errMsg(e))); }, []);
  useEffect(load, [load, reloadKey]);
  useEffect(() => { if (openId) { setOpen(openId); onOpened(); } }, [openId, onOpened]);
  const shown = (items ?? []).filter((p) => (show === 'all' || p.status !== 'completed') && (!q.trim() || `${p.name} ${p.members.map((m) => m.name).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1 sm:max-w-sm"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input className="input !pl-10" placeholder="Search projects or people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" /></label>
        <div className="inline-flex gap-1 rounded-2xl border border-line bg-surface p-1 text-sm font-semibold">{(['open', 'all'] as const).map((f) => <button key={f} onClick={() => setShow(f)} className={`rounded-xl px-3 py-1.5 ${show === f ? 'bg-app text-ink' : 'text-muted'}`}>{f === 'open' ? 'Running' : 'All'}</button>)}</div>
        {canCreate && <button className="btn-primary ml-auto" onClick={() => setForm('new')}><Plus size={16} />New project</button>}
      </div>
      {err ? <ErrorBox message={err} onRetry={load} /> : !items ? <Loading rows={3} /> : shown.length === 0 ? <Empty title={items.length ? 'No projects match' : 'No projects yet'} hint={canCreate ? 'Create a project, add the team, then assign tasks to each member.' : 'Projects you are added to will appear here.'} action={canCreate ? <button className="btn-primary" onClick={() => setForm('new')}><Plus size={16} />New project</button> : undefined} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <button key={p.id} onClick={() => setOpen(p.id)} className="group card relative overflow-hidden p-5 text-left transition hover:-translate-y-0.5 hover:shadow-glow">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand to-leaf" />
              <div className="mb-3 flex items-start justify-between gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand"><FolderKanban size={19} /></span><Pill value={p.status} /></div>
              <p className="truncate text-base font-extrabold">{p.name}</p>
              <p className="mt-0.5 line-clamp-2 min-h-9 text-xs text-muted">{p.description || 'No description'}</p>
              <div className="mt-4"><div className="mb-1 flex justify-between text-[11px] font-semibold text-muted"><span>{p.tasks.done}/{p.tasks.total} tasks</span><span>{p.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-app"><div className="h-full rounded-full bg-gradient-to-r from-brand to-leaf" style={{ width: `${p.progress}%` }} /></div></div>
              <div className="mt-4 flex items-center justify-between"><Faces members={p.members} />{p.due_date ? <span className="text-[11px] font-semibold text-muted">Due {fmtDate(p.due_date)}</span> : <span className="text-[11px] text-muted">{p.members.length} member{p.members.length === 1 ? '' : 's'}</span>}</div>
              {p.tasks.overdue > 0 && <p className="mt-3 rounded-lg bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-600">{p.tasks.overdue} overdue</p>}
            </button>
          ))}
        </div>
      )}
      {open != null && <ProjectDetail id={open} selfId={selfId} isAdmin={isAdmin} reloadKey={reloadKey} onClose={() => setOpen(null)} onChanged={load} onToast={onToast} onOpenTask={onOpenTask} onNewTask={onNewTask} onEdit={(p) => { setOpen(null); setForm(p); }} />}
      {form && <ProjectForm project={form === 'new' ? undefined : form} people={people} selfId={selfId} onClose={() => setForm(null)} onError={(m) => onToast('error', m)} onDone={(p) => { setForm(null); onToast('success', 'Project saved.'); load(); setOpen(p.id); }} />}
    </>
  );
}
