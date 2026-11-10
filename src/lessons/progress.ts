/*
  progress.ts — remembers the student's depth level and finished lessons.

  Saved in the browser's localStorage: it stays on this device only, and no
  account is needed. Some browsers (private windows, strict settings) block
  storage, so every read/write is wrapped in try/catch and the site still
  works without it — it just won't remember.
*/
import { useCallback, useState } from 'react'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: fine, we just won't remember */
  }
}

/** Like useState, but the value is also saved to this device. */
export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback))
  const set = useCallback(
    (next: T) => {
      setValue(next)
      write(key, next)
    },
    [key],
  )
  return [value, set] as const
}
