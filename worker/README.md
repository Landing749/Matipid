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
- `POST /trigger-deploy`
  Requires `Authorization: Bearer <firebase-id-token>`. Fires a
  `repository_dispatch` (`content-updated`) at the GitHub repo set in
  `wrangler.toml`, which re-runs the deploy workflow immediately — used so
  a new/edited/deleted announcement or event gets a real OG preview
  without waiting for the next code push. See "Deploy triggering" below.
- `POST /schedule-publish` — body `{ id, publishAt }`
  Requires `Authorization: Bearer <firebase-id-token>`. Sets a one-shot
  alarm on a `PublishScheduler` Durable Object (keyed by `id`) that fires
  the same `repository_dispatch` at exactly `publishAt`, so a scheduled
  announcement gets its real preview the moment it actually goes live —
  see "Scheduled publish previews" below.
- `POST /cancel-schedule` — body `{ id }`
  Requires `Authorization: Bearer <firebase-id-token>`. Clears a pending
  alarm for that id, if any. Safe to call even if nothing was scheduled.

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

## Deploy triggering

`/trigger-deploy` needs a GitHub token to call the Actions API on your
behalf. Create one at **GitHub → Settings → Developer settings → Fine-grained
tokens**, scoped to just this repository, with **Contents: Read** and
**Actions: Read and write** permissions — nothing else. Then set it as a
Worker secret (never put it in `wrangler.toml`, which is committed to the
repo):

```bash
npx wrangler secret put GITHUB_TOKEN
```

`GITHUB_OWNER` / `GITHUB_REPO` in `wrangler.toml` already point at this
repo — update them if you ever fork/rename it, then `npx wrangler deploy`.

The repo's `.github/workflows/deploy.yml` needs a matching
`repository_dispatch: types: [content-updated]` trigger for this to do
anything — it's already there if you're using the workflow this project
ships with.

## Scheduled publish previews

The manager UI calls `/schedule-publish` whenever a save leaves an
announcement `published` with a future `publishAt`, and `/cancel-schedule`
whenever a save or delete removes that future schedule (unpublish, edit
back to draft, edit `publishAt` away, or delete). Each announcement id maps
to its own `PublishScheduler` Durable Object instance holding exactly one
alarm — rescheduling just overwrites it, so there's never more than one
pending alarm per id. This needs no separate setup beyond `wrangler deploy`
picking up the `[[durable_objects.bindings]]` / `[[migrations]]` entries
already in `wrangler.toml`; Durable Objects with the SQLite storage backend
(what's configured here) are available on the Workers **Free** plan, no
upgrade required.

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
