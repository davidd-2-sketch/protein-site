/*
  sn2.test.ts — checks the science in the SN2 animation.
  Run all tests with:  npm test
*/
import { describe, expect, it } from 'vitest'
import { configuration, sn2Atoms, sn2Bonds, sub } from '../src/reactions/sn2Geometry'
import { SN2_CHECKPOINTS, SN2_STEPS, energyAt } from '../src/reactions/sn2'

const dist = (s: number, a: string, b: string) => {
  const atoms = sn2Atoms(s)
  const p = (id: string) => atoms.find((x) => x.id === id)!.position
  return Math.hypot(...sub(p(a), p(b)))
}
const angle = (s: number, a: string, c: string, b: string) => {
  const atoms = sn2Atoms(s)
  const p = (id: string) => atoms.find((x) => x.id === id)!.position
  const u = sub(p(a), p(c))
  const v = sub(p(b), p(c))
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
  return (Math.acos(dot / Math.hypot(...u) / Math.hypot(...v)) * 180) / Math.PI
}

describe('SN2 stereochemistry', () => {
  it('starts as (S)-2-bromobutane', () => expect(configuration(sn2Atoms(0))).toBe('S'))
  it('is flat (no R/S) at the transition state', () => expect(configuration(sn2Atoms(0.5))).toBeNull())
  it('ends as (R)-butan-2-ol: inversion of configuration', () => expect(configuration(sn2Atoms(1))).toBe('R'))
  it('never shows R before the transition state or S after it', () => {
    for (let k = 0; k <= 100; k++) {
      const c = configuration(sn2Atoms(k / 100))
      if (k < 50) expect(c).not.toBe('R')
      if (k > 50) expect(c).not.toBe('S')
    }
  })
})

describe('SN2 geometry', () => {
  it('uses standard bond lengths at the start and end', () => {
    expect(dist(0, 'C2', 'Br')).toBeCloseTo(1.97, 2)
    expect(dist(1, 'C2', 'O')).toBeCloseTo(1.43, 2)
    expect(dist(0, 'C2', 'C1')).toBeCloseTo(1.53, 2)
  })
  it('is tetrahedral (109.5°) at the start and end', () => {
    expect(angle(0, 'Br', 'C2', 'C1')).toBeCloseTo(109.47, 1)
    expect(angle(1, 'O', 'C2', 'C1')).toBeCloseTo(109.47, 1)
    expect(angle(0, 'C1', 'C2', 'C3')).toBeCloseTo(109.47, 1)
  })
  it('is flat (120° between the three remaining groups) at the transition state', () => {
    expect(angle(0.5, 'C1', 'C2', 'C3')).toBeCloseTo(120, 1)
  })
  it('has hydroxide attacking from directly opposite bromine (180°)', () => {
    expect(angle(0.3, 'O', 'C2', 'Br')).toBeCloseTo(180, 1)
  })
  it('never lets two unbonded atoms overlap', () => {
    for (let k = 0; k <= 100; k++) {
      const s = k / 100
      const atoms = sn2Atoms(s)
      const bonded = new Set(sn2Bonds(s).flatMap((b) => [`${b.a}|${b.b}`, `${b.b}|${b.a}`]))
      for (let i = 0; i < atoms.length; i++)
        for (let j = i + 1; j < atoms.length; j++) {
          if (bonded.has(`${atoms[i].id}|${atoms[j].id}`)) continue
          expect(Math.hypot(...sub(atoms[i].position, atoms[j].position))).toBeGreaterThan(1.5)
        }
    }
  })
  it('forms the C–O bond as the C–Br bond breaks', () => {
    const bond = (s: number, b: string) => sn2Bonds(s).find((x) => x.a === 'C2' && x.b === b)!.order
    expect(bond(0, 'O')).toBe(0)
    expect(bond(0, 'Br')).toBe(1)
    expect(bond(1, 'O')).toBe(1)
    expect(bond(1, 'Br')).toBe(0)
  })
})

describe('SN2 lesson content', () => {
  it('has one energy hump: highest at the transition state, products lower than reactants', () => {
    expect(energyAt(0.5)).toBeGreaterThan(energyAt(0.3))
    expect(energyAt(0.5)).toBeGreaterThan(energyAt(0.7))
    expect(energyAt(1)).toBeLessThan(energyAt(0))
  })
  it('has steps that cover the whole reaction without gaps', () => {
    expect(SN2_STEPS[0].from).toBe(0)
    expect(SN2_STEPS[SN2_STEPS.length - 1].to).toBe(1)
    for (let i = 1; i < SN2_STEPS.length; i++) expect(SN2_STEPS[i].from).toBe(SN2_STEPS[i - 1].to)
  })
  it('has valid questions (the answer is one of the choices)', () => {
    for (const c of SN2_CHECKPOINTS) expect(c.quiz.answer).toBeLessThan(c.quiz.choices.length)
  })
})
