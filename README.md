# MATIPID Portal

A modern Section Management & Transparency Platform for Grade 8 Section MATIPID.

## Features

- 🌐 **Public Site** — Announcements, Events, Timeline, Gallery, Financial Transparency, Officers, About
- 🔐 **Officer Portal** — Role-based access (Admin, Treasurer, Auditor)
- 💰 **Finance Module** — Income/expense recording with receipt uploads via Cloudinary
- 🛡️ **Audit System** — Immutable audit records, approve/flag/reject transactions
- 📋 **Activity Log** — Append-only log of all officer actions
- 🕐 **Version History** — Full rollback support for all records
- 💾 **Backup System** — JSON snapshots with restore functionality
- 📊 **Analytics** — Charts for income, expenses, events, announcements
- 🔍 **Global Search** — Fuzzy search across all content
- ⌨️ **Command Palette** — Ctrl+K quick navigation
- 🏥 **System Health** — Real-time Firebase + Cloudinary status monitoring
- 💬 **Comments & Reactions** — Public engagement on Announcements and Events
- 🎉 **RSVP** — "I'll be there" headcount + optional name capture for planning
- 💡 **Suggestion Box** — Anonymous feedback form, reviewed in the portal
- 🧾 **PDF/Excel Export** — Finance & Audit reports via a Cloudflare Worker (`/worker`)

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + Framer Motion
- Firebase Auth + Realtime Database
- Cloudinary (image storage)
- React Router (BrowserRouter, with a `public/404.html` fallback for GitHub Pages deep links)
- Recharts, TanStack Query, React Hook Form + Zod, Sonner

## Setup

1. Clone and install
```bash
npm install
```

2. Firebase is pre-configured. Apply the rules in `firebase-rtdb-rules.json`
   (Realtime Database → Rules tab) — it covers every node used by the app,
   including the newer `comments`, `reactions`, `suggestions`, `photoSubmissions`,
   and `rsvps/list`
   nodes (public can create, only officers can moderate/delete).

3. Start dev server
```bash
npm run dev
```

## Deployment

Push to `main` — GitHub Actions automatically builds and deploys to GitHub Pages.

Set `VITE_BASE_URL` in the workflow to `/<repo-name>/`, and `VITE_SITE_URL`
to the full deployed origin + base with **no trailing slash**, e.g.
`https://username.github.io/matipid`. `VITE_SITE_URL` feeds the site-wide
Open Graph tags in `index.html` and the per-page ones described below —
without it, shared links preview with broken relative image/URL tags.

Routing uses real URLs (`BrowserRouter`), not `/#/hash` paths, so shared
links can get per-page previews. GitHub Pages can't rewrite deep links
server-side, so `public/404.html` catches them and redirects to
`index.html`, which restores the real URL before React Router mounts —
see the comments in `public/404.html` and `index.html`. If `VITE_BASE_URL`
ever grows past one path segment (e.g. deploying under a subpath deeper
than `/<repo-name>/`), bump `pathSegmentsToKeep` in `public/404.html` to
match.

### Link previews for announcements & events

`scripts/prerender-og.mjs` runs automatically after every build (`npm run
build` → `postbuild`). It fetches public announcements/events straight
from the RTDB REST endpoint and writes a static
`dist/announcements/<id>/index.html` / `dist/events/<id>/index.html` for
each — a copy of the real `index.html` with that item's title,
description, and cover image swapped into the `<meta>` tags (falling back
to the site logo when an item has no cover image). GitHub Pages serves
these directly, so crawlers that don't run JavaScript (Facebook, Discord,
Twitter/X, iMessage, Slack) still see the correct preview, while real
visitors get the same JS bundle and the SPA takes over normally.

Deploys — and so these previews — happen automatically and immediately
whenever an officer creates, edits, or deletes an announcement or event,
not just on a code push. Saving/deleting in `AnnouncementsManager` or
`EventsManager` calls `triggerDeploy()` (`src/lib/worker.ts`), which hits
the Worker's `POST /trigger-deploy`, which fires a `repository_dispatch`
that re-runs this workflow. See `worker/README.md`'s "Deploy triggering"
section for the one-time setup (a scoped GitHub token as a Worker secret).
This is event-driven, not polled — nothing runs unless content actually
changed, and there's no periodic schedule to configure.

### Export Worker (PDF/Excel)

Finance and Audit exports run on a small Cloudflare Worker in `/worker` — it
reads straight from the public Firebase RTDB REST endpoint (no service
account needed). To enable exports:

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

Copy the printed `*.workers.dev` URL into `WORKER_URL` in
`src/lib/worker.ts`, then update `ALLOWED_ORIGINS` in `worker/wrangler.toml`
with your real site origin and redeploy. Full details in `worker/README.md`.

## First-Time Setup

1. Create the first admin account in Firebase Auth Console
2. In RTDB, manually create `/users/<uid>` with `{ "role": "admin", "email": "...", "isActive": true }`
3. Log in via `/login` and you're in

## Project Structure

```
src/
  components/
    layout/         PublicLayout, PortalLayout, Sidebar, PortalHeader
    ui/             StatCard, Modal, EmptyState, StatusBadge, Skeleton...
    CommandPalette  Ctrl+K navigation
  contexts/         AuthContext, ThemeContext
  lib/              firebase.ts, cloudinary.ts, utils.ts
  pages/
    public/         Home, Announcements, Events, Gallery, Timeline, etc.
    portal/         Dashboard, Finance, Audit, ActivityLog, Backup, etc.
  router/           AppRouter, ProtectedRoute
```
