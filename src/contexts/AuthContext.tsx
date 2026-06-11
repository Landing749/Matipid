import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth, dbGet, dbSet, logActivity } from '@/lib/firebase'
import type { UserRole } from '@/lib/utils'

interface UserProfile {
  uid: string
  email: string
  role: UserRole
  displayName?: string
  createdAt?: number
  lastLogin?: number
  isActive?: boolean
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAdmin: boolean
  isTreasurer: boolean
  isAuditor: boolean
  isOfficer: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const p = await dbGet<UserProfile>(`users/${u.uid}`)
          if (p) {
            setProfile({ ...p, uid: u.uid, email: u.email! })
            // Update last login
            await dbSet(`users/${u.uid}/lastLogin`, Date.now())
          } else {
            // First-time user — assign public role if not configured
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email!,
              role: 'public',
              createdAt: Date.now(),
              lastLogin: Date.now(),
              isActive: true,
            }
            await dbSet(`users/${u.uid}`, newProfile)
            setProfile(newProfile)
          }
        } catch (err) {
          console.error('Failed to load profile:', err)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const p = await dbGet<UserProfile>(`users/${cred.user.uid}`)
    if (p && !p.isActive) throw new Error('Account is disabled. Contact the administrator.')
    await logActivity({
      userUid: cred.user.uid,
      userEmail: cred.user.email!,
      role: p?.role || 'public',
      action: 'LOGIN',
      targetResource: 'auth',
    })
  }

  async function signOut() {
    if (user && profile) {
      await logActivity({
        userUid: user.uid,
        userEmail: user.email!,
        role: profile.role,
        action: 'LOGOUT',
        targetResource: 'auth',
      })
    }
    await firebaseSignOut(auth)
  }

  const role = profile?.role ?? null
  const isAdmin = role === 'admin'
  const isTreasurer = role === 'treasurer'
  const isAuditor = role === 'auditor'
  const isOfficer = isAdmin || isTreasurer || isAuditor

  return (
    <AuthContext.Provider
      value={{ user, profile, role, loading, signIn, signOut, isAdmin, isTreasurer, isAuditor, isOfficer }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
