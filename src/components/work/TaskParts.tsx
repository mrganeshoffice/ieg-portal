import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, FolderKanban, Send, Trash2, UserRound } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Pill, Spin, fmtDate } from '@/components/work/ui';
import Avatar from '@/components/work/Avatar';
import type { Person } from '@/components/work/people';
import { errMsg } from '@/services/emsService';
import { addTaskComment, createTask, deleteTask, getProject, taskComments, updateTask } from '@/services/workService';
import type { Project, Task, TaskComment, TaskPriority, TaskStatus } from '@/types/work';

export const STATUSES: { v: TaskStatus; l: string; c: string }[] = [{ v: 'todo', l: 'To do', c: '#94A3B8' }, { v: 'in_progress', l: 'In progress', c: '#1FA2E8' }, { v: 'blocked', l: 'Blocked', c: '#EF4444' }, { v: 'done', l: 'Done', c: '#34C77B' }];

export function TaskForm({ people, projects, selfId, defaultProject, onClose, onDone, onError, task }: { people: Person[]; projects: Project[]; selfId: number | null; defaultProject?: number | null; onClose: () => void; onDone: () => void; onError: (m: string) => void; task?: Task }) {
  const [f, setF] = useState({ title: task?.title ?? '', description: task?.description ?? '', priority: (task?.priority ?? 'medium') as TaskPriority, due_date: task?.due_date ?? '', assignee_id: String(task?.assignee.id ?? selfId ?? ''), project_id: String(task?.project?.id ?? defaultProject ?? '') });
  const [members, setMembers] = useState<Person[] | null>(null);
  const [busy, setBusy] = useState(false);
  const project = projects.find((p) => String(p.id) === f.project_id);
  useEffect(() => {
    if (!f.project_id) { setMembers(null); return; }
    let live = true; getProject(Number(f.project_id)).then((p) => { if (!live) return; setMembers(p.members.map((m) => ({ id: m.id, name: m.name }))); }).catch(() => setMembers([]));
    return () => { live = false; };
  }, [f.project_id]);
  const manageable = !project || project.can_manage || !!task;
  const options: Person[] = f.project_id ? (members ?? []).filter((m) => manageable || m.id === selfId) : [...(selfId != null ? [{ id: selfId, name: 'Me' }] : []), ...people.filter((p) => p.id !== selfId)];
  useEffect(() => { if (f.project_id && members && !options.some((o) => String(o.id) === f.assignee_id) && options[0]) setF((x) => ({ ...x, assignee_id: String(options[0].id) })); }, [members]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.title.trim()) { onError('Give the task a title.'); return; }
    setBusy(true);
    try {
      const body = { title: f.title.trim(), description: f.description.trim() || null, priority: f.priority, due_date: f.due_date || null, assignee_id: f.assignee_id ? Number(f.assignee_id) : undefined };
      if (task) await updateTask(task.id, body); else await createTask({ ...body, project_id: f.project_id ? Number(f.project_id) : undefined });
      onDone();
    } catch (e) { onError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={task ? 'Edit task' : 'New task'} size="md">
      <div className="space-y-4 p-5 sm:p-7">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Title</span><input className="input" value={f.title} maxLength={160} onChange={set('title')} data-autofocus /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Details</span><textarea className="input min-h-24" value={f.description} maxLength={4000} onChange={set('description')} /></label>
        {!task && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Project (optional)</span><select className="input" value={f.project_id} onChange={set('project_id')}><option value="">No project — personal / general task</option>{projects.filter((p) => p.status !== 'completed').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Priority</span><select className="input" value={f.priority} onChange={set('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Due date</span><input type="date" className="input" value={f.due_date} onChange={set('due_date')} /></label>
          {options.length > 1 || f.project_id ? <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Assign to</span><select className="input" value={f.assignee_id} onChange={set('assignee_id')} disabled={f.project_id !== '' && members === null}>{options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label> : null}
        </div>
        {project && !manageable && <p className="text-xs text-muted">You are a member of this project, so new tasks are assigned to you. The project lead can assign work to others.</p>}
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy} onClick={() => void save()}>{busy && <Spin />}{task ? 'Save' : 'Create task'}</button></div>
      </div>
    </Modal>
  );
}

const when = (iso: string) => { const d = new Date(iso); const today = new Date().toDateString() === d.toDateString(); return today ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };

/** Task detail with a live discussion thread. People involved in the task are notified of every new message. */
export function TaskDetail({ task: first, canManage, canStatus, onClose, onChanged, onToast, onEdit }: { task: Task; canManage: boolean; canStatus: boolean; onClose: () => void; onChanged: () => void; onToast: (t: 'success' | 'error', m: string) => void; onEdit: () => void }) {
  const [task, setTask] = useState(first);
  const [msgs, setMsgs] = useState<TaskComment[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const load = useCallback(() => { taskComments(task.id).then((m) => setMsgs((old) => (old && old.length === m.length ? old : m))).catch(() => setMsgs((o) => o ?? [])); }, [task.id]);
  useEffect(() => { load(); const t = window.setInterval(() => { if (!document.hidden) load(); }, 5000); return () => window.clearInterval(t); }, [load]);
  useEffect(() => { if (msgs && msgs.length !== last.current) { last.current = msgs.length; box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }); } }, [msgs]);
  const send = async () => { const body = text.trim(); if (!body) return; setBusy(true); try { await addTaskComment(task.id, body); setText(''); load(); } catch (e) { onToast('error', errMsg(e)); } finally { setBusy(false); } };
  const remove = async () => { if (!window.confirm('Delete this task? This cannot be undone.')) return; try { await deleteTask(task.id); onToast('success', 'Task deleted.'); onChanged(); onClose(); } catch (e) { onToast('error', errMsg(e)); } };
  const setStatus = async (status: TaskStatus) => { try { const t = await updateTask(task.id, { status }); setTask(t); onChanged(); } catch (e) { onToast('error', errMsg(e)); } };
  return (
    <Modal open onClose={onClose} title={task.title} size="md" description={`Created by ${task.created_by.name}`}>
      <div className="space-y-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Pill value={task.priority} />
          {task.project && <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand-600"><FolderKanban size={12} />{task.project.name}</span>}
          {task.due_date && <span className={`inline-flex items-center gap-1 text-xs font-semibold ${task.overdue ? 'text-red-500' : 'text-muted'}`}><CalendarDays size={13} />Due {fmtDate(task.due_date)}{task.overdue ? ' (overdue)' : ''}</span>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-app p-3">
          <span className="flex items-center gap-2 text-sm"><Avatar name={task.assignee.name} size={28} /><span><span className="block text-[11px] text-muted">Assigned to</span><span className="font-bold">{task.assignee.name}</span></span></span>
          {canStatus ? <select aria-label="Status" className="input !w-auto !py-1.5 text-sm font-semibold" value={task.status} onChange={(e) => void setStatus(e.target.value as TaskStatus)}>{STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select> : <Pill value={task.status} />}
        </div>
        {task.description ? <p className="whitespace-pre-wrap text-sm">{task.description}</p> : <p className="text-sm text-muted">No details added.</p>}

        <div className="overflow-hidden rounded-2xl border border-line">
          <p className="flex items-center gap-1.5 border-b border-line bg-app px-3 py-2 text-xs font-bold text-muted"><UserRound size={13} />Task chat <span className="font-normal">· everyone on this task is notified</span></p>
          <div ref={box} className="max-h-72 min-h-32 space-y-2 overflow-y-auto bg-surface p-3" aria-live="polite">
            {!msgs ? <div className="skeleton h-12" /> : msgs.length === 0 ? <p className="py-6 text-center text-sm text-muted">No messages yet. Start the conversation.</p> : msgs.map((c) => (
              <div key={c.id} className={`flex ${c.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${c.mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-app'}`}>
                  {!c.mine && <p className="text-[11px] font-bold text-brand-600">{c.author}</p>}
                  <p className="whitespace-pre-wrap break-words">{c.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${c.mine ? 'text-white/70' : 'text-muted'}`}>{when(c.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
          <form className="flex items-end gap-2 border-t border-line bg-surface p-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <textarea className="input !min-h-0 resize-none !py-2" rows={1} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Write a message… (Enter to send)" aria-label="Write a message" />
            <button className="btn-primary shrink-0 !px-3" disabled={busy || !text.trim()} aria-label="Send message"><Send size={16} /></button>
          </form>
        </div>
        {canManage && <div className="flex justify-between border-t border-line pt-3"><button className="btn-ghost !text-red-500" onClick={() => void remove()}><Trash2 size={16} />Delete</button><button className="btn-ghost" onClick={onEdit}>Edit details</button></div>}
      </div>
    </Modal>
  );
}

export function TaskRow({ task, showWho, onOpen, onStatus }: { task: Task; showWho: 'assignee' | 'creator'; onOpen: () => void; onStatus: (s: TaskStatus) => void }) {
  const st = STATUSES.find((s) => s.v === task.status)!;
  return (
    <li className="card flex flex-wrap items-center gap-3 p-4">
      <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: st.c }} />
      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <p className={`truncate font-bold ${task.status === 'done' ? 'text-muted line-through' : ''}`}>{task.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Avatar name={showWho === 'creator' ? task.created_by.name : task.assignee.name} size={16} />{showWho === 'creator' ? `From ${task.created_by.name}` : task.assignee.name}</span>
          {task.project && <span className="inline-flex items-center gap-1 text-brand-600"><FolderKanban size={11} />{task.project.name}</span>}
          {task.due_date && <span className={task.overdue ? 'font-bold text-red-500' : ''}>Due {fmtDate(task.due_date)}</span>}
        </p>
      </button>
      <Pill value={task.priority} />
      <select aria-label={`Status of ${task.title}`} className="input !w-auto !py-1.5 text-xs font-semibold" value={task.status} onChange={(e) => onStatus(e.target.value as TaskStatus)}>{STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select>
    </li>
  );
}

export function TaskBoard({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STATUSES.map((s) => {
        const col = tasks.filter((t) => t.status === s.v);
        return (
          <div key={s.v} className="rounded-2xl bg-app/70 p-3">
            <p className="mb-3 flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-wide text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.c }} />{s.l}<span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-[11px]">{col.length}</span></p>
            <div className="space-y-2">
              {col.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">Nothing here</p>}
              {col.map((t) => (
                <button key={t.id} onClick={() => onOpen(t)} className="block w-full rounded-xl border border-line bg-surface p-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand">
                  <p className="text-sm font-bold">{t.title}</p>
                  {t.project && <p className="mt-1 truncate text-[11px] font-semibold text-brand-600">{t.project.name}</p>}
                  <div className="mt-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-xs text-muted"><Avatar name={t.assignee.name} size={18} />{t.assignee.name.split(' ')[0]}</span>{t.due_date && <span className={`text-[11px] ${t.overdue ? 'font-bold text-red-500' : 'text-muted'}`}>{fmtDate(t.due_date)}</span>}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
