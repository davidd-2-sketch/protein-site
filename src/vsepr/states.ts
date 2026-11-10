/*
  states.ts — turn "a shape" or "a real molecule" into the description the 3D scene draws.
  Used by the Shapes page and practice mode.
*/
import { MOLECULES, type Molecule } from './molecules'
import { idealDomains, shapeFor } from './shapes'
import type { SceneState } from './VseprScene'

/** "109.5°" from a 3D angle; drops a trailing ".0". */
const fmtAngle = (deg: number) => `${deg.toFixed(1).replace(/\.0$/, '')}°`

/** An ideal shape with given counts (generic A/X atoms unless elements are given). */
export function idealState(bonds: number, lone: number, central = 'A', ligand = 'X'): SceneState {
  const domains = idealDomains(bonds, lone)
  const shape = shapeFor(bonds, lone)
  const bondDirs = domains.filter((d) => d.kind === 'bond').map((d) => d.dir)
  // Lone pairs squeeze bond angles, so for those shapes the drawn (ideal) angle is an upper
  // limit: label it "< 109.5°" rather than "109.5°" so nobody memorizes the wrong number.
  const squeezed = /less|squeezed/.test(shape.idealAngles)
  const arcs = shape.arcs.map(([i, j]): [number, number, string] => {
    const [a, b] = [bondDirs[i], bondDirs[j]]
    const angle = (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI
    return [i, j, `${squeezed ? '< ' : ''}${fmtAngle(angle)}`]
  })
  return { central, ligand, order: 1, domains, arcs }
}

export const moleculeState = (m: Molecule): SceneState => ({ central: m.central, ligand: m.ligand, order: m.order, domains: m.domains, arcs: m.arcs })

export const byFormula = (f?: string) => MOLECULES.find((m) => m.formula === f) ?? null
