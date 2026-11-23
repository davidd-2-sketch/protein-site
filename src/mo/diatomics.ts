/*
  diatomics.ts — molecular orbital (MO) diagrams for two-atom molecules.

  A diagram lists:
    • the atomic orbitals (AOs) of each atom, left and right, with schematic energies,
    • the molecular orbitals (MOs) they combine into: bonding (lower energy), antibonding
      (higher), or nonbonding (about the same as the AO they came from).
  Electrons fill MOs lowest first (Aufbau), one per orbital in a degenerate set before
  pairing (Hund's rule). Bond order = (bonding electrons − antibonding electrons) / 2.

  ENERGIES ARE SCHEMATIC (not to scale): they show the ORDER of the levels, which is what the
  Gen Chem model predicts. For CO, NO, and HF the atoms' AO heights follow their measured
  valence orbital energies (more electronegative atom = lower). Core (1s)
  electrons of second-row atoms are left out, as in most textbooks.

  Level ORDER (standard Gen Chem, e.g. OpenStax Chemistry 2e §8.4; Tro; Housecroft):
    Li₂–N₂: σ2s < σ*2s < π2p < σ2p < π*2p < σ*2p   (2s–2p mixing pushes σ2p above π2p)
    O₂–Ne₂: σ2s < σ*2s < σ2p < π2p < π*2p < σ*2p
  Measured bond lengths: Huber & Herzberg, Constants of Diatomic Molecules (via NIST).
  Bond energies (298 K): CRC Handbook. Sources and checks are listed in reference/README.md.
*/
import type { OrbitalView } from '../orbitals/OrbitalScene'

export type MoKind = 'bonding' | 'antibonding' | 'nonbonding'

export interface AO {
  id: string
  side: 'L' | 'R'
  label: string
  /** Schematic energy (higher = less stable). */
  e: number
  /** Degenerate orbitals drawn as one level (e.g. three 2p). */
  deg: number
}

export interface Level {
  id: string
  /** RichText label, e.g. 'σ*_2s'. */
  label: string
  kind: MoKind
  deg: 1 | 2
  e: number
  /** The AOs it is made from (for the connecting lines). */
  from: string[]
  /** Its 3D shape (OrbitalScene view), if we can draw it. */
  shape?: OrbitalView
}

export interface Diagram {
  id: string
  aos: AO[]
  levels: Level[]
  /** Small print under the diagram. */
  note?: string
}

/* ------------------------------------------------------------------ diagrams */

const sameAtoms = (p: string, e2s: number, e2p: number): AO[] => [
  { id: `L${p}s`, side: 'L', label: `${p}s`, e: e2s, deg: 1 },
  { id: `R${p}s`, side: 'R', label: `${p}s`, e: e2s, deg: 1 },
  ...(p === '2'
    ? ([
        { id: 'L2p', side: 'L', label: '2p', e: e2p, deg: 3 },
        { id: 'R2p', side: 'R', label: '2p', e: e2p, deg: 3 },
      ] as AO[])
    : []),
]

const bond = (id: string): OrbitalView => ({ kind: 'bond', id })

/** H₂ and He₂: just the two 1s orbitals. */
const D_1S: Diagram = {
  id: '1s',
  aos: sameAtoms('1', 0, 0),
  levels: [
    { id: 's1s', label: 'σ_1s', kind: 'bonding', deg: 1, e: -1.1, from: ['L1s', 'R1s'], shape: bond('h2-bonding') },
    { id: 's1s*', label: 'σ*_1s', kind: 'antibonding', deg: 1, e: 1.35, from: ['L1s', 'R1s'], shape: bond('h2-antibonding') },
  ],
}

