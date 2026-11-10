/* vsepr.test.ts — every angle we label must be the angle we actually draw. */
import { describe, expect, it } from 'vitest'
import { MOLECULES } from '../src/vsepr/molecules'
import { SHAPES, idealDomains, isValid } from '../src/vsepr/shapes'
import { VSEPR_LESSONS } from '../src/vsepr/lessons'

const angle = (a: number[], b: number[]) => (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI

describe('Real molecules', () => {
  for (const m of MOLECULES) {
    describe(m.formula, () => {
      const bonds = m.domains.filter((d) => d.kind === 'bond')
      const lones = m.domains.filter((d) => d.kind === 'lone')
      it('has the stated number of bonds and lone pairs', () => {
        expect(bonds.length).toBe(m.bonds)
        expect(lones.length).toBe(m.lone)
      })
      it('draws each labeled angle at the labeled value', () => {
        for (const [i, j, label] of m.arcs) {
          const value = parseFloat(label.replace(/[^\d.]/g, ''))
          expect(angle(bonds[i].dir, bonds[j].dir)).toBeCloseTo(value, 0)
        }
      })
      it('never puts a lone pair on top of a bond', () => {
        for (const l of lones) for (const b of bonds) expect(angle(l.dir, b.dir)).toBeGreaterThan(80)
      })
    })
  }
  it('shows the classic squeeze: CH₄ > NH₃ > H₂O', () => {
    const a = (f: string) => parseFloat(MOLECULES.find((m) => m.formula === f)!.arcs[0][2])
    expect(a('CH₄')).toBeGreaterThan(a('NH₃'))
    expect(a('NH₃')).toBeGreaterThan(a('H₂O'))
  })
})

describe('Ideal shapes', () => {
  it('covers all 13 standard shapes (linear and bent each appear twice), each valid', () => {
    expect(SHAPES).toHaveLength(13)
    for (const s of SHAPES) expect(isValid(s.bonds, s.lone)).toBe(true)
  })
  const ideal: Record<string, number[]> = {
    Linear: [180],
    'Trigonal planar': [120],
    Tetrahedral: [109.47],
    'Trigonal bipyramidal': [120, 90],
    Octahedral: [90],
  }
  for (const s of SHAPES.filter((x) => x.lone === 0)) {
    it(`${s.name} draws its ideal angles`, () => {
      const dirs = idealDomains(s.bonds, 0).map((d) => d.dir)
      s.arcs.forEach(([i, j], k) => expect(angle(dirs[i], dirs[j])).toBeCloseTo(ideal[s.name][k], 1))
    })
  }
  it('puts lone pairs in the right places', () => {
    // Seesaw / T-shaped / linear (5 groups): lone pairs are equatorial (90° from the axial direction).
    for (const lone of [1, 2, 3]) {
      const d = idealDomains(5 - lone, lone)
      for (const l of d.filter((x) => x.kind === 'lone')) expect(Math.abs(l.dir[1])).toBeLessThan(1e-9)
    }
    // Square planar: the two lone pairs are opposite each other.
    const sq = idealDomains(4, 2).filter((x) => x.kind === 'lone')
    expect(angle(sq[0].dir, sq[1].dir)).toBeCloseTo(180, 5)
  })
})

describe('VSEPR lessons', () => {
  it('has valid questions and reachable builder tasks', () => {
    for (const lesson of VSEPR_LESSONS)
      for (const step of lesson.steps) {
        if (step.quiz) expect(step.quiz.answer).toBeLessThan(step.quiz.choices.length)
        if (step.view.molecule) expect(MOLECULES.some((m) => m.formula === step.view.molecule)).toBe(true)
      }
  })
})
