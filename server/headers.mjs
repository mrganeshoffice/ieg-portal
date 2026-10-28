/** Browser security headers sent with every response (pages and API). */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const securityHeaders = (https) => ({
  'Content-Security-Policy': CSP,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  ...(https ? { 'Strict-Transport-Security': 'max-age=15552000' } : {}),
});

/** The caller's IP. Behind a reverse proxy the proxy APPENDS the real address, so trust the entry TRUST_PROXY_HOPS from the right
 *  (default 1). Taking the first entry would let anyone spoof it and dodge the login limits. Set TRUST_PROXY_HOPS=0 when not behind a proxy. */
export function clientIp(req, env = process.env) {
  const hops = env.TRUST_PROXY_HOPS === undefined ? 1 : Math.max(0, Number(env.TRUST_PROXY_HOPS) || 0);
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (hops > 0 && xff.length) return xff[Math.max(0, xff.length - hops)];
  return req.socket.remoteAddress || 'unknown';
}
