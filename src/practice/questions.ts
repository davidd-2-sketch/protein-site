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
import { INHIBITION_INFO, type Inhibition } from '../enzymes/kinetics'
import { CHYMO_SITE, type StructureId } from '../enzymes/structures'
import type { ModuleKey } from '../lessons/place'
import type { Quiz } from '../lessons/types'
import { formalCharges, LEWIS, lewisById, valenceTotal, VALENCE, type LForm } from '../lewis/molecules'
import { DIAGRAMS, diatomicById, fill, fmtOrder, ionFormula } from '../mo/diatomics'

export type Topic = 'shapes' | 'orbitals' | 'trends' | 'reactions' | 'polarity' | 'enzymes' | 'lewis' | 'mo'

export const TOPICS: { id: Topic; name: string; blurb: string }[] = [
  { id: 'shapes', name: 'Shapes', blurb: 'Name 3D shapes, count hidden lone pairs, read bond angles.' },
  { id: 'orbitals', name: 'Orbitals', blurb: 'Identify orbitals, count nodes, recognize hybrids and bonds.' },
  { id: 'trends', name: 'Trends', blurb: 'Compare two elements on the table, then see the data rise.' },
  { id: 'reactions', name: 'Reactions', blurb: 'Read frozen frames of the SN2 reaction.' },
  { id: 'polarity', name: 'Polarity', blurb: 'Polar or nonpolar? Then watch the bond dipoles add up.' },
  { id: 'enzymes', name: 'Enzymes', blurb: 'Read kinetics graphs, name inhibitors, and explore real active sites.' },
  { id: 'lewis', name: 'Lewis structures', blurb: 'Count electrons, place lone pairs, and find formal charges and resonance.' },
  { id: 'mo', name: 'MO theory', blurb: 'Read MO diagrams: bond order, unpaired electrons, and magnetism.' },
]

/** What to draw, before and after answering. */
export type Visual =
  | { kind: 'vsepr'; before: SceneState; after: SceneState; hullBefore?: boolean; hullAfter?: boolean; arcsAfter: boolean }
  | { kind: 'orbital'; before: OrbitalView & { axes?: boolean }; after?: OrbitalView & { axes?: boolean } }
  | { kind: 'trends'; before: { props: PropId[]; flat: boolean; focus: number[] }; after: { props: PropId[]; flat: boolean; focus: number[] } }
  | { kind: 'sn2'; s: number }
  /** A polarity molecule: bond dipoles beside the bonds, summed tip-to-tail once answered. */
  | { kind: 'polarity'; id: string }
  /** Kinetics graph; `after` (if set) replaces it once answered. */
  | { kind: 'kinetics'; before: KineticsVisual; after?: KineticsVisual }
  /** The catalyzed vs uncatalyzed energy diagram (hint labels hidden). */
  | { kind: 'energy' }
  /** A Lewis structure; `after` (if set) replaces it once answered. */
  | { kind: 'lewis'; molecule: string; before: LewisCard; after?: LewisCard }
  /** An MO diagram, empty or filled before answering, always filled after. */
  | { kind: 'mo'; molecule: string; electrons: number; filledBefore: boolean }
  /** A real enzyme structure; `after` replaces it once answered. Highlight = one residue. */
  | { kind: 'enzyme3d'; structure: StructureId; after?: StructureId; highlight?: { chain: string; seq: number; label: string } }

export interface Question extends Quiz {
  id: string
  topic: Topic
  visual: Visual
  /** Where to review this idea. */
  review: { module: ModuleKey | 'reaction' | 'polarity'; lessonId?: string; label: string }
}

/** How to draw a Lewis structure on a practice card. */
export interface LewisCard {
  show: 'form' | 'skeleton' | 'custom' | 'resonance'
  custom?: LForm
  formal?: boolean
  highlight?: number[]
}

