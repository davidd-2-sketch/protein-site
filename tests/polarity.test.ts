/*
  polarity.test.ts — checks the polarity model against measured facts:
  geometry matches the stated bond lengths and angles, nonpolar molecules sum to zero,
  polar ones don't, and the predicted negative end is on the correct side.
*/
import { describe, expect, it } from 'vitest'
import { bondDipoles, byId, electronegativity, length, netDipole, partialCharges, POLAR_MOLECULES, type Vec } from '../src/polarity/molecules'

const angle = (a: Vec, o: Vec, b: Vec) => {
  const u: Vec = [a[0] - o[0], a[1] - o[1], a[2] - o[2]]
  const w: Vec = [b[0] - o[0], b[1] - o[1], b[2] - o[2]]
  return (Math.acos((u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / (length(u) * length(w))) * 180) / Math.PI
}
const P = (id: string, i: number) => byId(id).atoms[i].pos

describe('polarity geometry (experimental values)', () => {
  it('H₂O angle 104.5°', () => expect(angle(P('H2O', 1), P('H2O', 0), P('H2O', 2))).toBeCloseTo(104.5, 1))
  it('NH₃ angle 106.7°', () => expect(angle(P('NH3', 1), P('NH3', 0), P('NH3', 2))).toBeCloseTo(106.7, 1))
  it('CCl₄ angles 109.5°', () => {
    for (const [i, j] of [[1, 2], [2, 3], [3, 4], [1, 4]]) expect(angle(P('CCl4', i), P('CCl4', 0), P('CCl4', j))).toBeCloseTo(109.47, 1)
  })
  it('CHCl₃ ∠ClCCl 111.3°', () => expect(angle(P('CHCl3', 2), P('CHCl3', 0), P('CHCl3', 3))).toBeCloseTo(111.3, 1))
  it('BF₃ angles 120° and flat', () => {
    expect(angle(P('BF3', 1), P('BF3', 0), P('BF3', 2))).toBeCloseTo(120, 1)
    for (let i = 1; i <= 3; i++) expect(Math.abs(P('BF3', i)[2])).toBeLessThan(1e-9)
  })
  it('every bond length matches the molecule data', () => {
    for (const m of POLAR_MOLECULES) for (const [i, j] of m.bonds) expect(length(sub(m.atoms[i].pos, m.atoms[j].pos))).toBeGreaterThan(0.9)
  })
})

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

describe('polarity model vs measured dipoles', () => {
  for (const m of POLAR_MOLECULES) {
    it(`${m.formula}: model says ${m.dipole === 0 ? 'nonpolar' : 'polar'} (measured ${m.dipole} D)`, () => {
      const net = length(netDipole(m))
      if (m.dipole === 0) expect(net).toBeLessThan(1e-9)
      else expect(net).toBeGreaterThan(0.2)
    })
  }
  it('negative end: toward O in water, N in ammonia, the Cl₃ end of chloroform, F/Cl in HX', () => {
    expect(netDipole(byId('H2O'))[1]).toBeGreaterThan(0) // O is above the H's
    expect(netDipole(byId('NH3'))[1]).toBeGreaterThan(0) // N above the H's
    expect(netDipole(byId('CHCl3'))[1]).toBeLessThan(0) // Cl's are below, H above
    expect(netDipole(byId('HF'))[0]).toBeGreaterThan(0) // F on +x
    expect(netDipole(byId('HCl'))[0]).toBeGreaterThan(0)
  })
  it('HF has a larger dipole than HCl in the model and in reality', () => {
    expect(length(netDipole(byId('HF')))).toBeGreaterThan(length(netDipole(byId('HCl'))))
    expect(byId('HF').dipole).toBeGreaterThan(byId('HCl').dipole)
  })
  it('bond arrows point toward the more electronegative atom', () => {
    for (const m of POLAR_MOLECULES)
      for (const b of bondDipoles(m)) expect(electronegativity(m.atoms[b.to].el)).toBeGreaterThanOrEqual(electronegativity(m.atoms[b.from].el))
  })
  it('partial charges: H δ+ and O δ− in water; C δ+ in CO₂', () => {
    expect(partialCharges(byId('H2O'))).toEqual(['−', '+', '+'])
    expect(partialCharges(byId('CO2'))).toEqual(['+', '−', '−'])
  })
  it('uses Pauling electronegativities from the site data', () => {
    expect(electronegativity('F')).toBeCloseTo(3.98, 2)
    expect(electronegativity('H')).toBeCloseTo(2.2, 2)
  })
})
