import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, FolderKanban, ListChecks, Plus, Search, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import Avatar from '@/components/work/Avatar';
import type { Person } from '@/components/work/people';
import { Empty, ErrorBox, Loading, Pill, Spin, Tabs, fmtDay, fmtTime } from '@/components/work/ui';
import { errMsg } from '@/services/emsService';
import { addWorkLog, dayLog, deleteWorkLog, listProjects, listTasks, logRange, teamLog } from '@/services/workService';
import type { DayLog, LogRange, Project, Task, TaskActivity, TeamLog } from '@/types/work';

const todayStr = () => new Date().toLocaleDateString('en-CA');
const shift = (d: string, n: number) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); };
const LBL: Record<string, string> = { todo: 'To do', in_progress: 'In progress', blocked: 'Blocked', done: 'Done' };

function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = todayStr();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-2xl border border-line bg-surface p-1 shadow-soft">
        <button className="icon-btn !h-9 !w-9" aria-label="Previous day" onClick={() => onChange(shift(date, -1))}><ChevronLeft size={18} /></button>
        <div className="min-w-40 px-2 text-center text-sm font-extrabold">{fmtDay(date)}{date === today && <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand-600">TODAY</span>}</div>
        <button className="icon-btn !h-9 !w-9" aria-label="Next day" disabled={date >= today} onClick={() => onChange(shift(date, 1))}><ChevronRight size={18} /></button>
      </div>
      <input type="date" className="input !w-auto" aria-label="Pick a date" value={date} max={today} onChange={(e) => e.target.value && onChange(e.target.value)} />
      {date !== today && <button className="btn-ghost" onClick={() => onChange(today)}>Today</button>}
    </div>
  );
}

const Tile = ({ icon: I, label, value, color }: { icon: typeof Users; label: string; value: string | number; color: string }) => (
  <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-soft"><span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} /><I size={16} className="mb-1.5" style={{ color }} /><p className="text-2xl font-extrabold">{value}</p><p className="text-xs font-semibold text-muted">{label}</p></div>
);

function activityText(a: TaskActivity) {
  if (a.kind === 'created') return 'Created the task';
  if (a.kind === 'assigned') return `Reassigned${a.to ? ` to ${a.to}` : ''}`;
  return a.to === 'done' ? 'Marked as done' : `Moved ${a.from ? `${LBL[a.from] ?? a.from} → ` : 'to '}${LBL[a.to ?? ''] ?? a.to}`;
}

