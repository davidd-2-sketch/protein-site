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
export const loadEnzymesPage = () => import('./EnzymesPage')
export const loadPracticePage = () => import('./PracticePage')
export const loadProgressPage = () => import('./ProgressPage')

type NetworkInfo = { saveData?: boolean; effectiveType?: string }

/** Is it polite to download extra code in the background? (Not on data-saver or slow networks.) */
export function canPrefetch() {
  const c = (navigator as Navigator & { connection?: NetworkInfo }).connection
  if (!c) return true
  return !c.saveData && !/(^|-)2g$/.test(c.effectiveType ?? '')
}

/**
 * Prefetch the small viewers once the browser has nothing better to do.
 * The protein viewer (Mol*, about 860 KB) is NOT prefetched here: many students never open
 * it, and on limited data plans or slow connections that download costs real money and time.
 * It is fetched the moment someone points at (or tabs to) a link to it instead.
 */
export function prefetchWhenIdle() {
  if (!canPrefetch()) return
  const run = () => {
    void loadReactionPage() // small: shares the 3D engine already loaded by the home page
    void loadVseprPage() // small: same 3D engine
    void loadOrbitalsPage() // small: same 3D engine
    void loadTrendsPage() // small: same 3D engine
    void loadPolarityPage()
    void loadPracticePage()
  }
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 5000 })
  else setTimeout(run, 3000)
}

const BY_PATH: Record<string, () => Promise<unknown>> = {
  '/protein': loadProteinPage,
  '/reaction': loadReactionPage,
  '/shapes': loadVseprPage,
  '/orbitals': loadOrbitalsPage,
  '/trends': loadTrendsPage,
  '/polarity': loadPolarityPage,
  '/enzymes': loadEnzymesPage,
  '/practice': loadPracticePage,
  '/progress': loadProgressPage,
}

/**
 * Start downloading a page's code as soon as someone points at, touches, or tabs to ANY link
 * to it (a hover usually comes 100–300 ms before the click). Returns a cleanup function.
 */
export function installLinkPrefetch() {
  const warm = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!a || a.origin !== location.origin || !canPrefetch()) return
    void BY_PATH[a.pathname]?.()
  }
  const opts = { passive: true, capture: true }
  document.addEventListener('pointerover', warm, opts)
  document.addEventListener('focusin', warm, opts)
  document.addEventListener('touchstart', warm, opts)
  return () => {
    document.removeEventListener('pointerover', warm, opts)
    document.removeEventListener('focusin', warm, opts)
    document.removeEventListener('touchstart', warm, opts)
  }
}
