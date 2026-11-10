/*
  sn1.test.ts — checks the SN1 model: correct starting stereochemistry, a flat carbocation,
  both faces of attack (one gives R, the other S), sensible bond lengths, no atoms colliding,
  and an energy diagram whose first hump is the highest (rate-determining step).
*/
import { describe, expect, it } from 'vitest'
import { v } from '../src/reactions/mechanism'
import { SN1_ENERGY_POINTS, sn1Atoms, sn1Bonds, sn1Configuration, sn1Energy } from '../src/reactions/sn1Geometry'

const P = (atoms: ReturnType<typeof sn1Atoms>, id: string) => atoms.find((a) => a.id === id)!.position

describe('SN1 stereochemistry', () => {
  for (const face of [-1, 1] as const) {
    it(`starts as (S)-3-bromo-3-methylhexane (face ${face})`, () => expect(sn1Configuration(sn1Atoms(0, face), 0)).toBe('S'))
    it(`carbocation has no R/S and is flat (face ${face})`, () => {
      const a = sn1Atoms(0.45, face)
      expect(sn1Configuration(a, 0.45)).toBeNull()
      // the three carbons bonded to C3 lie in a plane through C3
      const n = v.norm(v.cross(v.sub(P(a, 'C4'), P(a, 'Cm')), v.sub(P(a, 'C2'), P(a, 'Cm'))))
      expect(Math.abs(v.dot(n, v.sub(P(a, 'C3'), P(a, 'Cm'))))).toBeLessThan(0.02)
    })
  }
  it('attack opposite bromide gives (R): inversion', () => expect(sn1Configuration(sn1Atoms(1, -1), 1)).toBe('R'))
  it('attack from bromide’s side gives (S): retention', () => expect(sn1Configuration(sn1Atoms(1, 1), 1)).toBe('S'))
})

describe('SN1 geometry', () => {
  for (const face of [-1, 1] as const) {
    for (const s of [0, 1]) {
      it(`bond lengths are realistic at s=${s} (face ${face})`, () => {
        const a = sn1Atoms(s, face)
        for (const b of sn1Bonds(s).filter((b) => b.order > 0.99)) {
          const d = v.dist(P(a, b.a), P(a, b.b))
          expect(d, `${b.a}-${b.b}`).toBeGreaterThan(0.9)
          expect(d, `${b.a}-${b.b}`).toBeLessThan(2.0)
        }
      })
    }
    it(`no two unbonded atoms overlap anywhere along the path (face ${face})`, () => {
      for (let k = 0; k <= 50; k++) {
        const s = k / 50
        const a = sn1Atoms(s, face)
        // Neighbors: bonded atoms, and atoms that share a bonded neighbor (fixed by bond angles).
        const nb = new Map<string, string[]>()
        for (const b of sn1Bonds(s).filter((b) => b.order > 0.05)) {
          nb.set(b.a, [...(nb.get(b.a) ?? []), b.b])
          nb.set(b.b, [...(nb.get(b.b) ?? []), b.a])
        }
        for (let i = 0; i < a.length; i++)
          for (let j = i + 1; j < a.length; j++) {
            const x = a[i].id
            const y = a[j].id
            if (nb.get(x)?.includes(y) || nb.get(x)?.some((z) => nb.get(y)?.includes(z))) continue
            if ((x === 'Ha' || y === 'Ha') && /O[12]/.test(x + y)) continue // the proton being handed over
            const hh = a[i].element === 'H' && a[j].element === 'H'
            expect(v.dist(a[i].position, a[j].position), `${x}–${y} at s=${s}`).toBeGreaterThan(hh ? 1.8 : 2.1)
          }
      }
    })
  }
})

describe('SN1 energy diagram (schematic)', () => {
  const peaks = [SN1_ENERGY_POINTS[1], SN1_ENERGY_POINTS[3], SN1_ENERGY_POINTS[5]]
  it('has three humps, the first highest (rate-determining)', () => {
    expect(peaks[0][1]).toBeGreaterThan(peaks[1][1])
    expect(peaks[0][1]).toBeGreaterThan(peaks[2][1])
  })
  it('the carbocation sits in a valley between the first two humps', () => {
    expect(sn1Energy(0.43)).toBeLessThan(sn1Energy(0.24))
    expect(sn1Energy(0.43)).toBeLessThan(sn1Energy(0.57))
  })
})
