/*
  questions.ts — practice questions, generated from the same checked data the lessons use.

  Every question is built around a VISUAL: a 3D shape, an orbital surface, two highlighted
  elements on the periodic table, or a frozen frame of the SN2 reaction. The student reads
  the visual to answer; after answering, the visual often reveals more (angles, columns,
  lone pairs) to show why.

  Each question has a short ID that fully describes it, for example:
      shape:3:1          the molecular shape of AX₃E₁
      cmp:radius:11:17   which is larger, Na or Cl?
  so a missed question can be rebuilt exactly and brought back in a later round.
*/
import { configuration, sn2Atoms } from '../reactions/sn2Geometry'
import { ELEMENTS, byZ, isMainGroup, propInfo, type PropId } from '../trends/elements'
import type { OrbitalView } from '../orbitals/OrbitalScene'
import { ORBITALS } from '../orbitals/wavefunctions'
import { SHAPES, SLOTS, shapeFor } from '../vsepr/shapes'
import { byFormula, idealState, moleculeState } from '../vsepr/states'
import type { SceneState } from '../vsepr/VseprScene'
import { byId as polarById, POLAR_MOLECULES } from '../polarity/molecules'
import type { ModuleKey } from '../lessons/place'
import type { Quiz } from '../lessons/types'

export type Topic = 'shapes' | 'orbitals' | 'trends' | 'reactions' | 'polarity'

export const TOPICS: { id: Topic; name: string; blurb: string }[] = [
  { id: 'shapes', name: 'Shapes', blurb: 'Name 3D shapes, count hidden lone pairs, read bond angles.' },
  { id: 'orbitals', name: 'Orbitals', blurb: 'Identify orbitals, count nodes, recognize hybrids and bonds.' },
  { id: 'trends', name: 'Trends', blurb: 'Compare two elements on the table, then see the data rise.' },
  { id: 'reactions', name: 'Reactions', blurb: 'Read frozen frames of the SN2 reaction.' },
  { id: 'polarity', name: 'Polarity', blurb: 'Polar or nonpolar? Then watch the bond dipoles add up.' },
]

/** What to draw, before and after answering. */
export type Visual =
  | { kind: 'vsepr'; before: SceneState; after: SceneState; hullBefore?: boolean; hullAfter?: boolean; arcsAfter: boolean }
  | { kind: 'orbital'; before: OrbitalView & { axes?: boolean }; after?: OrbitalView & { axes?: boolean } }
  | { kind: 'trends'; before: { props: PropId[]; flat: boolean; focus: number[] }; after: { props: PropId[]; flat: boolean; focus: number[] } }
  | { kind: 'sn2'; s: number }
  /** A polarity molecule: bond dipoles beside the bonds, summed tip-to-tail once answered. */
  | { kind: 'polarity'; id: string }

export interface Question extends Quiz {
  id: string
  topic: Topic
  visual: Visual
  /** Where to review this idea. */
  review: { module: ModuleKey | 'reaction' | 'polarity'; lessonId?: string; label: string }
}

/* ---------- small helpers ---------- */

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const shuffle = <T>(list: T[]) => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
/** Shuffle choices; return them with the new index of the correct one. */
function withChoices(correct: string, wrong: string[]) {
  const choices = shuffle([correct, ...[...new Set(wrong)].filter((w) => w !== correct)])
  return { choices, answer: choices.indexOf(correct) }
}

/* ======================================================================= SHAPES */

const SHAPE_NAMES = [...new Set(SHAPES.map((s) => s.name))]

