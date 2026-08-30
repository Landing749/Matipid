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
- React Router (HashRouter for GitHub Pages)
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

Set `VITE_BASE_URL` in the workflow to `/<repo-name>/`.

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
