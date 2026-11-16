/*
  afterPaint.ts — "do this once the page is actually on screen".

  Heavy extras (the home page's 3D molecule, downloading other pages ahead of time) should
  never compete with showing the page itself, especially on slow phones. This waits for:
    1. the text font to arrive (so the final text has been drawn),
    2. two screen refreshes (so that drawing has really happened),
    3. an optional extra delay,
    4. a moment when the browser is idle.
  It returns a function that cancels the wait.
*/
export function afterFirstPaint(run: () => void, extraDelayMs = 0): () => void {
  let cancelled = false
  let timer = 0
  let idleId = 0
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }
  const whenIdle = () => {
    if (cancelled) return
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => !cancelled && run(), { timeout: 2000 })
    else timer = window.setTimeout(() => !cancelled && run(), 200) // older Safari has no idle callback
  }
  const painted = () => requestAnimationFrame(() => requestAnimationFrame(() => (timer = window.setTimeout(whenIdle, extraDelayMs))))
  const fonts = document.fonts?.ready ?? Promise.resolve()
  // Never wait more than a second for the font: the page works without it.
  void Promise.race([fonts, new Promise((r) => setTimeout(r, 1000))]).then(() => !cancelled && painted())
  return () => {
    cancelled = true
    window.clearTimeout(timer)
    if (idleId) w.cancelIdleCallback?.(idleId)
  }
}
