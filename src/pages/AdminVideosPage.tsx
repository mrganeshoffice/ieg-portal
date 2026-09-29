import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, ArrowDown, ArrowUp, Clapperboard, CheckCircle2, Clock, EyeOff, ExternalLink, Eye, Globe, LayoutGrid, List, Loader2, LogOut, Pencil, Plus, RefreshCw, Search, Trash2, Layers,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Modal from '@/components/ui/Modal';
import { ToastStack, useToasts } from '@/components/ui/Toast';
import AdminTabs from '@/components/admin/AdminTabs';
import VideoForm from '@/components/videos/VideoForm';
import VideoPreview from '@/components/videos/VideoPreview';
import DeleteVideoModal from '@/components/videos/DeleteVideoModal';
import VideoThumbnail from '@/components/videos/VideoThumbnail';
import { formatDate } from '@/components/videos/VideoCard';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { resolveVideo } from '@/lib/videoUrl';
import { deleteVideo, fetchAllVideos, subscribeToVideos, updateVideoDisplayOrder, updateVideo } from '@/services/videoService';
import type { Video } from '@/types/video';
import type { LoadStatus } from '@/types/productPresentation';

type Sort = 'order' | 'updated' | 'oldest' | 'title';
const WEEK = 7 * 24 * 60 * 60 * 1000;

