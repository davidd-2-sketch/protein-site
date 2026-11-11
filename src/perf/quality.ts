/*
  quality.ts — one place that decides how much graphics work this computer should do.

  Two profiles:
    • 'detailed': glossy reflective materials, edge smoothing, sharp pixels, soft shadows in
      the protein viewer, drifting backgrounds. For reasonably modern computers.
    • 'fast': simpler (still shiny) materials, normal pixel density, no edge smoothing, fewer
      triangles, no protein shadows, still backgrounds. Several times less work for the
      graphics chip, so older laptops and Chromebooks stay smooth.

  The student can choose Auto / Faster / Detailed (Progress page → This device). On Auto we
  guess from the hardware, and if a 3D view still runs slowly we switch to 'fast' and
  remember that for this device.
*/
import { useSyncExternalStore } from 'react'

export type QualitySetting = 'auto' | 'fast' | 'detailed'
export type Profile = 'fast' | 'detailed'

const SETTING_KEY = 'ps.quality' // what the student chose (this device only, never synced)
const SLOW_KEY = 'ps.quality.slowDevice' // set when Auto measured slow frames here

const read = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* storage unavailable */
  }
}

/* ---------- hardware guess (run once) ---------- */

let gpuName: string | null = null

/** The graphics chip's name, if the browser shares it (e.g. "Intel(R) HD Graphics 4000"). */
export function graphicsChip(): string {
  if (gpuName !== null) return gpuName
  gpuName = ''
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (gl) {
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      gpuName = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
      gl.getExtension('WEBGL_lose_context')?.loseContext() // give the test context back right away
    }
  } catch {
    /* no WebGL: the 3D pages will explain */
  }
  return gpuName
}

/**
 * Best guess before measuring anything. "Weak" means: software rendering (no real graphics
 * chip), an old integrated chip, very few processor cores, or very little memory.
 */
export function looksWeak(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory // GB, Chrome/Edge only, rounded down (max reported: 8)
  const gpu = graphicsChip()
  if (/swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(gpu)) return true
  // Older integrated chips: Intel "HD Graphics" with no number (Atom/Celeron) or a 4-digit
  // model below 6000 (about 2010–2015), Intel GMA, and low-end phone/Chromebook chips.
  // Newer 3-digit Intel chips (HD 520, UHD 620, ...) are left to the frame-rate check.
  const hd = gpu.match(/hd graphics\s*(\d+)?/i)
  if (hd && (!hd[1] || (hd[1].length === 4 && Number(hd[1]) < 6000))) return true
  if (/\bgma\b|mali-[4t]\d\d\b|powervr/i.test(gpu)) return true
  const adreno = gpu.match(/adreno[^\d]*(\d{3})/i)
  if (adreno && Number(adreno[1]) < 600) return true
  if (cores <= 2) return true
  if (memory !== undefined && memory <= 2) return true
  return false
}

/* ---------- the current setting and profile ---------- */

const listeners = new Set<() => void>()
let setting: QualitySetting = (read(SETTING_KEY) as QualitySetting) || 'auto'
let measuredSlow = read(SLOW_KEY) === '1'
let guessedWeak: boolean | null = null

export function currentSetting(): QualitySetting {
  return setting
}

export function setQualitySetting(s: QualitySetting) {
  setting = s
  write(SETTING_KEY, s === 'auto' ? null : s)
  // Choosing Auto again gives the device a fresh chance to be measured.
  if (s === 'auto') {
    measuredSlow = false
    write(SLOW_KEY, null)
  }
  applyPageClass()
  listeners.forEach((fn) => fn())
}

/** 'fast' or 'detailed' for this device right now. 3D views read this when they are created. */
export function profile(): Profile {
  if (setting === 'fast') return 'fast'
  if (setting === 'detailed') return 'detailed'
  guessedWeak ??= looksWeak()
  return guessedWeak || measuredSlow ? 'fast' : 'detailed'
}

/** React hook: re-renders when the setting changes. */
export function useQuality() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => `${setting}|${profile()}`,
  )
}

/** Marks <html> with the profile, so CSS can switch off purely decorative motion. */
export function applyPageClass() {
  document.documentElement.classList.toggle('perf-fast', profile() === 'fast')
}

/* ---------- the numbers each profile uses ---------- */

export function settings() {
  const fast = profile() === 'fast'
  return {
    fast,
    antialias: !fast,
    /** Highest pixel density to draw at (screens can be 2× or 3×). */
    maxPixelRatio: fast ? 1 : 1.5,
    /** Reflections from a virtual room (computed once when a view opens). */
    reflections: !fast,
    /** Sphere detail: segments around × segments top-to-bottom. */
    sphere: (fast ? [22, 14] : [48, 32]) as [number, number],
    /** Orbital surfaces: grid points per side (64³ = 262,144 calculations; 40³ = 64,000). */
    orbitalGrid: fast ? 40 : 64,
  }
}

/* ---------- watching real frame rates (Auto only) ---------- */

/**
 * Call `frame()` every time a 3D view draws. While it draws continuously (spinning,
 * playing, dragging), it times the frames. If they are consistently slow (below about
 * 24 per second), it first lowers the pixel density of THIS view, and remembers the
 * device as slow so every view opened afterwards uses the 'fast' profile.
 */
export function frameWatcher(onSlow: () => void) {
  let last = 0
  let slow = 0
  let total = 0
  let done = false
  return {
    frame(now: number) {
      if (done || setting !== 'auto' || profile() === 'fast') return
      const gap = now - last
      last = now
      if (gap > 250) return // a pause, not continuous drawing
      total++
      if (gap > 42) slow++
      if (total >= 90) {
        if (slow / total > 0.6) {
          done = true
          measuredSlow = true
          write(SLOW_KEY, '1')
          applyPageClass()
          onSlow()
          listeners.forEach((fn) => fn())
        }
        total = slow = 0
      }
    },
  }
}
