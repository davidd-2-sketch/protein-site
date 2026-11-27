/*
  molecules.ts — the molecules on the Stereochemistry page.

  Each one is stored as PubChem's isomeric SMILES (which records its handedness) plus the
  R/S labels from PubChem's IUPAC name. The 3D model is built from the SMILES (smiles.ts) and
  the R/S labels are worked out from the model (cip.ts); tests/stereo.test.ts checks that the
  two agree for every stereocenter. Source: PubChem (pubchem.ncbi.nlm.nih.gov), by CID.
  See reference/README.md.
*/
import { fromSmiles, type SMolecule } from './smiles'

export interface Center {
  /** Index of the stereocenter atom (heavy atoms keep their SMILES order). */
  atom: number
  /** Its IUPAC locant, e.g. 'C2'. */
  label: string
  /** R or S, from PubChem's IUPAC name. */
  expect: 'R' | 'S'
}

export interface StereoEntry {
  id: string
  name: string
  formula: string
  cid: number
  smiles: string
  iupac: string
  centers: Center[]
  /** One line on why students meet this molecule. */
  blurb: string
  /** Heavy atoms of the carbon chain, top to bottom, for a Fischer projection (most oxidized carbon on top). */
  chain?: number[]
}

export interface StereoMolecule extends StereoEntry {
  model: SMolecule
}

