/*
  sn1Geometry.ts — atom positions for the SN1 reaction of (S)-3-bromo-3-methylhexane with water:

      step 1 (slow):  R–Br → R⁺ + Br⁻              the C–Br bond breaks on its own
      step 2:         R⁺ + H₂O → R–OH₂⁺            water attacks the flat carbocation
      step 3:         R–OH₂⁺ + H₂O → R–OH + H₃O⁺    a second water removes a proton

  The carbocation is flat, so water can attack either face. `face` chooses which:
     face = −1  attack from the side opposite where bromide left  → (R) product (inversion)
     face = +1  attack from the side bromide left from           → (S) product (retention)
  Over many molecules both happen about equally, giving a (nearly) racemic mixture.

  FRAME: the central carbon (C3) is at the origin; bromine starts along +x.
  HONESTY: start and end shapes use standard bond lengths and angles; the path between
  is an approximate teaching model. Distances in ångströms.
*/
import { BULGE, energyCurve, pos, v, type ArrowSpec, type Mechanism } from './mechanism'
import { smoothstep, type ReactionAtom, type ReactionBond, type Vec } from './sn2Geometry'

const L = { CC: 1.53, CH: 1.09, CBr: 1.97, CO: 1.48, OH: 0.97, OO: 2.6 }
const TET = 109.47
const deg = (d: number) => (d * Math.PI) / 180
const X: Vec = [1, 0, 0]

/** Direction at angle `alpha` from +x, turned by `phi` around the x-axis. */
const umbrellaDir = (alphaDeg: number, phiDeg: number): Vec => [
  Math.cos(deg(alphaDeg)),
  Math.sin(deg(alphaDeg)) * Math.cos(deg(phiDeg)),
  Math.sin(deg(alphaDeg)) * Math.sin(deg(phiDeg)),
]

/** The three tetrahedral directions on an atom reached along bond direction b (each 109.47° from −b). */
function slots(b: Vec, ref: Vec, turn: number): Vec[] {
  const e1 = v.norm(v.cross(b, ref))
  const e2 = v.cross(b, e1)
  const c = -Math.cos(deg(TET))
  const s = Math.sin(deg(TET))
  return [0, 120, 240].map((a) => {
    const t = deg(a + turn)
    return v.norm(v.add(v.scale(b, c), v.add(v.scale(e1, s * Math.cos(t)), v.scale(e2, s * Math.sin(t)))))
  })
}

/*
  Where each group sits around the reaction axis (degrees). Chosen so the starting material
  is (S); checked by configuration() in tests/sn1.test.ts.
*/
/** Rotations of each chain about its bond to C3 (degrees), chosen so no atoms collide. */
// Found by a search that keeps every pair of unbonded atoms apart along the whole path
// (closest contact ≈1.85 Å between hydrogens). The conformation is illustrative, not the lowest-energy one.
export const TWIST = { ethyl: 135, propyl: 45, propyl2: 270, methylH: 90, ethylH: 150, water: 90 }

const PHI = { methyl: 90, ethyl: 330, propyl: 210 }

/* ---------- how angles and distances change with progress s ---------- */

/** Umbrella angle of the three carbon groups from +x: tetrahedral → flat (carbocation) → tetrahedral. */
function umbrella(s: number, face: 1 | -1) {
  const flat = 109.47 + (90 - 109.47) * smoothstep(0.12, 0.38, s)
  const final = face === -1 ? 180 - TET : TET // groups lean away from the incoming water
  return flat + (final - 90) * smoothstep(0.5, 0.66, s)
}

/** Bromine leaves along +x, then drifts up and back, out of the way of a front-side attack. */
function brPosition(s: number): Vec {
  const d = L.CBr + (3.1 - L.CBr) * smoothstep(0.12, 0.38, s) + 3.3 * smoothstep(0.36, 0.62, s)
  const dir = v.norm(v.lerp(X, v.norm([1, 0.75, -0.55]), smoothstep(0.26, 0.6, s)))
  return v.scale(dir, d)
}

/** The attacking water's oxygen: waiting at 6 Å, then moving in to bond. */
const o1Distance = (s: number) => 6 + (L.CO - 6) * smoothstep(0.42, 0.64, s)

/* ---------- build every atom ---------- */

