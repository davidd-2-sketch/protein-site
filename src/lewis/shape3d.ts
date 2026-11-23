/*
  shape3d.ts — turn a finished Lewis structure into the 3D VSEPR shape.

  The Lewis structure tells us the central atom's bonded atoms and lone pairs; VSEPR turns
  that into a 3D arrangement. If the Shapes page has MEASURED angles for the molecule, we use
  them. Otherwise we draw the ideal shape without angle labels (an ideal angle shown on a real
  molecule would be wrong, e.g. formaldehyde's H–C–H is not exactly 120°).
*/
import { idealDomains, isValid } from '../vsepr/shapes'
import { byFormula, moleculeState } from '../vsepr/states'
import type { SceneState } from '../vsepr/VseprScene'
import { shapeOf, type LewisMolecule, type LForm } from './molecules'

export function sceneFor(m: LewisMolecule, f: LForm): SceneState | null {
  const sh = shapeOf(m, f)
  if (!sh || !isValid(sh.neighbors.length, sh.lone)) return null
  const measured = m.vsepr ? byFormula(m.vsepr) : null
  if (measured) return moleculeState(measured)
  return {
    central: sh.central,
    ligand: sh.neighbors[0].el,
    order: 1,
    domains: idealDomains(sh.neighbors.length, sh.lone),
    arcs: [],
    ligands: sh.neighbors.map((n) => n.el),
    orders: sh.neighbors.map((n) => n.order),
  }
}
