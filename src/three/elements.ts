/*
  elements.ts — how each chemical element looks and what we say about it.

  Colors follow the widely used CPK/Jmol convention (O red, N blue, P orange...),
  slightly tuned so they stay crisp on a dark background. Carbon is a light
  graphite grey instead of near-black, otherwise it would vanish on our page.

  covalentRadius values are real (Cordero et al., Dalton Trans. 2008), in ångströms.
  We scale them down for ball-and-stick so bonds stay visible.
*/

export interface ElementStyle {
  name: string
  color: string
  covalentRadius: number
}

export const ELEMENTS: Record<string, ElementStyle> = {
  H: { name: 'Hydrogen', color: '#f2f4f7', covalentRadius: 0.31 },
  C: { name: 'Carbon', color: '#8a93a3', covalentRadius: 0.76 },
  N: { name: 'Nitrogen', color: '#3f7bff', covalentRadius: 0.71 },
  O: { name: 'Oxygen', color: '#ff3d4f', covalentRadius: 0.66 },
  P: { name: 'Phosphorus', color: '#ff9426', covalentRadius: 1.07 },
  S: { name: 'Sulfur', color: '#ffd23f', covalentRadius: 1.05 },
  // Bromine: CPK uses dark red, which is too close to oxygen's red on a dark page.
  // A reddish-brown keeps the convention but stays clearly different from O.
  Br: { name: 'Bromine', color: '#a0522d', covalentRadius: 1.2 },
  Cl: { name: 'Chlorine', color: '#3ee07a', covalentRadius: 1.02 },
  Fe: { name: 'Iron', color: '#e0703a', covalentRadius: 1.32 },
  B: { name: 'Boron', color: '#ffb5b5', covalentRadius: 0.84 },
  F: { name: 'Fluorine', color: '#8fe35a', covalentRadius: 0.57 },
  Xe: { name: 'Xenon', color: '#4fb3c9', covalentRadius: 1.4 },
  I: { name: 'Iodine', color: '#9d4fd8', covalentRadius: 1.39 },
  Si: { name: 'Silicon', color: '#e8c9a0', covalentRadius: 1.11 },
  // Generic atoms for the VSEPR builder: "A" = central atom, "X" = any bonded atom.
  A: { name: 'Central atom', color: '#9aa3c4', covalentRadius: 0.9 },
  X: { name: 'Bonded atom', color: '#c9b8ff', covalentRadius: 0.6 },
}

/** Fallback for any element we haven't styled yet (magenta, the classic "unknown" color). */
export const UNKNOWN_ELEMENT: ElementStyle = { name: 'Unknown', color: '#ff4fd8', covalentRadius: 0.8 }

export function elementStyle(symbol: string): ElementStyle {
  return ELEMENTS[symbol] ?? UNKNOWN_ELEMENT
}
