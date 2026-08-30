import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase, ref, set, push, get, update, remove, onValue, query, orderByChild, limitToLast, serverTimestamp, runTransaction } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCrU4cC3GdHu3MbB6fht1XhR_kYwAArAUQ',
  authDomain: 'section-matipid.firebaseapp.com',
  projectId: 'section-matipid',
  storageBucket: 'section-matipid.firebasestorage.app',
  messagingSenderId: '744070397549',
  appId: '1:744070397549:web:be6b9aed21b89b8bee0964',
  databaseURL: 'https://section-matipid-default-rtdb.firebaseio.com',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)

export { ref, set, push, get, update, remove, onValue, query, orderByChild, limitToLast, serverTimestamp, runTransaction }

// ─── Helpers ────────────────────────────────────────────────────────────────

export async function dbGet<T>(path: string): Promise<T | null> {
  const snap = await get(ref(db, path))
  return snap.exists() ? (snap.val() as T) : null
}

/** Recursively removes keys whose value is `undefined` (Firebase RTDB rejects them in set()/push()). */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v)
    }
    return out as T
  }
  return value
}

export async function dbSet(path: string, value: unknown) {
  await set(ref(db, path), stripUndefined(value))
}

export async function dbPush(path: string, value: unknown): Promise<string> {
  const r = await push(ref(db, path), stripUndefined(value))
  return r.key!
}

export async function dbUpdate(path: string, value: Record<string, unknown>) {
  await update(ref(db, path), stripUndefined(value))
}

export async function dbRemove(path: string) {
  await remove(ref(db, path))
}

/** Atomically adjusts a numeric counter at `path` by `delta`, creating it at 0 first if needed. Returns the new value. */
export async function dbIncrement(path: string, delta: number): Promise<number> {
  const result = await runTransaction(ref(db, path), (current: number | null) => (current ?? 0) + delta)
  return (result.snapshot.val() as number | null) ?? 0
}

// ─── Activity Logger ────────────────────────────────────────────────────────

export interface ActivityLog {
  id?: string
  timestamp: number
  userUid: string
  userEmail: string
  role: string
  action: string
  targetResource: string
  targetId?: string
  previousValue?: unknown
  newValue?: unknown
  details?: string
}

export async function logActivity(entry: Omit<ActivityLog, 'id' | 'timestamp'>) {
  const log: ActivityLog = {
    ...entry,
    timestamp: Date.now(),
  }
  await dbPush('logs', log)
}

// ─── Version History ────────────────────────────────────────────────────────

export async function saveVersion(
  resource: string,
  resourceId: string,
  data: unknown,
  userUid: string,
  userEmail: string
) {
  await dbPush(`versions/${resource}/${resourceId}`, {
    data,
    savedAt: Date.now(),
    savedBy: userUid,
    savedByEmail: userEmail,
  })
}