const ENTRIES: StereoEntry[] = [
  {
    id: 'cbrclf', name: 'Bromochlorofluoromethane', formula: 'CHBrClF', cid: 57518771,
    smiles: '[C@@H](F)(Cl)Br', iupac: '(R)-bromo-chloro-fluoromethane',
    centers: [{ atom: 0, label: 'C', expect: 'R' }],
    blurb: 'The simplest chiral molecule: one carbon, four different atoms.',
  },
  {
    id: 'butanol-r', name: '(R)-2-Butanol', formula: 'C₄H₁₀O', cid: 84682,
    smiles: 'CC[C@@H](C)O', iupac: '(2R)-butan-2-ol',
    centers: [{ atom: 2, label: 'C2', expect: 'R' }],
    blurb: 'A classic textbook example: OH, ethyl, methyl and H on one carbon.',
  },
  {
    id: 'butanol-s', name: '(S)-2-Butanol', formula: 'C₄H₁₀O', cid: 444683,
    smiles: 'CC[C@H](C)O', iupac: '(2S)-butan-2-ol',
    centers: [{ atom: 2, label: 'C2', expect: 'S' }],
    blurb: 'The mirror image of (R)-2-butanol.',
  },
  {
    id: 'propanol', name: '2-Propanol', formula: 'C₃H₈O', cid: 3776,
    smiles: 'CC(C)O', iupac: 'propan-2-ol',
    centers: [],
    blurb: 'Rubbing alcohol. Two identical methyl groups, so no stereocenter.',
  },
  {
    id: 'bromobutane-s', name: '(S)-2-Bromobutane', formula: 'C₄H₉Br', cid: 12236140,
    smiles: 'CC[C@H](C)Br', iupac: '(2S)-2-bromobutane',
    centers: [{ atom: 2, label: 'C2', expect: 'S' }],
    blurb: 'The starting material in the Reactions page’s SN2 reaction.',
  },
  {
    id: 'l-alanine', name: 'L-Alanine', formula: 'C₃H₇NO₂', cid: 5950,
    smiles: 'C[C@@H](C(=O)O)N', iupac: '(2S)-2-aminopropanoic acid',
    centers: [{ atom: 1, label: 'C2', expect: 'S' }],
    chain: [2, 1, 0],
    blurb: 'The amino acids in your proteins are the L form.',
  },
  {
    id: 'd-alanine', name: 'D-Alanine', formula: 'C₃H₇NO₂', cid: 71080,
    smiles: 'C[C@H](C(=O)O)N', iupac: '(2R)-2-aminopropanoic acid',
    centers: [{ atom: 1, label: 'C2', expect: 'R' }],
    chain: [2, 1, 0],
    blurb: 'The mirror image of L-alanine, found in bacterial cell walls.',
  },
  {
    id: 'l-lactic', name: 'L-Lactic acid', formula: 'C₃H₆O₃', cid: 107689,
    smiles: 'C[C@@H](C(=O)O)O', iupac: '(2S)-2-hydroxypropanoic acid',
    centers: [{ atom: 1, label: 'C2', expect: 'S' }],
    chain: [2, 1, 0],
    blurb: 'Made by your muscles during hard exercise.',
  },
  {
    id: 'd-glyceraldehyde', name: 'D-Glyceraldehyde', formula: 'C₃H₆O₃', cid: 79014,
    smiles: 'C([C@H](C=O)O)O', iupac: '(2R)-2,3-dihydroxypropanal',
    centers: [{ atom: 1, label: 'C2', expect: 'R' }],
    chain: [2, 1, 0],
    blurb: 'The reference sugar that defines D and L.',
  },
  {
    id: 'l-threonine', name: 'L-Threonine', formula: 'C₄H₉NO₃', cid: 6288,
    smiles: 'C[C@H]([C@@H](C(=O)O)N)O', iupac: '(2S,3R)-2-amino-3-hydroxybutanoic acid',
    centers: [
      { atom: 2, label: 'C2', expect: 'S' },
      { atom: 1, label: 'C3', expect: 'R' },
    ],
    chain: [3, 2, 1, 0],
    blurb: 'An amino acid with two stereocenters: the form in your proteins.',
  },
  {
    id: 'l-allothreonine', name: 'L-Allothreonine', formula: 'C₄H₉NO₃', cid: 99289,
    smiles: 'C[C@@H]([C@@H](C(=O)O)N)O', iupac: '(2S,3S)-2-amino-3-hydroxybutanoic acid',
    centers: [
      { atom: 2, label: 'C2', expect: 'S' },
      { atom: 1, label: 'C3', expect: 'S' },
    ],
    chain: [3, 2, 1, 0],
    blurb: 'Threonine’s diastereomer: one center flipped.',
  },
  {
    id: 'l-tartaric', name: 'L-(+)-Tartaric acid', formula: 'C₄H₆O₆', cid: 444305,
    smiles: '[C@@H]([C@H](C(=O)O)O)(C(=O)O)O', iupac: '(2R,3R)-2,3-dihydroxybutanedioic acid',
    centers: [
      { atom: 0, label: 'C2', expect: 'R' },
      { atom: 1, label: 'C3', expect: 'R' },
    ],
    chain: [6, 0, 1, 2],
    blurb: 'Found in grapes and wine.',
  },
  {
    id: 'd-tartaric', name: 'D-(−)-Tartaric acid', formula: 'C₄H₆O₆', cid: 439655,
    smiles: '[C@H]([C@@H](C(=O)O)O)(C(=O)O)O', iupac: '(2S,3S)-2,3-dihydroxybutanedioic acid',
    centers: [
      { atom: 0, label: 'C2', expect: 'S' },
      { atom: 1, label: 'C3', expect: 'S' },
    ],
    chain: [6, 0, 1, 2],
    blurb: 'The mirror image of L-tartaric acid.',
  },
  {
    id: 'meso-tartaric', name: 'meso-Tartaric acid', formula: 'C₄H₆O₆', cid: 447315,
    smiles: '[C@@H]([C@@H](C(=O)O)O)(C(=O)O)O', iupac: '(2R,3S)-2,3-dihydroxybutanedioic acid',
    centers: [
      { atom: 0, label: 'C2', expect: 'R' },
      { atom: 1, label: 'C3', expect: 'S' },
    ],
    chain: [6, 0, 1, 2],
    blurb: 'Two stereocenters, yet not chiral: it is its own mirror image.',
  },
]

export const STEREO: StereoMolecule[] = ENTRIES.map((e) => ({ ...e, model: fromSmiles(e.smiles) }))
export const stereoById = (id: string) => {
  const m = STEREO.find((x) => x.id === id)
  if (!m) throw new Error(`Unknown stereo molecule ${id}`)
  return m
}
