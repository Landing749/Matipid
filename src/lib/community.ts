import { db, dbGet, dbPush, dbRemove, dbIncrement, ref, onValue } from '@/lib/firebase'

// ─── Comments ───────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  name: string
  text: string
  createdAt: number
}

export type ResourceType = 'announcement' | 'event' | 'photo'

export function commentsPath(resourceType: ResourceType, resourceId: string) {
  return `comments/${resourceType}/${resourceId}`
}

export async function addComment(resourceType: ResourceType, resourceId: string, name: string, text: string) {
  const comment: Omit<Comment, 'id'> = {
    name: name.trim() || 'Anonymous',
    text: text.trim(),
    createdAt: Date.now(),
  }
  return dbPush(commentsPath(resourceType, resourceId), comment)
}

export async function deleteComment(resourceType: ResourceType, resourceId: string, commentId: string) {
  await dbRemove(`${commentsPath(resourceType, resourceId)}/${commentId}`)
}

/** Live-subscribes to a resource's comments, newest last. Returns an unsubscribe fn. */
export function listenComments(
  resourceType: ResourceType,
  resourceId: string,
  cb: (comments: Comment[]) => void
) {
  const r = ref(db, commentsPath(resourceType, resourceId))
  return onValue(r, (snap) => {
    const val = snap.val() as Record<string, Omit<Comment, 'id'>> | null
    const list = val
      ? Object.entries(val)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => a.createdAt - b.createdAt)
      : []
    cb(list)
  })
}

// ─── Comment reports ────────────────────────────────────────────────────────
// Lets any visitor flag a comment for officer review, without granting
// anonymous users write access to the comment itself.

export function commentReportPath(resourceType: ResourceType, resourceId: string, commentId: string) {
  return `commentReports/${resourceType}/${resourceId}/${commentId}`
}

/** Flags a comment once per visitor (tracked in localStorage). Returns the new count, or null if already reported. */
export async function reportComment(resourceType: ResourceType, resourceId: string, commentId: string) {
  const key = `matipid_reported_${resourceType}_${resourceId}_${commentId}`
  if (localStorage.getItem(key) === '1') return null
  const newCount = await dbIncrement(`${commentReportPath(resourceType, resourceId, commentId)}/count`, 1)
  localStorage.setItem(key, '1')
  return newCount
}

export function hasReportedComment(resourceType: ResourceType, resourceId: string, commentId: string) {
  return localStorage.getItem(`matipid_reported_${resourceType}_${resourceId}_${commentId}`) === '1'
}

/** Officer-only: clears a comment's report flag without deleting the comment. */
export async function dismissCommentReport(resourceType: ResourceType, resourceId: string, commentId: string) {
  await dbRemove(commentReportPath(resourceType, resourceId, commentId))
}

/** Live-subscribes to report counts for a resource's comments. Returns an unsubscribe fn. */
export function listenCommentReports(
  resourceType: ResourceType,
  resourceId: string,
  cb: (counts: Record<string, number>) => void
) {
  const r = ref(db, `commentReports/${resourceType}/${resourceId}`)
  return onValue(r, (snap) => {
    const val = snap.val() as Record<string, { count: number }> | null
    const counts: Record<string, number> = {}
    if (val) for (const [id, v] of Object.entries(val)) counts[id] = v.count ?? 0
    cb(counts)
  })
}

// ─── Reactions ──────────────────────────────────────────────────────────────

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢'] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export function reactionsPath(resourceType: ResourceType, resourceId: string) {
  return `reactions/${resourceType}/${resourceId}`
}

export async function getReactionCounts(resourceType: ResourceType, resourceId: string) {
  const data = await dbGet<Record<string, { count: number }>>(reactionsPath(resourceType, resourceId))
  const counts: Record<string, number> = {}
  for (const emoji of REACTION_EMOJIS) counts[emoji] = data?.[emoji]?.count ?? 0
  return counts
}

/** Toggles the current visitor's reaction for one emoji (localStorage-tracked, like RSVP). */
export async function toggleReaction(resourceType: ResourceType, resourceId: string, emoji: string) {
  const key = `matipid_reaction_${resourceType}_${resourceId}_${emoji}`
  const active = localStorage.getItem(key) === '1'
  const delta = active ? -1 : 1
  const newCount = await dbIncrement(`${reactionsPath(resourceType, resourceId)}/${emoji}/count`, delta)
  if (active) localStorage.removeItem(key)
  else localStorage.setItem(key, '1')
  return { active: !active, count: newCount }
}

export function isReactionActive(resourceType: ResourceType, resourceId: string, emoji: string) {
  return localStorage.getItem(`matipid_reaction_${resourceType}_${resourceId}_${emoji}`) === '1'
}

// ─── Suggestion box ─────────────────────────────────────────────────────────

export interface Suggestion {
  id: string
  name?: string
  category: string
  message: string
  createdAt: number
  status: 'new' | 'reviewed' | 'archived'
}

export async function submitSuggestion(category: string, message: string, name?: string) {
  const suggestion: Omit<Suggestion, 'id'> = {
    category,
    message: message.trim(),
    createdAt: Date.now(),
    status: 'new',
    ...(name?.trim() ? { name: name.trim() } : {}),
  }
  return dbPush('suggestions', suggestion)
}

// ─── Photo submissions ──────────────────────────────────────────────────────

export interface PhotoSubmission {
  id: string
  url: string
  publicId: string
  width: number
  height: number
  name?: string
  caption?: string
  eventId?: string
  eventTitle?: string
  createdAt: number
  status: 'pending' | 'approved' | 'rejected'
}

export async function submitPhoto(input: {
  url: string
  publicId: string
  width: number
  height: number
  name?: string
  caption?: string
  eventId?: string
  eventTitle?: string
}) {
  const submission: Omit<PhotoSubmission, 'id'> = {
    url: input.url,
    publicId: input.publicId,
    width: input.width,
    height: input.height,
    createdAt: Date.now(),
    status: 'pending',
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
    ...(input.eventId ? { eventId: input.eventId, eventTitle: input.eventTitle } : {}),
  }
  return dbPush('photoSubmissions', submission)
}
