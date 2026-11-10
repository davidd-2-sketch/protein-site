/*
  hemoglobin.ts — everything the viewer says about hemoglobin.

  Structure: PDB 4HHB, human deoxyhemoglobin (no O₂ bound), X-ray, 1.74 Å.
  Fermi, Perutz, Shaanan & Fourme, J. Mol. Biol. 175:159–174 (1984).

  Every residue number below was checked against the 4HHB file itself
  (chain lengths: α = 141, β = 146; residue identities at each position).
  Facts about function are standard textbook biochemistry (e.g. Lehninger, ch. 5).
*/

export type ChainId = 'A' | 'B' | 'C' | 'D'

export interface ChainInfo {
  id: ChainId
  /** Display name, e.g. "α₁" */
  label: string
  type: 'alpha' | 'beta'
  length: number
  color: string
}

export const CHAINS: Record<ChainId, ChainInfo> = {
  A: { id: 'A', label: 'α₁', type: 'alpha', length: 141, color: '#5ee4ff' },
  B: { id: 'B', label: 'β₁', type: 'beta', length: 146, color: '#a78bfa' },
  C: { id: 'C', label: 'α₂', type: 'alpha', length: 141, color: '#3f9bff' },
  D: { id: 'D', label: 'β₂', type: 'beta', length: 146, color: '#e879c9' },
}

export const ALL_CHAINS: ChainId[] = ['A', 'B', 'C', 'D']

/* One-letter sequences, copied from the 4HHB file (_entity_poly). */
export const SEQUENCES: Record<'alpha' | 'beta', string> = {
  alpha:
    'VLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNAL' +
    'SALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR',
  beta:
    'VHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDN' +
    'LKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH',
}

/*
  Residues with a known special role. Keyed by "<chain type>:<residue number>".
  Helix positions like "F8" use the classic globin naming (helix letter + position in helix).
*/
export const KEY_RESIDUES: Record<string, { title: string; text: string }> = {
  'alpha:87': {
    title: 'Proximal histidine (F8)',
    text: 'Its side chain bonds directly to the heme iron from below. It anchors the heme to the protein, and when O₂ binds, the iron pulls this histidine, and its whole helix, along with it.',
  },
  'beta:92': {
    title: 'Proximal histidine (F8)',
    text: 'Its side chain bonds directly to the heme iron from below. It anchors the heme to the protein, and when O₂ binds, the iron pulls this histidine, and its whole helix, along with it.',
  },
  'alpha:58': {
    title: 'Distal histidine (E7)',
    text: 'Sits on the oxygen side of the heme without touching the iron. When O₂ binds, this histidine hydrogen-bonds to it and helps hold it in place.',
  },
  'beta:63': {
    title: 'Distal histidine (E7)',
    text: 'Sits on the oxygen side of the heme without touching the iron. When O₂ binds, this histidine hydrogen-bonds to it and helps hold it in place.',
  },
  'beta:6': {
    title: 'Sickle-cell site',
    text: 'In sickle-cell disease, a single DNA change swaps this glutamate (charged) for valine (hydrophobic). The new sticky patch on the surface lets deoxygenated hemoglobin molecules clump into long fibers that bend red blood cells into a sickle shape.',
  },
  'beta:1': {
    title: '2,3-BPG binding site',
    text: 'The β-chain N-terminus lines the central cavity where 2,3-bisphosphoglycerate (2,3-BPG) binds. 2,3-BPG stabilizes the deoxy (T) state, which helps hemoglobin release O₂ to tissues.',
  },
  'beta:2': {
    title: '2,3-BPG binding site',
    text: 'One of the positively charged residues lining the central cavity that binds the negatively charged 2,3-BPG molecule.',
  },
  'beta:82': {
    title: '2,3-BPG binding site',
    text: 'This lysine points into the central cavity and helps bind the negatively charged 2,3-BPG molecule.',
  },
  'beta:143': {
    title: '2,3-BPG binding site',
    text: 'One of the positively charged residues lining the central cavity that binds 2,3-BPG.',
  },
  'beta:146': {
    title: 'Bohr effect residue',
    text: 'In the deoxy state this C-terminal histidine forms a salt bridge with Asp94. That makes it more likely to hold a proton, which is a big part of why acid (low pH) helps hemoglobin release O₂: the Bohr effect.',
  },
}
