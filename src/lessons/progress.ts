/*
  progress.ts — the one place the site saves anything about a student:
  finished lessons, explanation level, practice results, where they left off.

  • Everything is saved in this browser (localStorage) under keys starting with "ps.".
    No account is needed, and the site works fine if storage is blocked (it just forgets).
  • Each saved value also records WHEN it changed. If the student signs in, the account
    code (account/sync.ts) uses those times to merge this device's progress with the
    copy stored online, so progress from two devices combines instead of overwriting.
  • useStoredState() is like React's useState, but saved, and it updates on its own if the
    value changes elsewhere (for example, when progress arrives from the cloud).
*/
import { useCallback, useSyncExternalStore } from 'react'

const PREFIX = 'ps.'
const META = 'ps.__meta' // { key: last-changed time in ms }
/** Device-only settings that should never be synced to an account. */
const DEVICE_ONLY = new Set(['ps.sound', 'ps.lessonsOpen', META])

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

/* ---------- change listeners ---------- */

const listeners = new Map<string, Set<() => void>>() // per key
const anyListeners = new Set<(key: string) => void>() // any key (used by cloud sync)

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn())
  anyListeners.forEach((fn) => fn(key))
}

/** Run `fn` whenever any synced value changes. Returns a function that stops listening. */
export function onAnyChange(fn: (key: string) => void) {
  anyListeners.add(fn)
  return () => anyListeners.delete(fn)
}

/* ---------- reading and writing ---------- */

export function getItem<T>(key: string, fallback: T): T {
  return parse(readRaw(key), fallback)
}

function readMeta(): Record<string, number> {
  return parse(readRaw(META), {})
}

/** Save a value (and the time it changed). `time` is only passed when merging from the cloud. */
export function setItem(key: string, value: unknown, time = Date.now()) {
  writeRaw(key, JSON.stringify(value))
  if (!DEVICE_ONLY.has(key)) {
    const meta = readMeta()
    meta[key] = time
    writeRaw(META, JSON.stringify(meta))
  }
  notify(key)
}

/** Like useState, but saved to this device (and to the account, if signed in). */
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

/* ---------- for cloud sync (account/sync.ts) ---------- */

export interface Snapshot {
  data: Record<string, unknown>
  /** When each value last changed (ms since 1970). */
  times: Record<string, number>
}

/** Everything that should follow the student between devices. */
export function snapshot(): Snapshot {
  const data: Record<string, unknown> = {}
  const times = readMeta()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(PREFIX) || DEVICE_ONLY.has(key)) continue
      const raw = readRaw(key)
      try {
        data[key] = JSON.parse(raw ?? 'null')
      } catch {
        /* not JSON (an old or device-only value): skip it */
      }
    }
  } catch {
    /* storage unavailable */
  }
  return { data, times }
}

/**
 * Combine progress from the cloud with this device's progress:
 *   • Lists of finished lessons are combined (finished anywhere = finished).
 *   • Practice tallies keep the larger numbers.
 *   • Everything else: whichever copy changed most recently wins.
 * Returns true if anything on this device changed.
 */
export function mergeIn(remote: Snapshot): boolean {
  const local = snapshot()
  let changed = false
  for (const [key, remoteValue] of Object.entries(remote.data)) {
    if (!key.startsWith(PREFIX) || DEVICE_ONLY.has(key)) continue
    const localValue = local.data[key]
    const remoteTime = remote.times[key] ?? 0
    const localTime = local.times[key] ?? 0
    let next: unknown
    if (Array.isArray(remoteValue) && Array.isArray(localValue) && key.toLowerCase().includes('completed')) {
      next = [...new Set([...localValue, ...remoteValue])]
    } else if (key === 'ps.practice.stats' && isRecord(remoteValue) && isRecord(localValue)) {
      next = mergeStats(localValue, remoteValue)
    } else if (localValue === undefined || remoteTime > localTime) {
      next = remoteValue
    } else continue
    if (JSON.stringify(next) !== JSON.stringify(localValue)) {
      setItem(key, next, Math.max(remoteTime, localTime))
      changed = true
    }
  }
  return changed
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Practice stats look like { topic: { answered, firstTry } }; keep the larger tally of each. */
function mergeStats(a: Record<string, unknown>, b: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...a }
  for (const [topic, bv] of Object.entries(b)) {
    const av = a[topic]
    if (!isRecord(av) || !isRecord(bv)) {
      out[topic] = av ?? bv
      continue
    }
    const merged: Record<string, number> = {}
    for (const k of new Set([...Object.keys(av), ...Object.keys(bv)])) merged[k] = Math.max(Number(av[k] ?? 0), Number(bv[k] ?? 0))
    out[topic] = merged
  }
  return out
}
