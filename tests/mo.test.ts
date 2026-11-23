/* mo.test.ts — MO diagrams must give the textbook bond orders and magnetism. */
import { describe, expect, it } from 'vitest'
import { byEnergy, capacity, DIAGRAMS, DIATOMICS, diatomicById, fill } from '../src/mo/diatomics'

const of = (id: string, delta = 0) => {
  const m = diatomicById(id)
  return fill(DIAGRAMS[m.diagram], m.electrons + delta)
}

describe('MO diagrams', () => {
  it('give the textbook bond orders', () => {
    const expected: Record<string, number> = { h2: 1, he2: 0, li2: 1, be2: 0, b2: 1, c2: 2, n2: 3, o2: 2, f2: 1, ne2: 0, co: 3, no: 2.5, hf: 1 }
    for (const [id, bo] of Object.entries(expected)) expect(of(id).bondOrder, id).toBe(bo)
  })

  it('give the measured magnetism (unpaired electrons = paramagnetic)', () => {
    for (const m of DIATOMICS) {
      if (!m.magnetism) continue
      const para = of(m.id).unpaired > 0
      expect(para ? 'paramagnetic' : 'diamagnetic', m.id).toBe(m.magnetism)
    }
    expect(of('o2').unpaired).toBe(2)
    expect(of('b2').unpaired).toBe(2)
    expect(of('no').unpaired).toBe(1)
  })

  it('handles ions', () => {
    expect(of('h2', -1).bondOrder).toBe(0.5) // H₂⁺
    expect(of('he2', -1).bondOrder).toBe(0.5) // He₂⁺
    expect(of('o2', -1).bondOrder).toBe(2.5) // O₂⁺
    expect(of('o2', 1).bondOrder).toBe(1.5) // O₂⁻
    expect(of('o2', 2).bondOrder).toBe(1) // O₂²⁻
    expect(of('no', -1).bondOrder).toBe(3) // NO⁺
    expect(of('n2', -1).bondOrder).toBe(2.5) // N₂⁺
  })

  it('have the right level order', () => {
    const order = (d: string) => byEnergy(DIAGRAMS[d]).map((l) => l.id)
    expect(order('mixed')).toEqual(['s2s', 's2s*', 'p2p', 's2p', 'p2p*', 's2p*'])
    expect(order('unmixed')).toEqual(['s2s', 's2s*', 's2p', 'p2p', 'p2p*', 's2p*'])
    expect(order('co')).toEqual(order('mixed'))
  })

  it('draw bonding levels below their parent orbitals and antibonding levels above', () => {
    for (const d of Object.values(DIAGRAMS)) {
      for (const lv of d.levels) {
        const parents = d.aos.filter((a) => lv.from.includes(a.id)).map((a) => a.e)
        // (In CO the highest σ is only weakly bonding and lies between C 2p and O 2p, as
        // measured, so bonding levels need only be below the HIGHER parent.)
        if (lv.kind === 'bonding') expect(lv.e, `${d.id} ${lv.id}`).toBeLessThan(Math.max(...parents))
        if (lv.kind === 'antibonding') expect(lv.e, `${d.id} ${lv.id}`).toBeGreaterThan(Math.max(...parents))
      }
    }
    // Two identical atoms: bonding is below both.
    for (const id of ['1s', 'mixed', 'unmixed'])
      for (const lv of DIAGRAMS[id].levels.filter((l) => l.kind === 'bonding'))
        expect(lv.e).toBeLessThan(Math.min(...DIAGRAMS[id].aos.filter((a) => lv.from.includes(a.id)).map((a) => a.e)))
  })

  it('never overfill', () => {
    for (const d of Object.values(DIAGRAMS)) {
      const f = fill(d, capacity(d) + 5)
      for (const lv of d.levels) expect(f.count[lv.id]).toBeLessThanOrEqual(2 * lv.deg)
    }
  })

  it('give bond lengths that shrink as bond order rises (N₂ < O₂ < F₂)', () => {
    const L = (id: string) => diatomicById(id).length!
    expect(L('n2')).toBeLessThan(L('o2'))
    expect(L('o2')).toBeLessThan(L('f2'))
  })
})