export interface KineticsVisual {
  plot: 'mm' | 'lb'
  type: Inhibition
  inhibitor: number
  substrate: number
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

/* ======================================================================= enzymes */

const INH_TYPES = ['competitive', 'noncompetitive', 'uncompetitive'] as const
type InhType = (typeof INH_TYPES)[number]
const INH_NAME: Record<InhType, string> = { competitive: 'Competitive', noncompetitive: 'Noncompetitive', uncompetitive: 'Uncompetitive' }
const enzReview = (lessonId: string, label: string) => ({ module: 'enzymes' as const, lessonId, label })

/** Show a graph with an inhibitor; name the inhibitor type. */
function enzInhibitor(type: InhType, plot: 'mm' | 'lb'): Question {
  const { choices, answer } = withChoices(INH_NAME[type], Object.values(INH_NAME))
  const info = INHIBITION_INFO[type]
  return {
    id: `enzinh:${type}:${plot}`,
    topic: 'enzymes',
    visual: { kind: 'kinetics', before: { plot, type, inhibitor: 3, substrate: 8 } },
    question: `The dashed line has no inhibitor; the solid line has a drug added. What kind of inhibitor is the drug?`,
    choices,
    answer,
    explain: `${info.name}. ${info.effect} ${info.lb}`,
    hint: plot === 'mm' ? 'Compare the two Vmax lines and the two Km lines.' : 'Where do the two lines cross: on the y-axis, the x-axis, or never?',
    review: enzReview('inhibition', 'Enzymes: Inhibitors'),
  }
}

const CHANGES: Record<InhType, string> = {
  competitive: 'Vmax unchanged, Km goes up',
  noncompetitive: 'Vmax goes down, Km unchanged',
  uncompetitive: 'Vmax and Km both go down',
}

/** Predict how Vmax and Km change; the graph then shows it. */
function enzChange(type: InhType): Question {
  const { choices, answer } = withChoices(CHANGES[type], [...Object.values(CHANGES), 'Vmax and Km both go up'])
  return {
    id: `enzchange:${type}`,
    topic: 'enzymes',
    visual: {
      kind: 'kinetics',
      before: { plot: 'mm', type: 'none', inhibitor: 0, substrate: 8 },
      after: { plot: 'mm', type, inhibitor: 3, substrate: 8 },
    },
    question: `This is the enzyme with no inhibitor. ${type === 'uncompetitive' ? 'An' : 'A'} ${type} inhibitor is added. What happens to Vmax and Km?`,
    choices,
    answer,
    explain: `${CHANGES[type]}. ${type === 'uncompetitive' ? 'An' : 'A'} ${type} inhibitor binds ${INHIBITION_INFO[type].binds}. The graph now shows the inhibited curve (solid).`,
    hint: 'Ask: can piling on substrate push this inhibitor out?',
    review: enzReview('inhibition', 'Enzymes: Inhibitors'),
  }
}

const ENERGY_QS: Record<string, { question: string; correct: string; wrong: string[]; explain: string }> = {
  dg: {
    question: 'Dashed: no enzyme. Solid: with enzyme. What does the enzyme do to the reaction’s ΔG?',
    correct: 'Nothing: ΔG is the same',
    wrong: ['Makes ΔG more negative', 'Makes ΔG positive'],
    explain: 'Nothing. Both paths start and end at the same energies, so ΔG (and the equilibrium) is unchanged. The enzyme only lowers the barrier.',
  },
  ea: {
    question: 'Dashed: no enzyme. Solid: with enzyme. What does the enzyme lower?',
    correct: 'The activation energy (Eₐ)',
    wrong: ['The energy of the products', 'ΔG of the reaction'],
    explain: 'The activation energy. The enzyme’s highest peak (the stabilized transition state) is far lower than the uncatalyzed one, so the reaction runs much faster.',
  },
}

function enzEnergy(key: string): Question {
  const e = ENERGY_QS[key]
  const { choices, answer } = withChoices(e.correct, e.wrong)
  return {
    id: `enzenergy:${key}`,
    topic: 'enzymes',
    visual: { kind: 'energy' },
    question: e.question,
    choices,
    answer,
    explain: e.explain,
    hint: 'Compare where the two paths start and end, and how high each one climbs.',
    review: enzReview('barrier', 'Enzymes: Lowering the barrier'),
  }
}

/** Short job descriptions for chymotrypsin's active-site residues (full ones are in structures.ts). */
const JOBS: Record<number, string> = {
  195: 'Attacks the peptide bond (the nucleophile)',
  57: 'Pulls a proton off Ser195 (the base)',
  102: 'Holds His57 in the right position',
  193: 'Hydrogen-bonds the negative oxygen (oxyanion hole)',
  189: 'Sits at the bottom of the specificity pocket',
}

function enzResidue(seq: number): Question {
  const r = CHYMO_SITE.find((x) => x.seq === seq)!
  const label = `${r.comp[0]}${r.comp.slice(1).toLowerCase()}${seq}`
  const { choices, answer } = withChoices(JOBS[seq], Object.values(JOBS))
  return {
    id: `enzres:${seq}`,
    topic: 'enzymes',
    visual: { kind: 'enzyme3d', structure: 'chymo-ts', highlight: { chain: r.chain, seq, label } },
    question: `This is chymotrypsin’s real active site (PDB 6CHA). What is the job of the highlighted residue, ${label}?`,
    choices,
    answer,
    explain: `${label}: ${r.role}`,
    hint: 'Look at where it sits: next to the pink bound molecule, beside His57, or deep in the pocket?',
    review: enzReview(seq === 189 ? 'specificity' : 'triad', seq === 189 ? 'Enzymes: Picking the right target' : 'Enzymes: The catalytic triad'),
  }
}

const FIT = {
  gk: {
    before: 'gk-open' as StructureId,
    after: 'gk-closed' as StructureId,
    question: 'This is glucokinase with no glucose (real structure). Glucose binds. Predict what happens.',
    correct: 'A lid swings shut over the glucose (induced fit)',
    explain: 'A lid swings shut: in the real structures it moves from about 28 Å to about 6 Å from the glucose-binding residues. That is induced fit. The view now shows the closed form with glucose.',
  },
  chymo: {
    before: 'chymo-free' as StructureId,
    after: 'chymo-ts' as StructureId,
    question: 'This is chymotrypsin with nothing bound (real structure). A substrate-like molecule binds. Predict what happens to the active site.',
    correct: 'Almost nothing changes (close to lock and key)',
    explain: 'Almost nothing: the two real structures match to 0.25 Å, and no active-site residue moves more than 1 Å. Chymotrypsin’s pocket is already shaped. The view now shows the bound form.',
  },
}

function enzFit(key: 'gk' | 'chymo'): Question {
  const f = FIT[key]
  const { choices, answer } = withChoices(f.correct, [FIT.gk.correct, FIT.chymo.correct, 'The enzyme unfolds and refolds'])
  return {
    id: `enzfit:${key}`,
    topic: 'enzymes',
    visual: { kind: 'enzyme3d', structure: f.before, after: f.after },
    question: f.question,
    choices,
    answer,
    explain: f.explain,
    hint: key === 'gk' ? 'The module uses this enzyme as the induced-fit example.' : 'This enzyme’s pocket is a fairly rigid groove.',
    review: enzReview('specificity', 'Enzymes: Picking the right target'),
  }
}


/* ======================================================================= LEWIS STRUCTURES */

const lewisReview = (lessonId: string, label: string) => ({ module: 'lewis' as const, lessonId, label })
/** Molecules with a central atom (for lone-pair questions). */
const CENTERED = LEWIS.filter((m) => m.center !== undefined).map((m) => m.id)
/** Atoms whose formal charge is worth asking about: every atom of these molecules. */
const FC_MOLECULES = ['co', 'nh4', 'o3', 'no3', 'co3', 'co2', 'hcn', 'bf3', 'no']
const RES_MOLECULES = ['o3', 'co3', 'no3', 'co2', 'ch2o', 'hcn', 'n2']
const EXC_MOLECULES = ['bf3', 'no', 'pcl5', 'sf6', 'xef4', 'co2', 'nh3', 'h2o', 'hcn']
const fmtFc = (c: number) => (c > 0 ? `+${c}` : c < 0 ? `−${-c}` : '0')

function lewisValence(id: string): Question {
  const m = lewisById(id)
  const total = valenceTotal(m)
  const sum = m.atoms.reduce((s, a) => s + VALENCE[a.el], 0)
  // Wrong answers: forgetting the charge, ±2 (one pair) off.
  const wrong = [m.charge ? sum : total + 2, total - 2, total + 4].filter((x) => x > 0 && x !== total)
  const { choices, answer } = withChoices(String(total), wrong.map(String))
  const parts = [...new Set(m.atoms.map((a) => a.el))].map((el) => {
    const n = m.atoms.filter((a) => a.el === el).length
    return `${n > 1 ? `${n} × ` : ''}${VALENCE[el]} (${el})`
  })
  return {
    id: `lewisval:${id}`,
    topic: 'lewis',
    visual: { kind: 'lewis', molecule: id, before: { show: 'skeleton' }, after: { show: 'form' } },
    question: `How many valence electrons does ${m.formula} have?`,
    choices,
    answer,
    explain: `${parts.join(' + ')}${m.charge ? ` ${m.charge < 0 ? '+' : '−'} ${Math.abs(m.charge)} for the ${m.charge < 0 ? '−' : '+'}${Math.abs(m.charge) > 1 ? Math.abs(m.charge) : ''} charge` : ''} = ${total}.`,
    hint: 'Add each atom’s valence electrons (its group number’s last digit). For an ion, adjust for the charge.',
    review: lewisReview('drawing', 'Lewis structures: Drawing'),
  }
}

function lewisLonePairs(id: string): Question {
  const m = lewisById(id)
  const c = m.center!
  const f = m.forms[0]
  const lone = f.lone[c]
  const hidden: LForm = { ...f, lone: f.lone.map((x, i) => (i === c ? 0 : x)) }
  const { choices, answer } = withChoices(String(lone), ['0', '1', '2', '3'])
  return {
    id: `lewislp:${id}`,
    topic: 'lewis',
    visual: { kind: 'lewis', molecule: id, before: { show: 'custom', custom: hidden, highlight: [c] }, after: { show: 'form', highlight: [c] } },
    question: `${m.formula} has ${valenceTotal(m)} valence electrons. The central ${m.atoms[c].el}’s lone pairs are hidden. How many does it have?`,
    choices,
    answer,
    explain: `${lone}. The drawing shows ${valenceTotal(m) - 2 * lone} electrons; the remaining ${2 * lone} go on the central atom as ${lone} lone pair${lone === 1 ? '' : 's'}.`,
    hint: 'Count the electrons already drawn (2 per bond, 2 per lone pair) and subtract from the total.',
    review: lewisReview('drawing', 'Lewis structures: Drawing'),
  }
}

function lewisFormal(id: string, atom: number): Question {
  const m = lewisById(id)
  const f = m.forms[0]
  const fc = formalCharges(m, f)[atom]
  const el = m.atoms[atom].el
  const { choices, answer } = withChoices(fmtFc(fc), ['−1', '0', '+1', '+2', '−2'].filter((x) => x !== fmtFc(fc)).slice(0, 3))
  const nonbond = 2 * f.lone[atom] + (f.single?.[atom] ?? 0)
  const bonds = m.links.reduce((s, [a, b], k) => s + (a === atom || b === atom ? f.bonds[k] : 0), 0)
  return {
    id: `lewisfc:${id}:${atom}`,
    topic: 'lewis',
    visual: { kind: 'lewis', molecule: id, before: { show: 'form', highlight: [atom] }, after: { show: 'form', highlight: [atom], formal: true } },
    question: `What is the formal charge on the highlighted ${el} in ${m.formula}?`,
    choices,
    answer,
    explain: `${VALENCE[el]} valence − (${nonbond} nonbonding + ${bonds} bond${bonds === 1 ? '' : 's'}) = ${fmtFc(fc)}.`,
    hint: 'Formal charge = valence electrons − (dots + bonds).',
    review: lewisReview('formal-charge', 'Lewis structures: Formal charge'),
  }
}

function lewisResonance(id: string): Question {
  const m = lewisById(id)
  const n = m.forms.length
  const { choices, answer } = withChoices(String(n), ['1', '2', '3', '4'])
  return {
    id: `lewisres:${id}`,
    topic: 'lewis',
    visual: { kind: 'lewis', molecule: id, before: { show: 'form' }, after: { show: 'resonance' } },
    question: `How many equivalent resonance structures does ${m.formula} have?`,
    choices,
    answer,
    explain:
      n === 1
        ? `Just 1: there is only one place for each multiple bond${m.id === 'co2' ? ' (both oxygens already have a double bond)' : ''}.`
        : `${n}: the double bond can be drawn to ${n === 2 ? 'either outer oxygen' : 'any of the three oxygens'}. The real structure is a blend of all ${n}.`,
    hint: 'Count how many equally good places the double bond could go.',
    review: lewisReview('resonance', 'Lewis structures: Resonance'),
  }
}

const EXC_NAMES = { incomplete: 'Incomplete octet (fewer than 8)', odd: 'Odd number of electrons', expanded: 'Expanded octet (more than 8)', none: 'None: it follows the octet rule' } as const
function lewisException(id: string): Question {
  const m = lewisById(id)
  const key = m.exception ?? 'none'
  const correct = EXC_NAMES[key]
  const { choices, answer } = withChoices(correct, Object.values(EXC_NAMES))
  return {
    id: `lewisexc:${id}`,
    topic: 'lewis',
    visual: { kind: 'lewis', molecule: id, before: { show: 'form' } },
    question: `Which exception to the octet rule (if any) does ${m.formula} show?`,
    choices,
    answer,
    explain:
      key === 'none'
        ? 'Every atom has an octet (hydrogen, a duet), so it follows the rule.'
        : key === 'incomplete'
          ? 'The central atom has only 6 electrons around it.'
          : key === 'odd'
            ? `${valenceTotal(m)} valence electrons is an odd number, so one electron must be unpaired.`
            : `The central ${m.atoms[m.center!].el} has more than 8 electrons around it, which third-row and heavier atoms can do.`,
    hint: 'Count the electrons around the central atom, and check whether the total number of electrons is odd.',
    review: lewisReview('exceptions', 'Lewis structures: Exceptions'),
  }
}

/* ======================================================================= MO THEORY */

const moReview = (lessonId: string, label: string) => ({ module: 'mo' as const, lessonId, label })
/** Molecules and ions to ask about: [molecule, electron change]. */
const MO_CASES: [string, number][] = [
  ['h2', 0], ['h2', -1], ['he2', 0], ['he2', -1], ['li2', 0], ['be2', 0], ['b2', 0], ['c2', 0], ['n2', 0], ['n2', -1],
  ['o2', 0], ['o2', -1], ['o2', 1], ['o2', 2], ['f2', 0], ['ne2', 0], ['co', 0], ['no', 0], ['no', -1], ['hf', 0],
]
const BO_CHOICES = ['0', '½', '1', '1.5', '2', '2.5', '3']

function moBondOrder(id: string, delta: number): Question {
  const m = diatomicById(id)
  const n = m.electrons + delta
  const f = fill(DIAGRAMS[m.diagram], n)
  const correct = fmtOrder(f.bondOrder)
  const i = BO_CHOICES.indexOf(correct)
  const near = BO_CHOICES.filter((_, j) => j !== i && Math.abs(j - i) <= 3)
  const { choices, answer } = withChoices(correct, shuffle(near).slice(0, 3))
  const ion = ionFormula(m, n)
  return {
    id: `mobo:${id}:${delta}`,
    topic: 'mo',
    visual: { kind: 'mo', molecule: id, electrons: n, filledBefore: true },
    question: `What is the bond order of ${ion}?`,
    choices,
    answer,
    explain: `(${f.bonding} bonding − ${f.antibonding} antibonding) ÷ 2 = ${correct}.${f.nonbonding ? ' Nonbonding electrons don’t count.' : ''}`,
    hint: 'Bond order = (bonding electrons − antibonding electrons) ÷ 2. Antibonding levels have a *.',
    review: moReview(delta ? 'oxygen' : m.diagram === '1s' ? 'basics' : ['co', 'no', 'hf'].includes(id) ? 'unequal' : 'second-row', 'MO theory lessons'),
  }
}

function moMagnetism(id: string): Question {
  const m = diatomicById(id)
  const f = fill(DIAGRAMS[m.diagram], m.electrons)
  const para = f.unpaired > 0
  const correct = para ? 'Paramagnetic (has unpaired electrons)' : 'Diamagnetic (all electrons paired)'
  const { choices, answer } = withChoices(correct, ['Paramagnetic (has unpaired electrons)', 'Diamagnetic (all electrons paired)'])
  return {
    id: `momag:${id}`,
    topic: 'mo',
    visual: { kind: 'mo', molecule: id, electrons: m.electrons, filledBefore: false },
    question: `Fill in ${m.formula}’s ${m.electrons} valence electrons in your head. Is it paramagnetic or diamagnetic?`,
    choices,
    answer,
    explain: para
      ? `${f.unpaired} unpaired electron${f.unpaired === 1 ? '' : 's'}${id === 'o2' || id === 'b2' ? ', one in each of two equal-energy π orbitals (Hund’s rule)' : ''}: paramagnetic.`
      : 'Every electron is paired: diamagnetic.',
    hint: 'Fill lowest first. In a pair of equal-energy orbitals (π), put one electron in each before pairing.',
    review: moReview(id === 'o2' || id === 'b2' ? 'oxygen' : 'second-row', 'MO theory lessons'),
  }
}

const MAG_MOLECULES = ['h2', 'b2', 'c2', 'n2', 'o2', 'f2', 'co', 'no', 'hf']

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
      case 'enzinh':
        return (INH_TYPES as readonly string[]).includes(p[0]) && (p[1] === 'mm' || p[1] === 'lb') ? enzInhibitor(p[0] as InhType, p[1]) : null
      case 'enzchange':
        return (INH_TYPES as readonly string[]).includes(p[0]) ? enzChange(p[0] as InhType) : null
      case 'enzenergy':
        return ENERGY_QS[p[0]] ? enzEnergy(p[0]) : null
      case 'enzres':
        return JOBS[Number(p[0])] ? enzResidue(Number(p[0])) : null
      case 'enzfit':
        return p[0] === 'gk' || p[0] === 'chymo' ? enzFit(p[0]) : null
      case 'polar':
        return POLAR_MOLECULES.some((m) => m.id === p[0]) ? polarOrNot(p[0]) : null
      case 'lewisval':
        return LEWIS.some((m) => m.id === p[0]) ? lewisValence(p[0]) : null
      case 'lewislp':
        return CENTERED.includes(p[0]) ? lewisLonePairs(p[0]) : null
      case 'lewisfc':
        return FC_MOLECULES.includes(p[0]) && lewisById(p[0]).atoms[Number(p[1])] ? lewisFormal(p[0], Number(p[1])) : null
      case 'lewisres':
        return RES_MOLECULES.includes(p[0]) ? lewisResonance(p[0]) : null
      case 'lewisexc':
        return EXC_MOLECULES.includes(p[0]) ? lewisException(p[0]) : null
      case 'mobo':
        return MO_CASES.some(([id, d]) => id === p[0] && d === Number(p[1])) ? moBondOrder(p[0], Number(p[1])) : null
      case 'momag':
        return MAG_MOLECULES.includes(p[0]) ? moMagnetism(p[0]) : null
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
    case 'lewis': {
      const r = Math.random()
      if (r < 0.2) return `lewisval:${pick(LEWIS).id}`
      if (r < 0.4) return `lewislp:${pick(CENTERED)}`
      if (r < 0.65) {
        const id = pick(FC_MOLECULES)
        return `lewisfc:${id}:${Math.floor(Math.random() * lewisById(id).atoms.length)}`
      }
      if (r < 0.82) return `lewisres:${pick(RES_MOLECULES)}`
      return `lewisexc:${pick(EXC_MOLECULES)}`
    }
    case 'mo': {
      if (Math.random() < 0.65) {
        const [id, d] = pick(MO_CASES)
        return `mobo:${id}:${d}`
      }
      return `momag:${pick(MAG_MOLECULES)}`
    }
    case 'enzymes': {
      const r = Math.random()
      if (r < 0.35) return `enzinh:${pick([...INH_TYPES])}:${pick(['mm', 'lb'])}`
      if (r < 0.55) return `enzchange:${pick([...INH_TYPES])}`
      if (r < 0.68) return `enzenergy:${pick(Object.keys(ENERGY_QS))}`
      if (r < 0.86) return `enzres:${pick(Object.keys(JOBS))}`
      return `enzfit:${pick(['gk', 'chymo'])}`
    }
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
