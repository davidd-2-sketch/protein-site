/*
  loaders.ts — functions that download each heavy page's code.

  React's lazy() uses these to load a page when it's first visited. We also call them
  EARLY (prefetching): when the browser is idle on the home page, or the moment someone
  hovers a link. By the time they click, the code is usually already downloaded.
  Calling a loader twice is free: the browser reuses the first download.
*/
export const loadProteinPage = () => import('./ProteinPage')
export const loadReactionPage = () => import('./ReactionPage')
export const loadVseprPage = () => import('./VseprPage')
export const loadOrbitalsPage = () => import('./OrbitalsPage')
export const loadTrendsPage = () => import('./TrendsPage')
export const loadPolarityPage = () => import('./PolarityPage')
export const loadPracticePage = () => import('./PracticePage')
export const loadProgressPage = () => import('./ProgressPage')

type NetworkInfo = { saveData?: boolean; effectiveType?: string }

/** Is it polite to download extra code in the background? (Not on data-saver or slow networks.) */
export function canPrefetch() {
  const c = (navigator as Navigator & { connection?: NetworkInfo }).connection
  if (!c) return true
  return !c.saveData && !/(^|-)2g$/.test(c.effectiveType ?? '')
}

/** Prefetch both viewers once the browser has nothing better to do. */
export function prefetchWhenIdle() {
  if (!canPrefetch()) return
  const run = () => {
    void loadReactionPage() // small: shares the 3D engine already loaded by the home page
    void loadVseprPage() // small: same 3D engine
    void loadOrbitalsPage() // small: same 3D engine
    void loadTrendsPage() // small: same 3D engine
    void loadProteinPage() // large: Mol*
  }
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 5000 })
  else setTimeout(run, 3000)
}
