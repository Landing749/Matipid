import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(timestamp: number | string): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp)
  return format(d, 'MMM dd, yyyy')
}

export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), 'MMM dd, yyyy HH:mm')
}

export function timeAgo(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
}

export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

/** Converts a normal YouTube or Spotify link into its embeddable iframe `src`.
 *  Returns null if the URL doesn't match a known pattern, so callers can hide the embed
 *  instead of rendering a broken iframe. */
export function toEmbedUrl(url: string): { src: string; provider: 'youtube' | 'spotify' } | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v')
      const playlist = u.searchParams.get('list')
      if (id) return { src: `https://www.youtube.com/embed/${id}`, provider: 'youtube' }
      if (playlist) return { src: `https://www.youtube.com/embed/videoseries?list=${playlist}`, provider: 'youtube' }
      return null
    }
    if (u.hostname.includes('spotify.com')) {
      // e.g. /playlist/xyz or /track/xyz -> /embed/playlist/xyz
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) return { src: `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`, provider: 'spotify' }
      return null
    }
    return null
  } catch {
    return null
  }
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (groups, item) => {
      const k = String(item[key])
      if (!groups[k]) groups[k] = []
      groups[k].push(item)
      return groups
    },
    {} as Record<string, T[]>
  )
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const ROLES = {
  ADMIN: 'admin',
  TREASURER: 'treasurer',
  AUDITOR: 'auditor',
  PUBLIC: 'public',
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  treasurer: 'Treasurer',
  auditor: 'Auditor',
  public: 'Public',
}

export const TRANSACTION_STATUSES = ['pending', 'approved', 'flagged', 'rejected', 'archived'] as const
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number]

export const EXPENSE_CATEGORIES = [
  'Supplies', 'Food & Beverage', 'Transportation', 'Venue', 'Decorations',
  'Prizes', 'Printing', 'Communications', 'Miscellaneous',
] as const

export const INCOME_CATEGORIES = [
  'Contributions', 'Fundraising', 'Grants', 'Event Proceeds', 'Donations', 'Miscellaneous',
] as const
