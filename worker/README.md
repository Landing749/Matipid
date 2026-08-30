# matipid-export (Cloudflare Worker)

Generates PDF/Excel exports for the Finance and Audit portal pages, reading
straight from the Firebase RTDB REST API. No Firebase Admin SDK, no service
account, no cloud function — the DB is already public-readable, so the
Worker just does an authenticated `fetch()` against the same REST endpoint
the browser SDK talks to (forwarding the officer's Firebase ID token as the
`auth` query param for the auth-gated `audit_records` node).

## Endpoints

- `GET /export/finance?format=pdf|xlsx&status=all|pending|approved|flagged|rejected&type=all|income|expense&from=<ms>&to=<ms>`
  Public — no token required (matches `transactions`' public read rule).
- `GET /export/audit?format=pdf|xlsx&from=<ms>&to=<ms>`
  Requires `Authorization: Bearer <firebase-id-token>` — matches
  `audit_records`' `auth != null` read rule.

## Setup

```bash
cd worker
npm install
npx wrangler login          # one-time, opens a browser
npx wrangler deploy
```

Wrangler prints your live URL, e.g. `https://matipid-export.<subdomain>.workers.dev`.

1. Copy that URL into `src/lib/worker.ts` in the main app (`WORKER_URL`).
2. Edit `wrangler.toml` → `ALLOWED_ORIGINS` to include your real GitHub
   Pages origin (e.g. `https://<user>.github.io`), then `npx wrangler deploy`
   again.

## Local dev

```bash
npm run dev       # wrangler dev, serves on http://localhost:8787
```

Point `WORKER_URL` at `http://localhost:8787` while developing.

## Notes

- `xlsx` (SheetJS) is pinned to the last npm release (0.18.5). It only has
  known advisories around *parsing* untrusted files — this Worker only
  *writes* sheets it built itself, so that risk doesn't apply here. If you
  want the latest patched build anyway, swap the npm dependency for
  SheetJS's own CDN tarball per their install docs.
- `pdf-lib` and `xlsx` are both pure-JS and run fine on Workers with
  `nodejs_compat` on (already set in `wrangler.toml`).
- No KV/D1/queues used — every request is a stateless read-through.
