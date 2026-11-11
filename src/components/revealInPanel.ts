/* revealInPanel.ts — scroll a scrolling panel just enough to show an element. */

/** Scroll the nearest scrolling panel just enough to show `el` (plus room for a pinned bar below). */
export function revealInPanel(el: HTMLElement | null, bottomRoom = 84) {
  if (!el) return
  let panel = el.parentElement
  while (panel && !/(auto|scroll)/.test(getComputedStyle(panel).overflowY)) panel = panel.parentElement
  if (!panel) return
  const r = el.getBoundingClientRect()
  const p = panel.getBoundingClientRect()
  const below = r.bottom + bottomRoom - p.bottom
  // Scroll down to show it, but never so far that its top goes above the panel.
  const room = r.top - p.top
  if (below > 0) panel.scrollBy({ top: Math.min(below, Math.max(0, room)), behavior: 'smooth' })
}
