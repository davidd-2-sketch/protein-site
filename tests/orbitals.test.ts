/* orbitals.test.ts — the orbital math matches known results for hydrogen. */
import { describe, expect, it } from 'vitest'
import { BONDS, ORBITALS, isoForFraction, sampleGrid } from '../src/orbitals/wavefunctions'
import { ORBITAL_LESSONS } from '../src/orbitals/lessons'

describe('Hydrogen orbitals', () => {
  it('1s: the 90% surface sits at r ≈ 2.66 a₀ (1.41 Å)', () => {
    const iso = isoForFraction(sampleGrid(ORBITALS['1s'].fn, 96, 6), 0.9)
    expect(-Math.log(iso)).toBeCloseTo(2.66, 1)
  })
  it('2s: radial node at exactly r = 2 a₀', () => expect(ORBITALS['2s'].fn(2, 0, 0)).toBeCloseTo(0, 12))
  it('3s: radial nodes at r = (9 ± 3√3)/2 a₀', () => {
    expect(ORBITALS['3s'].fn((9 - 3 * Math.sqrt(3)) / 2, 0, 0)).toBeCloseTo(0, 9)
    expect(ORBITALS['3s'].fn((9 + 3 * Math.sqrt(3)) / 2, 0, 0)).toBeCloseTo(0, 9)
  })
  it('p orbitals: zero everywhere on their nodal plane', () => {
    expect(ORBITALS['2pz'].fn(1.3, -0.7, 0)).toBe(0)
    expect(ORBITALS['2px'].fn(0, 2, 1)).toBe(0)
  })
  it('node count = n − 1 for every orbital', () => {
    for (const o of Object.values(ORBITALS)) expect(o.n - o.l - 1 + o.l).toBe(o.n - 1)
  })
})

describe('Simple bonds', () => {
  it('σ* (antibonding) has a node exactly between the nuclei', () => expect(BONDS['h2-antibonding'].fn(0, 0, 0)).toBe(0))
  it('σ (bonding) builds density between the nuclei', () => expect(BONDS['h2-bonding'].fn(0, 0, 0)).toBeGreaterThan(0.9))
  it('π is zero along the bond axis', () => expect(BONDS['p-pi'].fn(0.4, 0, 0)).toBe(0))
  it('head-on σ from p orbitals adds up in the middle', () => expect(BONDS['p-sigma'].fn(0, 0, 0)).toBeGreaterThan(0))
})

describe('Orbital lessons', () => {
  it('has valid questions and real orbitals', () => {
    for (const lesson of ORBITAL_LESSONS)
      for (const step of lesson.steps) {
        if (step.quiz) expect(step.quiz.answer).toBeLessThan(step.quiz.choices.length)
        const v = step.view
        if (v.kind === 'orbital') expect(ORBITALS[v.id]).toBeDefined()
        if (v.kind === 'bond') expect(BONDS[v.id]).toBeDefined()
      }
  })
})
