/*
  fischer.ts — Fischer projections and group names, worked out from the 3D model.

  In a Fischer projection the carbon chain runs top to bottom (most oxidized carbon on top).
  At every stereocenter the vertical bonds point AWAY from you and the horizontal bonds point
  TOWARD you. So for each center we only need: which of its two side groups is on the right?
  We get that from the 3D model's handedness (a triple product), not from a rule of thumb.
*/
import { neighborsOf } from './cip'
import { triple, vec, type SMolecule } from './smiles'

/** A short condensed name for the group attached to `center` through atom `n` (e.g. OH, CH₃, COOH). */
export function groupName(m: SMolecule, center: number, n: number): string {
  const el = m.atoms[n].el
  const nb = neighborsOf(m, n).filter((k) => k !== center)
  const count = (e: string) => nb.filter((k) => m.atoms[k].el === e).length
  const hs = count('H')
  const H = hs === 0 ? '' : hs === 1 ? 'H' : `H${'₀₁₂₃'[hs]}`
  if (el === 'H') return 'H'
  if (el === 'O' || el === 'N') return `${el === 'N' ? 'N' : 'O'}${H}`
  if (el !== 'C') return el
  const order = (k: number) => m.bonds.find((b) => (b[0] === n && b[1] === k) || (b[1] === n && b[0] === k))![2]
  const dblO = nb.some((k) => m.atoms[k].el === 'O' && order(k) === 2)
  const oh = nb.filter((k) => m.atoms[k].el === 'O' && order(k) === 1)
  const carbons = nb.filter((k) => m.atoms[k].el === 'C')
  if (dblO && oh.length) return 'COOH'
  if (dblO && hs) return 'CHO'
  if (oh.length && !carbons.length) return `C${H}OH`
  if (!oh.length && !carbons.length) return `C${H}`
  if (carbons.length === 1 && !oh.length && hs === 2) {
    const next = groupName(m, n, carbons[0])
    if (next === 'CH₃') return 'CH₂CH₃'
  }
  return `C${H}…`
}

export interface FischerRow {
  /** The stereocenter (or chain carbon) on this row. */
  atom: number
  left: string
  right: string
  /** True if this row's carbon is a stereocenter (drawn as a crossing). */
  stereo: boolean
}

export interface Fischer {
  top: string
  rows: FischerRow[]
  bottom: string
}

/**
 * Build a Fischer projection for a chain of heavy atoms, listed TOP to BOTTOM
 * (top and bottom end groups included, e.g. [C1, C2, C3] for glyceraldehyde).
 */
export function fischer(m: SMolecule, chain: number[], isStereo: (atom: number) => boolean): Fischer {
  const rows: FischerRow[] = []
  for (let k = 1; k < chain.length - 1; k++) {
    const c = chain[k]
    const up = chain[k - 1]
    const down = chain[k + 1]
    const sides = neighborsOf(m, c).filter((n) => n !== up && n !== down)
    const rel = (i: number) => vec.sub(m.atoms[i].pos, m.atoms[c].pos)
    // With "up" and "down" going back and the sides coming forward, a side group X is on the
    // RIGHT exactly when triple(up, down, X) < 0.
    const [x, y] = sides
    const xRight = triple(rel(up), rel(down), rel(x)) < 0
    rows.push({ atom: c, left: groupName(m, c, xRight ? y : x), right: groupName(m, c, xRight ? x : y), stereo: isStereo(c) })
  }
  return { top: groupName(m, chain[1], chain[0]), rows, bottom: groupName(m, chain[chain.length - 2], chain[chain.length - 1]) }
}
