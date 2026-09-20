import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPublishedPresentations, subscribeToPresentations } from '@/services/presentationService';
import type { LoadStatus, ProductPresentation } from '@/types/productPresentation';

const POLL_MS = 30_000;

/**
 * Published presentations for the user panel. Refreshes on: admin changes (live server events),
 * tab focus, and a slow poll (safety net if the live connection drops).
 */
export function usePublishedPresentations() {
  const [items, setItems] = useState<ProductPresentation[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (opts: { force?: boolean; silent?: boolean } = {}) => {
    const id = ++seq.current;
    if (!opts.silent) setStatus('loading');
    try {
      const rows = await fetchPublishedPresentations(opts.force);
      if (id !== seq.current) return;
      setItems(rows); setStatus('ready'); setError(null);
    } catch (e) {
      if (id !== seq.current) return;
      if (opts.silent) return; // keep showing what we have
      setError(e instanceof Error ? e.message : 'Something went wrong.'); setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
    const off = subscribeToPresentations(() => void load({ force: true, silent: true }));
    const refresh = () => { if (document.visibilityState === 'visible') void load({ force: true, silent: true }); };
    document.addEventListener('visibilitychange', refresh);
    const t = window.setInterval(refresh, POLL_MS);
    return () => { off(); document.removeEventListener('visibilitychange', refresh); window.clearInterval(t); seq.current++; };
  }, [load]);

  return { items, status, error, reload: () => load({ force: true }) };
}
