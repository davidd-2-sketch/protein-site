/*
  molecules.ts — the Lewis structures the page can draw and check.

  Each molecule is a SKELETON (which atoms are connected, and where to draw them in 2D)
  plus its correct structure(s):
    • bonds[k]  = bond order of skeleton link k (1 single, 2 double, 3 triple)
    • lone[i]   = lone PAIRS on atom i
    • single[i] = unpaired electrons on atom i (only for odd-electron molecules like NO)
  Several correct structures = resonance forms. `alternatives` are structures that pass the
  octet check but are worse (bigger formal charges), used by the formal-charge lesson.

  The rules (standard Gen Chem, e.g. OpenStax Chemistry 2e §7.3–7.4; Tro; Zumdahl):
    valence electrons = sum of the atoms' valence electrons − charge
    formal charge     = valence electrons − (nonbonding electrons + bonds)
  tests/lewis.test.ts checks every structure here against these rules.
*/

export interface LAtom {
  el: string
  /** 2D drawing position (1 unit ≈ one bond length; y points DOWN, as on screen). */
  x: number
  y: number
}

export interface LForm {
  bonds: number[]
  lone: number[]
  single?: number[]
}

export interface LewisMolecule {
  id: string
  formula: string
  name: string
  charge: number
  atoms: LAtom[]
  /** Skeleton: which atoms are bonded (by index). */
  links: [number, number][]
  /** Correct structure(s). More than one = resonance forms. */
  forms: LForm[]
  /** Octet-valid structures that are NOT the best, with why. */
  alternatives?: { form: LForm; why: string }[]
  /** The central atom (for the 3D shape). None for two-atom molecules. */
  center?: number
  /** A rule-breaker, and how. */
  exception?: 'incomplete' | 'odd' | 'expanded'
  /** One line shown with the finished structure. */
  note?: string
  /** Formula as written on the Shapes page, if that page has measured angles for it. */
  vsepr?: string
}

/** Valence electrons: the main-group group number (last digit). */
export const VALENCE: Record<string, number> = { H: 1, B: 3, C: 4, N: 5, O: 6, F: 7, P: 5, S: 6, Cl: 7, Xe: 8 }

/** Second-row atoms (and H, B) can't go past an octet; third-row and below can. */
const ROW2 = new Set(['B', 'C', 'N', 'O', 'F'])

const triangle = (c: string, o: string): LAtom[] => [
  { el: c, x: 0, y: 0 },
  { el: o, x: 0, y: -1 },
  { el: o, x: -0.87, y: 0.5 },
  { el: o, x: 0.87, y: 0.5 },
]