function shapeName(bonds: number, lone: number): Question {
  const s = shapeFor(bonds, lone)
  const sameGroups = SHAPES.filter((x) => x.bonds + x.lone === bonds + lone).map((x) => x.name)
  // Wrong answers: the electron geometry (the most common mix-up), shapes with the same
  // number of groups, then any other shape names to make four choices.
  const wrong = shuffle([s.electronGeometry, ...sameGroups, ...shuffle(SHAPE_NAMES)]).filter((n) => n !== s.name)
  const { choices, answer } = withChoices(s.name, [s.electronGeometry !== s.name ? s.electronGeometry : '', ...wrong].filter(Boolean).slice(0, 3))
  const full = idealState(bonds, lone)
  return {
    id: `shape:${bonds}:${lone}`,
    topic: 'shapes',
    visual: { kind: 'vsepr', before: { ...full, arcs: [] }, after: full, arcsAfter: true },
    question: `Central atom A has ${bonds} bonded atoms (X) and ${lone} lone pair${lone === 1 ? '' : 's'} (gold). What is the molecular shape?`,
    choices,
    answer,
    explain: `${s.name}. ${bonds + lone} electron groups give ${s.electronGeometry.toLowerCase()} electron geometry${lone ? `; with ${lone} lone pair${lone === 1 ? '' : 's'}, the atoms alone form a ${s.name.toLowerCase()} shape` : ', and with no lone pairs the shape is the same'}.`,
    hint: 'Name the shape from where the ATOMS are. The lone pairs are invisible in the final shape.',
    review: { module: 'vsepr', lessonId: bonds + lone >= 5 ? 'five-six' : 'lone-pairs', label: 'Shapes lessons' },
  }
}

function loneCount(bonds: number, lone: number): Question {
  const sn = bonds + lone
  const full = idealState(bonds, lone)
  const options = [0, 1, 2, 3].filter((l) => l <= sn - 2).map(String)
  const { choices, answer } = withChoices(String(lone), options)
  return {
    id: `lone:${bonds}:${lone}`,
    topic: 'shapes',
    visual: {
      kind: 'vsepr',
      // Before: only the atoms, plus the dashed outline of where all the electron groups point.
      before: { ...full, domains: full.domains.filter((d) => d.kind === 'bond'), arcs: [], hullDirs: SLOTS[sn] },
      after: full,
      hullBefore: true,
      hullAfter: true,
      arcsAfter: false,
    },
    question: `This central atom has ${sn} electron groups (the dashed outline), but only its atoms are shown. How many lone pairs does it have?`,
    choices,
    answer,
    explain: `${lone}. Count the corners of the outline with no atom: each empty corner holds a lone pair. ${sn} groups − ${bonds} bonded atoms = ${lone}.`,
    hint: 'Count the corners of the dashed outline that have no atom on them.',
    review: { module: 'vsepr', lessonId: 'lone-pairs', label: 'Shapes: Lone pairs change the shape' },
  }
}

/* Real molecules whose angles are fixed by symmetry or well measured ("exact" in molecules.ts). */
const ANGLE_MOLECULES = ['CH₄', 'NH₃', 'H₂O', 'BF₃', 'CO₂', 'SF₆']
const ANGLE_CHOICES = ['180°', '120°', '109.5°', '106.7°', '104.5°', '90°']

function bondAngle(formula: string): Question {
  const m = byFormula(formula)!
  const correct = m.arcs[0][2]
  const near = ANGLE_CHOICES.filter((a) => a !== correct).sort((a, b) => Math.abs(parseFloat(a) - parseFloat(correct)) - Math.abs(parseFloat(b) - parseFloat(correct)))
  const { choices, answer } = withChoices(correct, near.slice(0, 3))
  const state = moleculeState(m)
  return {
    id: `angle:${formula}`,
    topic: 'shapes',
    visual: { kind: 'vsepr', before: { ...state, arcs: [] }, after: state, arcsAfter: true },
    question: `What is the measured bond angle in ${m.formula} (${m.name.toLowerCase()})?`,
    choices,
    answer,
    explain:
      m.lone > 0
        ? `${correct}: smaller than the ideal ${shapeFor(m.bonds, m.lone).electronGeometry.toLowerCase()} angle, because lone pairs push the bonds closer together.`
        : `${correct}: with no lone pairs, the angle is exactly the ideal ${shapeFor(m.bonds, 0).name.toLowerCase()} angle.`,
    hint: 'Count the electron groups (lone pairs too), then think about whether lone pairs squeeze the angle.',
    review: { module: 'vsepr', lessonId: 'lone-pairs', label: 'Shapes: Lone pairs change the shape' },
  }
}