export function sn1Atoms(s: number, face: 1 | -1): ReactionAtom[] {
  const atoms: ReactionAtom[] = []
  const put = (id: string, element: ReactionAtom['element'], position: Vec) => atoms.push({ id, element, position })
  const alpha = umbrella(s, face)

  put('C3', 'C', [0, 0, 0])

  // Methyl
  const uM = umbrellaDir(alpha, PHI.methyl)
  const Cm = v.scale(uM, L.CC)
  put('Cm', 'C', Cm)
  slots(uM, X, TWIST.methylH).forEach((d, i) => put(`Hm${i}`, 'H', v.add(Cm, v.scale(d, L.CH))))

  // Ethyl: C2 then C1
  const uE = umbrellaDir(alpha, PHI.ethyl)
  const C2 = v.scale(uE, L.CC)
  put('C2', 'C', C2)
  const s2 = slots(uE, X, TWIST.ethyl)
  const C1 = v.add(C2, v.scale(s2[0], L.CC))
  put('C1', 'C', C1)
  put('H2a', 'H', v.add(C2, v.scale(s2[1], L.CH)))
  put('H2b', 'H', v.add(C2, v.scale(s2[2], L.CH)))
  slots(s2[0], uE, TWIST.ethylH).forEach((d, i) => put(`H1${i}`, 'H', v.add(C1, v.scale(d, L.CH))))

  // Propyl: C4, C5, C6 (zigzag)
  const uP = umbrellaDir(alpha, PHI.propyl)
  const C4 = v.scale(uP, L.CC)
  put('C4', 'C', C4)
  const s4 = slots(uP, X, TWIST.propyl)
  const C5 = v.add(C4, v.scale(s4[0], L.CC))
  put('C5', 'C', C5)
  put('H4a', 'H', v.add(C4, v.scale(s4[1], L.CH)))
  put('H4b', 'H', v.add(C4, v.scale(s4[2], L.CH)))
  const s5 = slots(s4[0], uP, TWIST.propyl2)
  const C6 = v.add(C5, v.scale(s5[0], L.CC))
  put('C6', 'C', C6)
  put('H5a', 'H', v.add(C5, v.scale(s5[1], L.CH)))
  put('H5b', 'H', v.add(C5, v.scale(s5[2], L.CH)))
  slots(s5[0], s4[0], 60).forEach((d, i) => put(`H6${i}`, 'H', v.add(C6, v.scale(d, L.CH))))

  // Bromine (leaves as bromide)
  put('Br', 'Br', brPosition(s))

  // Attacking water: O1 with Ha (later removed) and Hb. Hydrogens point away from carbon,
  // so the final C–O–H angles are tetrahedral.
  const u: Vec = [face, 0, 0] // from carbon toward this oxygen
  const O1 = v.scale(u, o1Distance(s))
  put('O1', 'O', O1)
  const hDir = (phi: number): Vec => v.norm(v.add(v.scale(u, Math.cos(deg(180 - TET))), [0, Math.sin(deg(180 - TET)) * Math.cos(deg(phi)), Math.sin(deg(180 - TET)) * Math.sin(deg(phi))]))
  const dA = hDir(35 + TWIST.water) // the hydrogen that will be removed
  const dB = hDir(145 + TWIST.water)
  put('Hb', 'H', v.add(O1, v.scale(dB, L.OH)))

  // Second water (O2) comes in along Ha's direction, takes Ha, and leaves as H₃O⁺.
  const o2Far = 7
  const o2Dist = o2Far + (L.OO - o2Far) * smoothstep(0.66, 0.8, s) + 4 * smoothstep(0.88, 1, s)
  const O2 = v.add(O1, v.scale(dA, o2Dist))
  put('O2', 'O', O2)
  const transfer = smoothstep(0.8, 0.88, s)
  const haOnO1 = v.add(O1, v.scale(dA, L.OH))
  const haOnO2 = v.add(O2, v.scale(dA, -L.OH))
  put('Ha', 'H', v.lerp(haOnO1, haOnO2, transfer))
  // O2's own hydrogens point away from O1 (52° either side of the line, ≈104.5° apart).
  const w = v.norm(v.cross(dA, [0, 0, 1]))
  for (const [id, sign] of [['H2w', 1], ['H3w', -1]] as const) {
    put(id, 'H', v.add(O2, v.scale(v.norm(v.add(v.scale(dA, Math.cos(deg(52))), v.scale(w, sign * Math.sin(deg(52))))), L.OH)))
  }
  return atoms
}

export function sn1Bonds(s: number): ReactionBond[] {
  const fixed: [string, string][] = [
    ['C3', 'Cm'], ['C3', 'C2'], ['C2', 'C1'], ['C3', 'C4'], ['C4', 'C5'], ['C5', 'C6'],
    ['Cm', 'Hm0'], ['Cm', 'Hm1'], ['Cm', 'Hm2'],
    ['C2', 'H2a'], ['C2', 'H2b'], ['C1', 'H10'], ['C1', 'H11'], ['C1', 'H12'],
    ['C4', 'H4a'], ['C4', 'H4b'], ['C5', 'H5a'], ['C5', 'H5b'], ['C6', 'H60'], ['C6', 'H61'], ['C6', 'H62'],
    ['O1', 'Hb'], ['O2', 'H2w'], ['O2', 'H3w'],
  ]
  const transfer = smoothstep(0.8, 0.88, s)
  return [
    ...fixed.map(([a, b]) => ({ a, b, order: 1 })),
    { a: 'C3', b: 'Br', order: 1 - smoothstep(0.12, 0.36, s) }, // breaks first, on its own
    { a: 'C3', b: 'O1', order: smoothstep(0.5, 0.64, s) }, // forms after the carbocation exists
    { a: 'O1', b: 'Ha', order: 1 - transfer },
    { a: 'O2', b: 'Ha', order: transfer },
  ]
}

