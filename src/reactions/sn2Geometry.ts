/*
  sn2Geometry.ts — atom positions for HO⁻ + (S)-2-bromobutane → (R)-butan-2-ol + Br⁻.

  The whole reaction is described by one number, the "reaction coordinate" s:
      s = 0    reactants, far apart
      s = 0.5  transition state (the top of the energy hill)
      s = 1    products
  For any s, sn2Atoms(s) returns every atom's position. The animation just moves s.

  FRAME OF REFERENCE
    The central carbon (C2, the stereocenter) sits at the origin.
    The reaction happens along the x-axis: hydroxide comes in from −x, bromide leaves toward +x.
    The three groups that stay on carbon (H, CH₃, CH₂CH₃) fold like an umbrella:
    pointing toward −x at the start, flat at the transition state, toward +x at the end.

  HONESTY
    Start and end structures use standard measured bond lengths and the tetrahedral angle.
    The path between them and the transition-state distances are an approximate teaching
    model, not a quantum-chemistry calculation.

  All distances in ångströms (Å). This file has no imports, so it can also be run directly
  by a test script to check the stereochemistry.
*/
import { BULGE, pos, v, type ArrowSpec, type Mechanism } from './mechanism'

export type Vec = [number, number, number]

export interface ReactionAtom {
  id: string
  element: 'C' | 'H' | 'O' | 'Br'
  position: Vec
}

export interface ReactionBond {
  a: string
  b: string
  /** 1 = full bond, 0 = no bond, in between = partial bond (drawn dashed). */
  order: number
}

/* ---------- Standard bond lengths (Å) ---------- */
export const LENGTHS = {
  CBr: 1.97, // C–Br in bromoalkanes (≈1.94–1.97 Å)
  CO: 1.43, // C–O in alcohols
  CC: 1.53, // C–C single bond
  CH: 1.09, // C–H
  OH: 0.96, // O–H
  // Transition-state distances: APPROXIMATE. Partial bonds are longer than full ones.
  CO_TS: 2.05,
  CBr_TS: 2.45,
  // How far apart the reactants start, and how far bromide drifts away at the end.
  FAR: 5.0,
}

const TETRAHEDRAL = 109.47 // degrees

/* ---------- Small vector helpers ---------- */
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec): Vec => scale(a, 1 / Math.hypot(...a))
const deg = (d: number) => (d * Math.PI) / 180
export const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
/** Smooth 0→1 ramp between edge0 and edge1 (eases in and out). */
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

const X: Vec = [1, 0, 0]

/** Direction at angle `alpha` from +x, turned by `phi` around the x-axis. */
const umbrellaDir = (alphaDeg: number, phiDeg: number): Vec => [
  Math.cos(deg(alphaDeg)),
  Math.sin(deg(alphaDeg)) * Math.cos(deg(phiDeg)),
  Math.sin(deg(alphaDeg)) * Math.sin(deg(phiDeg)),
]

/**
 * The three tetrahedral directions on an atom bonded back along -u.
 * (Each makes 109.47° with the bond pointing back.) `turn` rotates them around u.
 */
function tetrahedralSlots(u: Vec, turn: number): Vec[] {
  const e1 = norm(cross(u, X)) // a direction perpendicular to u (u is never parallel to x here)
  const e2 = cross(u, e1)
  const c = -Math.cos(deg(TETRAHEDRAL)) // = 0.3333
  const s = Math.sin(deg(TETRAHEDRAL)) // = 0.9428
  return [0, 120, 240].map((a) => {
    const t = deg(a + turn)
    return norm(add(scale(u, c), add(scale(e1, s * Math.cos(t)), scale(e2, s * Math.sin(t)))))
  })
}

/*
  Which way each group points around the reaction axis (degrees around x).
  This choice sets the handedness. It was checked with configuration() below:
  the reactant is (S) and the product is (R).
*/
const PHI = { H: 90, CH3: 330, ET: 210 }

/* ---------- How each distance/angle changes with s ---------- */

/** C···O distance: hydroxide approaches, partial bond at the TS, full bond at the end. */
const distCO = (s: number) =>
  s < 0.5 ? lerp(LENGTHS.FAR, LENGTHS.CO_TS, smoothstep(0, 0.5, s)) : lerp(LENGTHS.CO_TS, LENGTHS.CO, smoothstep(0.5, 1, s))

/** C···Br distance: stretches only near the TS, then bromide drifts away. */
const distCBr = (s: number) =>
  s < 0.5 ? lerp(LENGTHS.CBr, LENGTHS.CBr_TS, smoothstep(0.25, 0.5, s)) : lerp(LENGTHS.CBr_TS, LENGTHS.FAR, smoothstep(0.5, 1, s))

/** Umbrella angle of the three groups from +x: 109.47° → 90° (flat, TS) → 70.53°. */
const umbrellaAngle = (s: number) => lerp(TETRAHEDRAL, 180 - TETRAHEDRAL, smoothstep(0.25, 0.75, s))

/** How "formed" the C–O bond is (0 → 1). The C–Br bond is the reverse (1 → 0). */
export const bondProgress = (s: number) => smoothstep(0.3, 0.7, s)

/* ---------- Build all atoms for a given s ---------- */