function Stat({ icon: Icon, label, value, sub, tone }: { icon: typeof Layers; label: string; value: string | number; sub?: string; tone: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${tone}22`, color: tone }}><Icon size={22} /></span>
      <div className="min-w-0"><p className="text-2xl font-extrabold leading-none">{value}</p><p className="mt-1 text-xs font-semibold text-muted">{label}</p>{sub && <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>}</div>
    </div>
  );
}

const iconBtn = 'icon-btn !h-9 !w-9 border border-line disabled:opacity-30';

function OpenLink({ v }: { v: Video }) {
  const t = resolveVideo(v.video_url);
  if (t.kind === 'invalid') return <button type="button" className={iconBtn} disabled aria-label="Link is invalid"><ExternalLink size={16} /></button>;
  const href = t.kind === 'youtube' || t.kind === 'vimeo' ? v.video_url : t.kind === 'file' ? t.src : t.kind === 'internal' ? t.to : t.href;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={iconBtn} aria-label={`Open ${v.title} in a new tab`} title="Open video"><ExternalLink size={16} /></a>;
}

export default function AdminVideosPage() {
  const { admin, logout } = useAdminAuth();
  const toast = useToasts();
  const [rows, setRows] = useState<Video[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState<Sort>('order');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [toDelete, setToDelete] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewing, setPreviewing] = useState<Video | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    try { setRows(await fetchAllVideos()); setStatus('ready'); setError(null); }
    catch (e) { if (!silent) { setError(e instanceof Error ? e.message : 'Something went wrong.'); setStatus('error'); } }
  }, []);
  useEffect(() => { void load(); return subscribeToVideos(() => void load(true)); }, [load]);

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)), [rows]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.is_published).length;
    const recent = rows.filter((r) => Date.now() - +new Date(r.updated_at) < WEEK).length;
    const latest = [...rows].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))[0];
    return { total: rows.length, active, hidden: rows.length - active, recent, latest };
  }, [rows]);

  const canReorder = sort === 'order' && !q.trim() && categoryFilter === 'all';
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = t ? rows.filter((r) => r.title.toLowerCase().includes(t)) : [...rows];
    if (categoryFilter !== 'all') list = list.filter((r) => (r.category || 'Uncategorized') === categoryFilter);
    if (sort === 'updated') list.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
    if (sort === 'oldest') list.sort((a, b) => +new Date(a.updated_at) - +new Date(b.updated_at));
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [rows, q, categoryFilter, sort]);

  const nextOrder = rows.length ? Math.max(...rows.map((r) => r.display_order)) + 1 : 0;

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: Video) => { setEditing(r); setFormOpen(true); };

  const togglePublish = async (r: Video) => {
    if (busyId) return;
    setBusyId(r.id);
    setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, is_published: !r.is_published } : x)));
    try { await updateVideo(r.id, { is_published: !r.is_published }); toast.success(r.is_published ? `“${r.title}” is now hidden from users.` : `“${r.title}” is now published.`); }
    catch (e) { setRows((cur) => cur.map((x) => (x.id === r.id ? r : x))); toast.error(e instanceof Error ? e.message : 'Could not change the status.'); }
    finally { setBusyId(null); }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (busyId || !canReorder) return;
    const j = index + dir;
    if (j < 0 || j >= visible.length) return;
    const next = [...visible];
    [next[index], next[j]] = [next[j], next[index]];
    const changed = next.map((r, i) => ({ id: r.id, display_order: i, prev: r.display_order })).filter((o) => o.display_order !== o.prev);
    const before = rows;
    setRows(next.map((r, i) => ({ ...r, display_order: i })));
    setBusyId('reorder');
    try { await updateVideoDisplayOrder(changed.map(({ id, display_order }) => ({ id, display_order }))); }
    catch (e) { setRows(before); toast.error(e instanceof Error ? e.message : 'Could not change the order.'); }
    finally { setBusyId(null); }
  };

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try { await deleteVideo(toDelete); toast.success('Video deleted.'); setToDelete(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not delete the video.'); }
    finally { setDeleting(false); }
  };

  const actions = (r: Video, i: number) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {canReorder && <>
        <button type="button" className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0 || !!busyId} aria-label={`Move ${r.title} earlier`} title="Move earlier"><ArrowUp size={16} /></button>
        <button type="button" className={iconBtn} onClick={() => move(i, 1)} disabled={i === visible.length - 1 || !!busyId} aria-label={`Move ${r.title} later`} title="Move later"><ArrowDown size={16} /></button>
      </>}
      <button type="button" className={iconBtn} onClick={() => setPreviewing(r)} aria-label={`Preview ${r.title}`} title="Preview card"><Eye size={16} /></button>
      <OpenLink v={r} />
      <button type="button" className={iconBtn} onClick={() => openEdit(r)} aria-label={`Edit ${r.title}`} title="Edit"><Pencil size={16} /></button>
      <button type="button" className={iconBtn} onClick={() => togglePublish(r)} disabled={!!busyId} aria-label={r.is_published ? `Hide ${r.title}` : `Publish ${r.title}`} title={r.is_published ? 'Hide from users' : 'Publish'}>
        {busyId === r.id ? <Loader2 size={16} className="animate-spin" /> : r.is_published ? <EyeOff size={16} /> : <Globe size={16} />}
      </button>
      <button type="button" className={`${iconBtn} !text-red-500 hover:!bg-red-500/10`} onClick={() => setToDelete(r)} aria-label={`Delete ${r.title}`} title="Delete"><Trash2 size={16} /></button>
    </div>
  );

  const pill = (r: Video) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${r.is_published ? 'bg-leaf/15 text-leaf-600' : 'bg-slate-500/15 text-muted'}`}>
      {r.is_published ? <CheckCircle2 size={12} /> : <EyeOff size={12} />}{r.is_published ? 'Published' : 'Hidden'}
    </span>
  );

  return (
    <div className="min-h-full bg-app">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900 text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-8">
          <Logo size={38} />
          <div className="min-w-0 flex-1 leading-tight"><p className="truncate text-sm font-extrabold">Admin Portal</p><p className="truncate text-[11px] text-slate-400">Videos</p></div>
          <AdminTabs active="videos" />
          <span className="hidden max-w-[16rem] truncate text-xs text-slate-300 sm:block">{admin?.email}</span>
          <button type="button" onClick={() => void logout()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Manage Videos</h1><p className="mt-1 text-sm text-muted">Changes go live in the user panel as soon as you save.</p></div>
          <button type="button" className="btn-primary !px-5 !py-3" onClick={openAdd}><Plus size={18} />Add New Video</button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Layers} label="Total Videos" value={stats.total} tone="#1FA2E8" />
          <Stat icon={CheckCircle2} label="Active Videos" value={stats.active} tone="#34C77B" />
          <Stat icon={EyeOff} label="Hidden Videos" value={stats.hidden} tone="#94A3B8" />
          <Stat icon={Clock} label="Recently Updated" value={stats.recent} sub={stats.latest ? `Last: ${stats.latest.title}` : 'Updated in the last 7 days'} tone="#F59E0B" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[13rem] flex-1 sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-10" placeholder="Search videos" aria-label="Search videos" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {categories.length > 0 && (
            <select className="input !w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort videos">
            <option value="order">Display order</option><option value="updated">Recently updated</option><option value="oldest">Least recently updated</option><option value="title">Title A to Z</option>
          </select>
          <div className="ml-auto flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Layout">
            <button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'} aria-label="List view" className={`flex h-8 w-9 items-center justify-center rounded-lg ${view === 'list' ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}><List size={16} /></button>
            <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'} aria-label="Grid view" className={`flex h-8 w-9 items-center justify-center rounded-lg ${view === 'grid' ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}><LayoutGrid size={16} /></button>
          </div>
        </div>
        {!canReorder && status === 'ready' && rows.length > 1 && <p className="-mt-3 text-xs text-muted">Reordering is available when sorted by display order with no search or category filter applied.</p>}

        {status === 'loading' && <div className="space-y-3" aria-busy="true">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}</div>}

        {status === 'error' && (
          <div role="alert" className="card flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"><AlertTriangle size={26} /></span>
            <h2 className="mt-4 text-lg font-bold">Could not load videos</h2><p className="mt-1 max-w-md text-sm text-muted">{error}</p>
            <button type="button" className="btn-primary mt-5" onClick={() => void load()}><RefreshCw size={16} />Try again</button>
          </div>
        )}

        {status === 'ready' && rows.length === 0 && (
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand/20 to-leaf/20 text-brand"><Clapperboard size={30} /></span>
            <h2 className="mt-5 text-lg font-bold">No videos yet</h2><p className="mt-1 text-sm text-muted">Add your first video to show it in the user panel.</p>
            <button type="button" className="btn-primary mt-5" onClick={openAdd}><Plus size={17} />Add New Video</button>
          </div>
        )}
        {status === 'ready' && rows.length > 0 && visible.length === 0 && <div className="card px-6 py-12 text-center text-sm text-muted">No videos match the current filters.</div>}

        {status === 'ready' && visible.length > 0 && (
          <motion.ul layout className={view === 'grid' ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((r, i) => (
                <motion.li key={r.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.22 }}
                  className={`card overflow-hidden ${view === 'grid' ? 'flex flex-col' : 'flex flex-col sm:flex-row'} ${r.is_published ? '' : 'opacity-80'}`}>
                  <div className={`group relative shrink-0 overflow-hidden bg-navy-900 ${view === 'grid' ? 'aspect-[16/10] w-full' : 'aspect-[16/10] w-full sm:aspect-auto sm:w-56'}`}>
                    <VideoThumbnail thumbnailUrl={r.thumbnail_url} videoUrl={r.video_url} title={r.title} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">{pill(r)}{r.category && <span className="rounded-full bg-app px-2 py-0.5 text-xs font-semibold text-muted">{r.category}</span>}<span className="text-xs text-muted">Order {r.display_order}</span></div>
                      <h3 className="mt-1.5 truncate text-base font-extrabold">{r.title}</h3>
                      <p className="mt-1 truncate text-xs text-muted">Updated {formatDate(r.updated_at)} · {r.video_url}</p>
                    </div>
                    {actions(r, i)}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </main>

      <VideoForm open={formOpen} video={editing} nextOrder={nextOrder} existingCategories={categories} onClose={() => setFormOpen(false)}
        onSaved={(m) => { setFormOpen(false); toast.success(m); }} onError={(m) => toast.error(m)} />
      <DeleteVideoModal video={toDelete} busy={deleting} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />
      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title="Card preview" description="This is how users see the card." size="sm">
        {previewing && <div className="p-5 sm:p-7"><VideoPreview title={previewing.title} videoUrl={previewing.video_url} thumbnailUrl={previewing.thumbnail_url} category={previewing.category ?? ''} updatedAt={previewing.updated_at} /></div>}
      </Modal>
      <ToastStack toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