/** Curved arrows for each step, shown just before that step's electrons move. */
function sn1Arrows(s: number, atoms: ReactionAtom[]): ArrowSpec[] {
  const C = pos(atoms, 'C3')
  const Br = pos(atoms, 'Br')
  const O1 = pos(atoms, 'O1')
  const O2 = pos(atoms, 'O2')
  const Ha = pos(atoms, 'Ha')
  const window = (a: number, b: number, c: number, d: number) => smoothstep(a, b, s) * (1 - smoothstep(c, d, s))

  // 1: the C–Br bond's electrons go to bromine.
  const cToBr = v.norm(v.sub(Br, C))
  const a1: ArrowSpec = {
    tail: v.lerp(C, Br, 0.5),
    tip: v.add(v.add(Br, v.scale(cToBr, -0.1)), v.scale(BULGE, 0.48)),
    bow: 0.55,
    opacity: window(0.03, 0.08, 0.3, 0.38),
    travel: smoothstep(0.12, 0.34, s),
  }
  // 2: a lone pair on water's oxygen goes to the empty orbital on the carbocation.
  const oToC = v.norm(v.sub(C, O1))
  const a2: ArrowSpec = {
    tail: v.add(v.add(O1, v.scale(oToC, 0.42)), v.scale(BULGE, 0.25)),
    tip: v.add(C, v.scale(oToC, -0.5)),
    bow: Math.max(0.6, v.dist(O1, C) * 0.28),
    opacity: window(0.44, 0.49, 0.6, 0.66),
    travel: smoothstep(0.5, 0.64, s),
  }
  // 3: a lone pair on the second water grabs the proton; the O–H electrons stay on O1.
  const a3: ArrowSpec = {
    tail: v.add(O2, v.scale(v.norm(v.sub(Ha, O2)), 0.4)),
    tip: Ha,
    bow: 0.45,
    opacity: window(0.74, 0.78, 0.86, 0.9),
    travel: smoothstep(0.8, 0.88, s),
  }
  return [a1, a2, a3]
}

export const makeSn1 = (face: 1 | -1): Mechanism => ({
  atoms: (s) => sn1Atoms(s, face),
  bonds: sn1Bonds,
  arrows: sn1Arrows,
  extent: { halfW: 7.2, halfH: 4.4 },
})

/* ---------- R/S at C3 ---------- */

/**
 * Priorities: Br or OH (1) > propyl (2) > ethyl (3) > methyl (4). Returns null for the
 * carbocation (only three groups: not a stereocenter) and whenever carbon is flat.
 */
export function sn1Configuration(atoms: ReactionAtom[], s: number): 'R' | 'S' | null {
  const brBond = 1 - smoothstep(0.12, 0.36, s)
  const oBond = smoothstep(0.5, 0.64, s)
  if (brBond < 0.5 && oBond < 0.5) return null // carbocation
  const C = pos(atoms, 'C3')
  const top = v.sub(pos(atoms, brBond >= 0.5 ? 'Br' : 'O1'), C)
  const b = v.sub(pos(atoms, 'C4'), C)
  const c = v.sub(pos(atoms, 'C2'), C)
  const m = v.sub(pos(atoms, 'Cm'), C)
  // Flat (the three carbon groups in one plane): no R/S.
  if (Math.abs(v.dot(v.norm(b), v.cross(v.norm(c), v.norm(m)))) < 0.12) return null
  // Same rule as SN2 (checked against PubChem): sign of a·(b×c) for priorities 1, 2, 3.
  return v.dot(top, v.cross(b, c)) < 0 ? 'R' : 'S'
}

/* ---------- schematic energy diagram: three steps, the first is the slowest ---------- */
export const SN1_ENERGY_POINTS: [number, number][] = [
  [0, 0], // reactants
  [0.24, 1], // TS 1: C–Br breaking (highest = rate-determining)
  [0.43, 0.52], // carbocation intermediate
  [0.57, 0.7], // TS 2: water attacking
  [0.72, 0.1], // oxonium ion intermediate
  [0.84, 0.28], // TS 3: proton transfer
  [1, -0.25], // products
]
export const sn1Energy = energyCurve(SN1_ENERGY_POINTS)
