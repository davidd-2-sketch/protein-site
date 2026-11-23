/*
  polarModels.ts — the bond-dipole (electronegativity arrow) model for every polarity card.

  A polarity card's visual names a model by ID:
    • 'HF', 'H2O', …       a molecule from the Polarity page (measured geometry);
    • 'bond:S-O'           one bond, two atoms;
    • 'bonds:C-Cl:B-F'     two separate bonds, one above the other, to compare;
    • 'shape:xef4'         a molecule from the Lewis page, in its VSEPR shape.

  Bond lengths in the 'bond', 'bonds' and 'shape' models are a fixed illustrative 1.3 Å
  (the cards ask about polarity, not size), and shapes use ideal or measured VSEPR angles.
  The arrows follow the same rule as the Polarity page: they point toward the more
  electronegative atom, with length proportional to the Pauling electronegativity difference.
*/
import { byId, type PAtom, type PolarMolecule, type Vec } from '../polarity/molecules'
import { lewisById } from '../lewis/molecules'
import { sceneFor } from '../lewis/shape3d'

const LEN = 1.3

const bondAtoms = (b: string, y: number): PAtom[] => {
  const [x, z] = b.split('-')
  return [
    { el: x, pos: [-LEN / 2, y, 0] },
    { el: z, pos: [LEN / 2, y, 0] },
  ]
}

/** Polar or nonpolar, for the Lewis-page molecules used on "is this shape polar" cards. */
export const SHAPE_POLARITY: Record<string, { polar: boolean; why: string }> = {
  h2o: { polar: true, why: 'Bent: the two O–H dipoles point partly the same way and don’t cancel.' },
  nh3: { polar: true, why: 'Trigonal pyramidal: the three N–H dipoles all tilt the same way.' },
  ch4: { polar: false, why: 'Tetrahedral and symmetric: the four C–H dipoles cancel (and are small anyway).' },
  co2: { polar: false, why: 'Linear: the two C=O dipoles point in opposite directions and cancel.' },
  hcn: { polar: true, why: 'Linear, but the two ends are different (H vs N), so the dipoles add up instead of cancelling.' },
  ch2o: { polar: true, why: 'The C=O dipole isn’t balanced by the small C–H dipoles.' },
  bf3: { polar: false, why: 'Trigonal planar and symmetric: the three B–F dipoles cancel.' },
  pcl5: { polar: false, why: 'Trigonal bipyramidal and symmetric: the dipoles cancel.' },
  sf6: { polar: false, why: 'Octahedral: every S–F dipole has an opposite partner.' },
  xef4: { polar: false, why: 'Square planar: opposite Xe–F dipoles cancel (the two lone pairs are opposite each other too).' },
  sf4: { polar: true, why: 'Seesaw: the lone pair makes the shape lopsided, so the S–F dipoles don’t cancel.' },
  clf3: { polar: true, why: 'T-shaped: the dipoles don’t cancel.' },
  xef2: { polar: false, why: 'Linear: the two Xe–F dipoles are opposite and cancel.' },
  so2: { polar: true, why: 'Bent (a lone pair on S): the S–O dipoles don’t cancel.' },
  o3: {
    polar: true,
    why: 'Bent, and the central O is electron-poor compared with the outer ones (formal charge +1), so there is a small dipole (0.53 D), even though every atom is oxygen. Electronegativity arrows can’t show this one: all three atoms are the same element.',
  },
  becl2: { polar: false, why: 'Linear: the two Be–Cl dipoles cancel.' },
}

function shapeModel(id: string): PolarMolecule {
  const m = lewisById(id)
  const state = sceneFor(m, m.forms[0])!
  const atoms: PAtom[] = [{ el: state.central, pos: [0, 0, 0] }]
  const bonds: [number, number, number][] = []
  const lonePairs: Vec[] = []
  let k = 0
  for (const d of state.domains) {
    if (d.kind === 'lone') {
      lonePairs.push(d.dir)
      continue
    }
    atoms.push({ el: state.ligands?.[k] ?? state.ligand, pos: [d.dir[0] * LEN, d.dir[1] * LEN, d.dir[2] * LEN] })
    bonds.push([0, atoms.length - 1, state.orders?.[k] ?? state.order])
    k++
  }
  const p = SHAPE_POLARITY[id]
  return {
    id: `shape:${id}`,
    formula: m.formula,
    name: m.name,
    shape: '',
    atoms,
    bonds,
    center: 0,
    lonePairs,
    dipole: p?.polar ? 1 : 0,
    why: p?.why ?? '',
    // Ozone: every bond is O–O, so there are no arrows to add up.
    sum: id === 'o3' ? false : undefined,
    netText: p ? (p.polar ? 'Bond dipoles don’t cancel: polar' : 'Bond dipoles cancel: nonpolar') : '',
  }
}

/** Build the model for a polarity card (see the header for the ID forms). */
export function polarModel(id: string): PolarMolecule {
  const [kind, a, b] = id.split(':')
  if (kind === 'bond')
    return { id, formula: a, name: a, shape: '', atoms: bondAtoms(a, 0), bonds: [[0, 1, 1]], center: 0, lonePairs: [], dipole: 0, why: '', sum: false, netText: '' }
  if (kind === 'bonds')
    return {
      id,
      formula: `${a} vs ${b}`,
      name: '',
      shape: '',
      atoms: [...bondAtoms(a, 0.8), ...bondAtoms(b, -0.8)],
      bonds: [
        [0, 1, 1],
        [2, 3, 1],
      ],
      center: 0,
      lonePairs: [],
      dipole: 0,
      why: '',
      sum: false,
      netText: '',
    }
  if (kind === 'shape') return shapeModel(a)
  const m = byId(id)
  // One bond: its arrow already IS the molecule's dipole, so it stays beside the bond.
  return m.bonds.length === 1 ? { ...m, sum: false } : m
}
