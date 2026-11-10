/*
  bonds.ts — small chemistry helpers shared by the info panel and lessons.
*/
import type { AtomInfo } from './ProteinViewer'

/** A peptide bond joins the carbonyl C of one residue to the N of the next residue in the same chain. */
export function isPeptideBond(a: AtomInfo, b: AtomInfo) {
  if (a.chain !== b.chain) return false
  return (
    (a.atomName === 'C' && b.atomName === 'N' && b.seq === a.seq + 1) ||
    (b.atomName === 'C' && a.atomName === 'N' && a.seq === b.seq + 1)
  )
}

/** Backbone atoms shared by every amino acid. Everything else in a residue is side chain. */
export const BACKBONE = new Set(['N', 'CA', 'C', 'O', 'OXT'])

/* Hydrophobic residues (nonpolar aliphatic + aromatic, Lehninger grouping; Tyr excluded
   because its OH makes it partly polar, Gly excluded because it has no side chain). */
export const HYDROPHOBIC = ['ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PRO', 'PHE', 'TRP']
