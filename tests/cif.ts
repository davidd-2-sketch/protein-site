/* cif.ts — a tiny reader for the atom list in an mmCIF file (test helper, not shipped). */
import { readFileSync } from 'node:fs'

export interface CifAtom {
  record: 'ATOM' | 'HETATM'
  atom: string
  element: string
  comp: string
  chain: string
  seq: number
  xyz: [number, number, number]
}

/** Atoms of model 1, first alternate position only, using the author (PDB) chain and residue numbers. */
export function readAtoms(file: string): CifAtom[] {
  const text = readFileSync(new URL(`../reference/${file}`, import.meta.url), 'utf8')
  const cols: string[] = []
  const atoms: CifAtom[] = []
  for (const line of text.split('\n')) {
    if (line.startsWith('_atom_site.')) cols.push(line.slice(11).trim())
    else if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      const f = line.trim().split(/\s+/)
      const v = (k: string) => f[cols.indexOf(k)]
      if (v('pdbx_PDB_model_num') !== '1') continue
      if (!['.', 'A'].includes(v('label_alt_id'))) continue
      atoms.push({
        record: v('group_PDB') as CifAtom['record'],
        atom: v('auth_atom_id').replace(/"/g, ''),
        element: v('type_symbol'),
        comp: v('auth_comp_id'),
        chain: v('auth_asym_id'),
        seq: Number(v('auth_seq_id')),
        xyz: [Number(v('Cartn_x')), Number(v('Cartn_y')), Number(v('Cartn_z'))],
      })
    }
  }
  return atoms
}

export const dist = (a: CifAtom, b: CifAtom) => Math.hypot(a.xyz[0] - b.xyz[0], a.xyz[1] - b.xyz[1], a.xyz[2] - b.xyz[2])

export function find(atoms: CifAtom[], chain: string, seq: number, atom: string) {
  const a = atoms.find((x) => x.chain === chain && x.seq === seq && x.atom === atom)
  if (!a) throw new Error(`No atom ${chain}:${seq}:${atom}`)
  return a
}
