import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Empty, ErrorBox, Loading, Tabs, monthLabel, monthOf, shiftMonth } from '@/components/work/ui';
import { errMsg } from '@/services/emsService';
import { attendanceReport, leaveReport, reportCsvUrl, taskReport } from '@/services/workService';
import { useAuth } from '@/context/AuthContext';

type Rows = Record<string, string | number | null>[];
function Table({ cols, rows }: { cols: { k: string; l: string }[]; rows: Rows }) {
  if (!rows.length) return <Empty title="Nothing to report for this period" />;
  return (
    <div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="border-b border-line bg-app text-xs uppercase tracking-wide text-muted"><tr>{cols.map((c) => <th key={c.k} className="whitespace-nowrap px-4 py-3">{c.l}</th>)}</tr></thead>
      <tbody className="divide-y divide-line">{rows.map((r, i) => <tr key={i}>{cols.map((c, j) => <td key={c.k} className={`px-4 py-2.5 ${j === 0 ? 'font-semibold' : ''} ${typeof r[c.k] === 'number' && c.k === 'absent' && Number(r[c.k]) > 0 ? 'font-bold text-red-500' : ''}`}>{r[c.k] ?? '—'}</td>)}</tr>)}</tbody>
    </table></div></div>
  );
}

export default function ReportsPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<'attendance' | 'leave' | 'tasks'>('attendance');
  const [month, setMonth] = useState(monthOf());
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<Rows | null>(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true; setRows(null); setErr('');
    const run = tab === 'attendance' ? attendanceReport(month).then((r) => r.rows as unknown as Rows) : tab === 'leave' ? leaveReport(year).then((r) => r.rows as unknown as Rows) : taskReport().then((r) => r.rows as unknown as Rows);
    run.then((r) => live && setRows(r)).catch((e) => live && setErr(errMsg(e)));
    return () => { live = false; };
  }, [tab, month, year, tick]);
  const csv = tab === 'attendance' ? reportCsvUrl('attendance', { month }) : tab === 'leave' ? reportCsvUrl('leave', { year }) : reportCsvUrl('tasks');
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Reports" description={session?.role === 'manager' ? 'Reports for you and the people who report to you.' : 'Reports for everyone.'} actions={<a className="btn-ghost" href={csv}><Download size={16} />Export CSV</a>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'attendance', label: 'Attendance' }, { id: 'leave', label: 'Leave' }, { id: 'tasks', label: 'Tasks' }]} />
      {tab === 'attendance' && <div className="mb-4 flex items-center gap-2"><button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button><p className="min-w-40 text-center font-bold">{monthLabel(month)}</p><button className="icon-btn" aria-label="Next month" disabled={month >= monthOf()} onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button></div>}
      {tab === 'leave' && <div className="mb-4 flex items-center gap-2"><button className="icon-btn" aria-label="Previous year" onClick={() => setYear(year - 1)}><ChevronLeft size={18} /></button><p className="min-w-24 text-center font-bold">{year}</p><button className="icon-btn" aria-label="Next year" disabled={year >= new Date().getFullYear()} onClick={() => setYear(year + 1)}><ChevronRight size={18} /></button></div>}
      {err ? <ErrorBox message={err} onRetry={() => setTick((t) => t + 1)} /> : !rows ? <Loading /> : tab === 'attendance' ? (
        <Table rows={rows} cols={[{ k: 'name', l: 'Employee' }, { k: 'department', l: 'Department' }, { k: 'present', l: 'Present' }, { k: 'late', l: 'Late' }, { k: 'half_day', l: 'Half day' }, { k: 'short', l: 'Short' }, { k: 'missed_checkout', l: 'No check-out' }, { k: 'leave', l: 'Leave' }, { k: 'absent', l: 'Absent' }, { k: 'hours', l: 'Hours' }]} />
      ) : tab === 'leave' ? <Table rows={rows} cols={[{ k: 'name', l: 'Employee' }, { k: 'leave_type', l: 'Leave type' }, { k: 'days', l: 'Days taken' }]} /> : (
        <Table rows={rows} cols={[{ k: 'name', l: 'Employee' }, { k: 'todo', l: 'To do' }, { k: 'in_progress', l: 'In progress' }, { k: 'blocked', l: 'Blocked' }, { k: 'done', l: 'Done' }, { k: 'overdue', l: 'Overdue' }]} />
      )}
      {tab === 'attendance' && <p className="mt-3 text-xs text-muted">Absent counts working days with no check-in, no approved leave, and that are not weekly offs or holidays.</p>}
    </div>
  );
}
