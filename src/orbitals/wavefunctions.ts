/*
  wavefunctions.ts — the math behind every orbital on the page.

  These are the REAL hydrogen-atom orbitals (exact solutions of the Schrödinger equation
  for one electron), written in Cartesian form. Distances are in Bohr radii (a₀ = 0.529 Å).
  Overall constants are left out where they don't change the SHAPE, because each surface's
  threshold is chosen separately (below). Where orbitals are MIXED (hybrids, bonds), we use
  properly normalized forms so the mixing proportions are right.

  Sources: any physical chemistry text (e.g. McQuarrie, Quantum Chemistry, ch. 6), and
  OpenStax Chemistry 2e §6.3 for the Gen Chem framing.

  HOW THE SURFACE IS DRAWN
    An orbital has no hard edge, so we draw the surface that encloses 90% of the probability
    of finding the electron (probability ∝ ψ²). isoForFraction() finds that threshold numerically.
*/

export type Fn = (x: number, y: number, z: number) => number

const r3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z)

/* ---------- Hydrogen-like orbitals (shape only; Z scales size: bigger Z = smaller orbital) ---------- */

export const ORBITALS: Record<string, { label: string; n: number; l: number; fn: Fn; extent: number }> = {
  '1s': { label: '1s', n: 1, l: 0, extent: 5, fn: (x, y, z) => Math.exp(-r3(x, y, z)) },
  '2s': { label: '2s', n: 2, l: 0, extent: 16, fn: (x, y, z) => { const r = r3(x, y, z); return (2 - r) * Math.exp(-r / 2) } },
  '2px': { label: '2p_x', n: 2, l: 1, extent: 16, fn: (x, y, z) => x * Math.exp(-r3(x, y, z) / 2) },
  '2py': { label: '2p_y', n: 2, l: 1, extent: 16, fn: (x, y, z) => y * Math.exp(-r3(x, y, z) / 2) },
  '2pz': { label: '2p_z', n: 2, l: 1, extent: 16, fn: (x, y, z) => z * Math.exp(-r3(x, y, z) / 2) },
  '3s': { label: '3s', n: 3, l: 0, extent: 28, fn: (x, y, z) => { const r = r3(x, y, z); return (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3) } },
  '3pz': { label: '3p_z', n: 3, l: 1, extent: 28, fn: (x, y, z) => { const r = r3(x, y, z); return (6 - r) * z * Math.exp(-r / 3) } },
  '3dxy': { label: '3d_xy', n: 3, l: 2, extent: 26, fn: (x, y, z) => x * y * Math.exp(-r3(x, y, z) / 3) },
  '3dxz': { label: '3d_xz', n: 3, l: 2, extent: 26, fn: (x, y, z) => x * z * Math.exp(-r3(x, y, z) / 3) },
  '3dyz': { label: '3d_yz', n: 3, l: 2, extent: 26, fn: (x, y, z) => y * z * Math.exp(-r3(x, y, z) / 3) },
  '3dx2y2': { label: '3d_x²−y²', n: 3, l: 2, extent: 26, fn: (x, y, z) => ((x * x - y * y) / 2) * Math.exp(-r3(x, y, z) / 3) },
  '3dz2': { label: '3d_z²', n: 3, l: 2, extent: 26, fn: (x, y, z) => { const r = r3(x, y, z); return ((3 * z * z - r * r) / (2 * Math.sqrt(3))) * Math.exp(-r / 3) } },
}

/* ---------- Hybrid orbitals ----------
   With Z = 1, the normalized 2s and 2p orbitals share the same prefactor:
     ψ2s ∝ (2 − r) e^(−r/2),   ψ2p along unit vector n ∝ (n·r) e^(−r/2)
   An spᵏ hybrid pointing along n is  (ψ2s + √k · ψ2p_n) / √(1 + k):
     sp (k = 1), sp² (k = 2), sp³ (k = 3). The overall 1/√(1+k) doesn't change the shape. */
export function hybrid(k: 1 | 2 | 3, n: [number, number, number]): Fn {
  const l = Math.hypot(...n)
  const [a, b, c] = [n[0] / l, n[1] / l, n[2] / l]
  const lambda = Math.sqrt(k)
  return (x, y, z) => {
    const r = r3(x, y, z)
    return (2 - r + lambda * (a * x + b * y + c * z)) * Math.exp(-r / 2)
  }
}

