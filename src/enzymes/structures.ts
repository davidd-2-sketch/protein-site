/*
  structures.ts — the real enzyme structures used in the Enzymes module, and the residues
  the lessons point at. Every residue number and name here is checked against the actual
  PDB file by tests/enzymes.test.ts (the text copies live in reference/).

  Numbering: chymotrypsin uses the standard "chymotrypsinogen" numbering found in the PDB
  file (His57, Asp102, Ser195). The file holds TWO copies of the enzyme (chains A–C and
  E–G); the site shows the first copy only. Chymotrypsin is made of three chains that come
  from one precursor: A (1–13), B (16–146), C (149–245).
*/

export type StructureId = 'chymo-ts' | 'chymo-free' | 'gk-closed' | 'gk-open'

export interface EnzymeStructure {
  id: StructureId
  pdb: string
  /** Binary file the viewer loads (public/structures/). */
  file: string
  enzyme: string
  state: string
  organism: string
  method: string
  /** Å */
  resolution: number
  year: number
  /** Polymer chains of the copy we show. */
  chains: string[]
  /** Small molecules bound in that copy (PDB component id → plain name). */
  ligands: Record<string, string>
}

export const STRUCTURES: Record<StructureId, EnzymeStructure> = {
  'chymo-ts': {
    id: 'chymo-ts',
    pdb: '6CHA',
    file: '/structures/6cha.bcif',
    enzyme: 'Chymotrypsin',
    state: 'with a transition-state mimic bound',
    organism: 'Cow (Bos taurus), pancreas',
    method: 'X-ray crystallography',
    resolution: 1.8,
    year: 1987,
    chains: ['A', 'B', 'C'],
    ligands: { PBA: 'phenylethane boronic acid (a transition-state mimic)' },
  },
  'chymo-free': {
    id: 'chymo-free',
    pdb: '4CHA',
    file: '/structures/4cha.bcif',
    enzyme: 'Chymotrypsin',
    state: 'empty (nothing bound)',
    organism: 'Cow (Bos taurus), pancreas',
    method: 'X-ray crystallography',
    resolution: 1.68,
    year: 1985,
    chains: ['A', 'B', 'C'],
    ligands: {},
  },
  'gk-closed': {
    id: 'gk-closed',
    pdb: '1V4S',
    file: '/structures/1v4s.bcif',
    enzyme: 'Glucokinase (hexokinase IV)',
    state: 'closed, with glucose bound',
    organism: 'Human (Homo sapiens)',
    method: 'X-ray crystallography',
    resolution: 2.3,
    year: 2004,
    chains: ['A'],
    ligands: { GLC: 'glucose', MRK: 'a synthetic activator (a drug-like molecule, bound at a separate site)' },
  },
  'gk-open': {
    id: 'gk-open',
    pdb: '1V4T',
    file: '/structures/1v4t.bcif',
    enzyme: 'Glucokinase (hexokinase IV)',
    state: 'open, nothing in the glucose site',
    organism: 'Human (Homo sapiens)',
    method: 'X-ray crystallography',
    resolution: 3.4,
    year: 2004,
    chains: ['A'],
    ligands: {},
  },
}

export type SiteGroup = 'triad' | 'oxyanion' | 'pocket' | 'glucose' | 'activator'

export interface SiteResidue {
  chain: string
  seq: number
  /** Three-letter name, exactly as in the PDB file. */
  comp: string
  group: SiteGroup
  /** One-sentence job description shown when the residue is clicked. */
  role: string
}

/** Chymotrypsin's active site (first copy: chains B and C). */
export const CHYMO_SITE: SiteResidue[] = [
  { chain: 'C', seq: 195, comp: 'SER', group: 'triad', role: 'The nucleophile: its oxygen attacks the carbonyl carbon of the peptide bond being cut.' },
  { chain: 'B', seq: 57, comp: 'HIS', group: 'triad', role: 'The base: pulls the proton off Ser195, making Ser195 a much stronger nucleophile, then hands it on.' },
  { chain: 'B', seq: 102, comp: 'ASP', group: 'triad', role: 'Holds His57 in place and in the right orientation (and its negative charge helps steady His57 once it gains a proton).' },
  { chain: 'C', seq: 193, comp: 'GLY', group: 'oxyanion', role: 'Oxyanion hole: its backbone N–H donates a hydrogen bond to the negatively charged oxygen of the transition state.' },
  { chain: 'C', seq: 189, comp: 'SER', group: 'pocket', role: 'Sits at the bottom of the specificity (S1) pocket: small and uncharged, so the deep pocket suits large, nonpolar side chains.' },
  { chain: 'C', seq: 216, comp: 'GLY', group: 'pocket', role: 'Lines the S1 pocket. As glycine (no side chain), it leaves room for a bulky aromatic ring.' },
  { chain: 'C', seq: 226, comp: 'GLY', group: 'pocket', role: 'Lines the S1 pocket. As glycine (no side chain), it leaves room for a bulky aromatic ring.' },
]

