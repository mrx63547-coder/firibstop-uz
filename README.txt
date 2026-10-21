FiribStop UZ Secure — setup
==========================

Included
- index.html: app, local URL heuristic analysis, optional reputation API UI, optional Supabase sync UI
- server.js: static server + server-side Google Web Risk lookup proxy
- .env.example: server-only API key template
- supabase-schema.sql: per-user access control for cloud history
- manifest.webmanifest, sw.js, icon.svg: PWA files

Quick start (Node.js 18+)
1. Unzip this package into a folder.
2. Copy .env.example to .env and enter GOOGLE_WEBRISK_API_KEY if you enabled Google Web Risk in Google Cloud. The server reads .env locally; never put this key in index.html.
3. Start: node server.js (PORT defaults to 8787). Browse http://localhost:8787.
4. If the Web Risk key is absent, the external lookup explains it is not configured and local heuristics still work.

Optional cloud sync (Supabase)
1. Create a Supabase project and enable email/password authentication.
2. Run supabase-schema.sql in the SQL Editor.
3. In the app, open «Облако», enter Project URL and the public anon/publishable key, then save. Public client keys are intended for the browser only when RLS is correctly enabled; NEVER use service_role/secret keys in the browser.
4. Create an account, sign in, tick the consent checkbox and press «Синхронизировать». The user explicitly agrees that full history text is uploaded.
5. To share the session across devices, sign in with the same account on the other device and sync there.

Security / limitations
- Google Web Risk is optional and requires account/API setup, quotas and applicable terms. The proxy sends only the user-submitted URL to that service.
- Local scores are heuristic, not a verdict that a site is safe. A URL not found in a threat feed is not guaranteed safe.
- Supabase CDN loading requires internet. Cloud sync is not configured until the user enters their own project settings and applies the SQL schema.
- For real deployment, use HTTPS, server rate limiting, API key restrictions and a privacy notice. This sample server is a starting point and has no production-grade rate limiting.
- History is local by default. Remote upload occurs only after explicit checkbox consent and a click.
- Service workers/PWA and camera generally require HTTPS or localhost. Opening index.html directly as file:// does not enable them.
