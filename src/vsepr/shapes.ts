/*
  shapes.ts — the VSEPR shapes: what each arrangement of electron groups looks like
  and what we say about it.

  VSEPR in one sentence: electron groups (bonds and lone pairs) around a central atom
  push each other as far apart as possible. The number of groups (the "steric number")
  sets the ELECTRON geometry; which of those groups are atoms sets the MOLECULAR shape.

  Directions use a y-up frame. Ideal angles are exact consequences of symmetry.
*/
import type { Depth } from '../lessons/types'

export type V3 = [number, number, number]

export interface ShapeInfo {
  /** Bonded atoms (X) and lone pairs (E) on the central atom (A): AXₙEₘ. */
  bonds: number
  lone: number
  name: string
  electronGeometry: string
  idealAngles: string
  hybridization: string
  /** Pairs of BOND indices (in the order returned by idealDomains) to draw angle arcs between. */
  arcs: [number, number][]
  text: Record<Depth, string>
}

const ELECTRON_GEOMETRY: Record<number, string> = {
  2: 'Linear',
  3: 'Trigonal planar',
  4: 'Tetrahedral',
  5: 'Trigonal bipyramidal',
  6: 'Octahedral',
}

/* Hybridization labels as taught in Gen Chem. The 5- and 6-group labels are flagged in the UI. */
const HYBRID: Record<number, string> = { 2: 'sp', 3: 'sp²', 4: 'sp³', 5: 'sp³d*', 6: 'sp³d²*' }

export const HYBRID_FOOTNOTE =
  '*Many Gen Chem textbooks use sp³d and sp³d² for 5 and 6 electron groups. Modern calculations show d orbitals contribute very little; these bonds are better described with other models. The shapes themselves are correct.'

/* ---------- Ideal directions for each steric number ---------- */
const deg = (d: number) => (d * Math.PI) / 180
const norm = (v: V3): V3 => {
  const l = Math.hypot(...v)
  return [v[0] / l, v[1] / l, v[2] / l]
}
const TET = deg(109.4712)

/**
 * The electron-group directions for a steric number, ordered so lone pairs can be
 * placed by index. LONE_SLOTS says which slots lone pairs take (lowest repulsion).
 */