const second = (mixed: boolean): Diagram => ({
  id: mixed ? 'mixed' : 'unmixed',
  aos: sameAtoms('2', -3, 0),
  levels: [
    { id: 's2s', label: 'σ_2s', kind: 'bonding', deg: 1, e: -3.75, from: ['L2s', 'R2s'], shape: bond('mo-s2-sigma') },
    { id: 's2s*', label: 'σ*_2s', kind: 'antibonding', deg: 1, e: -2.15, from: ['L2s', 'R2s'], shape: bond('mo-s2-sigma*') },
    { id: 'p2p', label: 'π_2p', kind: 'bonding', deg: 2, e: mixed ? -1.15 : -0.75, from: ['L2p', 'R2p'], shape: bond('p-pi') },
    { id: 's2p', label: 'σ_2p', kind: 'bonding', deg: 1, e: mixed ? -0.6 : -1.3, from: ['L2p', 'R2p'], shape: bond('p-sigma') },
    { id: 'p2p*', label: 'π*_2p', kind: 'antibonding', deg: 2, e: 0.95, from: ['L2p', 'R2p'], shape: bond('mo-p-pi*') },
    { id: 's2p*', label: 'σ*_2p', kind: 'antibonding', deg: 1, e: 1.8, from: ['L2p', 'R2p'], shape: bond('mo-p-sigma*') },
  ],
  note: mixed
    ? 'Li₂ to N₂: the 2s and 2p orbitals are close in energy and mix, which pushes σ_2p above π_2p.'
    : 'O₂ to Ne₂: the 2s and 2p are far apart, so σ_2p stays below π_2p.',
})

const D_MIXED = second(true)
const D_UNMIXED = second(false)

/*
  Unequal atoms. The more electronegative atom's orbitals sit LOWER. The heights below keep
  the order of the measured valence orbital energies (eV):
    H 1s −13.6 · C 2s −19.4, 2p −10.7 · N 2s −25.6, 2p −13.2 · O 2s −32.4, 2p −15.9 · F 2s −40.2, 2p −18.7
  (as tabulated in Miessler, Fischer & Tarr, Inorganic Chemistry), but are spaced for
  readability, not to scale. Bonding MOs lie closer to (and look more like) the lower atom's
  AOs; antibonding MOs look more like the higher atom's. The "polar-" 3D shapes are drawn
  lopsided that way.
*/
const D_CO: Diagram = {
  id: 'co',
  aos: [
    { id: 'L2s', side: 'L', label: '2s', e: -2.4, deg: 1 },
    { id: 'L2p', side: 'L', label: '2p', e: -0.6, deg: 3 },
    { id: 'R2s', side: 'R', label: '2s', e: -3.6, deg: 1 },
    { id: 'R2p', side: 'R', label: '2p', e: -1.4, deg: 3 },
  ],
  levels: [
    { id: 's2s', label: 'σ', kind: 'bonding', deg: 1, e: -4.15, from: ['L2s', 'R2s'], shape: bond('polar-s2-sigma') },
    { id: 's2s*', label: 'σ*', kind: 'antibonding', deg: 1, e: -2.0, from: ['L2s', 'R2s'], shape: bond('polar-s2-sigma*') },
    { id: 'p2p', label: 'π', kind: 'bonding', deg: 2, e: -1.7, from: ['L2p', 'R2p'], shape: bond('polar-p-pi') },
    { id: 's2p', label: 'σ', kind: 'bonding', deg: 1, e: -1.05, from: ['L2p', 'R2p'], shape: bond('polar-p-sigma') },
    { id: 'p2p*', label: 'π*', kind: 'antibonding', deg: 2, e: 0.45, from: ['L2p', 'R2p'], shape: bond('polar-p-pi*') },
    { id: 's2p*', label: 'σ*', kind: 'antibonding', deg: 1, e: 1.35, from: ['L2p', 'R2p'], shape: bond('polar-p-sigma*') },
  ],
  note: 'Same level order as N₂. Oxygen’s orbitals sit lower because oxygen is more electronegative.',
}

