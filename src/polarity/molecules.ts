/*
  molecules.ts — the molecules in the Polarity module, in look-alike pairs:
  one polar, one nonpolar (or two polar ones of different strength).

  For each molecule we store:
    • 3D atom positions from experimental bond lengths and angles (gas phase, rounded;
      NIST CCCBDB / CRC Handbook). Good to about ±0.01 Å and ±0.5°.
    • its MEASURED dipole moment in debye (D) (CRC Handbook, gas phase).

  The arrows are a MODEL: each bond dipole arrow points toward the more electronegative
  atom, with length proportional to the electronegativity difference (Pauling scale,
  the same values as the Trends page). Adding them as vectors predicts whether the
  molecule is polar, and roughly which end is negative. It does NOT predict exact
  sizes: lone pairs and other effects also contribute (e.g. NH₃ 1.47 D vs NF₃ 0.23 D).

  ARROW CONVENTION: chemistry textbooks point the arrow toward the NEGATIVE end, with a
  "+" cross on the tail. (Physics uses the opposite direction.) We use the chemistry one.
*/
import { ELEMENTS } from '../trends/elements'

export type Vec = [number, number, number]

export interface PAtom {
  el: string
  pos: Vec
}

export interface PolarMolecule {
  id: string
  formula: string
  name: string
  shape: string
  atoms: PAtom[]
  /** Bonds as [atom index, atom index, bond order]. */
  bonds: [number, number, number][]
  /** Index of the central atom (for lone pairs and the starting point of the sum). */
  center: number
  /** Directions of the central atom's lone pairs. */
  lonePairs: Vec[]
  /** Measured dipole moment, debye. */
  dipole: number
  /** One-line "why" for the result. */
  why: string
  /** Camera direction for the default view (3D shapes look best from above). */
  view?: Vec
}

export interface Pair {
  id: string
  title: string
  molecules: [string, string]
  /** What the pair teaches, shown above the molecules. */
  lesson: string
}

/* ---------- small vector helpers ---------- */
const deg = (d: number) => (d * Math.PI) / 180
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k]
export const length = (a: Vec) => Math.hypot(a[0], a[1], a[2])
const norm = (a: Vec): Vec => scale(a, 1 / length(a))

/** Three bonds at polar angle θ from −y, 120° apart: a pyramid (θ < 90°) or a flat triangle (θ = 90°). */
const tripod = (r: number, thetaDeg: number, phase = 90): Vec[] =>
  [0, 120, 240].map((p) => {
    const t = deg(thetaDeg)
    const f = deg(p + phase)
    return [r * Math.sin(t) * Math.cos(f), -r * Math.cos(t), r * Math.sin(t) * Math.sin(f)]
  })

/** Polar angle that gives three bonds a mutual angle α: cos α = 1.5 cos²θ − 0.5. */
const thetaFor = (alphaDeg: number) => (Math.acos(Math.sqrt((Math.cos(deg(alphaDeg)) + 0.5) / 1.5)) * 180) / Math.PI

/* ---------- the molecules ---------- */

