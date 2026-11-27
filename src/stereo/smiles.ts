/*
  smiles.ts — turn a SMILES string (the text code chemists and PubChem use for a molecule)
  into a 3D ball-and-stick model.

  SMILES in 20 seconds:  C[C@@H](C(=O)O)N  is L-alanine.
    • letters are atoms (hydrogens are usually left out and added back here),
    • ( ) are side branches, = is a double bond,
    • [C@@H] is a carbon with one H whose four neighbors go CLOCKWISE (@@) or
      ANTICLOCKWISE (@) when viewed from the first neighbor. That records which mirror
      image it is, so the 3D model built here has the right handedness.

  We only need the parts of SMILES used by small open-chain molecules: no rings, no charges.

  The 3D model uses textbook geometry (109.5° around sp³ atoms, 120° around sp² atoms,
  typical bond lengths) with chains drawn zigzag (anti). It is ILLUSTRATIVE: right shape and
  right handedness, not measured coordinates.
*/

export type Vec3 = [number, number, number]

export interface SAtom {
  el: string
  pos: Vec3
}

export interface SMolecule {
  atoms: SAtom[]
  /** [atom a, atom b, bond order] */
  bonds: [number, number, number][]
}

/* ---------------------------------------------------------------- vectors */
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => mul(a, 1 / Math.hypot(...a))
export const triple = (a: Vec3, b: Vec3, c: Vec3) => dot(a, cross(b, c))
export const vec = { add, sub, mul, dot, cross, norm }

/* ---------------------------------------------------------------- parsing */
interface PAtom {
  el: string
  chiral: '@' | '@@' | null
  /** Hydrogens written inside brackets, e.g. [C@@H] → 1. null = not a bracket atom. */
  bracketH: number | null
  /** Neighbors in SMILES order. 'H' marks where a bracket hydrogen sits in that order. */
  order: (number | 'H')[]
}

const VALENCE: Record<string, number> = { B: 3, C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1, S: 2, P: 3 }

function parse(smiles: string) {
  const atoms: PAtom[] = []
  const bonds: [number, number, number][] = []
  const stack: number[] = []
  let prev = -1
  let pendingOrder = 1
  let i = 0
  const addAtom = (a: PAtom) => {
    const idx = atoms.length
    atoms.push(a)
    if (prev >= 0) {
      bonds.push([prev, idx, pendingOrder])
      atoms[prev].order.push(idx)
      a.order.push(prev)
    }
    // A bracket H comes right after the preceding atom in the neighbor order (or first, if none).
    if (a.bracketH) for (let h = 0; h < a.bracketH; h++) a.order.push('H')
    pendingOrder = 1
    prev = idx
  }
  while (i < smiles.length) {
    const ch = smiles[i]
    if (ch === '(') {
      stack.push(prev)
      i++
    } else if (ch === ')') {
      prev = stack.pop()!
      i++
    } else if (ch === '=' || ch === '#' || ch === '-') {
      pendingOrder = ch === '=' ? 2 : ch === '#' ? 3 : 1
      i++
    } else if (ch === '[') {
      const end = smiles.indexOf(']', i)
      const body = smiles.slice(i + 1, end)
      const m = /^([A-Z][a-z]?)(@@|@)?(H(\d?))?$/.exec(body)
      if (!m) throw new Error(`Unsupported bracket atom [${body}]`)
      addAtom({ el: m[1], chiral: (m[2] as '@' | '@@') ?? null, bracketH: m[3] ? Number(m[4] || 1) : 0, order: [] })
      i = end + 1
    } else {
      const two = smiles.slice(i, i + 2)
      const el = two === 'Cl' || two === 'Br' ? two : ch
      if (!VALENCE[el]) throw new Error(`Unsupported SMILES character "${ch}" in ${smiles}`)
      addAtom({ el, chiral: null, bracketH: null, order: [] })
      i += el.length
    }
  }
  return { atoms, bonds }
}

/* ---------------------------------------------------------------- 3D geometry */
const LENGTHS: Record<string, number> = {
  'C-C': 1.53, 'C=C': 1.34, 'C-H': 1.09, 'C-O': 1.43, 'C=O': 1.21, 'C-N': 1.47, 'C-F': 1.35,
  'C-Cl': 1.77, 'C-Br': 1.94, 'C-I': 2.14, 'O-H': 0.96, 'N-H': 1.01,
}
const bondLength = (a: string, b: string, order: number) => {
  const sym = order === 2 ? '=' : '-'
  return LENGTHS[`${a}${sym}${b}`] ?? LENGTHS[`${b}${sym}${a}`] ?? 1.5
}