const D_NO: Diagram = {
  id: 'no',
  aos: [
    { id: 'L2s', side: 'L', label: '2s', e: -2.8, deg: 1 },
    { id: 'L2p', side: 'L', label: '2p', e: -0.9, deg: 3 },
    { id: 'R2s', side: 'R', label: '2s', e: -3.6, deg: 1 },
    { id: 'R2p', side: 'R', label: '2p', e: -1.4, deg: 3 },
  ],
  levels: [
    { id: 's2s', label: 'σ', kind: 'bonding', deg: 1, e: -4.15, from: ['L2s', 'R2s'], shape: bond('polar-s2-sigma') },
    { id: 's2s*', label: 'σ*', kind: 'antibonding', deg: 1, e: -2.4, from: ['L2s', 'R2s'], shape: bond('polar-s2-sigma*') },
    { id: 's2p', label: 'σ', kind: 'bonding', deg: 1, e: -1.95, from: ['L2p', 'R2p'], shape: bond('polar-p-sigma') },
    { id: 'p2p', label: 'π', kind: 'bonding', deg: 2, e: -1.65, from: ['L2p', 'R2p'], shape: bond('polar-p-pi') },
    { id: 'p2p*', label: 'π*', kind: 'antibonding', deg: 2, e: 0.3, from: ['L2p', 'R2p'], shape: bond('polar-p-pi*') },
    { id: 's2p*', label: 'σ*', kind: 'antibonding', deg: 1, e: 1.2, from: ['L2p', 'R2p'], shape: bond('polar-p-sigma*') },
  ],
  note: 'Textbooks differ on whether NO’s σ or π level is lower. Either way, the bond order and the one unpaired electron come out the same.',
}

const D_HF: Diagram = {
  id: 'hf',
  aos: [
    { id: 'L1s', side: 'L', label: '1s', e: -0.9, deg: 1 },
    { id: 'R2s', side: 'R', label: '2s', e: -4.0, deg: 1 },
    { id: 'R2p', side: 'R', label: '2p', e: -1.9, deg: 3 },
  ],
  levels: [
    { id: 'nb2s', label: 'n (2s)', kind: 'nonbonding', deg: 1, e: -4.0, from: ['R2s'], shape: bond('hf-2s') },
    { id: 'sig', label: 'σ', kind: 'bonding', deg: 1, e: -2.55, from: ['L1s', 'R2p'], shape: bond('hf-sigma') },
    { id: 'nbp', label: 'n (2p)', kind: 'nonbonding', deg: 2, e: -1.9, from: ['R2p'], shape: bond('hf-nb') },
    { id: 'sig*', label: 'σ*', kind: 'antibonding', deg: 1, e: 0.25, from: ['L1s', 'R2p'], shape: bond('hf-sigma*') },
  ],
  note: 'Only one of fluorine’s 2p orbitals points at hydrogen, so only it can bond. The other two stay on fluorine as nonbonding orbitals (n), as does fluorine’s 2s: these are its three lone pairs.',
}

export const DIAGRAMS: Record<string, Diagram> = { '1s': D_1S, mixed: D_MIXED, unmixed: D_UNMIXED, co: D_CO, no: D_NO, hf: D_HF }

/* ------------------------------------------------------------------ molecules */

export interface Diatomic {
  id: string
  formula: string
  name: string
  /** Element symbols, left then right. */
  atoms: [string, string]
  /** Valence electrons of the neutral molecule (what the diagram holds). */
  electrons: number
  diagram: string
  /** Measured bond length (pm), if the molecule exists as a stable gas-phase molecule. */
  length?: number
  /** Measured bond dissociation energy at 298 K (kJ/mol). */
  energy?: number
  /** Measured magnetism of the neutral molecule. */
  magnetism?: 'paramagnetic' | 'diamagnetic'
  /** A short honest note (e.g. "does not form a stable molecule"). */
  note?: string
}

