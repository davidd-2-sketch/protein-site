/* trends.test.ts — the periodic table data has the right shape and the trends the lessons claim. */
import { describe, expect, it } from 'vitest'
import { ELEMENTS, byZ } from '../src/trends/elements'
import { TREND_LESSONS } from '../src/trends/lessons'

const v = (sym: string, p: 'radius' | 'ie' | 'en' | 'ea') => ELEMENTS.find((e) => e.symbol === sym)!.values[p]!

describe('Element data', () => {
  it('has all 118 elements, in order, each in a unique cell', () => {
    expect(ELEMENTS).toHaveLength(118)
    ELEMENTS.forEach((e, i) => expect(e.z).toBe(i + 1))
    const cells = new Set(ELEMENTS.map((e) => `${e.row},${e.col}`))
    expect(cells.size).toBe(118)
  })
  it('places landmark elements correctly', () => {
    expect([byZ(1).period, byZ(1).group]).toEqual([1, 1])
    expect([byZ(2).period, byZ(2).group]).toEqual([1, 18])
    expect([byZ(26).period, byZ(26).group]).toEqual([4, 8]) // iron
    expect([byZ(55).period, byZ(55).group]).toEqual([6, 1]) // cesium
    expect(byZ(57).group).toBeNull() // lanthanum sits in the f-block row
    expect([byZ(118).period, byZ(118).group]).toEqual([7, 18])
  })
})

describe('Trends the lessons teach', () => {
  it('radius shrinks across period 2 and grows down group 1', () => {
    const p2 = ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'].map((s) => v(s, 'radius'))
    p2.slice(1).forEach((r, i) => expect(r).toBeLessThan(p2[i]))
    const g1 = ['Li', 'Na', 'K', 'Rb', 'Cs'].map((s) => v(s, 'radius'))
    g1.slice(1).forEach((r, i) => expect(r).toBeGreaterThan(g1[i]))
  })
  it('cesium has the largest radius in the data', () => {
    const max = Math.max(...ELEMENTS.map((e) => e.values.radius ?? 0))
    expect(v('Cs', 'radius')).toBe(max)
  })
  it('ionization energy dips at Be→B and N→O (and Mg→Al, P→S)', () => {
    expect(v('B', 'ie')).toBeLessThan(v('Be', 'ie'))
    expect(v('O', 'ie')).toBeLessThan(v('N', 'ie'))
    expect(v('Al', 'ie')).toBeLessThan(v('Mg', 'ie'))
    expect(v('S', 'ie')).toBeLessThan(v('P', 'ie'))
  })
  it('helium has the highest ionization energy; fluorine the highest electronegativity', () => {
    expect(v('He', 'ie')).toBe(Math.max(...ELEMENTS.map((e) => e.values.ie ?? 0)))
    expect(v('F', 'en')).toBe(Math.max(...ELEMENTS.map((e) => e.values.en ?? 0)))
  })
  it('chlorine has a larger electron affinity than fluorine', () => expect(v('Cl', 'ea')).toBeGreaterThan(v('F', 'ea')))
  it('Cl is more electronegative than H (so H–Cl is polar toward Cl)', () => expect(v('Cl', 'en')).toBeGreaterThan(v('H', 'en')))
  it('every number quoted in the lesson notes matches the data', () => {
    const quoted: [string, 'radius' | 'ie' | 'en' | 'ea', number][] = [
      ['Li', 'radius', 167], ['Ne', 'radius', 38], ['Cs', 'radius', 298], ['He', 'radius', 31],
      ['He', 'ie', 2372], ['Cs', 'ie', 376], ['Be', 'ie', 900], ['B', 'ie', 801], ['N', 'ie', 1402], ['O', 'ie', 1314],
      ['F', 'en', 3.98], ['Cl', 'en', 3.16], ['H', 'en', 2.2], ['Cl', 'ea', 349], ['F', 'ea', 322],
    ]
    for (const [sym, p, value] of quoted) expect(v(sym, p)).toBe(value)
  })
})

describe('Trend lessons', () => {
  it('has valid questions and click tasks with reachable answers', () => {
    for (const lesson of TREND_LESSONS)
      for (const step of lesson.steps) {
        if (step.quiz) expect(step.quiz.answer).toBeLessThan(step.quiz.choices.length)
        if (step.task) expect(ELEMENTS.some((e) => step.task!.check(e.z))).toBe(true)
      }
  })
})