export const LEWIS: LewisMolecule[] = [
  /* ---------------------------------------------------------------- basics */
  {
    id: 'h2o',
    formula: 'H₂O',
    name: 'Water',
    charge: 0,
    atoms: [{ el: 'H', x: -1, y: 0 }, { el: 'O', x: 0, y: 0 }, { el: 'H', x: 1, y: 0 }],
    links: [[0, 1], [1, 2]],
    forms: [{ bonds: [1, 1], lone: [0, 2, 0] }],
    center: 1,
    vsepr: 'H₂O',
    note: 'Two bonds and two lone pairs on oxygen: four electron groups, so water is bent.',
  },
  {
    id: 'nh3',
    formula: 'NH₃',
    name: 'Ammonia',
    charge: 0,
    atoms: [{ el: 'N', x: 0, y: 0 }, { el: 'H', x: -1, y: 0 }, { el: 'H', x: 1, y: 0 }, { el: 'H', x: 0, y: 1 }],
    links: [[0, 1], [0, 2], [0, 3]],
    forms: [{ bonds: [1, 1, 1], lone: [1, 0, 0, 0] }],
    center: 0,
    vsepr: 'NH₃',
    note: 'Three bonds and one lone pair on nitrogen: trigonal pyramidal.',
  },
  {
    id: 'ch4',
    formula: 'CH₄',
    name: 'Methane',
    charge: 0,
    atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'H', x: -1, y: 0 }, { el: 'H', x: 1, y: 0 }, { el: 'H', x: 0, y: -1 }, { el: 'H', x: 0, y: 1 }],
    links: [[0, 1], [0, 2], [0, 3], [0, 4]],
    forms: [{ bonds: [1, 1, 1, 1], lone: [0, 0, 0, 0, 0] }],
    center: 0,
    vsepr: 'CH₄',
    note: 'The flat cross is just how it is drawn. In 3D the four bonds point to the corners of a tetrahedron.',
  },
  {
    id: 'co2',
    formula: 'CO₂',
    name: 'Carbon dioxide',
    charge: 0,
    atoms: [{ el: 'O', x: -1, y: 0 }, { el: 'C', x: 0, y: 0 }, { el: 'O', x: 1, y: 0 }],
    links: [[0, 1], [1, 2]],
    forms: [{ bonds: [2, 2], lone: [2, 0, 2] }],
    alternatives: [
      {
        form: { bonds: [3, 1], lone: [1, 0, 3] },
        why: 'Every atom has an octet, but the oxygens carry formal charges of +1 and −1. Two double bonds give every atom a formal charge of 0, so that structure is better.',
      },
    ],
    center: 1,
    vsepr: 'CO₂',
  },
  {
    id: 'hcn',
    formula: 'HCN',
    name: 'Hydrogen cyanide',
    charge: 0,
    atoms: [{ el: 'H', x: -1, y: 0 }, { el: 'C', x: 0, y: 0 }, { el: 'N', x: 1, y: 0 }],
    links: [[0, 1], [1, 2]],
    forms: [{ bonds: [1, 3], lone: [0, 0, 1] }],
    center: 1,
    note: 'Carbon needs a triple bond to nitrogen to reach an octet.',
  },
  {
    id: 'ch2o',
    formula: 'CH₂O',
    name: 'Formaldehyde',
    charge: 0,
    atoms: [{ el: 'C', x: 0, y: 0 }, { el: 'O', x: 0, y: -1 }, { el: 'H', x: -0.87, y: 0.5 }, { el: 'H', x: 0.87, y: 0.5 }],
    links: [[0, 1], [0, 2], [0, 3]],
    forms: [{ bonds: [2, 1, 1], lone: [0, 2, 0, 0] }],
    center: 0,
  },
  {
    id: 'n2',
    formula: 'N₂',
    name: 'Nitrogen',
    charge: 0,
    atoms: [{ el: 'N', x: -0.5, y: 0 }, { el: 'N', x: 0.5, y: 0 }],
    links: [[0, 1]],
    forms: [{ bonds: [3], lone: [1, 1] }],
    note: 'A triple bond: one of the strongest bonds known, which is why N₂ is so unreactive.',
  },
  {
    id: 'nh4',
    formula: 'NH₄⁺',
    name: 'Ammonium ion',
    charge: 1,
    atoms: [{ el: 'N', x: 0, y: 0 }, { el: 'H', x: -1, y: 0 }, { el: 'H', x: 1, y: 0 }, { el: 'H', x: 0, y: -1 }, { el: 'H', x: 0, y: 1 }],
    links: [[0, 1], [0, 2], [0, 3], [0, 4]],
    forms: [{ bonds: [1, 1, 1, 1], lone: [0, 0, 0, 0, 0] }],
    center: 0,
    note: 'The + charge means one electron fewer than the atoms bring. Nitrogen carries the formal charge of +1.',
  },
  /* ---------------------------------------------------------------- formal charge */
  {
    id: 'co',
    formula: 'CO',
    name: 'Carbon monoxide',
    charge: 0,
    atoms: [{ el: 'C', x: -0.5, y: 0 }, { el: 'O', x: 0.5, y: 0 }],
    links: [[0, 1]],
    forms: [{ bonds: [3], lone: [1, 1] }],
    note: 'Formal charges of −1 on C and +1 on O look odd, but this is the only structure where both atoms have an octet. Octets come first.',
  },
  /* ---------------------------------------------------------------- resonance */
  {
    id: 'o3',
    formula: 'O₃',
    name: 'Ozone',
    charge: 0,
    atoms: [{ el: 'O', x: -0.9, y: 0.45 }, { el: 'O', x: 0, y: 0 }, { el: 'O', x: 0.9, y: 0.45 }],
    links: [[0, 1], [1, 2]],
    forms: [
      { bonds: [2, 1], lone: [2, 1, 3] },
      { bonds: [1, 2], lone: [3, 1, 2] },
    ],
    center: 1,
    note: 'Measured: both O–O bonds are 127.8 pm, between an O–O single bond (147.5 pm in H₂O₂) and the O=O double bond (120.7 pm in O₂).',
  },
  {
    id: 'co3',
    formula: 'CO₃²⁻',
    name: 'Carbonate ion',
    charge: -2,
    atoms: triangle('C', 'O'),
    links: [[0, 1], [0, 2], [0, 3]],
    forms: [
      { bonds: [2, 1, 1], lone: [0, 2, 3, 3] },
      { bonds: [1, 2, 1], lone: [0, 3, 2, 3] },
      { bonds: [1, 1, 2], lone: [0, 3, 3, 2] },
    ],
    center: 0,
    note: 'All three C–O bonds are measured to be the same length: each is one-third of the way from a single to a double bond.',
  },
  {
    id: 'no3',
    formula: 'NO₃⁻',
    name: 'Nitrate ion',
    charge: -1,
    atoms: triangle('N', 'O'),
    links: [[0, 1], [0, 2], [0, 3]],
    forms: [
      { bonds: [2, 1, 1], lone: [0, 2, 3, 3] },
      { bonds: [1, 2, 1], lone: [0, 3, 2, 3] },
      { bonds: [1, 1, 2], lone: [0, 3, 3, 2] },
    ],
    center: 0,
  },
  /* ---------------------------------------------------------------- exceptions */
  {
    id: 'bf3',
    formula: 'BF₃',
    name: 'Boron trifluoride',
    charge: 0,
    atoms: triangle('B', 'F'),
    links: [[0, 1], [0, 2], [0, 3]],
    forms: [{ bonds: [1, 1, 1], lone: [0, 3, 3, 3] }],
    alternatives: [
      {
        form: { bonds: [2, 1, 1], lone: [0, 2, 3, 3] },
        why: 'This gives boron an octet, but puts a +1 formal charge on fluorine, the most electronegative element. The usual structure leaves boron with only 6 electrons and every formal charge at 0.',
      },
    ],
    center: 0,
    exception: 'incomplete',
    vsepr: 'BF₃',
    note: 'Boron is satisfied with 6 electrons: an incomplete octet. That empty spot is why BF₃ readily accepts an electron pair.',
  },
  {
    id: 'no',
    formula: 'NO',
    name: 'Nitric oxide',
    charge: 0,
    atoms: [{ el: 'N', x: -0.5, y: 0 }, { el: 'O', x: 0.5, y: 0 }],
    links: [[0, 1]],
    forms: [{ bonds: [2], lone: [1, 2], single: [1, 0] }],
    exception: 'odd',
    note: 'With 11 valence electrons, one must be unpaired: a radical. It sits on nitrogen, where every formal charge comes out 0.',
  },
  {
    id: 'pcl5',
    formula: 'PCl₅',
    name: 'Phosphorus pentachloride',
    charge: 0,
    atoms: [
      { el: 'P', x: 0, y: 0 },
      ...[90, 162, 234, 306, 18].map((a): LAtom => ({ el: 'Cl', x: Math.cos((a * Math.PI) / 180), y: -Math.sin((a * Math.PI) / 180) })),
    ],
    links: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]],
    forms: [{ bonds: [1, 1, 1, 1, 1], lone: [0, 3, 3, 3, 3, 3] }],
    center: 0,
    exception: 'expanded',
    vsepr: 'PCl₅',
    note: 'Phosphorus holds 10 electrons: an expanded octet. Atoms from the third row down can do this; second-row atoms (C, N, O, F) cannot.',
  },
  {
    id: 'sf6',
    formula: 'SF₆',
    name: 'Sulfur hexafluoride',
    charge: 0,
    atoms: [
      { el: 'S', x: 0, y: 0 },
      ...[90, 150, 210, 270, 330, 30].map((a): LAtom => ({ el: 'F', x: Math.cos((a * Math.PI) / 180), y: -Math.sin((a * Math.PI) / 180) })),
    ],
    links: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]],
    forms: [{ bonds: [1, 1, 1, 1, 1, 1], lone: [0, 3, 3, 3, 3, 3, 3] }],
    center: 0,
    exception: 'expanded',
    vsepr: 'SF₆',
    note: 'Sulfur holds 12 electrons around it in this drawing.',
  },
  {
    id: 'xef4',
    formula: 'XeF₄',
    name: 'Xenon tetrafluoride',
    charge: 0,
    atoms: [{ el: 'Xe', x: 0, y: 0 }, { el: 'F', x: -1, y: 0 }, { el: 'F', x: 1, y: 0 }, { el: 'F', x: 0, y: -1 }, { el: 'F', x: 0, y: 1 }],
    links: [[0, 1], [0, 2], [0, 3], [0, 4]],
    forms: [{ bonds: [1, 1, 1, 1], lone: [2, 3, 3, 3, 3] }],
    center: 0,
    exception: 'expanded',
    vsepr: 'XeF₄',
    note: 'After the four bonds, xenon still has two lone pairs: 12 electrons in all. Two lone pairs opposite each other make it square planar.',
  },
]

