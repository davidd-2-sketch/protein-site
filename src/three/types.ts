/*
  types.ts — shared "shapes" of data used by our Three.js code.
  TypeScript uses these to check we never, say, pass a string where a number belongs.
*/

/** One atom: [element symbol, x, y, z]. Coordinates are in ångströms (1 Å = 0.1 nanometer). */
export type AtomRecord = [element: string, x: number, y: number, z: number]

/** One bond: [index of atom A, index of atom B, bond order (1 = single, 2 = double, 3 = triple)]. */
export type BondRecord = [a: number, b: number, order: number]

export interface MoleculeData {
  name: string
  /** Where the coordinates came from — always shown to students. */
  source: string
  atoms: AtomRecord[]
  bonds: BondRecord[]
}