/* ======================================================================= ORBITALS */

const P_IDS = ['2px', '2py', '2pz']
const D_IDS = ['3dxy', '3dxz', '3dyz', '3dx2y2', '3dz2']
const NODE_IDS = ['1s', '2s', '3s', '2pz', '3pz']

function whichOrbital(id: string): Question {
  const family = P_IDS.includes(id) ? P_IDS : D_IDS
  const { choices, answer } = withChoices(ORBITALS[id].label, family.filter((x) => x !== id).map((x) => ORBITALS[x].label).slice(0, 3))
  const isP = family === P_IDS
  return {
    id: `orb:${id}`,
    topic: 'orbitals',
    visual: { kind: 'orbital', before: { kind: 'orbital', id, axes: true } },
    question: `Which ${isP ? 'p' : 'd'} orbital is this? Use the x, y, z axes (drag to rotate).`,
    choices,
    answer,
    explain: isP
      ? `${ORBITALS[id].label}: its two lobes lie along the ${id.slice(-1)}-axis.`
      : id === '3dz2'
        ? '3d_z²: two lobes along z with a donut-shaped ring around the middle.'
        : id === '3dx2y2'
          ? '3d_x²−y²: four lobes pointing right ALONG the x and y axes.'
          : `${ORBITALS[id].label}: four lobes lying BETWEEN the ${id.slice(2, 3)} and ${id.slice(3, 4)} axes.`,
    hint: isP ? 'Which axis do the two lobes point along?' : 'Do the lobes point along the axes, or between them? Which plane are they in?',
    review: { module: 'orbitals', lessonId: 'orbitals-basics', label: 'Orbitals: Where electrons live' },
  }
}

function nodeCount(id: string): Question {
  const o = ORBITALS[id]
  const n = o.n - 1
  const { choices, answer } = withChoices(String(n), ['0', '1', '2', '3'])
  return {
    id: `nodes:${id}`,
    topic: 'orbitals',
    visual: { kind: 'orbital', before: { kind: 'orbital', id, cutaway: true, axes: false } },
    question: 'This orbital is cut open. How many nodes (surfaces where the electron is never found) does it have?',
    choices,
    answer,
    explain: `${n}. This is ${o.label}: n − 1 = ${n} node${n === 1 ? '' : 's'}${n ? ` (${o.n - o.l - 1} spherical, ${o.l} flat or cone-shaped)` : ''}. Nodes show up as gaps between regions, and the sign (phase) flips across each one.`,
    hint: 'Count the gaps between separate regions, and any flat gap through the middle.',
    review: { module: 'orbitals', lessonId: 'orbitals-basics', label: 'Orbitals: Where electrons live' },
  }
}

function whichHybrid(set: 'sp' | 'sp2' | 'sp3'): Question {
  const name = { sp: 'sp', sp2: 'sp²', sp3: 'sp³' }[set]
  const { choices, answer } = withChoices(name, ['sp', 'sp²', 'sp³'])
  const angle = { sp: '180°', sp2: '120°', sp3: '109.5°' }[set]
  return {
    id: `hybrid:${set}`,
    topic: 'orbitals',
    // Hybrids only: leftover p orbitals are large and would hide the lobes being counted.
    visual: { kind: 'orbital', before: { kind: 'hybrids', set, axes: true } },
    question: 'Each colored lobe is one hybrid orbital on the same atom. What hybridization is this?',
    choices,
    answer,
    explain: `${name}: ${set === 'sp' ? 'two' : set === 'sp2' ? 'three' : 'four'} hybrids, ${angle} apart${set === 'sp3' ? ', and no p orbitals left over' : `, with ${set === 'sp' ? 'two p orbitals' : 'one p orbital'} left over for π bonds`}.`,
    hint: 'Count the colored lobes. Two, three, or four?',
    review: { module: 'orbitals', lessonId: 'hybridization', label: 'Orbitals: Hybridization' },
  }
}