export const DIATOMICS: Diatomic[] = [
  { id: 'h2', formula: 'H₂', name: 'Hydrogen', atoms: ['H', 'H'], electrons: 2, diagram: '1s', length: 74.1, energy: 436.0, magnetism: 'diamagnetic' },
  { id: 'he2', formula: 'He₂', name: 'Helium', atoms: ['He', 'He'], electrons: 4, diagram: '1s', note: 'Bond order 0: helium does not form a stable He₂ molecule. (An extremely weak He₂ can exist near absolute zero, held by much weaker forces than a bond.)' },
  { id: 'li2', formula: 'Li₂', name: 'Lithium', atoms: ['Li', 'Li'], electrons: 2, diagram: 'mixed', length: 267.3, note: 'Li₂ exists in lithium vapor; its long, weak bond uses lithium’s large 2s orbitals.' },
  { id: 'be2', formula: 'Be₂', name: 'Beryllium', atoms: ['Be', 'Be'], electrons: 4, diagram: 'mixed', note: 'Bond order 0: no ordinary Be₂ molecule. (Only a very weakly bound Be₂ has been observed in the gas phase.)' },
  { id: 'b2', formula: 'B₂', name: 'Boron', atoms: ['B', 'B'], electrons: 6, diagram: 'mixed', length: 159.0, magnetism: 'paramagnetic' },
  { id: 'c2', formula: 'C₂', name: 'Carbon', atoms: ['C', 'C'], electrons: 8, diagram: 'mixed', length: 124.2, magnetism: 'diamagnetic' },
  { id: 'n2', formula: 'N₂', name: 'Nitrogen', atoms: ['N', 'N'], electrons: 10, diagram: 'mixed', length: 109.8, energy: 945.3, magnetism: 'diamagnetic' },
  { id: 'o2', formula: 'O₂', name: 'Oxygen', atoms: ['O', 'O'], electrons: 12, diagram: 'unmixed', length: 120.7, energy: 498.4, magnetism: 'paramagnetic' },
  { id: 'f2', formula: 'F₂', name: 'Fluorine', atoms: ['F', 'F'], electrons: 14, diagram: 'unmixed', length: 141.2, energy: 158.8, magnetism: 'diamagnetic' },
  { id: 'ne2', formula: 'Ne₂', name: 'Neon', atoms: ['Ne', 'Ne'], electrons: 16, diagram: 'unmixed', note: 'Bond order 0: neon does not form a Ne₂ molecule.' },
  { id: 'co', formula: 'CO', name: 'Carbon monoxide', atoms: ['C', 'O'], electrons: 10, diagram: 'co', length: 112.8, energy: 1076.5, magnetism: 'diamagnetic', note: 'CO has the same number of electrons as N₂ (it is “isoelectronic”), and the same bond order: 3. Its bond is the strongest of any two-atom molecule.' },
  { id: 'no', formula: 'NO', name: 'Nitric oxide', atoms: ['N', 'O'], electrons: 11, diagram: 'no', length: 115.1, magnetism: 'paramagnetic' },
  { id: 'hf', formula: 'HF', name: 'Hydrogen fluoride', atoms: ['H', 'F'], electrons: 8, diagram: 'hf', length: 91.7, energy: 569.9, magnetism: 'diamagnetic' },
]

export const diatomicById = (id: string) => {
  const d = DIATOMICS.find((x) => x.id === id)
  if (!d) throw new Error(`Unknown diatomic ${id}`)
  return d
}

/* ------------------------------------------------------------------ filling */

export interface Filled {
  /** Electrons in each level, in the diagram's level order. */
  count: Record<string, number>
  /** Arrows per orbital within each level: e.g. [2, 1] = one pair and one single. */
  arrows: Record<string, number[]>
  bonding: number
  antibonding: number
  nonbonding: number
  bondOrder: number
  unpaired: number
}

/** Levels from lowest to highest energy (ties keep diagram order). */
export const byEnergy = (d: Diagram) => [...d.levels].sort((a, b) => a.e - b.e)

