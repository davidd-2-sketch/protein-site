import { describe, expect, it } from 'vitest'
import { DIAGRAMS } from '../src/mo/diatomics'
import { layoutLevels } from '../src/mo/layout'

const GAP = { L: 40, M: 44, R: 40 }

describe('MO diagram layout', () => {
  for (const d of Object.values(DIAGRAMS)) {
    const { y } = layoutLevels(d, 60, 450, GAP)
    const items = [...d.aos.map((a) => ({ e: a.e, col: a.side })), ...d.levels.map((l) => ({ e: l.e, col: 'M' as const }))]

    it(`${d.id}: keeps the energy order of every level (higher energy = higher on screen)`, () => {
      for (const a of items) for (const b of items) if (a.e < b.e) expect(y(a.e)).toBeGreaterThan(y(b.e))
    })

    it(`${d.id}: levels in one column never crowd each other`, () => {
      for (const col of ['L', 'M', 'R'] as const) {
        const ys = [...new Set(items.filter((i) => i.col === col).map((i) => y(i.e)))].sort((a, b) => a - b)
        for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(GAP[col] - 0.01)
      }
    })

    it(`${d.id}: fits in the drawing area`, () => {
      for (const i of items) {
        expect(y(i.e)).toBeGreaterThanOrEqual(60 - 0.01)
        expect(y(i.e)).toBeLessThanOrEqual(450 + 0.01)
      }
    })
  }
})
