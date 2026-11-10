/*
  account.ts — sign-in state and progress syncing.

  • useAccount() gives any component the current user (or null) and the sync status.
  • When a student signs in, we download their saved progress, MERGE it with this
    device's progress (nothing is lost; see lessons/progress.ts), and upload the result.
  • While signed in, every change is uploaded a couple of seconds later (batched, so
    clicking through a lesson doesn't send a request per click).
  • Signing out keeps this device's progress; it just stops syncing.

  Database: one row per student in the "progress" table: { user_id, data, updated_at }.
*/
import type { User } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { mergeIn, onAnyChange, snapshot, type Snapshot } from '../lessons/progress'
import { supabase } from './supabase'

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error'

interface AccountState {
  user: User | null
  /** True until we've checked whether the student is already signed in. */
  loading: boolean
  status: SyncStatus
  lastSynced: number | null
  /** True after the student clicked a password-reset link (show the "new password" form). */
  recovering: boolean
}

let state: AccountState = { user: null, loading: supabase !== null, status: 'off', lastSynced: null, recovering: false }
const listeners = new Set<() => void>()
const update = (patch: Partial<AccountState>) => {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

export function useAccount() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
  )
}

/* ---------- syncing ---------- */

let stopWatching: (() => void) | null = null
let uploadTimer = 0

async function upload(userId: string) {
  if (!supabase) return
  update({ status: 'syncing' })
  const { error } = await supabase.from('progress').upsert({ user_id: userId, data: snapshot(), updated_at: new Date().toISOString() })
  update(error ? { status: 'error' } : { status: 'synced', lastSynced: Date.now() })
}

/** Download, merge, upload, then keep uploading changes. */
async function startSync(user: User) {
  if (!supabase) return
  update({ status: 'syncing' })
  const { data, error } = await supabase.from('progress').select('data').eq('user_id', user.id).maybeSingle()
  if (error) {
    update({ status: 'error' })
    return
  }
  if (data?.data) mergeIn(data.data as Snapshot)
  await upload(user.id)
  stopWatching?.()
  stopWatching = onAnyChange(() => {
    window.clearTimeout(uploadTimer)
    uploadTimer = window.setTimeout(() => void upload(user.id), 2000)
  })
}

function stopSync() {
  stopWatching?.()
  stopWatching = null
  window.clearTimeout(uploadTimer)
  update({ status: 'off', lastSynced: null })
}

/** Called once when the app starts. */
export function initAccount() {
  if (!supabase) return
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null
    const wasSignedIn = state.user !== null
    update({ user, loading: false, recovering: event === 'PASSWORD_RECOVERY' ? true : state.recovering })
    if (user && (!wasSignedIn || event === 'SIGNED_IN')) void startSync(user)
    if (!user) stopSync()
  })
}

/* ---------- actions used by the sign-in form ---------- */

/** Where emailed links send the student back to. */
const returnTo = () => `${window.location.origin}/progress`

export async function sendMagicLink(email: string) {
  if (!supabase) return 'Accounts are not set up yet.'
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: returnTo() } })
  return error?.message ?? null
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return 'Accounts are not set up yet.'
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error?.message ?? null
}

/** Returns an error message, or null. If email confirmation is on, the student must click the emailed link first. */
export async function createAccount(email: string, password: string) {
  if (!supabase) return 'Accounts are not set up yet.'
  const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: returnTo() } })
  return error?.message ?? null
}

export async function sendPasswordReset(email: string) {
  if (!supabase) return 'Accounts are not set up yet.'
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: returnTo() })
  return error?.message ?? null
}

export async function setNewPassword(password: string) {
  if (!supabase) return 'Accounts are not set up yet.'
  const { error } = await supabase.auth.updateUser({ password })
  if (!error) update({ recovering: false })
  return error?.message ?? null
}

export async function signOut() {
  await supabase?.auth.signOut()
}

/** Delete the synced copy of progress (this device keeps its own copy). */
export async function deleteSyncedProgress() {
  if (!supabase || !state.user) return 'Not signed in.'
  stopSync()
  const { error } = await supabase.from('progress').delete().eq('user_id', state.user.id)
  return error?.message ?? null
}
