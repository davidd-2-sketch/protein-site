/*
  mechanism.ts — what any animated reaction must describe, so one 3D engine
  (ReactionScene) can play SN2, SN1, and future mechanisms.

  Everything is a function of the reaction progress s (0 → 1):
    • atoms(s): every atom's position,
    • bonds(s): every bond and how formed it is (0 = none, 1 = full, between = dashed),
    • arrows(s): the curved electron-flow arrows to draw and where their electron pair is.
*/
import type { ReactionAtom, ReactionBond, Vec } from './sn2Geometry'

export interface ArrowSpec {
  tail: Vec
  tip: Vec
  /** How far the arrow bows out (Å). */
  bow: number
  /** 0 = hidden, 1 = fully visible. */
  opacity: number
  /** Where the moving electron pair is along the arrow (0–1); outside that range = not shown. */
  travel: number
}

export interface Mechanism {
  atoms(s: number): ReactionAtom[]
  bonds(s: number): ReactionBond[]
  arrows(s: number, atoms: ReactionAtom[]): ArrowSpec[]
  /** Half the width and height (Å) of the region the camera should fit. */
  extent: { halfW: number; halfH: number }
}

/* ---------- vector helpers shared by mechanism files ---------- */
export const v = {
  add: (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a: Vec): Vec => {
    const l = Math.hypot(...a)
    return [a[0] / l, a[1] / l, a[2] / l]
  },
  lerp: (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  dist: (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
}

export const pos = (atoms: ReactionAtom[], id: string) => atoms.find((a) => a.id === id)!.position

/** Direction the curved arrows bow toward: up and toward the default camera. */
export const BULGE: Vec = v.norm([0, Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)])

/**
 * Energy along the reaction from key points [s, energy]. Between points the curve eases in and
 * out, so every key point is a smooth peak or valley. SCHEMATIC: shapes, not real values.
 */
export function energyCurve(points: [number, number][]) {
  return (s: number) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [s0, e0] = points[i]
      const [s1, e1] = points[i + 1]
      if (s <= s1) {
        const t = Math.max(0, (s - s0) / (s1 - s0))
        return e0 + (e1 - e0) * 0.5 * (1 - Math.cos(Math.PI * t))
      }
    }
    return points[points.length - 1][1]
  }
}
