import { db, dbGet, dbPush, dbRemove, dbIncrement, ref, onValue } from '@/lib/firebase'

// ─── Comments ───────────────────────────────────────────────────────────────

export interface Comment {
  id: string
  name: string
  text: string
  createdAt: number
}

export type ResourceType = 'announcement' | 'event'

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
