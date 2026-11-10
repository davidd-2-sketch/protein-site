/*
  molecules.ts — real molecules for each VSEPR shape, with their MEASURED bond angles.

  Confidence levels (shown honestly in the UI):
    • 'exact'   — fixed by symmetry (e.g. CH₄ 109.5°, SF₆ 90°), or a well-established
                  gas-phase measurement (NH₃ 106.7°, H₂O 104.5°).
    • 'approx'  — sources agree only to about a degree (shown with ≈):
                  SO₂ ≈ 119° (NIST CCCBDB tables list 119.1–119.8°);
                  SF₄ ≈ 173° axial and ≈ 102° equatorial (gas-phase studies; Tolles & Gwinn 1962);
                  ClF₃ ≈ 87.5° axial–equatorial.
    • 'textbook'— only a commonly quoted value found, no primary measurement checked:
                  BrF₅ ≈ 85°. Labeled as uncertain.

  Bond lengths are NOT measured values here: we use the sum of covalent radii (an
  approximation) so atoms are spaced sensibly. Lone-pair cloud positions are drawn for
  teaching; lone pairs can't be "seen" directly.
*/
import { type Domain, type V3 } from './shapes'

export type Confidence = 'exact' | 'approx' | 'textbook'

export interface Molecule {
  formula: string
  name: string
  central: string
  ligand: string
  bonds: number
  lone: number
  /** Bond order per bonded atom (1 single, 2 double). VSEPR counts each as ONE group. */
  order: number
  domains: Domain[]
  /** Angle arcs: [bond index, bond index, label]. */
  arcs: [number, number, string][]
  confidence: Confidence
  note?: string
}

const deg = (d: number) => (d * Math.PI) / 180
const norm = (v: V3): V3 => {
  const l = Math.hypot(...v)
  return [v[0] / l, v[1] / l, v[2] / l]
}
const bond = (dir: V3): Domain => ({ dir: norm(dir), kind: 'bond' })
const lone = (dir: V3): Domain => ({ dir: norm(dir), kind: 'lone' })

/** Two bonds pointing down, symmetric in the screen plane, `angle` degrees apart. */
const bentDown = (angle: number): Domain[] => {
  const h = deg(angle / 2)
  return [bond([-Math.sin(h), -Math.cos(h), 0]), bond([Math.sin(h), -Math.cos(h), 0])]
}

/** Three bonds pointing down from a lone pair on top, with bond-bond angle `angle`. */
const pyramid = (angle: number): Domain[] => {
  // For a symmetric pyramid: cos(angle) = cos²θ − ½ sin²θ, where θ is each bond's tilt from the axis.
  const cos2 = (Math.cos(deg(angle)) + 0.5) / 1.5
  const t = Math.acos(Math.sqrt(cos2))
  return [90, 210, 330].map((a) => bond([Math.sin(t) * Math.cos(deg(a)), -Math.cos(t), Math.sin(t) * Math.sin(deg(a))]))
}

const tetra = (): Domain[] => {
  const t = Math.acos(-1 / 3)
  return [bond([0, 1, 0]), ...[90, 210, 330].map((a) => bond([Math.sin(t) * Math.cos(deg(a)), Math.cos(t), Math.sin(t) * Math.sin(deg(a))]))]
}