function Composer({ date, onSaved, onToast }: { date: string; onSaved: () => void; onToast: (t: 'success' | 'error', m: string) => void }) {
  const [text, setText] = useState(''); const [hours, setHours] = useState(''); const [project, setProject] = useState(''); const [task, setTask] = useState('');
  const [projects, setProjects] = useState<Project[]>([]); const [tasks, setTasks] = useState<Task[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => { listProjects().then(setProjects).catch(() => {}); listTasks('mine', 'open').then(setTasks).catch(() => {}); }, []);
  const save = async () => {
    if (!text.trim()) { onToast('error', 'Write what you worked on.'); return; }
    setBusy(true);
    try { await addWorkLog({ date, summary: text.trim(), hours: hours ? Number(hours) : null, project_id: project ? Number(project) : null, task_id: task ? Number(task) : null }); setText(''); setHours(''); setTask(''); onToast('success', 'Update added.'); onSaved(); }
    catch (e) { onToast('error', errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="card mb-5 p-4">
      <p className="mb-2 text-sm font-extrabold">What did you work on {date === todayStr() ? 'today' : `on ${fmtDay(date)}`}?</p>
      <textarea className="input min-h-24" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="e.g. Finished the charger wiring review and shared the notes with the team." aria-label="Daily update" />
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_7rem_auto]">
        <select className="input" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project"><option value="">Project (optional)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className="input" value={task} onChange={(e) => setTask(e.target.value)} aria-label="Task"><option value="">Task (optional)</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
        <input className="input" type="number" min={0} max={24} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours" aria-label="Hours spent" />
        <button className="btn-primary" disabled={busy} onClick={() => void save()}>{busy ? <Spin /> : <Plus size={16} />}Add update</button>
      </div>
    </div>
  );
}

function DayView({ employeeId, date, setDate, canWrite, onToast, showName }: { employeeId?: number; date: string; setDate: (d: string) => void; canWrite: boolean; onToast: (t: 'success' | 'error', m: string) => void; showName: boolean }) {
  const [d, setD] = useState<DayLog | null>(null); const [range, setRange] = useState<LogRange | null>(null); const [err, setErr] = useState('');
  const load = useCallback(() => {
    setD(null); dayLog(date, employeeId).then((x) => { setD(x); setErr(''); }).catch((e) => setErr(errMsg(e)));
    logRange(shift(todayStr(), -20), todayStr(), employeeId).then(setRange).catch(() => setRange(null));
  }, [date, employeeId]);
  useEffect(load, [load]);
  const remove = async (id: number) => { if (!window.confirm('Remove this update?')) return; try { await deleteWorkLog(id); load(); } catch (e) { onToast('error', errMsg(e)); } };
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_17rem]">
      <div className="min-w-0">
        {canWrite && <Composer date={date} onSaved={load} onToast={onToast} />}
        {err ? <ErrorBox message={err} onRetry={load} /> : !d ? <Loading rows={3} /> : (
          <div className="space-y-5">
            {showName && <div className="flex items-center gap-3"><Avatar name={d.employee.name} size={44} /><div><p className="text-lg font-extrabold">{d.employee.name}</p><p className="text-xs text-muted">{d.employee.department ?? 'No department'} · {d.open_tasks} open task{d.open_tasks === 1 ? '' : 's'}</p></div></div>}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile icon={Clock} label={d.attendance ? `${fmtTime(d.attendance.check_in)} → ${d.attendance.check_out ? fmtTime(d.attendance.check_out) : 'working'}` : 'No check-in'} value={d.attendance ? d.attendance.status.replace('_', ' ') : '—'} color="#1FA2E8" />
              <Tile icon={ListChecks} label="Updates written" value={d.totals.logs} color="#8B5CF6" />
              <Tile icon={Clock} label="Hours logged" value={d.totals.hours} color="#E9B44C" />
              <Tile icon={CheckCircle2} label="Tasks completed" value={d.totals.completed} color="#34C77B" />
            </div>
            <section><h3 className="mb-2 text-sm font-extrabold">Work updates</h3>
              {d.logs.length === 0 ? <Empty title="No update for this day" hint={canWrite ? 'Add what you worked on above.' : 'Nothing was written for this date.'} /> : (
                <ul className="space-y-2.5">{d.logs.map((l) => (
                  <li key={l.id} className="card p-4"><div className="flex items-start gap-3"><p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{l.summary}</p>{l.hours != null && <span className="shrink-0 rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-bold text-amber-700">{l.hours} h</span>}{canWrite && <button className="icon-btn !h-8 !w-8" aria-label="Remove update" onClick={() => void remove(l.id)}><Trash2 size={15} /></button>}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">{l.project && <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 font-bold text-brand-600"><FolderKanban size={11} />{l.project.name}</span>}{l.task && <span className="inline-flex items-center gap-1 rounded-full bg-app px-2 py-0.5 font-semibold"><ListChecks size={11} />{l.task.title}</span>}<span>{fmtTime(l.created_at)}</span></div></li>))}</ul>)}
            </section>
            <section><h3 className="mb-2 text-sm font-extrabold">Task activity</h3>
              {d.activity.length === 0 ? <p className="rounded-xl bg-app px-4 py-3 text-sm text-muted">No task changes on this day.</p> : (
                <ol className="relative space-y-3 border-l-2 border-line pl-5">{d.activity.map((a) => (
                  <li key={a.id} className="relative"><span className={`absolute -left-[1.72rem] top-1.5 h-3 w-3 rounded-full ring-4 ring-app ${a.to === 'done' ? 'bg-leaf' : 'bg-brand'}`} /><p className="text-sm"><span className="font-bold">{a.task.title}</span> <span className="text-muted">— {activityText(a)}</span></p><p className="text-[11px] text-muted">{fmtTime(a.at)}{a.project ? ` · ${a.project.name}` : ''}</p></li>))}</ol>)}
            </section>
            {d.due_tasks.length > 0 && <section><h3 className="mb-2 text-sm font-extrabold">Tasks due this day</h3><ul className="space-y-2">{d.due_tasks.map((t) => <li key={t.id} className="flex items-center gap-3 rounded-xl bg-app px-4 py-2.5 text-sm"><span className="min-w-0 flex-1 truncate font-semibold">{t.title}</span>{t.project && <span className="text-xs text-muted">{t.project}</span>}<Pill value={t.status} /></li>)}</ul></section>}
          </div>
        )}
      </div>
      <aside aria-label="Recent days"><div className="card p-3 xl:sticky xl:top-20"><p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wide text-muted"><CalendarDays size={13} />Last 3 weeks</p>
        {!range ? <div className="skeleton h-40" /> : <ul className="max-h-[28rem] space-y-1 overflow-y-auto">{range.days.map((x) => (
          <li key={x.date}><button onClick={() => setDate(x.date)} aria-current={x.date === date ? 'date' : undefined} className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition ${x.date === date ? 'bg-brand/10 ring-1 ring-brand/40' : 'hover:bg-app'}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${x.logs ? 'bg-leaf' : x.attendance ? 'bg-gold' : 'bg-line'}`} /><span className="flex-1 font-semibold">{fmtDay(x.date)}</span>
            <span className="text-[11px] text-muted">{x.logs ? `${x.logs} update${x.logs > 1 ? 's' : ''}` : x.attendance ? 'no update' : '—'}</span></button></li>))}</ul>}
        <p className="mt-2 px-1 text-[10px] text-muted">Green = update written · Yellow = attended, no update</p>
      </div></aside>
    </div>
  );
}

function TeamSummary({ date, setDate, onPick }: { date: string; setDate: (d: string) => void; onPick: (id: number) => void }) {
  const [d, setD] = useState<TeamLog | null>(null); const [err, setErr] = useState(''); const [q, setQ] = useState(''); const [only, setOnly] = useState<'all' | 'missing'>('all');
  const load = useCallback(() => { setD(null); teamLog(date).then((x) => { setD(x); setErr(''); }).catch((e) => setErr(errMsg(e))); }, [date]);
  useEffect(load, [load]);
  const rows = (d?.rows ?? []).filter((r) => (only === 'all' || r.logs === 0) && (!q.trim() || `${r.name} ${r.employee_code ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <>
      <div className="mb-5"><DateNav date={date} onChange={setDate} /></div>
      {err ? <ErrorBox message={err} onRetry={load} /> : !d ? <Loading rows={3} /> : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile icon={UserCheck} label="Wrote an update" value={`${d.summary.updated}/${d.summary.total}`} color="#34C77B" />
            <Tile icon={UserX} label="No update yet" value={d.summary.missing} color="#EF4444" />
            <Tile icon={Clock} label="Hours logged" value={d.summary.hours} color="#E9B44C" />
            <Tile icon={CheckCircle2} label="Tasks completed" value={d.summary.completed} color="#1FA2E8" />
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-52 flex-1 sm:max-w-sm"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input className="input !pl-10" placeholder="Search name or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></label>
            <div className="inline-flex gap-1 rounded-2xl border border-line bg-surface p-1 text-sm font-semibold">{(['all', 'missing'] as const).map((f) => <button key={f} onClick={() => setOnly(f)} className={`rounded-xl px-3 py-1.5 ${only === f ? 'bg-app text-ink' : 'text-muted'}`}>{f === 'all' ? 'Everyone' : 'Missing update'}</button>)}</div>
          </div>
          {rows.length === 0 ? <Empty title="No one to show" hint={only === 'missing' ? 'Everyone has written an update.' : 'Try a different search.'} /> : (
            <ul className="space-y-2.5">{rows.map((r) => (
              <li key={r.employee_id}><button onClick={() => onPick(r.employee_id)} className="card group flex w-full flex-wrap items-center gap-4 p-4 text-left transition hover:border-brand">
                <Avatar name={r.name} size={40} />
                <div className="min-w-0 flex-1 basis-48"><p className="truncate font-bold">{r.name}</p><p className="truncate text-xs text-muted">{r.department ?? 'No department'}{r.employee_code ? ` · ${r.employee_code}` : ''}</p>
                  {r.latest.length > 0 ? <p className="mt-1 line-clamp-2 text-xs">{r.latest[r.latest.length - 1].summary}</p> : <p className="mt-1 text-xs text-red-500">No update written{r.attendance ? ' (attended)' : ''}</p>}</div>
                <div className="flex items-center gap-4 text-center text-xs"><div><p className="text-lg font-extrabold">{r.logs}</p><p className="text-muted">updates</p></div><div><p className="text-lg font-extrabold">{r.hours}</p><p className="text-muted">hours</p></div><div><p className="text-lg font-extrabold text-leaf-600">{r.completed}</p><p className="text-muted">done</p></div></div>
                <ArrowRight size={16} className="text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
              </button></li>))}</ul>)}
        </>
      )}
    </>
  );
}

export default function DailyPanel({ lead, hasEmployee, people, selfId, onToast, jumpTo }: { lead: boolean; hasEmployee: boolean; people: Person[]; selfId: number | null; onToast: (t: 'success' | 'error', m: string) => void; jumpTo?: number | null }) {
  const [tab, setTab] = useState<'team' | 'person' | 'mine'>(lead ? 'team' : 'mine');
  const [date, setDate] = useState(todayStr());
  const [person, setPerson] = useState<number | null>(jumpTo ?? null);
  useEffect(() => { if (jumpTo) { setPerson(jumpTo); setTab('person'); } }, [jumpTo]);
  const options = useMemo(() => people.filter((p) => p.id !== selfId), [people, selfId]);
  const active = person ?? options[0]?.id ?? null;
  const tabs = [...(lead ? [{ id: 'team' as const, label: 'Team summary' }, { id: 'person' as const, label: 'By person' }] : []), ...(hasEmployee ? [{ id: 'mine' as const, label: 'My updates' }] : [])];
  return (
    <>
      {tabs.length > 1 && <div><Tabs value={tab} onChange={setTab} tabs={tabs} /></div>}
      {tab === 'team' && <TeamSummary date={date} setDate={setDate} onPick={(id) => { setPerson(id); setTab('person'); }} />}
      {tab === 'person' && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <select className="input !w-auto min-w-56" value={active ?? ''} onChange={(e) => setPerson(Number(e.target.value))} aria-label="Employee">{person != null && !options.some((o) => o.id === person) && <option value={person}>Selected employee</option>}{options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <DateNav date={date} onChange={setDate} />
          </div>
          {active == null ? <Empty title="Choose an employee" /> : <DayView key={active} employeeId={active} date={date} setDate={setDate} canWrite={false} onToast={onToast} showName />}
        </>
      )}
      {tab === 'mine' && (<><div className="mb-5"><DateNav date={date} onChange={setDate} /></div><DayView date={date} setDate={setDate} canWrite onToast={onToast} showName={false} /></>)}
    </>
  );
}
