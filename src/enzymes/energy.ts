/*
  energy.ts — schematic energy diagrams for an uncatalyzed vs an enzyme-catalyzed reaction.

  The SHAPES follow standard textbook diagrams; the heights are not real values:
    • Both start at S (substrate) and end at P (product): the overall ΔG is IDENTICAL.
      An enzyme cannot change where a reaction ends up, only how fast it gets there.
    • Uncatalyzed: one high peak (the transition state, ‡).
    • Catalyzed: E + S → ES (binding) → [ES‡, stabilized] → EP → E + P. The highest peak is
      much lower: the enzyme binds the transition state more tightly than the substrate.
*/
import { energyCurve } from '../reactions/mechanism'

export const UNCATALYZED: [number, number][] = [
  [0, 0],
  [0.5, 1],
  [1, -0.35],
]

export const CATALYZED: [number, number][] = [
  [0, 0], // E + S
  [0.1, 0.08], // binding (small barrier)
  [0.24, -0.15], // ES complex
  [0.5, 0.42], // transition state, stabilized by the enzyme
  [0.74, -0.48], // EP complex
  [0.88, -0.24], // product release
  [1, -0.35], // E + P
]

export const uncatalyzedEnergy = energyCurve(UNCATALYZED)
export const catalyzedEnergy = energyCurve(CATALYZED)

const last = (p: [number, number][]) => p[p.length - 1][1]
const peak = (p: [number, number][]) => Math.max(...p.map(([, e]) => e))

/** Overall free-energy change (products − reactants). Same for both by construction. */
export const deltaG = (p: [number, number][]) => last(p) - p[0][1]
/** Height of the highest peak above the starting point (what a student reads as Eₐ). */
export const activation = (p: [number, number][]) => peak(p) - p[0][1]
