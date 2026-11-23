/* lewis.test.ts — every Lewis structure on the site must obey the rules it teaches. */
import { describe, expect, it } from 'vitest'
import { allowedAround, checkStructure, electronsAround, electronsUsed, formalCharges, LEWIS, lewisById, skeleton, valenceTotal } from '../src/lewis/molecules'

describe('Lewis structures', () => {
  for (const m of LEWIS) {
    describe(m.formula, () => {
      const all = [...m.forms, ...(m.alternatives ?? []).map((a) => a.form), ...(m.accepted?.forms ?? [])]
      it('uses exactly the valence electrons, with formal charges adding up to the charge', () => {
        for (const f of all) {
          expect(f.bonds).toHaveLength(m.links.length)
          expect(f.lone).toHaveLength(m.atoms.length)
          expect(electronsUsed(f)).toBe(valenceTotal(m))
          expect(formalCharges(m, f).reduce((s, c) => s + c, 0)).toBe(m.charge)
        }
      })
      it('gives every atom an allowed number of electrons', () => {
        for (const f of all) {
          electronsAround(m, f).forEach((n, i) => {
            const { min, max } = allowedAround(m, i)
            expect(n, `${m.atoms[i].el}${i}`).toBeGreaterThanOrEqual(min)
            expect(n, `${m.atoms[i].el}${i}`).toBeLessThanOrEqual(max)
          })
        }
      })
      it('accepts its own answers and explains its alternatives', () => {
        for (const f of [...m.forms, ...(m.accepted?.forms ?? [])]) expect(checkStructure(m, f).ok).toBe(true)
        for (const a of m.alternatives ?? []) {
          const r = checkStructure(m, a.form)
          expect(r.ok).toBe(false)
          expect(r.message).toBe(a.why)
        }
      })
      it('rejects the bare skeleton (unless that is already the answer, as for CH₄)', () => {
        const bare = skeleton(m)
        const isAnswer = m.forms.some((f) => f.bonds.every((b, k) => b === bare.bonds[k]) && f.lone.every((l) => l === 0))
        expect(checkStructure(m, bare).ok).toBe(isAnswer)
      })
    })
  }

  it('has the textbook formal charges', () => {
    const fc = (id: string, form = 0) => formalCharges(lewisById(id), lewisById(id).forms[form])
    expect(fc('co')).toEqual([-1, 1])
    expect(fc('nh4')[0]).toBe(1)
    expect(fc('o3')).toEqual([0, 1, -1])
    expect(fc('no3')).toEqual([1, 0, -1, -1])
    expect(fc('co3')).toEqual([0, 0, -1, -1])
    expect(fc('no')).toEqual([0, 0])
    expect(fc('co2')).toEqual([0, 0, 0])
    expect(fc('ocn')).toEqual([-1, 0, 0])
    expect(fc('h3o')[0]).toBe(1)
    expect(fc('i3')).toEqual([0, -1, 0])
    expect(fc('no2')).toEqual([0, 1, -1])
    expect(fc('so4')).toEqual([2, -1, -1, -1, -1])
    expect(fc('hno3')).toEqual([1, 0, -1, 0, 0])
    expect(formalCharges(lewisById('so4'), lewisById('so4').accepted!.forms[0])[0]).toBe(0)
  })

  it('has the textbook valence electron counts', () => {
    const v = (id: string) => valenceTotal(lewisById(id))
    expect(v('h2o')).toBe(8)
    expect(v('co2')).toBe(16)
    expect(v('co3')).toBe(24)
    expect(v('no3')).toBe(24)
    expect(v('o3')).toBe(18)
    expect(v('no')).toBe(11)
    expect(v('xef4')).toBe(36)
    expect(v('sf6')).toBe(48)
    expect(v('glycine')).toBe(30)
    expect(v('no2')).toBe(17)
    expect(v('i3')).toBe(22)
    expect(v('so4')).toBe(32)
    expect(v('becl2')).toBe(16)
  })

  it('accepts both textbook versions of sulfate, but not a half-way one', () => {
    const m = lewisById('so4')
    expect(m.accepted!.forms).toHaveLength(6) // two double bonds, placed every possible way
    expect(checkStructure(m, { bonds: [1, 1, 1, 1], lone: [0, 3, 3, 3, 3] }).ok).toBe(true)
    expect(checkStructure(m, { bonds: [2, 2, 1, 1], lone: [0, 2, 2, 3, 3] }).ok).toBe(true)
    expect(checkStructure(m, { bonds: [2, 1, 1, 1], lone: [0, 2, 3, 3, 3] }).ok).toBe(false)
  })

  it('prefers the negative charge on the more electronegative atom (cyanate)', () => {
    const m = lewisById('ocn')
    expect(checkStructure(m, { bonds: [1, 3], lone: [3, 0, 1] }).ok).toBe(true)
    expect(checkStructure(m, { bonds: [2, 2], lone: [2, 0, 2] }).ok).toBe(false)
  })

  it('explains common mistakes', () => {
    const m = lewisById('co2')
    // All single bonds, lone pairs on the oxygens: 16 electrons, but carbon is short of an octet.
    const r = checkStructure(m, { bonds: [1, 1], lone: [3, 0, 3] })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.atom).toBe(1)
    // Too many electrons.
    expect(checkStructure(m, { bonds: [2, 2], lone: [3, 0, 2] }).message).toMatch(/only has 16/)
  })
})