export const SLOTS: Record<number, V3[]> = {
  2: [
    [1, 0, 0],
    [-1, 0, 0],
  ],
  // In the screen-facing plane, one pointing up.
  3: [
    [0, 1, 0],
    [Math.cos(deg(210)), Math.sin(deg(210)), 0],
    [Math.cos(deg(330)), Math.sin(deg(330)), 0],
  ],
  // One up, three below at the tetrahedral angle.
  4: [
    [0, 1, 0],
    ...[90, 210, 330].map((a): V3 => norm([Math.sin(TET) * Math.cos(deg(a)), Math.cos(TET), Math.sin(TET) * Math.sin(deg(a))])),
  ],
  // Equatorial slots first (lone pairs go there), then axial.
  5: [
    [1, 0, 0],
    [Math.cos(deg(120)), 0, Math.sin(deg(120))],
    [Math.cos(deg(240)), 0, Math.sin(deg(240))],
    [0, 1, 0],
    [0, -1, 0],
  ],
  // Lone pairs: first below (−y), second above (+y), so two lone pairs end up opposite each other.
  6: [
    [0, -1, 0],
    [0, 1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ],
}

/** Which slot indices hold lone pairs, for each steric number and lone-pair count. */
const LONE_SLOTS: Record<number, number[][]> = {
  2: [[]],
  3: [[], [0]],
  4: [[], [0], [0, 1]],
  5: [[], [0], [0, 1], [0, 1, 2]], // equatorial: lone pairs have the most room there
  6: [[], [0], [0, 1]], // opposite each other
}

export interface Domain {
  dir: V3
  kind: 'bond' | 'lone'
}

/** Ideal domains for AXₙEₘ. Bonds come first in the returned list, then lone pairs. */
export function idealDomains(bonds: number, lone: number): Domain[] {
  const sn = bonds + lone
  const slots = SLOTS[sn]
  const loneIdx = new Set(LONE_SLOTS[sn][lone])
  const bondsOut: Domain[] = []
  const lonesOut: Domain[] = []
  slots.forEach((dir, i) => (loneIdx.has(i) ? lonesOut : bondsOut).push({ dir, kind: loneIdx.has(i) ? 'lone' : 'bond' }))
  return [...bondsOut, ...lonesOut]
}

/** Is this combination something VSEPR covers (and we can draw)? */
export function isValid(bonds: number, lone: number) {
  const sn = bonds + lone
  return bonds >= 2 && sn >= 2 && sn <= 6 && LONE_SLOTS[sn]?.[lone] !== undefined
}

/* ---------- The 12 shapes ---------- */

const shape = (bonds: number, lone: number, name: string, idealAngles: string, arcs: [number, number][], text: Record<Depth, string>): ShapeInfo => ({
  bonds,
  lone,
  name,
  electronGeometry: ELECTRON_GEOMETRY[bonds + lone],
  idealAngles,
  hybridization: HYBRID[bonds + lone],
  arcs,
  text,
})

export const SHAPES: ShapeInfo[] = [
  shape(2, 0, 'Linear', '180°', [[0, 1]], {
    simple: 'Two groups get as far apart as possible by pointing in opposite directions, like a tug-of-war rope. That makes a straight line.',
    standard: 'With two electron groups and no lone pairs, repulsion is minimized at 180°. Example: CO₂. A double bond still counts as just one electron group.',
    deep: 'The steric number is 2, so the electron and molecular geometries are both linear. The central atom is often described as sp-hybridized; the two unhybridized p orbitals can form π bonds, as in CO₂’s two C=O bonds.',
  }),
  shape(3, 0, 'Trigonal planar', '120°', [[0, 1]], {
    simple: 'Three groups spread out evenly in a flat triangle, like a peace sign or the blades of a fan, each 120° apart.',
    standard: 'Three electron groups with no lone pairs arrange in a flat triangle at 120°. Example: BF₃. All four atoms lie in one plane.',
    deep: 'Steric number 3 gives trigonal planar electron geometry (often described as sp²). BF₃ is electron-deficient: boron has only six valence electrons and readily accepts a lone pair, which is why it acts as a Lewis acid.',
  }),
  shape(2, 1, 'Bent', 'less than 120°', [[0, 1]], {
    simple: "Three groups, but one is a lone pair, an invisible \"cloud\" of electrons. You only see the two atoms, so the molecule looks bent, like a boomerang.",
    standard: 'With three electron groups the electron geometry is trigonal planar, but one group is a lone pair. The molecular shape (just the atoms) is bent. Lone pairs take up more room, so the angle is a bit less than 120°. Example: SO₂.',
    deep: 'A lone pair is held by only one nucleus, so its electron density spreads wider and repels bonding pairs more strongly (lone pair–bond pair > bond pair–bond pair). That compresses the bond angle below the ideal 120°.',
  }),
  shape(4, 0, 'Tetrahedral', '109.5°', [[0, 1]], {
    simple: 'Four groups can spread out more in 3D than on a flat sheet. They point to the corners of a pyramid with a triangle base (a tetrahedron), each 109.5° apart.',
    standard: 'Four electron groups with no lone pairs form a tetrahedron with 109.5° angles. Example: CH₄. Spin it: a flat square (90°) would crowd the groups more.',
    deep: 'Steric number 4 gives tetrahedral geometry (often described as sp³). 109.5° is exactly arccos(−1/3), the angle that puts four points as far apart as possible on a sphere.',
  }),
  shape(3, 1, 'Trigonal pyramidal', 'less than 109.5°', [[0, 1]], {
    simple: 'Four groups again, but one is a lone pair on top. The three atoms form a short pyramid, like a tripod or a camera stand.',
    standard: 'The electron geometry is still tetrahedral, but with one lone pair the molecular shape is trigonal pyramidal. The lone pair pushes the bonds closer together, so angles drop below 109.5°. Example: NH₃ at 106.7°.',
    deep: 'The lone pair makes the molecule polar and gives it a site to accept a proton or bind a metal; it is why ammonia is a base. NH₃ also undergoes rapid inversion through a planar transition state, like an umbrella flipping.',
  }),
  shape(2, 2, 'Bent', 'less than 109.5°', [[0, 1]], {
    simple: 'Two atoms and two lone pairs. The two lone pairs crowd the bonds even more, so the molecule is bent, like a V. Water looks like this.',
    standard: 'Four electron groups (tetrahedral electron geometry) with two lone pairs give a bent shape. Two lone pairs squeeze harder than one, so the angle drops further: 104.5° in H₂O versus 106.7° in NH₃ and 109.5° in CH₄.',
    deep: "Water's bent shape makes it strongly polar, which underlies hydrogen bonding, its high boiling point, and why ice floats. The trend CH₄ > NH₃ > H₂O (109.5° > 106.7° > 104.5°) is the classic test of lone-pair repulsion.",
  }),
  shape(5, 0, 'Trigonal bipyramidal', '90° and 120°', [[0, 1], [0, 3]], {
    simple: 'Five groups: three around the middle in a triangle and one sticking up and one down, like two pyramids glued base to base.',
    standard: 'Five electron groups form a trigonal bipyramid. The three equatorial positions are 120° apart; the two axial positions are 90° from the equator. Example: PCl₅.',
    deep: 'The two kinds of position are not equivalent: axial groups have three neighbors at 90°, equatorial groups only two. In PCl₅ the axial P–Cl bonds are measurably longer than the equatorial ones.',
  }),
  shape(4, 1, 'Seesaw', '90°, 120°, 180° (all squeezed smaller)', [[2, 3], [0, 1]], {
    simple: 'Five groups, one of them a lone pair. The atoms look like a playground seesaw, tipped away from the lone pair.',
    standard: 'With one lone pair, the electron geometry is trigonal bipyramidal and the molecular shape is a seesaw. The lone pair sits in an equatorial position, where it has the most room. Example: SF₄.',
    deep: 'In an equatorial spot, a lone pair has only two neighbors at 90° (in an axial spot it would have three), so the equatorial position minimizes strong lone pair–bond pair repulsions at 90°.',
  }),
  shape(3, 2, 'T-shaped', 'less than 90°', [[0, 1]], {
    simple: 'Two lone pairs and three atoms. The atoms make a letter T, slightly folded.',
    standard: 'Two lone pairs take two equatorial positions in the trigonal bipyramid, leaving three atoms in a T. The lone pairs push the axial atoms back, so the angles are slightly under 90°. Example: ClF₃.',
    deep: 'Placing both lone pairs equatorially keeps them 120° apart and minimizes 90° lone pair interactions. The resulting T-shape is a good test of the "lone pairs go equatorial" rule.',
  }),
  shape(2, 3, 'Linear', '180°', [[0, 1]], {
    simple: 'Three lone pairs form a ring around the middle, and the two atoms stick straight out the top and bottom. Straight line again!',
    standard: 'Three lone pairs fill all three equatorial positions, leaving the two atoms axial at 180°. The electron geometry is trigonal bipyramidal, but the molecule is linear. Example: XeF₂.',
    deep: 'XeF₂ shows that "linear" can arise from two very different electron geometries (steric number 2 or 5). Noble-gas compounds like XeF₂ were first made in the 1960s, overturning the idea that noble gases never bond.',
  }),
  shape(6, 0, 'Octahedral', '90°', [[2, 4]], {
    simple: 'Six groups point along up, down, left, right, front, and back, like the six faces of a die. Every neighbor is 90° away.',
    standard: 'Six electron groups form an octahedron: all adjacent angles are 90°. Example: SF₆. All six positions are equivalent.',
    deep: 'SF₆ is extremely stable and unreactive because the six fluorines shield sulfur. It is used as an electrical insulator, and it is a potent greenhouse gas.',
  }),
  shape(5, 1, 'Square pyramidal', 'less than 90°', [[4, 0]], {
    simple: 'Six groups, one a lone pair underneath. The five atoms form a square-based pyramid, like an Egyptian pyramid.',
    standard: 'With one lone pair, the octahedral electron geometry gives a square pyramid. The lone pair pushes the four base atoms up slightly, so those angles are a little under 90°. Example: BrF₅.',
    deep: 'All six octahedral positions are equivalent, so the first lone pair can go anywhere; the second (next shape) goes opposite the first to keep them 180° apart.',
  }),
  shape(4, 2, 'Square planar', '90°', [[0, 2]], {
    simple: 'Two lone pairs, one on top and one on the bottom. The four atoms make a flat square.',
    standard: 'Two lone pairs sit opposite each other (180° apart) in the octahedron, leaving four atoms in a flat square with 90° angles. Example: XeF₄.',
    deep: 'Square planar geometry also appears in transition-metal chemistry, such as the anticancer drug cisplatin, though there the reason is d-orbital energies rather than VSEPR lone pairs.',
  }),
]

export const shapeFor = (bonds: number, lone: number) => SHAPES.find((s) => s.bonds === bonds && s.lone === lone)!