function build(): PolarMolecule[] {
  const list: PolarMolecule[] = []

  // CO₂: linear, C=O 1.160 Å. 0 D.
  list.push({
    id: 'CO2', formula: 'CO₂', name: 'Carbon dioxide', shape: 'Linear',
    atoms: [{ el: 'C', pos: [0, 0, 0] }, { el: 'O', pos: [-1.16, 0, 0] }, { el: 'O', pos: [1.16, 0, 0] }],
    bonds: [[0, 1, 2], [0, 2, 2]], center: 0, lonePairs: [], dipole: 0,
    why: 'Two equal C=O dipoles point in exactly opposite directions and cancel.',
  })

  // H₂O: bent, O–H 0.958 Å, 104.5°. 1.85 D.
  const hw = deg(104.5 / 2)
  list.push({
    id: 'H2O', formula: 'H₂O', name: 'Water', shape: 'Bent',
    atoms: [
      { el: 'O', pos: [0, 0, 0] },
      { el: 'H', pos: [-0.958 * Math.sin(hw), -0.958 * Math.cos(hw), 0] },
      { el: 'H', pos: [0.958 * Math.sin(hw), -0.958 * Math.cos(hw), 0] },
    ],
    bonds: [[0, 1, 1], [0, 2, 1]], center: 0,
    lonePairs: [norm([0, 0.58, 0.82]), norm([0, 0.58, -0.82])],
    dipole: 1.85,
    why: 'The bend means the two O–H dipoles both point partly "up" toward oxygen, so they add instead of cancel.',
  })

  // BF₃: trigonal planar, B–F 1.307 Å, 120°. 0 D. (Shown facing the viewer.)
  list.push({
    id: 'BF3', formula: 'BF₃', name: 'Boron trifluoride', shape: 'Trigonal planar',
    atoms: [{ el: 'B', pos: [0, 0, 0] }, ...[90, 210, 330].map((a): PAtom => ({ el: 'F', pos: [1.307 * Math.cos(deg(a)), 1.307 * Math.sin(deg(a)), 0] }))],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]], center: 0, lonePairs: [], dipole: 0,
    why: 'Three equal B–F dipoles, 120° apart in one plane, add to zero, like three equal tugs on a ring.',
  })

  // NH₃: trigonal pyramidal, N–H 1.012 Å, ∠HNH 106.7°. 1.47 D.
  list.push({
    id: 'NH3', view: [0.3, 0.35, 1], formula: 'NH₃', name: 'Ammonia', shape: 'Trigonal pyramidal',
    atoms: [{ el: 'N', pos: [0, 0, 0] }, ...tripod(1.012, thetaFor(106.7)).map((p): PAtom => ({ el: 'H', pos: p }))],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]], center: 0, lonePairs: [[0, 1, 0]], dipole: 1.47,
    why: 'The lone pair pushes the three N–H bonds down into a pyramid, so their dipoles all lean the same way and add up.',
  })

  // CCl₄: tetrahedral, C–Cl 1.767 Å. 0 D.
  list.push({
    id: 'CCl4', view: [0.35, 1.1, 1], formula: 'CCl₄', name: 'Carbon tetrachloride', shape: 'Tetrahedral',
    atoms: [
      { el: 'C', pos: [0, 0, 0] },
      { el: 'Cl', pos: [0, 1.767, 0] },
      ...tripod(1.767, 180 - (Math.acos(-1 / 3) * 180) / Math.PI) /* exact tetrahedral angle, 109.471° */.map((p): PAtom => ({ el: 'Cl', pos: p })),
    ],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], center: 0, lonePairs: [], dipole: 0,
    why: 'Four identical C–Cl dipoles pointing to the corners of a tetrahedron cancel exactly.',
  })

  // CHCl₃: C–H 1.080 Å, C–Cl 1.758 Å, ∠ClCCl 111.3°. 1.04 D.
  list.push({
    id: 'CHCl3', view: [0.35, 1.1, 1], formula: 'CHCl₃', name: 'Chloroform', shape: 'Tetrahedral',
    atoms: [
      { el: 'C', pos: [0, 0, 0] },
      { el: 'H', pos: [0, 1.08, 0] },
      ...tripod(1.758, thetaFor(111.3)).map((p): PAtom => ({ el: 'Cl', pos: p })),
    ],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], center: 0, lonePairs: [], dipole: 1.04,
    why: 'Same shape as CCl₄, but one corner is H instead of Cl. The dipoles no longer match, so they can’t cancel.',
  })

  // HF: 0.917 Å, 1.83 D.  HCl: 1.275 Å, 1.11 D.
  for (const [id, x, d, dip, name] of [
    ['HF', 'F', 0.917, 1.83, 'Hydrogen fluoride'],
    ['HCl', 'Cl', 1.275, 1.11, 'Hydrogen chloride'],
  ] as const) {
    list.push({
      id, formula: id, name, shape: 'Linear (two atoms)',
      atoms: [{ el: 'H', pos: [-d / 2, 0, 0] }, { el: x, pos: [d / 2, 0, 0] }],
      bonds: [[0, 1, 1]], center: 0, lonePairs: [], dipole: dip,
      why:
        id === 'HF'
          ? 'Only one bond, so its dipole IS the molecule’s dipole. F is the most electronegative element: a big difference, a big dipole.'
          : 'One bond again, but Cl is less electronegative than F, so the difference and the dipole are smaller.',
    })
  }
  return list
}