const BOND_KINDS: Record<string, string> = {
  'h2-bonding': 'σ bond (bonding)',
  'p-sigma': 'σ bond (bonding)',
  'h2-antibonding': 'σ* (antibonding)',
  'p-pi': 'π bond',
}

function whichBond(id: string): Question {
  const correct = BOND_KINDS[id]
  const { choices, answer } = withChoices(correct, ['σ bond (bonding)', 'σ* (antibonding)', 'π bond'])
  const explain: Record<string, string> = {
    'h2-bonding': 'A σ bond: electron density builds up directly between the two nuclei (white dots).',
    'p-sigma': 'A σ bond: head-on overlap, with density right on the line between the nuclei.',
    'h2-antibonding': 'σ* (antibonding): the phases cancel, leaving a node exactly between the nuclei.',
    'p-pi': 'A π bond: side-by-side overlap, with density above and below the bond axis and none on it.',
  }
  return {
    id: `bond:${id}`,
    topic: 'orbitals',
    visual: { kind: 'orbital', before: { kind: 'bond', id, axes: false } },
    question: 'Two nuclei (white dots) share this orbital. What kind is it?',
    choices,
    answer,
    explain: explain[id],
    hint: 'Is there electron density between the nuclei, a gap between them, or density above and below the line joining them?',
    review: { module: 'orbitals', lessonId: 'bonding', label: 'Orbitals: Bonds from overlap' },
  }
}

/* ======================================================================= TRENDS */

const PROP_QUESTION: Partial<Record<PropId, { ask: string; more: string }>> = {
  radius: { ask: 'Which atom is larger?', more: 'larger' },
  ie: { ask: 'Which atom has the higher ionization energy (holds its outer electron more tightly)?', more: 'higher ionization energy' },
  en: { ask: 'Which atom is more electronegative?', more: 'more electronegative' },
}

/** The textbook rule's prediction: which of two elements in the same row or column has more of `prop`? */
function rulePrediction(prop: PropId, a: number, b: number): number {
  const A = byZ(a)
  const B = byZ(b)
  // Radius grows down and to the left; ionization energy and electronegativity grow up and to the right.
  const sameRow = A.period === B.period
  const downOrLeft = sameRow ? (A.group! < B.group! ? a : b) : A.period > B.period ? a : b
  return prop === 'radius' ? downOrLeft : downOrLeft === a ? b : a
}

function compare(prop: PropId, a: number, b: number): Question {
  const A = byZ(a)
  const B = byZ(b)
  const winner = A.values[prop]! > B.values[prop]! ? A : B
  const loser = winner === A ? B : A
  const sameRow = A.period === B.period
  const { choices, answer } = withChoices(`${winner.symbol} (${winner.name})`, [`${loser.symbol} (${loser.name})`])
  const info = PROP_QUESTION[prop]!
  const why =
    prop === 'radius'
      ? sameRow
        ? 'Across a period, the pull on the outer electrons grows, so atoms get smaller.'
        : 'Down a group, each row adds a new shell of electrons, so atoms get bigger.'
      : sameRow
        ? 'Across a period, the stronger pull on the outer electrons makes this value rise.'
        : 'Down a group, outer electrons are farther from the nucleus and more shielded, so this value falls.'
  return {
    id: `cmp:${prop}:${a}:${b}`,
    topic: 'trends',
    visual: {
      kind: 'trends',
      before: { props: [], flat: true, focus: [a, b] },
      after: { props: [prop], flat: false, focus: [a, b] },
    },
    question: `${info.ask} Use their positions on the table.`,
    choices,
    answer,
    explain: `${winner.symbol} is ${info.more}: ${winner.symbol} ${fmt(prop, winner.values[prop]!)} vs. ${loser.symbol} ${fmt(prop, loser.values[prop]!)}. ${why}`,
    hint: sameRow ? 'They are in the same row. Which way does this trend go across a row?' : 'They are in the same column. Which way does this trend go down a column?',
    review: {
      module: 'trends',
      lessonId: prop === 'radius' ? 'atomic-radius' : prop === 'ie' ? 'ionization-energy' : 'electronegativity',
      label: `Trends: ${propInfo(prop).name}`,
    },
  }
}

