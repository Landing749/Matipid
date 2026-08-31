// Runs automatically after `npm run build` (see package.json "postbuild").
//
// GitHub Pages only serves static files — it can't run server code to
// generate per-page <meta> tags, and link-preview crawlers (Facebook,
// Discord, Twitter/X, Slack, iMessage, etc.) don't execute JavaScript, so
// the SPA's client-side <title>/meta updates are invisible to them. Every
// shared link would preview as the same generic "MATIPID Portal" card.
//
// The fix: at build time, fetch every public announcement and event from
// the Realtime Database's public REST endpoint, and write a static
// dist/announcements/<id>/index.html (and dist/events/<id>/index.html) —
// a copy of the real index.html with that item's title/description/image
// swapped into the <meta> tags. GitHub Pages serves these directly for a
// request to /announcements/<id>/ (see trailing-slash note in
// public/404.html's neighbor comment in index.html), so crawlers see
// correct per-item previews. Real visitors get the identical JS bundle in
// these files too, so React mounts and takes over exactly as it would from
// the plain index.html — this only changes what's in <head> before that
// happens.
//
// Content changes in the database won't appear in previews until the next
// deploy (push to main) — there's no way around that without a server, but
// for a section portal that's an acceptable trade-off.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'

const RTDB_URL = 'https://section-matipid-default-rtdb.firebaseio.com'
const SITE_URL = (process.env.VITE_SITE_URL || '').replace(/\/$/, '')
const DIST_DIR = path.resolve('dist')
const DEFAULT_IMAGE = `${SITE_URL}/logo-512.png`

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Collapses whitespace and cuts at a word boundary near maxLen. */
function truncate(text, maxLen = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLen) return clean
  const cut = clean.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLen)}…`
}

function replaceMeta(html, attr, value, name) {
  const re = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`)
  if (!re.test(html)) {
    console.warn(`  ⚠ couldn't find <meta ${attr}="${name}"> in template — skipping that tag`)
    return html
  }
  return html.replace(re, `$1${escapeHtml(value)}$2`)
}

function buildPage(template, { title, description, url, image, type = 'article' }) {
  let html = template
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
  html = replaceMeta(html, 'name', description, 'description')
  html = replaceMeta(html, 'property', type, 'og:type')
  html = replaceMeta(html, 'property', title, 'og:title')
  html = replaceMeta(html, 'property', description, 'og:description')
  html = replaceMeta(html, 'property', url, 'og:url')
  html = replaceMeta(html, 'property', image, 'og:image')
  html = replaceMeta(html, 'name', title, 'twitter:title')
  html = replaceMeta(html, 'name', description, 'twitter:description')
  html = replaceMeta(html, 'name', image, 'twitter:image')
  return html
}

async function fetchCollection(name) {
  try {
    const res = await fetch(`${RTDB_URL}/${name}.json`)
    if (!res.ok) {
      console.warn(`⚠ ${name}: RTDB responded ${res.status} — skipping ${name} previews`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn(`⚠ ${name}: fetch failed (${err.message}) — skipping ${name} previews`)
    return null
  }
}

function isPubliclyVisible(announcement) {
  if (announcement.status === 'draft') return false
  if (announcement.publishAt && announcement.publishAt > Date.now()) return false
  return true
}

async function writePage(routeDir, id, template, meta) {
  const outDir = path.join(DIST_DIR, routeDir, String(id))
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'index.html'), buildPage(template, meta), 'utf8')
}

async function main() {
  if (!SITE_URL) {
    console.warn(
      '⚠ VITE_SITE_URL is not set — og:url/og:image will be written as ' +
        'relative paths, which most crawlers reject. Set VITE_SITE_URL in ' +
        'the deploy workflow to the full origin + base, e.g. ' +
        'https://username.github.io/matipid (no trailing slash).'
    )
  }

  try {
    await access(path.join(DIST_DIR, 'index.html'))
  } catch {
    console.warn('⚠ dist/index.html not found — run `vite build` first. Skipping OG prerender.')
    return
  }

  const template = await readFile(path.join(DIST_DIR, 'index.html'), 'utf8')

  const [announcements, events] = await Promise.all([
    fetchCollection('announcements'),
    fetchCollection('events'),
  ])

  let count = 0

  if (announcements) {
    for (const [id, a] of Object.entries(announcements)) {
      if (!isPubliclyVisible(a)) continue
      await writePage('announcements', id, template, {
        title: a.title || 'Announcement',
        description: truncate(a.content),
        url: `${SITE_URL}/announcements/${id}`,
        image: a.coverImage || DEFAULT_IMAGE,
      })
      count++
    }
  }

  if (events) {
    for (const [id, e] of Object.entries(events)) {
      await writePage('events', id, template, {
        title: e.title || 'Event',
        description: truncate(e.description),
        url: `${SITE_URL}/events/${id}`,
        image: e.coverImage || DEFAULT_IMAGE,
      })
      count++
    }
  }

  console.log(`✓ prerendered OG previews for ${count} announcement/event page(s)`)
}

main()