export const MOLECULES: Molecule[] = [
  {
    formula: 'CO₂', name: 'Carbon dioxide', central: 'C', ligand: 'O', bonds: 2, lone: 0, order: 2,
    domains: [bond([1, 0, 0]), bond([-1, 0, 0])],
    arcs: [[0, 1, '180°']], confidence: 'exact',
  },
  {
    formula: 'BF₃', name: 'Boron trifluoride', central: 'B', ligand: 'F', bonds: 3, lone: 0, order: 1,
    domains: [90, 210, 330].map((a) => bond([Math.cos(deg(a)), Math.sin(deg(a)), 0])),
    arcs: [[0, 1, '120°']], confidence: 'exact',
  },
  {
    formula: 'SO₂', name: 'Sulfur dioxide', central: 'S', ligand: 'O', bonds: 2, lone: 1, order: 2,
    domains: [...bentDown(119), lone([0, 1, 0])],
    arcs: [[0, 1, '≈119°']], confidence: 'approx',
    note: 'SO₂ is a resonance hybrid; its two S–O bonds are identical. They are drawn as double bonds for simplicity.',
  },
  {
    formula: 'CH₄', name: 'Methane', central: 'C', ligand: 'H', bonds: 4, lone: 0, order: 1,
    domains: tetra(),
    arcs: [[0, 1, '109.5°']], confidence: 'exact',
  },
  {
    formula: 'NH₃', name: 'Ammonia', central: 'N', ligand: 'H', bonds: 3, lone: 1, order: 1,
    domains: [...pyramid(106.7), lone([0, 1, 0])],
    arcs: [[0, 1, '106.7°']], confidence: 'exact',
  },
  {
    formula: 'H₂O', name: 'Water', central: 'O', ligand: 'H', bonds: 2, lone: 2, order: 1,
    // Lone pairs: drawn above, in the plane perpendicular to the H–O–H plane (illustrative).
    domains: [...bentDown(104.5), lone([0, Math.cos(deg(57)), Math.sin(deg(57))]), lone([0, Math.cos(deg(57)), -Math.sin(deg(57))])],
    arcs: [[0, 1, '104.5°']], confidence: 'exact',
  },
  {
    formula: 'PCl₅', name: 'Phosphorus pentachloride', central: 'P', ligand: 'Cl', bonds: 5, lone: 0, order: 1,
    domains: [0, 120, 240].map((a) => bond([Math.cos(deg(a)), 0, Math.sin(deg(a))])).concat([bond([0, 1, 0]), bond([0, -1, 0])]),
    arcs: [[0, 1, '120°'], [0, 3, '90°']], confidence: 'exact',
  },
  {
    formula: 'SF₄', name: 'Sulfur tetrafluoride', central: 'S', ligand: 'F', bonds: 4, lone: 1, order: 1,
    // Lone pair equatorial at +x. Equatorial F's ≈102° apart, axial F's ≈173° apart, both bent away from it.
    domains: [
      bond([Math.cos(deg(180 - 51)), 0, Math.sin(deg(180 - 51))]),
      bond([Math.cos(deg(180 + 51)), 0, Math.sin(deg(180 + 51))]),
      bond([-Math.sin(deg(3.5)), Math.cos(deg(3.5)), 0]),
      bond([-Math.sin(deg(3.5)), -Math.cos(deg(3.5)), 0]),
      lone([1, 0, 0]),
    ],
    arcs: [[2, 3, '≈173°'], [0, 1, '≈102°']], confidence: 'approx',
  },
  {
    formula: 'ClF₃', name: 'Chlorine trifluoride', central: 'Cl', ligand: 'F', bonds: 3, lone: 2, order: 1,
    // Two lone pairs equatorial (toward +x); one equatorial F at −x; axial F's tilted 2.5° toward it.
    domains: [
      bond([-1, 0, 0]),
      bond([-Math.sin(deg(2.5)), Math.cos(deg(2.5)), 0]),
      bond([-Math.sin(deg(2.5)), -Math.cos(deg(2.5)), 0]),
      lone([Math.cos(deg(60)), 0, Math.sin(deg(60))]),
      lone([Math.cos(deg(60)), 0, -Math.sin(deg(60))]),
    ],
    arcs: [[0, 1, '≈87.5°']], confidence: 'approx',
  },
  {
    formula: 'XeF₂', name: 'Xenon difluoride', central: 'Xe', ligand: 'F', bonds: 2, lone: 3, order: 1,
    domains: [bond([0, 1, 0]), bond([0, -1, 0]), ...[0, 120, 240].map((a) => lone([Math.cos(deg(a)), 0, Math.sin(deg(a))]))],
    arcs: [[0, 1, '180°']], confidence: 'exact',
  },
  {
    formula: 'SF₆', name: 'Sulfur hexafluoride', central: 'S', ligand: 'F', bonds: 6, lone: 0, order: 1,
    domains: [[0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].map((d) => bond(d as V3)),
    arcs: [[2, 4, '90°']], confidence: 'exact',
  },
  {
    formula: 'BrF₅', name: 'Bromine pentafluoride', central: 'Br', ligand: 'F', bonds: 5, lone: 1, order: 1,
    // Apical F up; four basal F's tilted up toward it (≈85° from the apical bond); lone pair below.
    domains: [
      bond([0, 1, 0]),
      ...[0, 90, 180, 270].map((a) => bond([Math.sin(deg(85)) * Math.cos(deg(a)), Math.cos(deg(85)), Math.sin(deg(85)) * Math.sin(deg(a))])),
      lone([0, -1, 0]),
    ],
    arcs: [[0, 2, '≈85°']], confidence: 'textbook',
    note: 'The exact BrF₅ angle varies between sources; about 85° (less than 90°) is the commonly quoted value.',
  },
  {
    formula: 'XeF₄', name: 'Xenon tetrafluoride', central: 'Xe', ligand: 'F', bonds: 4, lone: 2, order: 1,
    domains: [bond([1, 0, 0]), bond([0, 0, 1]), bond([-1, 0, 0]), bond([0, 0, -1]), lone([0, 1, 0]), lone([0, -1, 0])],
    arcs: [[0, 1, '90°']], confidence: 'exact',
  },
]