/** Fill `electrons` into a diagram: lowest level first, Hund's rule within degenerate levels. */
export function fill(d: Diagram, electrons: number): Filled {
  const count: Record<string, number> = {}
  const arrows: Record<string, number[]> = {}
  let left = Math.max(0, electrons)
  for (const lv of byEnergy(d)) {
    const n = Math.min(left, 2 * lv.deg)
    left -= n
    count[lv.id] = n
    // Hund: one in each orbital first, then pair up.
    const a: number[] = Array.from({ length: lv.deg }, (_, i) => (n > i ? 1 : 0))
    for (let i = 0; i < lv.deg && n - lv.deg > i; i++) a[i] = 2
    arrows[lv.id] = a
  }
  let bonding = 0
  let antibonding = 0
  let nonbonding = 0
  for (const lv of d.levels) {
    if (lv.kind === 'bonding') bonding += count[lv.id]
    else if (lv.kind === 'antibonding') antibonding += count[lv.id]
    else nonbonding += count[lv.id]
  }
  const unpaired = Object.values(arrows).reduce((s, a) => s + a.filter((x) => x === 1).length, 0)
  return { count, arrows, bonding, antibonding, nonbonding, bondOrder: (bonding - antibonding) / 2, unpaired }
}

/** How many electrons the diagram can hold. */
export const capacity = (d: Diagram) => d.levels.reduce((s, l) => s + 2 * l.deg, 0)

/** "O₂", "O₂⁺", "O₂²⁻" for a molecule with a given electron count. */
export function ionFormula(m: Diatomic, electrons: number) {
  const charge = m.electrons - electrons
  if (charge === 0) return m.formula
  const sup: Record<string, string> = { '1': '', '2': '²', '3': '³', '4': '⁴' }
  return `${m.formula}${sup[String(Math.abs(charge))] ?? Math.abs(charge)}${charge > 0 ? '⁺' : '⁻'}`
}

/** "1", "2.5", "½" style bond order for display. */
export const fmtOrder = (bo: number) => (bo === 0.5 ? '½' : Number.isInteger(bo) ? String(bo) : bo.toFixed(1))

/* ------------------------------------------------------------------ checking a student's filling */

/** Each orbital line holds 0, 1 (↑) or 2 (↑↓) electrons, by level id. */
export type Arrows = Record<string, number[]>

export const emptyArrows = (d: Diagram): Arrows => Object.fromEntries(d.levels.map((l) => [l.id, Array.from({ length: l.deg }, () => 0)]))
export const arrowCount = (a: Arrows) => Object.values(a).reduce((s, x) => s + x.reduce((t, y) => t + y, 0), 0)
const plain = (label: string) => label.replace('_', '')

/**
 * Check a filled diagram in the order students should think about it: the electron count,
 * then lowest levels first (Aufbau), then one-per-orbital before pairing (Hund's rule).
 * The Pauli principle (at most 2, opposite spins) is built in: a line can't hold more than 2.
 */
export function checkFill(d: Diagram, electrons: number, a: Arrows): { ok: boolean; message: string; level?: string } {
  const n = arrowCount(a)
  if (n !== electrons)
    return { ok: false, message: n < electrons ? `You’ve placed ${n} of ${electrons} electrons. Place ${electrons - n} more.` : `You’ve placed ${n}, but there are only ${electrons}. Remove ${n - electrons}.` }
  const levels = byEnergy(d)
  const full = (id: string) => a[id].every((x) => x === 2)
  for (let i = 0; i < levels.length; i++) {
    if (full(levels[i].id)) continue
    const higher = levels.slice(i + 1).find((l) => a[l.id].some((x) => x > 0))
    if (higher)
      return {
        ok: false,
        level: higher.id,
        message: `${plain(higher.label)} has electrons, but ${plain(levels[i].label)} (lower in energy) isn’t full yet. Fill the lowest levels first.`,
      }
    break
  }
  for (const l of levels) {
    const x = a[l.id]
    if (l.deg > 1 && x.some((v) => v === 2) && x.some((v) => v === 0))
      return { ok: false, level: l.id, message: `In ${plain(l.label)}, put one electron in each of the ${l.deg} equal-energy orbitals before pairing any (Hund’s rule).` }
  }
  return { ok: true, message: 'Correct! Lowest levels first, and one electron per orbital before pairing.' }
}
