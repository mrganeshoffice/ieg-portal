# IEG Organization & Department Flow Portal

React + Vite + TypeScript + Tailwind + React Router + Framer Motion + @xyflow/react.

    npm install
    npm run dev        # development
    npm run build      # production build in dist/

Demo login (client-side, prototype only): ieg@ieg.com / ieg@2026
Auth is isolated in src/services/auth.ts for later replacement by a real API.

Data lives in src/data (trees.ts, departments.ts, factory.ts, common.ts). Navigation is driven by src/config/navigation.ts.
Any unclear item from the source photos carries a `confirm` note; see Settings > Items to confirm.
Serve dist/ with SPA fallback (all routes -> index.html).

## Our Product PPT module (local server, no cloud account)

User page: `/product-ppt` (sidebar + dashboard card). Admin: `/admin/login` -> `/admin/dashboard` (not linked anywhere in the portal).

    npm run admin:create   # once: create the admin email + password (stored hashed in server/data/admin.json)
    npm run dev            # development: site + API together

Production (one port, whole company can reach it):

    npm run build
    npm start              # http://localhost:3000 and your network address; set PORT=8080 to change

Where data lives: `server/data/presentations.json` (records), `server/data/uploads/` (thumbnails), `server/data/admin.json` (admin hashes), `server/data/session.key` (login signing key). Back up the `server/data` folder. Never commit or share it.

Security: passwords are salted scrypt hashes; the admin session is an httpOnly signed cookie; login is rate-limited; uploads are checked by real file bytes (JPG/PNG/WebP, 5 MB); every admin route needs the session. Serve over HTTPS if the portal is reachable outside your office network.

Live updates: the server pushes an event whenever an admin saves, so open user pages refresh without reloading.

Old Supabase version: archived in `_archive_supabase/` (not used).

## Going live on Netlify

The same API runs as a Netlify Function (`netlify/functions/api.mjs`); data is stored in Netlify Blobs (no database to set up). Admin accounts come from two environment variables.

    npm install
    npm run admin:netlify        # prints ADMINS_JSON and SESSION_SECRET: add both in Netlify > Environment variables
    npx netlify-cli login
    npx netlify-cli deploy --build --prod

Add the two variables, then deploy again so they take effect. Notes: images max 4 MB; on Netlify the user page refreshes about every 20 seconds (no instant push); if you add a new top-level page route in `src/App.tsx`, add it to `netlify.toml` too.