/**
 * Glucokinase residues that hydrogen-bond glucose in the closed form 1V4S (side-chain or
 * backbone atom within 3.3 Å of glucose; measured from the file).
 */
export const GK_GLUCOSE_SITE: SiteResidue[] = [
  { chain: 'A', seq: 168, comp: 'THR', group: 'glucose', role: 'Hydrogen-bonds glucose. Part of a loop that is too floppy to see in the open form.' },
  { chain: 'A', seq: 169, comp: 'LYS', group: 'glucose', role: 'Hydrogen-bonds glucose. Part of a loop that is too floppy to see in the open form.' },
  { chain: 'A', seq: 204, comp: 'ASN', group: 'glucose', role: 'Hydrogen-bonds glucose.' },
  { chain: 'A', seq: 205, comp: 'ASP', group: 'glucose', role: 'Hydrogen-bonds glucose.' },
  { chain: 'A', seq: 231, comp: 'ASN', group: 'glucose', role: 'Hydrogen-bonds glucose.' },
  { chain: 'A', seq: 256, comp: 'GLU', group: 'glucose', role: 'Hydrogen-bonds glucose.' },
  { chain: 'A', seq: 290, comp: 'GLU', group: 'glucose', role: 'Hydrogen-bonds glucose.' },
]

/** Residues of glucokinase missing from the open structure 1V4T (disordered: too mobile to locate). */
export const GK_OPEN_MISSING = { from: 157, to: 179 }

/**
 * The two sides of glucokinase's glucose pocket (measured from the files):
 *   • `base`: the residues that hydrogen-bond glucose; they barely move between the forms.
 *   • `lid`: residues 151–153 on the part that swings shut over glucose.
 * Distance between the two sides' Cα centers: about 28 Å open (1V4T) vs 6 Å closed (1V4S).
 */
export const GK_POCKET_SIDES = { lid: [151, 152, 153], base: [204, 205, 231, 256, 290] }

/**
 * Lining up the open structure (1V4T) on the closed one (1V4S), so switching between them
 * shows only the part that really moves. Computed from the files (tests/enzymes.test.ts
 * checks it): repeatedly superpose all shared Cα atoms and drop the ones that differ by more
 * than 2 Å. What remains is the rigid "core" (279 of 424 residues, mostly the large
 * domain), which matches to 0.77 Å RMSD. The small domain, including the glucose-pocket
 * lid, is what swings shut.
 * `openToClosed` is a 4×4 matrix in Mol*'s column-major order.
 */
export const GK_ALIGN = {
  core: [[15, 60], [62, 64], [182, 182], [204, 247], [251, 339], [345, 397], [399, 416], [418, 442]] as [number, number][],
  openToClosed: [-0.24494, -0.92929, -0.27645, 0, 0.81594, -0.04356, -0.57649, 0, 0.52368, -0.36677, 0.76892, 0, -4.81002, 42.12794, 43.07525, 1],
}

/**
 * Lining up empty chymotrypsin (4CHA) on the mimic-bound one (6CHA). Computed from all
 * 236 matching Cα atoms of chains A–C: they differ by only 0.25 Å RMSD, and no
 * active-site or pocket residue moves more than 0.6 Å. Chymotrypsin's pocket is
 * already shaped before anything binds: close to "lock and key". (Checked in tests.)
 */
export const CHYMO_ALIGN = {
  freeToBound: [-0.9999, -0.01421, 0.00074, 0, -0.01421, 0.9999, -0.00166, 0, -0.00072, -0.00167, -1, 0, 35.7937, 20.16802, 64.58096, 1],
}