export const POLAR_MOLECULES = build()
export const byId = (id: string) => POLAR_MOLECULES.find((m) => m.id === id)!

export const PAIRS: Pair[] = [
  {
    id: 'co2-h2o', title: 'CO₂ vs H₂O', molecules: ['CO2', 'H2O'],
    lesson: 'Both have two polar bonds to a central atom. The only difference is the shape: straight vs bent.',
  },
  {
    id: 'bf3-nh3', title: 'BF₃ vs NH₃', molecules: ['BF3', 'NH3'],
    lesson: 'Both have three polar bonds. A lone pair on nitrogen bends ammonia into a pyramid; BF₃ stays flat.',
  },
  {
    id: 'ccl4-chcl3', title: 'CCl₄ vs CHCl₃', molecules: ['CCl4', 'CHCl3'],
    lesson: 'The same tetrahedral shape. Swapping one Cl for an H breaks the symmetry.',
  },
  {
    id: 'hf-hcl', title: 'HF vs HCl', molecules: ['HF', 'HCl'],
    lesson: 'One bond each. The size of the dipole follows the electronegativity difference.',
  },
]

/* ---------- electronegativity and bond dipoles ---------- */

const EN = new Map(ELEMENTS.map((e) => [e.symbol, e.values.en]))
export const electronegativity = (el: string) => {
  const v = EN.get(el)
  if (v == null) throw new Error(`No electronegativity for ${el}`)
  return v
}

/** Arrow length (Å) per unit of electronegativity difference. Display scale only. */
export const ARROW_SCALE = 1.1

export interface BondDipole {
  /** From the less to the more electronegative atom (toward the δ− end). */
  from: number
  to: number
  /** Electronegativity difference (≥ 0). */
  delta: number
  /** Arrow vector (Å): direction toward the δ− atom, length ARROW_SCALE × delta. */
  vector: Vec
}

export function bondDipoles(m: PolarMolecule, arrowScale = ARROW_SCALE): BondDipole[] {
  return m.bonds.map(([i, j]) => {
    const ei = electronegativity(m.atoms[i].el)
    const ej = electronegativity(m.atoms[j].el)
    const [from, to] = ei <= ej ? [i, j] : [j, i]
    const delta = Math.abs(ej - ei)
    return { from, to, delta, vector: scale(norm(sub(m.atoms[to].pos, m.atoms[from].pos)), arrowScale * delta) }
  })
}

/** Vector sum of the bond dipoles (the model's prediction for the net dipole). */
export const netDipole = (m: PolarMolecule, arrowScale = ARROW_SCALE): Vec => bondDipoles(m, arrowScale).reduce<Vec>((s, b) => add(s, b.vector), [0, 0, 0])

/**
 * Display scale for a molecule's arrows: its longest arrow is 1.4 Å, so small differences
 * (C–Cl, N–H) stay readable. A molecule's arrows are exactly to scale with each other.
 * HF and HCl share one scale, because comparing their sizes is the point of that pair.
 */
export const SHARED_SCALE = new Set(['HF', 'HCl'])
export function displayScale(m: PolarMolecule) {
  const ids = SHARED_SCALE.has(m.id) ? [...SHARED_SCALE] : [m.id]
  const maxDelta = Math.max(...ids.flatMap((id) => bondDipoles(byId(id), 1).map((b) => b.delta)))
  return 1.4 / maxDelta
}

/** δ+ / δ− for each atom: sum of (neighbor EN − own EN) over its bonds. Positive → δ+. */
export function partialCharges(m: PolarMolecule): ('+' | '−' | null)[] {
  return m.atoms.map((a, i) => {
    let sum = 0
    for (const [p, q] of m.bonds) {
      if (p === i) sum += electronegativity(m.atoms[q].el) - electronegativity(a.el)
      if (q === i) sum += electronegativity(m.atoms[p].el) - electronegativity(a.el)
    }
    return Math.abs(sum) < 0.05 ? null : sum > 0 ? '+' : '−'
  })
}

export { add, scale, sub, norm }