export function sn2Atoms(s: number): ReactionAtom[] {
  const atoms: ReactionAtom[] = []
  const put = (id: string, element: ReactionAtom['element'], position: Vec) => atoms.push({ id, element, position })

  const C2: Vec = [0, 0, 0]
  put('C2', 'C', C2)

  const alpha = umbrellaAngle(s)

  // Hydrogen on the stereocenter
  put('H2', 'H', scale(umbrellaDir(alpha, PHI.H), LENGTHS.CH))

  // Methyl group (C1 and its three hydrogens)
  const uMe = umbrellaDir(alpha, PHI.CH3)
  const C1 = scale(uMe, LENGTHS.CC)
  put('C1', 'C', C1)
  tetrahedralSlots(uMe, 60).forEach((d, i) => put(`H1${i}`, 'H', add(C1, scale(d, LENGTHS.CH))))

  // Ethyl group (C3, its two hydrogens, C4 and its three hydrogens)
  const uEt = umbrellaDir(alpha, PHI.ET)
  const C3 = scale(uEt, LENGTHS.CC)
  put('C3', 'C', C3)
  const slots3 = tetrahedralSlots(uEt, 0)
  const C4 = add(C3, scale(slots3[0], LENGTHS.CC))
  put('C4', 'C', C4)
  put('H30', 'H', add(C3, scale(slots3[1], LENGTHS.CH)))
  put('H31', 'H', add(C3, scale(slots3[2], LENGTHS.CH)))
  tetrahedralSlots(slots3[0], 60).forEach((d, i) => put(`H4${i}`, 'H', add(C4, scale(d, LENGTHS.CH))))

  // Hydroxide: O on the −x side; its H angled so the final C–O–H angle is ~108.5°
  const O: Vec = [-distCO(s), 0, 0]
  put('O', 'O', O)
  put('HO', 'H', add(O, scale(norm([Math.cos(deg(108.5)), Math.sin(deg(108.5)) * Math.cos(deg(150)), Math.sin(deg(108.5)) * Math.sin(deg(150))]), LENGTHS.OH)))

  // Bromine on the +x side
  put('Br', 'Br', [distCBr(s), 0, 0])

  return atoms
}

export function sn2Bonds(s: number): ReactionBond[] {
  const p = bondProgress(s)
  const fixed: [string, string][] = [
    ['C2', 'H2'], ['C2', 'C1'], ['C2', 'C3'], ['C3', 'C4'], ['O', 'HO'],
    ['C1', 'H10'], ['C1', 'H11'], ['C1', 'H12'],
    ['C3', 'H30'], ['C3', 'H31'],
    ['C4', 'H40'], ['C4', 'H41'], ['C4', 'H42'],
  ]
  return [
    ...fixed.map(([a, b]) => ({ a, b, order: 1 })),
    { a: 'C2', b: 'O', order: p }, // forming
    { a: 'C2', b: 'Br', order: 1 - p }, // breaking
  ]
}

/** True once the umbrella has flipped past flat (groups lean toward +x = after the TS). */
function pastTransitionState(atoms: ReactionAtom[]): boolean {
  const p = (id: string) => atoms.find((a) => a.id === id)!.position
  return p('C1')[0] + p('C3')[0] + p('H2')[0] > 0
}

/**
 * R or S at the stereocenter, computed from the actual 3D positions using the
 * Cahn–Ingold–Prelog rules. Priorities: Br or OH (1) > ethyl (2) > methyl (3) > H (4).
 * Returns null when the carbon is flat (near the transition state).
 */
export function configuration(atoms: ReactionAtom[]): 'R' | 'S' | null {
  const p = (id: string) => atoms.find((a) => a.id === id)!.position
  const C = p('C2')
  // Highest priority = the heteroatom that is (mostly) bonded: Br before the TS, O after.
  // Decided by how far the reaction has gone, not by distance, which misleads near the TS.
  const brBonded = !pastTransitionState(atoms)
  const a = sub(brBonded ? p('Br') : p('O'), C)
  const b = sub(p('C3'), C)
  const c = sub(p('C1'), C)
  const h = sub(p('H2'), C)
  // Near the transition state the three groups that stay (ethyl, methyl, H) lie flat in one
  // plane around carbon, so the center has no R/S. Detect that with their triple product.
  if (Math.abs(dot(norm(b), cross(norm(c), norm(h)))) < 0.12) return null
  // Chirality from the sign of the triple product a·(b×c) of the three highest-priority
  // groups (vectors from the stereocenter). Negative = R, positive = S. This rule was
  // checked against PubChem's 3D structure of (R)-butan-2-ol (see scripts in this folder's notes).
  const triple = dot(a, cross(b, c))
  return triple < 0 ? 'R' : 'S'
}

/* ---------- SN2 as a Mechanism (what ReactionScene plays) ---------- */

/** The two curved arrows: O lone pair → C, and C–Br electrons → Br. Shown before the TS, fading at it. */
function sn2Arrows(s: number, atoms: ReactionAtom[]): ArrowSpec[] {
  const C = pos(atoms, 'C2')
  const O = pos(atoms, 'O')
  const Br = pos(atoms, 'Br')
  const opacity = smoothstep(0.04, 0.12, s) * (1 - smoothstep(0.46, 0.56, s))
  const oToC = v.norm(v.sub(C, O))
  const cToBr = v.norm(v.sub(Br, C))
  return [
    {
      tail: v.add(v.add(O, v.scale(oToC, 0.42)), v.scale(BULGE, 0.25)),
      tip: v.add(C, v.scale(oToC, -0.5)),
      bow: Math.max(0.6, v.dist(O, C) * 0.28),
      opacity,
      travel: smoothstep(0.18, 0.5, s),
    },
    {
      tail: v.lerp(C, Br, 0.5),
      tip: v.add(v.add(Br, v.scale(cToBr, -0.1)), v.scale(BULGE, 0.48)),
      bow: 0.55,
      opacity,
      travel: smoothstep(0.3, 0.62, s),
    },
  ]
}

export const SN2: Mechanism = { atoms: sn2Atoms, bonds: sn2Bonds, arrows: sn2Arrows, extent: { halfW: 6.2, halfH: 3.4 } }