const fmt = (prop: PropId, v: number) => (prop === 'en' ? v.toFixed(2) : `${v} ${propInfo(prop).unit}`)

/** A random main-group pair in the same row or column where the data follows the textbook rule. */
function randomCompareId(): string {
  const prop = pick<PropId>(['radius', 'ie', 'en'])
  const pool = ELEMENTS.filter((e) => isMainGroup(e) && e.period >= 2 && e.period <= 6 && e.values[prop] !== null)
  for (let tries = 0; tries < 200; tries++) {
    const a = pick(pool)
    const sameRow = Math.random() < 0.5
    const partners = pool.filter((b) => b !== a && (sameRow ? b.period === a.period : b.group === a.group))
    if (!partners.length) continue
    const b = pick(partners)
    const actual = a.values[prop]! > b.values[prop]! ? a.z : b.z
    // Only use pairs where the data agrees with the rule (exceptions are taught in the lessons).
    if (actual === rulePrediction(prop, a.z, b.z) && a.values[prop] !== b.values[prop]) return `cmp:${prop}:${a.z}:${b.z}`
  }
  return 'cmp:radius:11:17'
}

/* ======================================================================= REACTIONS */

/* Frames chosen to be unambiguous. */
const STAGE_FRAMES: Record<string, string> = { '0.04': 'reactants', '0.5': 'ts', '0.97': 'products' }

function sn2Stage(s: string): Question {
  const labels = { reactants: 'Reactants: hydroxide still approaching', ts: 'Transition state', products: 'Products: bromide has left' }
  const correct = labels[STAGE_FRAMES[s] as keyof typeof labels]
  const { choices, answer } = withChoices(correct, Object.values(labels))
  const explain = {
    reactants: 'Reactants: carbon is still fully bonded to bromine, and hydroxide is still far away.',
    ts: 'The transition state: dashed (partial) bonds to both O and Br, and the three other groups lie flat.',
    products: 'Products: the C–O bond is complete and bromide has drifted away.',
  }[STAGE_FRAMES[s]]!
  return {
    id: `sn2stage:${s}`,
    topic: 'reactions',
    visual: { kind: 'sn2', s: Number(s) },
    question: 'This is one frozen frame of the SN2 reaction. Which moment is it?',
    choices,
    answer,
    explain,
    hint: 'Look at the bonds to carbon: solid, dashed, or missing?',
    review: { module: 'reaction', label: 'The SN2 reaction' },
  }
}

const CONFIG_FRAMES = ['0.02', '0.98']

function sn2Config(s: string): Question {
  const c = configuration(sn2Atoms(Number(s)))
  const correct = c === 'S' ? '(S)' : '(R)'
  const { choices, answer } = withChoices(correct, ['(R)', '(S)'])
  return {
    id: `sn2config:${s}`,
    topic: 'reactions',
    visual: { kind: 'sn2', s: Number(s) },
    question: `Is the central carbon (C) here ${'(R)'} or ${'(S)'}? Priorities: ${Number(s) < 0.5 ? 'Br' : 'OH'} > CH₂CH₃ > CH₃ > H. Drag to rotate so H points away from you.`,
    choices,
    answer,
    explain: `${correct}. With H pointing away, going ${Number(s) < 0.5 ? 'Br' : 'OH'} → CH₂CH₃ → CH₃ turns ${c === 'R' ? 'clockwise' : 'counterclockwise'}. ${Number(s) < 0.5 ? 'This is the starting material, (S)-2-bromobutane.' : 'This is the product: SN2 inverted the (S) starting material to (R).'}`,
    hint: 'Rotate until the H is behind the carbon, then trace the other three in priority order: clockwise is R.',
    review: { module: 'reaction', label: 'The SN2 reaction' },
  }
}

/* ======================================================================= polarity */

