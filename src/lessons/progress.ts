/*
  progress.ts — the one place the site saves anything about a student:
  finished lessons, explanation level, practice results, where they left off.

  • Everything is saved in this browser (localStorage) under keys starting with "ps.".
    There are no accounts: progress stays on the student's own device, and the site
    works fine if storage is blocked (it just forgets).
  • useStoredState() is like React's useState, but saved, and every component using the
    same key updates together.
*/
import { useCallback, useSyncExternalStore } from 'react'

/* ---------- raw storage, always wrapped so blocked storage can't crash the site ---------- */

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: fine, we just won't remember */
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/* ---------- change listeners (so every component showing a value stays in step) ---------- */

const listeners = new Map<string, Set<() => void>>()

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn())
}

/* ---------- reading and writing ---------- */

export function getItem<T>(key: string, fallback: T): T {
  return parse(readRaw(key), fallback)
}

export function setItem(key: string, value: unknown) {
  writeRaw(key, JSON.stringify(value))
  notify(key)
}

/** Like useState, but saved on this device. */
export function useStoredState<T>(key: string, fallback: T) {
  // React re-renders when the saved text changes; parsing that text gives the value.
  const raw = useSyncExternalStore(
    (fn) => {
      let set = listeners.get(key)
      if (!set) listeners.set(key, (set = new Set()))
      set.add(fn)
      return () => set!.delete(fn)
    },
    () => readRaw(key),
  )
  const value = parse(raw, fallback)
  const set = useCallback((next: T) => setItem(key, next), [key])
  return [value, set] as const
}