/** Directions of each hybrid set (matching the VSEPR electron geometries). */
const t = 1 / Math.sqrt(3)
export const HYBRID_SETS: Record<'sp' | 'sp2' | 'sp3', { k: 1 | 2 | 3; dirs: [number, number, number][]; leftover: string[] }> = {
  sp: { k: 1, dirs: [[1, 0, 0], [-1, 0, 0]], leftover: ['2py', '2pz'] },
  sp2: { k: 2, dirs: [[1, 0, 0], [-0.5, Math.sqrt(3) / 2, 0], [-0.5, -Math.sqrt(3) / 2, 0]], leftover: ['2pz'] },
  sp3: { k: 3, dirs: [[t, t, t], [t, -t, -t], [-t, t, -t], [-t, -t, t]], leftover: [] },
}

/* ---------- Simple bonds (LCAO: add or subtract atomic orbitals) ----------
   H₂: two 1s orbitals 1.4 a₀ apart (0.74 Å, the real H–H bond length).
   C=C-like σ and π: 2p orbitals with Z_eff = 3.25 (Slater's rules for carbon) so they
   are carbon-sized, 2.53 a₀ apart (1.34 Å, the C=C length in ethene). */
const s1 = (x: number, y: number, z: number) => Math.exp(-r3(x, y, z))
const p2 = (Z: number) => (u: number, x: number, y: number, z: number) => Z * u * Math.exp((-Z * r3(x, y, z)) / 2)
const pC = p2(3.25)
const H2_HALF = 0.7 // a₀
const CC_HALF = 2.53 / 2 // a₀

// Bonds lie along the x-axis (left–right on screen), so π lobes appear above and below, as in textbooks.
export const BONDS: Record<string, { label: string; fn: Fn; extent: number; nuclei: [number, number, number][] }> = {
  'h2-bonding': {
    label: 'σ (bonding), H₂',
    extent: 5,
    nuclei: [[-H2_HALF, 0, 0], [H2_HALF, 0, 0]],
    fn: (x, y, z) => s1(x + H2_HALF, y, z) + s1(x - H2_HALF, y, z),
  },
  'h2-antibonding': {
    label: 'σ* (antibonding), H₂',
    extent: 5,
    nuclei: [[-H2_HALF, 0, 0], [H2_HALF, 0, 0]],
    fn: (x, y, z) => s1(x + H2_HALF, y, z) - s1(x - H2_HALF, y, z),
  },
  // Head-on: both p orbitals along the bond (x). A's + lobe points at B; subtracting B's p
  // makes B's lobe facing A positive too, so the overlap in the middle adds up.
  'p-sigma': {
    label: 'σ from two p orbitals (head-on)',
    extent: 5,
    nuclei: [[-CC_HALF, 0, 0], [CC_HALF, 0, 0]],
    fn: (x, y, z) => pC(x + CC_HALF, x + CC_HALF, y, z) - pC(x - CC_HALF, x - CC_HALF, y, z),
  },
  // Side by side: both p orbitals perpendicular to the bond (along z, i.e. up), same sign: π bond.
  'p-pi': {
    label: 'π from two p orbitals (side by side)',
    extent: 5,
    nuclei: [[-CC_HALF, 0, 0], [CC_HALF, 0, 0]],
    fn: (x, y, z) => pC(z, x + CC_HALF, y, z) + pC(z, x - CC_HALF, y, z),
  },
}

/* ---------- Sampling on a grid + the 90% threshold ---------- */

/** Sample fn on an N×N×N grid spanning ±extent, in the index layout three's MarchingCubes uses. */
export function sampleGrid(fn: Fn, N: number, extent: number) {
  const out = new Float32Array(N * N * N)
  const h = N / 2
  for (let k = 0; k < N; k++) {
    const z = ((k - h) / h) * extent
    for (let j = 0; j < N; j++) {
      const y = ((j - h) / h) * extent
      for (let i = 0; i < N; i++) out[k * N * N + j * N + i] = fn(((i - h) / h) * extent, y, z)
    }
  }
  return out
}

/**
 * The |ψ| threshold whose surface encloses `fraction` of the total probability (ψ²).
 * Sort grid points from most to least probable and add them up until we reach the fraction.
 */
export function isoForFraction(values: Float32Array, fraction = 0.9) {
  const p = new Float32Array(values.length)
  let total = 0
  for (let i = 0; i < values.length; i++) {
    p[i] = values[i] * values[i]
    total += p[i]
  }
  p.sort() // ascending
  let acc = 0
  for (let i = p.length - 1; i >= 0; i--) {
    acc += p[i]
    if (acc >= fraction * total) return Math.sqrt(p[i])
  }
  return 0
}

/** Bohr radius in ångströms (CODATA 2018: 0.529177 Å). */
export const BOHR = 0.529177