/** Any unit vector perpendicular to `v`. */
const perpTo = (v: Vec3): Vec3 => norm(cross(v, Math.abs(v[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]))

/**
 * Directions for `n` new bonds from an atom whose existing bond points along `back`
 * (toward its parent). `ref` (⊥ back) is where the first new bond should lean: away from
 * the grandparent, which gives a zigzag (anti) chain.
 */
function childDirections(back: Vec3, ref: Vec3, trigonal: boolean, n: number): Vec3[] {
  const side = cross(back, ref)
  if (trigonal) {
    // 120° from the parent bond, in one plane.
    const c = Math.cos((120 * Math.PI) / 180)
    const s = Math.sin((120 * Math.PI) / 180)
    return [add(mul(back, c), mul(ref, s)), add(mul(back, c), mul(ref, -s))].slice(0, n)
  }
  const c = -1 / 3 // cos 109.47°
  const s = Math.sqrt(1 - c * c)
  return [0, 120, 240].slice(0, Math.max(n, 3)).map((deg) => {
    const p = (deg * Math.PI) / 180
    return add(mul(back, c), mul(add(mul(ref, Math.cos(p)), mul(side, Math.sin(p))), s))
  }).slice(0, n)
}

/** Four tetrahedral (or three trigonal) directions for the first atom, which has no parent. */
function rootDirections(trigonal: boolean, n: number): Vec3[] {
  if (trigonal) return [[1, 0, 0], [-0.5, 0.866, 0], [-0.5, -0.866, 0]].slice(0, n) as Vec3[]
  const t: Vec3[] = [
    [0, 0, 1],
    norm([0.9428, 0, -0.3333]),
    norm([-0.4714, 0.8165, -0.3333]),
    norm([-0.4714, -0.8165, -0.3333]),
  ]
  return t.slice(0, n)
}

/**
 * Parse a SMILES string and build its 3D model, hydrogens included.
 * Heavy atoms keep their SMILES order (atom 0 is the first atom written); hydrogens follow.
 */
export function fromSmiles(smiles: string): SMolecule {
  const { atoms: pa, bonds } = parse(smiles)
  const atoms: SAtom[] = pa.map((a) => ({ el: a.el, pos: [0, 0, 0] }))
  const allBonds = [...bonds]

  // Add hydrogens: bracket ones keep their place in the neighbor order; implicit ones go last.
  pa.forEach((a, i) => {
    const used = bonds.filter((b) => b[0] === i || b[1] === i).reduce((s, b) => s + b[2], 0)
    const implicit = a.bracketH === null ? Math.max(0, VALENCE[a.el] - used) : 0
    a.order = a.order.map((n) => {
      if (n !== 'H') return n
      atoms.push({ el: 'H', pos: [0, 0, 0] })
      allBonds.push([i, atoms.length - 1, 1])
      return atoms.length - 1
    })
    for (let h = 0; h < implicit; h++) {
      atoms.push({ el: 'H', pos: [0, 0, 0] })
      allBonds.push([i, atoms.length - 1, 1])
      a.order.push(atoms.length - 1)
    }
  })
  const neighbors = (i: number): number[] => (i < pa.length ? (pa[i].order as number[]) : allBonds.filter((b) => b[1] === i).map((b) => b[0]))
  const orderOf = (a: number, b: number) => allBonds.find((x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a))![2]
  const trigonalAt = (i: number) => i < pa.length && neighbors(i).some((n) => orderOf(i, n) === 2)

  const placed = new Set<number>([0])
  const place = (i: number, parent: number | null, grand: number | null) => {
    const kids = neighbors(i).filter((n) => n !== parent)
    if (!kids.length) return
    const trig = trigonalAt(i)
    let dirs: Vec3[]
    if (parent === null) dirs = rootDirections(trig, kids.length)
    else {
      const back = norm(sub(atoms[parent].pos, atoms[i].pos))
      let ref: Vec3
      if (grand !== null) {
        const g = sub(atoms[grand].pos, atoms[parent].pos)
        const gPerp = sub(g, mul(back, dot(g, back)))
        ref = Math.hypot(...gPerp) > 1e-6 ? norm(mul(gPerp, -1)) : perpTo(back)
      } else ref = perpTo(back)
      dirs = childDirections(back, ref, trig, kids.length)
    }
    // Heavier groups take the first (zigzag) positions, hydrogens fill the rest.
    const slots = kids.map((_, k) => k)
    const sorted = [...kids].sort((a, b) => Number(atoms[a].el === 'H') - Number(atoms[b].el === 'H'))
    const at = new Map<number, Vec3>(sorted.map((k, j) => [k, dirs[slots[j]]]))

    // Chirality: make the neighbors (in SMILES order) turn the way @ / @@ says.
    const chiral = i < pa.length ? pa[i].chiral : null
    if (chiral) {
      const order = neighbors(i)
      const posOf = (n: number): Vec3 => (n === parent ? norm(sub(atoms[parent!].pos, atoms[i].pos)) : at.get(n)!)
      // Seen from order[0], order[1..3] run clockwise when this triple product is positive.
      // (order[0] is always the parent when there is one: the atom written just before.)
      const clockwise = triple(posOf(order[1]), posOf(order[2]), posOf(order[3])) > 0
      if (clockwise !== (chiral === '@@')) {
        // Swap two non-parent neighbors to flip the handedness.
        const [x, y] = order.filter((n) => n !== parent).slice(-2)
        const px = at.get(x)!
        at.set(x, at.get(y)!)
        at.set(y, px)
      }
    }
    for (const k of kids) {
      atoms[k].pos = add(atoms[i].pos, mul(at.get(k)!, bondLength(atoms[i].el, atoms[k].el, orderOf(i, k))))
      placed.add(k)
    }
    for (const k of kids) place(k, i, parent)
  }
  place(0, null, null)
  if (placed.size !== atoms.length) throw new Error(`Could not place every atom of ${smiles}`)
  // Center the model on its middle.
  const c = mul(atoms.reduce<Vec3>((s, a) => add(s, a.pos), [0, 0, 0]), 1 / atoms.length)
  atoms.forEach((a) => (a.pos = sub(a.pos, c)))
  return { atoms, bonds: allBonds }
}
