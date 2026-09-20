/** Netlify adapter: same API as the local server, storage in Netlify Blobs, admin accounts from environment variables. */
import { HttpError, createCore } from './core.mjs';

/** rows / images are Netlify Blobs stores (or anything with the same get/set/list/delete methods). */
export function blobsStorage({ rows, images }) {
  const toAB = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  return {
    async list() {
      const keys = [];
      for await (const page of rows.list({ prefix: 'p/', paginate: true })) for (const b of page.blobs) keys.push(b.key);
      return (await Promise.all(keys.map((k) => rows.get(k, { type: 'json' })))).filter(Boolean);
    },
    get: async (id) => (await rows.get(`p/${id}`, { type: 'json' })) ?? null,
    put: (row) => rows.setJSON(`p/${row.id}`, row),
    remove: (id) => rows.delete(`p/${id}`),
    putImage: (name, buf) => images.set(name, toAB(buf)),
    getImage: async (name) => { const ab = await images.get(name, { type: 'arrayBuffer' }); return ab ? Buffer.from(ab) : null; },
    removeImage: (name) => images.delete(name),
  };
}

/** Admins come from the ADMINS_JSON environment variable (set in Netlify > Site configuration > Environment variables). */
function adminsFrom(env) {
  try {
    const a = JSON.parse(env.ADMINS_JSON || '[]');
    return Array.isArray(a) ? a.filter((x) => x && typeof x.email === 'string' && typeof x.salt === 'string' && typeof x.hash === 'string').map((x) => ({ ...x, email: x.email.toLowerCase() })) : [];
  } catch { return []; }
}

export function createNetlifyHandler({ getStorage, env = process.env }) {
  let core = null;
  const build = () => core ??= createCore({
    storage: getStorage(),
    getAdmins: async () => adminsFrom(env),
    getSecret: async () => {
      const s = env.SESSION_SECRET;
      if (!s || s.length < 32) throw new HttpError(500, 'The server is not configured yet: SESSION_SECRET is missing.');
      return s;
    },
  });

  return async (req, context) => {
    const url = new URL(req.url);
    const method = req.method;
    // Functions cannot hold a live connection, so this "event stream" tells the browser to check again every 20 seconds.
    if (method === 'GET' && url.pathname === '/api/events') {
      return new Response('retry: 20000\nevent: changed\ndata: {}\n\n', { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } });
    }
    const headers = Object.fromEntries(req.headers);
    const body = method === 'GET' || method === 'HEAD' ? null : Buffer.from(await req.arrayBuffer());
    const out = await build()({ method, pathname: url.pathname, headers, body, ip: context?.ip || headers['x-nf-client-connection-ip'] || 'unknown', https: url.protocol === 'https:', host: url.host });
    return new Response(method === 'HEAD' ? null : out.body, { status: out.status, headers: out.headers });
  };
}