export const lewisById = (id: string) => {
  const m = LEWIS.find((x) => x.id === id)
  if (!m) throw new Error(`Unknown Lewis molecule ${id}`)
  return m
}

/* ======================================================================= counting */

export const valenceTotal = (m: LewisMolecule) => m.atoms.reduce((s, a) => s + VALENCE[a.el], 0) - m.charge

/** Bonds (as a count of shared pairs) touching each atom. */
export function bondsAround(m: LewisMolecule, f: LForm) {
  const out = m.atoms.map(() => 0)
  m.links.forEach(([a, b], k) => {
    out[a] += f.bonds[k]
    out[b] += f.bonds[k]
  })
  return out
}

/** Electrons drawn in a structure (each bond = 2, each lone pair = 2, each unpaired = 1). */
export const electronsUsed = (f: LForm) => 2 * f.bonds.reduce((s, b) => s + b, 0) + 2 * f.lone.reduce((s, l) => s + l, 0) + (f.single ?? []).reduce((s, x) => s + x, 0)

/** Electrons around each atom (its lone electrons plus BOTH electrons of each of its bonds). */
export function electronsAround(m: LewisMolecule, f: LForm) {
  const b = bondsAround(m, f)
  return m.atoms.map((_, i) => 2 * f.lone[i] + (f.single?.[i] ?? 0) + 2 * b[i])
}