function polarOrNot(id: string): Question {
  const m = polarById(id)
  const polar = m.dipole > 0
  return {
    id: `polar:${id}`,
    topic: 'polarity',
    visual: { kind: 'polarity', id },
    question: `${m.formula} (${m.name.toLowerCase()}): the arrows show its bond dipoles. Is the molecule polar or nonpolar?`,
    choices: ['Polar', 'Nonpolar'],
    answer: polar ? 0 : 1,
    explain: `${polar ? 'Polar' : 'Nonpolar'}. ${m.why} Measured: ${m.dipole === 0 ? '0 D' : `${m.dipole.toFixed(2)} D`}.`,
    hint: 'Imagine sliding the arrows tip to tail. Do they come back to where they started?',
    review: { module: 'polarity', label: 'Polarity: look-alike pairs' },
  }
}

/* ======================================================================= building rounds */

/** Rebuild a question from its ID (used for review of missed questions). */
export function fromId(id: string): Question | null {
  const [kind, ...p] = id.split(':')
  try {
    switch (kind) {
      case 'shape':
        return shapeName(Number(p[0]), Number(p[1]))
      case 'lone':
        return loneCount(Number(p[0]), Number(p[1]))
      case 'angle':
        return byFormula(p[0]) ? bondAngle(p[0]) : null
      case 'orb':
        return ORBITALS[p[0]] ? whichOrbital(p[0]) : null
      case 'nodes':
        return ORBITALS[p[0]] ? nodeCount(p[0]) : null
      case 'hybrid':
        return whichHybrid(p[0] as 'sp' | 'sp2' | 'sp3')
      case 'bond':
        return BOND_KINDS[p[0]] ? whichBond(p[0]) : null
      case 'cmp':
        return compare(p[0] as PropId, Number(p[1]), Number(p[2]))
      case 'sn2stage':
        return STAGE_FRAMES[p[0]] ? sn2Stage(p[0]) : null
      case 'sn2config':
        return sn2Config(p[0])
      case 'polar':
        return POLAR_MOLECULES.some((m) => m.id === p[0]) ? polarOrNot(p[0]) : null
    }
  } catch {
    /* an old or malformed ID: skip it */
  }
  return null
}

/** A random question ID for a topic. */
export function randomId(topic: Topic): string {
  switch (topic) {
    case 'shapes': {
      const r = Math.random()
      if (r < 0.45) {
        const s = pick(SHAPES)
        return `shape:${s.bonds}:${s.lone}`
      }
      if (r < 0.75) {
        const s = pick(SHAPES.filter((x) => x.lone > 0))
        return `lone:${s.bonds}:${s.lone}`
      }
      return `angle:${pick(ANGLE_MOLECULES)}`
    }
    case 'orbitals': {
      const r = Math.random()
      if (r < 0.35) return `orb:${pick([...P_IDS, ...D_IDS])}`
      if (r < 0.6) return `nodes:${pick(NODE_IDS)}`
      if (r < 0.8) return `hybrid:${pick(['sp', 'sp2', 'sp3'])}`
      return `bond:${pick(Object.keys(BOND_KINDS))}`
    }
    case 'trends':
      return randomCompareId()
    case 'reactions':
      return Math.random() < 0.55 ? `sn2stage:${pick(Object.keys(STAGE_FRAMES))}` : `sn2config:${pick(CONFIG_FRAMES)}`
    case 'polarity':
      return `polar:${pick(POLAR_MOLECULES).id}`
  }
}

/**
 * Build a round: up to 3 questions the student missed before (spaced review), then fresh
 * questions spread across the chosen topics, with no repeats.
 */
export function buildRound(topics: Topic[], missed: Record<string, { topic: Topic; misses: number }>, size = 10): Question[] {
  const ids: string[] = []
  const review = Object.entries(missed)
    .filter(([, m]) => topics.includes(m.topic))
    .sort((a, b) => b[1].misses - a[1].misses)
    .slice(0, 3)
    .map(([id]) => id)
  ids.push(...review)
  let guard = 0
  while (ids.length < size && guard++ < 500) {
    const id = randomId(topics[ids.length % topics.length])
    if (!ids.includes(id)) ids.push(id)
  }
  return shuffle(ids)
    .map(fromId)
    .filter((q): q is Question => q !== null)
}
