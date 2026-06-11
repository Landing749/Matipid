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

2. Firebase is pre-configured. The Realtime Database rules should allow:
```json
{
  "rules": {
    "settings": { ".read": true, ".write": "auth != null" },
    "announcements": { ".read": true, ".write": "auth != null" },
    "events": { ".read": true, ".write": "auth != null" },
    "gallery": { ".read": true, ".write": "auth != null" },
    "officers": { ".read": true, ".write": "auth != null" },
    "transactions": { ".read": true, ".write": "auth != null" },
    "audit_records": { ".read": "auth != null", ".write": "auth != null" },
    "logs": { ".read": "auth != null", ".write": "auth != null" },
    "users": { ".read": "auth != null", ".write": "auth != null" },
    "backups": { ".read": "auth != null", ".write": "auth != null" },
    "versions": { ".read": "auth != null", ".write": "auth != null" },
    "_heartbeat": { ".read": "auth != null", ".write": "auth != null" }
  }
}
```

3. Start dev server
```bash
npm run dev
```

## Deployment

Push to `main` — GitHub Actions automatically builds and deploys to GitHub Pages.

Set `VITE_BASE_URL` in the workflow to `/<repo-name>/`.

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