/** Formal charge = valence electrons − (nonbonding electrons + bonds). */
export function formalCharges(m: LewisMolecule, f: LForm) {
  const b = bondsAround(m, f)
  return m.atoms.map((a, i) => VALENCE[a.el] - (2 * f.lone[i] + (f.single?.[i] ?? 0)) - b[i])
}

/** How many electrons this atom may have around it in a valid structure. */
export function allowedAround(m: LewisMolecule, i: number): { min: number; max: number } {
  const el = m.atoms[i].el
  if (el === 'H') return { min: 2, max: 2 }
  if (el === 'B') return { min: 6, max: 8 }
  if (ROW2.has(el)) return { min: m.exception === 'odd' ? 7 : 8, max: 8 }
  return { min: 8, max: 12 } // third row and below: expanded octets allowed
}

const sameForm = (a: LForm, b: LForm) =>
  a.bonds.every((x, k) => x === b.bonds[k]) && a.lone.every((x, i) => x === b.lone[i]) && a.lone.every((_, i) => (a.single?.[i] ?? 0) === (b.single?.[i] ?? 0))

const chargeSize = (m: LewisMolecule, f: LForm) => formalCharges(m, f).reduce((s, c) => s + Math.abs(c), 0)

/* ======================================================================= checking a student's drawing */

export type CheckResult =
  | { ok: true; form: number; message: string }
  | { ok: false; atom?: number; message: string }

const article = (el: string) => (/^[AEFHILMNORSX]/.test(el) ? 'an' : 'a')

/**
 * Check a student's structure. The messages say what to fix next, in the order a
 * student would naturally work: count electrons, then octets, then formal charges.
 */
