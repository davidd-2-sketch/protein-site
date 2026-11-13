/*
  kinetics.ts — Michaelis–Menten kinetics and reversible inhibition.

  v = Vmax·[S] / (Km + [S])

  With an inhibitor at concentration [I] and dissociation constant Ki, let α = 1 + [I]/Ki:
    • competitive (binds only free enzyme, at the active site):   Km_app = α·Km,  Vmax_app = Vmax
    • noncompetitive (pure: binds E and ES equally well):           Km_app = Km,    Vmax_app = Vmax/α
    • uncompetitive (binds only the ES complex):                   Km_app = Km/α,  Vmax_app = Vmax/α
  (Standard results, e.g. Lehninger; Berg/Tymoczko/Stryer.) "Mixed" inhibition is the general
  case where Ki for E and for ES differ; pure noncompetitive is the special case Ki = Ki'.

  Lineweaver–Burk (double reciprocal): 1/v = (Km/Vmax)·(1/[S]) + 1/Vmax
    y-intercept = 1/Vmax, x-intercept = −1/Km, slope = Km/Vmax.

  The example numbers (DEMO) are ILLUSTRATIVE, chosen to make the graph easy to read.
*/

export type Inhibition = 'none' | 'competitive' | 'noncompetitive' | 'uncompetitive'

export interface KineticParams {
  /** Maximum rate (example units: µM/s). */
  vmax: number
  /** Michaelis constant (example units: mM). */
  km: number
  /** Inhibitor dissociation constant (example units: mM). */
  ki: number
}

export const DEMO: KineticParams = { vmax: 100, km: 2, ki: 1 }

/** Rate at substrate concentration s. */
export const rate = (s: number, vmax: number, km: number) => (s <= 0 ? 0 : (vmax * s) / (km + s))

/** Apparent Vmax and Km with inhibitor concentration i. */
export function apparent(type: Inhibition, p: KineticParams, i: number) {
  const a = 1 + Math.max(0, i) / p.ki
  switch (type) {
    case 'competitive':
      return { vmax: p.vmax, km: p.km * a }
    case 'noncompetitive':
      return { vmax: p.vmax / a, km: p.km }
    case 'uncompetitive':
      return { vmax: p.vmax / a, km: p.km / a }
    default:
      return { vmax: p.vmax, km: p.km }
  }
}

/** Rate with inhibitor, from the full rate equation (not via the apparent constants). */
export function velocity(type: Inhibition, p: KineticParams, s: number, i: number) {
  if (s <= 0) return 0
  const a = 1 + Math.max(0, i) / p.ki
  switch (type) {
    case 'competitive':
      return (p.vmax * s) / (a * p.km + s)
    case 'noncompetitive':
      return (p.vmax * s) / (a * (p.km + s))
    case 'uncompetitive':
      return (p.vmax * s) / (p.km + a * s)
    default:
      return (p.vmax * s) / (p.km + s)
  }
}

/** The straight line of the Lineweaver–Burk plot. */
export function lineweaverBurk(vmax: number, km: number) {
  return { slope: km / vmax, yIntercept: 1 / vmax, xIntercept: -1 / km }
}

export const INHIBITION_INFO: Record<Exclude<Inhibition, 'none'>, { name: string; binds: string; effect: string; lb: string }> = {
  competitive: {
    name: 'Competitive',
    binds: 'the free enzyme, at the active site (it competes with the substrate)',
    effect: 'Km rises, Vmax unchanged: enough substrate can outcompete it.',
    lb: 'Lines cross on the y-axis (same 1/Vmax).',
  },
  noncompetitive: {
    name: 'Noncompetitive',
    binds: 'the enzyme whether or not substrate is bound, at a different site',
    effect: 'Vmax falls, Km unchanged: extra substrate can’t rescue it.',
    lb: 'Lines cross on the x-axis (same −1/Km).',
  },
  uncompetitive: {
    name: 'Uncompetitive',
    binds: 'only the enzyme–substrate complex',
    effect: 'Vmax and Km both fall by the same factor.',
    lb: 'Lines are parallel (same slope).',
  },
}
