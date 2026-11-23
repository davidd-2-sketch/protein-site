/*
  layout.ts — where each level of an MO diagram goes vertically.

  The energies in diatomics.ts are schematic, and some levels are very close (NO's σ and π,
  for example). Drawn strictly to scale, their arrows and labels would sit on top of each other.
  So we space the levels proportionally to energy, but never let two levels in the SAME column
  (left atom, molecule, right atom) come closer than a minimum gap. The ORDER of every level,
  across all three columns, is always kept, so the diagram never says something false about
  which orbital is higher.
*/
import type { Diagram } from './diatomics'

export type Column = 'L' | 'M' | 'R'

export interface Layout {
  /** Height (y, in SVG units) for a given schematic energy. */
  y: (e: number) => number
}

/**
 * Lay out a diagram between `top` and `bottom` (SVG y grows downward).
 * `minGap` is the smallest allowed distance between two levels in one column.
 */
export function layoutLevels(d: Diagram, top: number, bottom: number, minGap: Record<Column, number>): Layout {
  // Every distinct energy, with the columns that have something at that height.
  const cols = new Map<number, Set<Column>>()
  const add = (e: number, c: Column) => (cols.get(e) ?? cols.set(e, new Set()).get(e)!).add(c)
  d.aos.forEach((a) => add(a.e, a.side))
  d.levels.forEach((l) => add(l.e, 'M'))
  const es = [...cols.keys()].sort((a, b) => a - b)
  const avail = bottom - top

  /** Positions (0 = lowest) for a scale of `s` units per energy step. */
  const place = (s: number) => {
    const pos: number[] = []
    const last: Partial<Record<Column, number>> = {}
    es.forEach((e, i) => {
      let p = i === 0 ? 0 : pos[i - 1] + s * (e - es[i - 1])
      // A small step between neighbors in different columns, so the order stays visible.
      if (i > 0) p = Math.max(p, pos[i - 1] + 4)
      for (const c of cols.get(e)!) if (last[c] !== undefined) p = Math.max(p, last[c]! + minGap[c])
      pos.push(p)
      for (const c of cols.get(e)!) last[c] = p
    })
    return pos
  }

  // Find the largest scale whose layout still fits (the height only grows with the scale).
  let lo = 0
  let hi = avail / Math.max(es[es.length - 1] - es[0], 1e-6)
  let pos = place(lo)
  if (pos[pos.length - 1] <= avail) {
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (place(mid)[es.length - 1] <= avail) lo = mid
      else hi = mid
    }
    pos = place(lo)
  }
  // Squeeze uniformly if even the minimum gaps don't fit; otherwise center the leftover space.
  const total = pos[pos.length - 1] || 1
  const k = total > avail ? avail / total : 1
  const pad = total > avail ? 0 : (avail - total) / 2
  const at = new Map(es.map((e, i) => [e, bottom - pad - pos[i] * k]))
  return { y: (e) => at.get(e) ?? bottom }
}
