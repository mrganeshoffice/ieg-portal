import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { listNotices, markNoticesRead } from '@/services/workService';
import type { Notice } from '@/types/work';

const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; return new Date(iso).toLocaleDateString(); };

/** Bell with an unread count. Polls every 30 s while the tab is visible. */
export default function NotificationBell() {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  const load = useCallback(async () => { try { const r = await listNotices(); setItems(r.items); setUnread(r.unread); } catch { /* keep what we have */ } }, []);
  useEffect(() => {
    void load();
    const t = setInterval(() => { if (!document.hidden) void load(); }, 30000);
    const v = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', v);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); };
  }, [load]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const openItem = async (n: Notice) => { setOpen(false); if (!n.is_read) { await markNoticesRead(n.id).catch(() => {}); void load(); } if (n.link) nav(n.link); };
  return (
    <div className="relative" ref={ref}>
      <button className="icon-btn relative" onClick={() => setOpen(!open)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-haspopup="menu" aria-expanded={open}>
        <Bell size={19} />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="card absolute right-0 top-12 z-40 w-[22rem] max-w-[calc(100vw-1.5rem)] p-2">
            <div className="flex items-center justify-between px-3 py-2"><p className="text-sm font-bold">Notifications</p>{unread > 0 && <button className="text-xs font-semibold text-brand hover:underline" onClick={() => void markNoticesRead().then(load)}>Mark all read</button>}</div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted">You are all caught up.</p> : items.map((n) => (
                <button key={n.id} role="menuitem" onClick={() => void openItem(n)} className={`flex w-full gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-app ${n.is_read ? '' : 'bg-brand/5'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-brand'}`} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{n.title}</span>{n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}<span className="text-[11px] text-muted">{ago(n.created_at)}</span></span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