export function checkStructure(m: LewisMolecule, f: LForm): CheckResult {
  const total = valenceTotal(m)
  const used = electronsUsed(f)
  if (used !== total) {
    const diff = total - used
    return {
      ok: false,
      message:
        diff > 0
          ? `You've placed ${used} electrons, but ${m.formula} has ${total} valence electrons. Place ${diff} more.`
          : `You've placed ${used} electrons, but ${m.formula} only has ${total} valence electrons. Remove ${-diff}.`,
    }
  }
  const around = electronsAround(m, f)
  for (let i = 0; i < m.atoms.length; i++) {
    const { max } = allowedAround(m, i)
    const el = m.atoms[i].el
    if (around[i] > max)
      return {
        ok: false,
        atom: i,
        message:
          el === 'H'
            ? 'Hydrogen can only share 2 electrons: one single bond and nothing else.'
            : `This ${el} has ${around[i]} electrons around it. ${ROW2.has(el) ? 'Second-row atoms can hold at most 8.' : `${el} can hold at most ${max} here.`}`,
      }
  }
  for (let i = 0; i < m.atoms.length; i++) {
    const { min } = allowedAround(m, i)
    const el = m.atoms[i].el
    if (around[i] < min)
      return {
        ok: false,
        atom: i,
        message: `This ${el} has only ${around[i]} electrons around it. Try turning a neighbor’s lone pair into a shared double (or triple) bond to give it ${el === 'B' ? 'at least 6' : 'an octet'}.`,
      }
  }
  const match = m.forms.findIndex((g) => sameForm(g, f))
  if (match >= 0)
    return {
      ok: true,
      form: match,
      message: m.forms.length > 1 ? `Correct! This is one of ${m.forms.length} equally good resonance structures.` : 'Correct! Every atom is satisfied and the formal charges are as small as they can be.',
    }
  const alt = m.alternatives?.find((a) => sameForm(a.form, f))
  if (alt) return { ok: false, message: alt.why }
  if (chargeSize(m, f) > chargeSize(m, m.forms[0])) {
    const fc = formalCharges(m, f)
    const worst = fc.findIndex((c) => c !== 0)
    return {
      ok: false,
      atom: worst >= 0 ? worst : undefined,
      message: `Every atom is satisfied, but the formal charges are bigger than they need to be (${worst >= 0 ? `${article(m.atoms[worst].el)} ${m.atoms[worst].el} has ${fmtCharge(fc[worst])}` : ''}). Try moving a double bond.`,
    }
  }
  // Valid and just as good as ours (an equivalent drawing): accept it.
  return { ok: true, form: 0, message: 'Correct! Every atom is satisfied and the formal charges are as small as they can be.' }
}

/** "+1", "−1", "0". */
export const fmtCharge = (c: number) => (c > 0 ? `+${c}` : c < 0 ? `−${-c}` : '0')

/** The skeleton with only single bonds and no lone pairs: where a student starts building. */
export const skeleton = (m: LewisMolecule): LForm => ({ bonds: m.links.map(() => 1), lone: m.atoms.map(() => 0), single: m.atoms.map(() => 0) })

/** The resonance hybrid: average bond orders and formal charges over all resonance forms. */
export function hybridOf(m: LewisMolecule) {
  const n = m.forms.length
  const bonds = m.links.map((_, k) => m.forms.reduce((s, f) => s + f.bonds[k], 0) / n)
  const charges = m.atoms.map((_, i) => m.forms.reduce((s, f) => s + formalCharges(m, f)[i], 0) / n)
  return { bonds, charges }
}

/* ======================================================================= 3D */

/** What the 3D shape view needs: the central atom, its neighbors (with bond orders), and lone pairs. */
export function shapeOf(m: LewisMolecule, f: LForm) {
  if (m.center === undefined) return null
  const c = m.center
  const neighbors: { el: string; order: number }[] = []
  m.links.forEach(([a, b], k) => {
    if (a === c) neighbors.push({ el: m.atoms[b].el, order: f.bonds[k] })
    else if (b === c) neighbors.push({ el: m.atoms[a].el, order: f.bonds[k] })
  })
  return { central: m.atoms[c].el, neighbors, lone: f.lone[c] }
}
