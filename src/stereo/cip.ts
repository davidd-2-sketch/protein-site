/*
  cip.ts — Cahn–Ingold–Prelog (CIP) priorities and R/S, the way students learn them.

  To rank the four groups on a stereocenter:
    1. Higher atomic number of the atom attached directly wins.
    2. Tie? Move outward one "sphere" at a time and compare the SETS of atoms found there
       (highest first), until the first point of difference.
    3. Double and triple bonds count as if the atom were attached two or three times
       ("duplicate atoms").
  Then point the lowest-priority group (4) away from you and trace 1 → 2 → 3:
  clockwise = R (rectus), counterclockwise = S (sinister).

  This covers the open-chain molecules on the Stereochemistry page. (The full CIP rules have
  extra tie-breakers, e.g. for isotopes or groups that differ only in their own R/S. None of
  our molecules need them, and the tests check every answer against PubChem's names.)
*/
import { triple, vec, type SMolecule } from './smiles'

const Z: Record<string, number> = { H: 1, B: 5, C: 6, N: 7, O: 8, F: 9, P: 15, S: 16, Cl: 17, Br: 35, I: 53 }
export const atomicNumber = (el: string) => Z[el] ?? 0

/** A node of the CIP tree: a real atom, a duplicate (from a multiple bond), or a phantom (Z = 0). */
interface Node {
  atom: number
  z: number
  parent: number
  duplicate: boolean
}

function bondOrder(m: SMolecule, a: number, b: number) {
  return m.bonds.find((x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a))?.[2] ?? 0
}

export function neighborsOf(m: SMolecule, i: number) {
  return m.bonds.flatMap((b) => (b[0] === i ? [b[1]] : b[1] === i ? [b[0]] : []))
}

/** The branches one sphere further out from `n`, highest atomic number first, padded to three. */
function children(m: SMolecule, n: Node): Node[] {
  const out: Node[] = []
  if (n.z > 1 && !n.duplicate) {
    for (const k of neighborsOf(m, n.atom)) {
      const order = bondOrder(m, n.atom, k)
      const z = atomicNumber(m.atoms[k].el)
      if (k !== n.parent) out.push({ atom: k, z, parent: n.atom, duplicate: false })
      for (let d = 1; d < order; d++) out.push({ atom: k, z, parent: n.atom, duplicate: true })
    }
  }
  // Hydrogens have no further branches; everything else is padded with phantom atoms (Z = 0).
  if (n.z > 1) while (out.length < 3) out.push({ atom: -1, z: 0, parent: n.atom, duplicate: true })
  return out.sort((a, b) => b.z - a.z)
}

/**
 * Compare two branches leaving `center` through atoms a and b.
 * Positive: a has higher priority. 0: no difference found (equal groups).
 */
export function compareBranches(m: SMolecule, center: number, a: number, b: number): number {
  const za = atomicNumber(m.atoms[a].el)
  const zb = atomicNumber(m.atoms[b].el)
  if (za !== zb) return za - zb
  let fa: Node[] = [{ atom: a, z: za, parent: center, duplicate: false }]
  let fb: Node[] = [{ atom: b, z: zb, parent: center, duplicate: false }]
  for (let sphere = 0; sphere < 12; sphere++) {
    // Explore the sets in order: each node's own branches, as a set, highest first.
    const sa = fa.map((n) => children(m, n))
    const sb = fb.map((n) => children(m, n))
    for (let k = 0; k < Math.max(sa.length, sb.length); k++) {
      const x = (sa[k] ?? []).map((n) => n.z)
      const y = (sb[k] ?? []).map((n) => n.z)
      for (let j = 0; j < Math.max(x.length, y.length); j++) {
        const d = (x[j] ?? -1) - (y[j] ?? -1)
        if (d !== 0) return d
      }
    }
    fa = sa.flat().filter((n) => n.z > 1)
    fb = sb.flat().filter((n) => n.z > 1)
    if (!fa.length && !fb.length) return 0
  }
  return 0
}

/** The four neighbors of `center`, highest priority first. null if two are tied (not a stereocenter). */
export function priorities(m: SMolecule, center: number): number[] | null {
  const nb = neighborsOf(m, center)
  if (nb.length !== 4) return null
  const sorted = [...nb].sort((a, b) => compareBranches(m, center, b, a))
  for (let i = 0; i < 3; i++) if (compareBranches(m, center, sorted[i], sorted[i + 1]) === 0) return null
  return sorted
}

/** R or S for a stereocenter (null if it isn't one). */
export function descriptor(m: SMolecule, center: number): 'R' | 'S' | null {
  const p = priorities(m, center)
  if (!p) return null
  const c = m.atoms[center].pos
  const [a, b, d] = [p[0], p[1], p[2]].map((i) => vec.sub(m.atoms[i].pos, c))
  // With the lowest group pointing away, 1 → 2 → 3 is clockwise when this is negative.
  return triple(a, b, d) < 0 ? 'R' : 'S'
}

/** Every stereocenter (sp³ atom with four different groups), in atom order. */
export function stereocenters(m: SMolecule): number[] {
  return m.atoms.map((_, i) => i).filter((i) => m.atoms[i].el !== 'H' && priorities(m, i) !== null)
}
