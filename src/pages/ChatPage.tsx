import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ems/Fields';
import { Empty, ErrorBox, Loading } from '@/components/work/ui';
import { errMsg } from '@/services/emsService';
import { chatPeople, chatSend, chatThread } from '@/services/workService';
import type { ChatMsg, ChatPerson } from '@/types/work';

/** Direct messages. The thread refreshes every 4 s while this tab is visible. Message text is always rendered as plain text. */
export default function ChatPage() {
  const [people, setPeople] = useState<ChatPerson[] | null>(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<ChatPerson | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [q, setQ] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  const loadPeople = useCallback(() => { chatPeople().then((p) => { setPeople(p); setErr(''); }).catch((e) => setErr(errMsg(e))); }, []);
  useEffect(() => { loadPeople(); const t = setInterval(() => { if (!document.hidden) loadPeople(); }, 10000); return () => clearInterval(t); }, [loadPeople]);

  useEffect(() => {
    if (!sel) return; let live = true; lastId.current = 0; setMsgs([]); setSendErr('');
    const pull = async (first: boolean) => {
      try { const r = await chatThread(sel.user_id, first ? undefined : lastId.current); if (!live) return; if (first) setMsgs(r); else if (r.length) setMsgs((m) => [...m, ...r.filter((x) => !m.some((y) => y.id === x.id))]); const mx = r.reduce((a, b) => Math.max(a, b.id), lastId.current); lastId.current = mx; } catch { /* retry on next tick */ }
    };
    void pull(true).then(loadPeople);
    const t = setInterval(() => { if (!document.hidden) void pull(false); }, 4000);
    return () => { live = false; clearInterval(t); };
  }, [sel, loadPeople]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, sel]);

  const send = async () => {
    const body = text.trim(); if (!body || !sel) return; setSending(true); setSendErr('');
    try { const m = await chatSend(sel.user_id, body); setText(''); lastId.current = Math.max(lastId.current, m.id); setMsgs((x) => [...x, m]); } catch (e) { setSendErr(errMsg(e)); } finally { setSending(false); }
  };
  const list = (people ?? []).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Chat" description="Message your colleagues one to one." />
      {err ? <ErrorBox message={err} onRetry={loadPeople} /> : !people ? <Loading rows={2} /> : (
        <div className="card grid h-[calc(100dvh-14rem)] min-h-[26rem] overflow-hidden md:grid-cols-[18rem_minmax(0,1fr)]">
          <div className={`flex min-h-0 flex-col border-line md:border-r ${sel ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3"><input className="input" placeholder="Search people" aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {list.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted">No one found.</li> : list.map((p) => (
                <li key={p.user_id}><button onClick={() => setSel(p)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-app ${sel?.user_id === p.user_id ? 'bg-app' : ''}`}>
                  <Avatar name={p.name} url={null} size={36} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="block truncate text-xs text-muted">{p.department ?? 'IEG'}</span></span>
                  {p.unread > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{p.unread}</span>}
                </button></li>
              ))}
            </ul>
          </div>
          <div className={`min-h-0 flex-col ${sel ? 'flex' : 'hidden md:flex'}`}>
            {!sel ? <div className="m-auto p-6"><Empty title="Pick someone to chat with" /></div> : (
              <>
                <div className="flex items-center gap-3 border-b border-line px-4 py-3"><button className="icon-btn md:hidden" onClick={() => setSel(null)} aria-label="Back to people"><ArrowLeft size={18} /></button><Avatar name={sel.name} url={null} size={32} /><p className="font-bold">{sel.name}</p></div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
                  {msgs.length === 0 && <p className="py-8 text-center text-sm text-muted">No messages yet. Say hello.</p>}
                  {msgs.map((m) => <div key={m.id} className={`flex ${m.mine ? 'justify-end' : ''}`}><div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? 'bg-gradient-to-r from-brand to-leaf text-white' : 'bg-app'}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><p className={`mt-0.5 text-[10px] ${m.mine ? 'text-white/80' : 'text-muted'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>)}
                  <div ref={end} />
                </div>
                {sendErr && <p className="px-4 text-xs text-red-500" role="alert">{sendErr}</p>}
                <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
                  <input className="input" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="Type a message" aria-label="Message" />
                  <button className="btn-primary shrink-0" disabled={sending || !text.trim()} aria-label="Send"><Send size={16} /></button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
