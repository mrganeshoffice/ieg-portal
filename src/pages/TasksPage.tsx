import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import { Empty, ErrorBox, Loading, Pill, Spin, Tabs, fmtDate } from '@/components/work/ui';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { errMsg, getDirectory, listEmployees } from '@/services/emsService';
import { addTaskComment, createTask, deleteTask, listTasks, taskComments, updateTask } from '@/services/workService';
import type { Task, TaskComment, TaskPriority, TaskStatus } from '@/types/work';

const STATUSES: { v: TaskStatus; l: string }[] = [{ v: 'todo', l: 'To do' }, { v: 'in_progress', l: 'In progress' }, { v: 'blocked', l: 'Blocked' }, { v: 'done', l: 'Done' }];
type Person = { id: number; name: string };

function usePeople(role: string | undefined, selfId: number | null | undefined) {
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => {
    if (role === 'employee' || !role) return;
    if (role === 'manager') listEmployees({ page_size: 100 }).then((r) => setPeople(r.items.map((e) => ({ id: e.id, name: e.full_name })))).catch(() => {});
    else getDirectory().then((d) => setPeople(d.map((p) => ({ id: p.id, name: p.name })))).catch(() => {});
  }, [role, selfId]);
  return people;
}

function TaskForm({ people, selfId, onClose, onDone, onError, task }: { people: Person[]; selfId: number | null; onClose: () => void; onDone: () => void; onError: (m: string) => void; task?: Task }) {
  const [f, setF] = useState({ title: task?.title ?? '', description: task?.description ?? '', priority: (task?.priority ?? 'medium') as TaskPriority, due_date: task?.due_date ?? '', assignee_id: String(task?.assignee.id ?? selfId ?? '') });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.title.trim()) { onError('Give the task a title.'); return; }
    setBusy(true);
    try { const body = { title: f.title.trim(), description: f.description.trim() || null, priority: f.priority, due_date: f.due_date || null, assignee_id: f.assignee_id ? Number(f.assignee_id) : undefined }; if (task) await updateTask(task.id, body); else await createTask(body); onDone(); }
    catch (e) { onError(errMsg(e)); } finally { setBusy(false); }
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open onClose={onClose} title={task ? 'Edit task' : 'New task'} size="md">
      <div className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Title</span><input className="input" value={f.title} maxLength={160} onChange={set('title')} data-autofocus /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Details</span><textarea className="input min-h-24" value={f.description} maxLength={4000} onChange={set('description')} /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Priority</span><select className="input" value={f.priority} onChange={set('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Due date</span><input type="date" className="input" value={f.due_date} onChange={set('due_date')} /></label>
          {(people.length > 0) && <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Assign to</span><select className="input" value={f.assignee_id} onChange={set('assignee_id')}>{selfId != null && <option value={selfId}>Me</option>}{people.filter((p) => p.id !== selfId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
        </div>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy} onClick={() => void save()}>{busy && <Spin />}{task ? 'Save' : 'Create task'}</button></div>
      </div>
    </Modal>
  );
}

function Detail({ task, canManage, onClose, onChanged, onToast, onEdit }: { task: Task; canManage: boolean; onClose: () => void; onChanged: () => void; onToast: (t: 'success' | 'error', m: string) => void; onEdit: () => void }) {
  const [comments, setComments] = useState<TaskComment[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { taskComments(task.id).then(setComments).catch(() => setComments([])); }, [task.id]);
  useEffect(load, [load]);
  const send = async () => { if (!text.trim()) return; setBusy(true); try { await addTaskComment(task.id, text.trim()); setText(''); load(); } catch (e) { onToast('error', errMsg(e)); } finally { setBusy(false); } };
  const remove = async () => { if (!window.confirm('Delete this task? This cannot be undone.')) return; try { await deleteTask(task.id); onToast('success', 'Task deleted.'); onChanged(); onClose(); } catch (e) { onToast('error', errMsg(e)); } };
  return (
    <Modal open onClose={onClose} title={task.title} size="md" description={`Assigned to ${task.assignee.name} by ${task.created_by.name}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2"><Pill value={task.status} /><Pill value={task.priority} />{task.due_date && <span className={`text-xs font-semibold ${task.overdue ? 'text-red-500' : 'text-muted'}`}>Due {fmtDate(task.due_date)}{task.overdue ? ' (overdue)' : ''}</span>}</div>
        {task.description ? <p className="whitespace-pre-wrap text-sm">{task.description}</p> : <p className="text-sm text-muted">No details added.</p>}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted"><MessageSquare size={14} />Comments</p>
          {!comments ? <div className="skeleton h-12" /> : comments.length === 0 ? <p className="text-sm text-muted">No comments yet.</p> : <ul className="max-h-48 space-y-2 overflow-y-auto">{comments.map((c) => <li key={c.id} className="rounded-xl bg-app px-3 py-2 text-sm"><p className="text-xs font-bold">{c.author} <span className="font-normal text-muted">{new Date(c.created_at).toLocaleString()}</span></p><p className="whitespace-pre-wrap">{c.body}</p></li>)}</ul>}
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}><input className="input" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Add a comment" aria-label="Add a comment" /><button className="btn-primary shrink-0" disabled={busy || !text.trim()} aria-label="Send comment"><Send size={16} /></button></form>
        </div>
        {canManage && <div className="flex justify-between border-t border-line pt-3"><button className="btn-ghost !text-red-500" onClick={() => void remove()}><Trash2 size={16} />Delete</button><button className="btn-ghost" onClick={onEdit}>Edit details</button></div>}
      </div>
    </Modal>
  );
}

export default function TasksPage() {
  const { session } = useAuth();
  const toast = useToasts();
  const lead = session?.role !== 'employee'; const admin = session?.role === 'admin' || session?.role === 'super_admin';
  const [view, setView] = useState<'mine' | 'assigned' | 'team' | 'all'>('mine');
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [items, setItems] = useState<Task[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Task | null>(null);
  const [form, setForm] = useState<null | 'new' | Task>(null);
  const people = usePeople(session?.role, session?.employeeId);
  const t = (k: 'success' | 'error', m: string) => (k === 'success' ? toast.success(m) : toast.error(m));
  const load = useCallback(() => { setItems(null); listTasks(view, filter === 'open' ? 'open' : undefined).then((r) => { setItems(r); setErr(''); }).catch((e) => setErr(errMsg(e))); }, [view, filter]);
  useEffect(load, [load]);
  const setStatus = async (task: Task, status: TaskStatus) => { try { await updateTask(task.id, { status }); setItems((xs) => xs && xs.map((x) => (x.id === task.id ? { ...x, status } : x))); } catch (e) { toast.error(errMsg(e)); load(); } };
  const tabs = [{ id: 'mine' as const, label: 'My tasks' }, { id: 'assigned' as const, label: 'Assigned by me' }, ...(lead ? [{ id: (admin ? 'all' : 'team') as 'team' | 'all', label: admin ? 'Everyone' : 'My team' }] : [])];
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Tasks" description="Track what needs doing, who is doing it and by when." actions={<button className="btn-primary" onClick={() => setForm('new')}><Plus size={16} />New task</button>} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onChange={setView} tabs={tabs} />
        <div className="mb-5 inline-flex gap-1 rounded-2xl border border-line bg-surface p-1 text-sm font-semibold">{(['open', 'all'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-xl px-3 py-1.5 ${filter === f ? 'bg-app text-ink' : 'text-muted'}`}>{f === 'open' ? 'Open' : 'All'}</button>)}</div>
      </div>
      {err ? <ErrorBox message={err} onRetry={load} /> : !items ? <Loading /> : items.length === 0 ? <Empty title={filter === 'open' ? 'No open tasks' : 'No tasks yet'} hint="Create a task to get started." action={<button className="btn-primary" onClick={() => setForm('new')}><Plus size={16} />New task</button>} /> : (
        <ul className="space-y-2.5">
          {items.map((x) => (
            <li key={x.id} className="card flex flex-wrap items-center gap-3 p-4">
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(x)}>
                <p className={`truncate font-bold ${x.status === 'done' ? 'text-muted line-through' : ''}`}>{x.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted"><span>{view === 'mine' ? `From ${x.created_by.name}` : `To ${x.assignee.name}`}</span>{x.due_date && <span className={x.overdue ? 'font-bold text-red-500' : ''}>Due {fmtDate(x.due_date)}</span>}</p>
              </button>
              <Pill value={x.priority} />
              <select aria-label={`Status of ${x.title}`} className="input !w-auto !py-1.5 text-xs font-semibold" value={x.status} onChange={(e) => void setStatus(x, e.target.value as TaskStatus)}>{STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select>
            </li>
          ))}
        </ul>
      )}
      {open && <Detail task={open} canManage={admin || open.created_by.id === session?.employeeId} onClose={() => setOpen(null)} onChanged={load} onToast={t} onEdit={() => { setForm(open); setOpen(null); }} />}
      {form && <TaskForm people={people} selfId={session?.employeeId ?? null} task={form === 'new' ? undefined : form} onClose={() => setForm(null)} onError={(m) => toast.error(m)} onDone={() => { setForm(null); toast.success('Saved.'); load(); }} />}
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
