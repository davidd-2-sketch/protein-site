/*
  aminoAcids.ts — reference data for the 20 standard amino acids.

  Side-chain classes follow the grouping used in Lehninger Principles of
  Biochemistry (the most common intro biochem textbook):
    nonpolar (aliphatic), aromatic, polar (uncharged), acidic (negative), basic (positive).
  Charges are what you'd expect at physiological pH (~7.4). Histidine is listed
  as basic, but its side chain is only partly protonated at pH 7.4. We say so
  in its note, because that detail matters in hemoglobin.
*/

export type SideChainClass = 'nonpolar' | 'aromatic' | 'polar' | 'acidic' | 'basic'

export interface AminoAcid {
  name: string
  three: string
  one: string
  sideChain: SideChainClass
  note?: string
}

export const SIDE_CHAIN_LABEL: Record<SideChainClass, string> = {
  nonpolar: 'Nonpolar, aliphatic',
  aromatic: 'Aromatic (mostly nonpolar)',
  polar: 'Polar, uncharged',
  acidic: 'Acidic, negatively charged',
  basic: 'Basic, positively charged',
}

/** One friendly sentence per side-chain class, shown first in the info panel. */
export const PLAIN_SIDE_CHAIN: Record<SideChainClass, string> = {
  nonpolar: 'An amino acid with an oily side chain. Oily side chains avoid water and usually end up inside the protein.',
  aromatic: 'An amino acid whose side chain has a flat ring of carbons. Mostly oily, so it tends to sit inside the protein.',
  polar: 'An amino acid with a water-loving side chain. It can hydrogen-bond with water and other polar groups.',
  acidic: 'An amino acid with a negatively charged side chain at body pH. Charged side chains like to sit on the surface, facing water.',
  basic: 'An amino acid with a side chain that carries (or can carry) a positive charge. Usually found on the surface, facing water.',
}

const LIST: AminoAcid[] = [
  { name: 'Glycine', three: 'GLY', one: 'G', sideChain: 'nonpolar', note: 'The smallest amino acid: its side chain is just a hydrogen, so it fits in tight turns.' },
  { name: 'Alanine', three: 'ALA', one: 'A', sideChain: 'nonpolar' },
  { name: 'Valine', three: 'VAL', one: 'V', sideChain: 'nonpolar' },
  { name: 'Leucine', three: 'LEU', one: 'L', sideChain: 'nonpolar' },
  { name: 'Isoleucine', three: 'ILE', one: 'I', sideChain: 'nonpolar' },
  { name: 'Methionine', three: 'MET', one: 'M', sideChain: 'nonpolar' },
  { name: 'Proline', three: 'PRO', one: 'P', sideChain: 'nonpolar', note: 'Its side chain loops back onto the backbone, making a rigid kink. Proline often ends or breaks a helix.' },
  { name: 'Phenylalanine', three: 'PHE', one: 'F', sideChain: 'aromatic' },
  { name: 'Tyrosine', three: 'TYR', one: 'Y', sideChain: 'aromatic' },
  { name: 'Tryptophan', three: 'TRP', one: 'W', sideChain: 'aromatic' },
  { name: 'Serine', three: 'SER', one: 'S', sideChain: 'polar' },
  { name: 'Threonine', three: 'THR', one: 'T', sideChain: 'polar' },
  { name: 'Cysteine', three: 'CYS', one: 'C', sideChain: 'polar' },
  { name: 'Asparagine', three: 'ASN', one: 'N', sideChain: 'polar' },
  { name: 'Glutamine', three: 'GLN', one: 'Q', sideChain: 'polar' },
  { name: 'Aspartate', three: 'ASP', one: 'D', sideChain: 'acidic' },
  { name: 'Glutamate', three: 'GLU', one: 'E', sideChain: 'acidic' },
  { name: 'Lysine', three: 'LYS', one: 'K', sideChain: 'basic' },
  { name: 'Arginine', three: 'ARG', one: 'R', sideChain: 'basic' },
  { name: 'Histidine', three: 'HIS', one: 'H', sideChain: 'basic', note: 'Its side chain has a pKa near 6, so at body pH it is only partly charged. That lets it gain or lose a proton easily.' },
]

export const BY_THREE = new Map(LIST.map((a) => [a.three, a]))
export const BY_ONE = new Map(LIST.map((a) => [a.one, a]))

/** The four backbone atoms shared by every amino acid (everything else is side chain). */
export const BACKBONE_ATOMS: Record<string, string> = {
  N: 'Backbone nitrogen (the amino group)',
  CA: 'Alpha carbon (Cα): the central carbon every side chain attaches to',
  C: 'Backbone carbonyl carbon',
  O: 'Backbone carbonyl oxygen',
  OXT: 'Second oxygen of the C-terminal carboxylate',
}
