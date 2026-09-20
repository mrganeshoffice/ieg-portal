export type LinkTarget = { kind: 'external'; href: string } | { kind: 'internal'; to: string } | { kind: 'invalid' };

/**
 * Validates a configured presentation URL.
 * - "/path" (single leading slash) is an in-app route.
 * - Only http(s) absolute URLs are external; javascript:, data:, file: etc. are rejected.
 */
export function resolveLink(raw: string | null | undefined): LinkTarget {
  const v = (raw ?? '').trim();
  if (!v || /\s/.test(v)) return { kind: 'invalid' };
  if (v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\')) return { kind: 'internal', to: v };
  try {
    const u = new URL(v);
    if (u.protocol === 'https:' || u.protocol === 'http:') return { kind: 'external', href: u.toString() };
  } catch { /* fall through */ }
  return { kind: 'invalid' };
}

export const isValidPresentationUrl = (raw: string) => resolveLink(raw).kind !== 'invalid';
