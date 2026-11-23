/*
  more.ts — the second wave of practice questions: more variety for every topic, plus the
  "build it" and "click the answer" cards.

  Same rules as questions.ts: every card is generated from the site's checked data (or from
  a short list of standard Gen Chem / Organic facts written out below), every card has a short
  ID that rebuilds it exactly, and tests/practice.test.ts draws thousands of them to check they
  are well formed.

  Card IDs here look like:
    rxnsub:sn2:0:3      which substrate reacts faster by SN2, CH₃Br or (CH₃)₃CBr?
    bondpol:C-O:C-H     which bond is more polar?
    qnbad:17            which set of quantum numbers is not allowed (variant 17)?
    lewisbuild:no3      build NO₃⁻
    moclick:homo:o2:0   click O₂'s highest occupied level
*/
import type { Question, Topic } from './questions'
import { pick, shuffle, someWrong, subsets, withChoices } from './util'
import { byZ, ELEMENTS, isMainGroup, propInfo, type PropId } from '../trends/elements'
import { apparent, DEMO, type Inhibition } from '../enzymes/kinetics'
import { electronsAround, formalCharges, LEWIS, lewisById, allowedAround } from '../lewis/molecules'
import { shapeOf } from '../lewis/molecules'
import { HYBRID_FOOTNOTE, isValid, shapeFor } from '../vsepr/shapes'
import { sceneFor } from '../lewis/shape3d'
import { byEnergy, DIAGRAMS, diatomicById, fill, fmtOrder, ionFormula } from '../mo/diatomics'

/* ======================================================================= REACTIONS */

const rxnReview = { module: 'reaction' as const, label: 'Reactions: SN1 and SN2' }
const SUBS = [
  { f: 'CH₃Br', cls: 'methyl' },
  { f: 'CH₃CH₂Br', cls: 'primary (1°)' },
  { f: '(CH₃)₂CHBr', cls: 'secondary (2°)' },
  { f: '(CH₃)₃CBr', cls: 'tertiary (3°)' },
]
/* SN2: less crowded is faster (methyl > 1° > 2° >> 3°). SN1: more stable carbocation is faster
   (3° > 2°; methyl and 1° essentially don't go SN1, so those pairs aren't asked). */
const SUB_PAIRS: Record<'sn2' | 'sn1', [number, number][]> = {
  sn2: subsets([0, 1, 2, 3], 2) as [number, number][],
  sn1: [[2, 3], [1, 3], [0, 3], [0, 2], [1, 2]],
}

function rxnSubstrate(mech: 'sn2' | 'sn1', a: number, b: number): Question {
  const fast = mech === 'sn2' ? Math.min(a, b) : Math.max(a, b)
  const slow = fast === a ? b : a
  const { choices, answer } = withChoices(SUBS[fast].f, [SUBS[slow].f])
  const M = mech === 'sn2' ? 'SN2' : 'SN1'
  return {
    id: `rxnsub:${mech}:${a}:${b}`,
    topic: 'reactions',
    visual: { kind: 'sn2', s: mech === 'sn2' ? 0.5 : 0.43, mech },
    question: `Which reacts faster by ${M}: ${SUBS[a].f} or ${SUBS[b].f}?`,
    choices,
    answer,
    explain:
      mech === 'sn2'
        ? `${SUBS[fast].f} (${SUBS[fast].cls}). SN2 needs the nucleophile to reach the back of the carbon; fewer groups around it means less crowding, so methyl > 1° > 2°, and 3° essentially never reacts by SN2.`
        : `${SUBS[fast].f} (${SUBS[fast].cls}). SN1 goes through a carbocation, and more alkyl groups stabilize it (by hyperconjugation): 3° > 2°. Methyl and 1° carbocations are too unstable to form.`,
    hint: mech === 'sn2' ? 'SN2 is one step with backside attack. Which carbon is easier to reach?' : 'SN1 forms a carbocation first. Which one is more stable?',
    review: rxnReview,
  }
}

/** SN1 frozen frames (the carbocation is near the middle of the timeline). */
const SN1_FRAMES: Record<string, 'reactants' | 'cation' | 'products'> = { '0.03': 'reactants', '0.43': 'cation', '0.97': 'products' }
function rxnSn1Stage(s: string): Question {
  const names = { reactants: 'Reactants: bromide still attached', cation: 'The carbocation intermediate', products: 'Products: water has attached' }
  const key = SN1_FRAMES[s]
  const { choices, answer } = withChoices(names[key], Object.values(names))
  return {
    id: `rxnsn1:${s}`,
    topic: 'reactions',
    visual: { kind: 'sn2', s: Number(s), mech: 'sn1' },
    question: 'This is one frozen frame of the SN1 reaction. Which moment is it?',
    choices,
    answer,
    explain: {
      reactants: 'Reactants: the C–Br bond is still there.',
      cation: 'The carbocation: bromide has left, and the carbon with only three groups has gone flat (sp², 120°), waiting for the nucleophile.',
      products: 'Products: the nucleophile (water) is now bonded to carbon.',
    }[key],
    hint: 'How many groups are attached to the central carbon, and is it flat?',
    review: rxnReview,
  }
}

/** Standard SN1/SN2 facts (match the comparison table on the Reactions page). */
const RXN_FACTS: { q: string; a: string; wrong: string[]; why: string; mech: 'sn1' | 'sn2' }[] = [
  { q: 'What is the rate law for an SN2 reaction?', a: 'rate = k[RX][Nu]', wrong: ['rate = k[RX]', 'rate = k[Nu]', 'rate = k[RX]²'], why: 'One step in which both the substrate and the nucleophile collide, so both appear in the rate law.', mech: 'sn2' },
  { q: 'What is the rate law for an SN1 reaction?', a: 'rate = k[RX]', wrong: ['rate = k[RX][Nu]', 'rate = k[Nu]', 'rate = k[RX]²'], why: 'The slow step is the leaving group departing on its own, so only the substrate appears.', mech: 'sn1' },
  { q: 'In an SN2 reaction, what happens to the rate if you double the nucleophile concentration?', a: 'It doubles', wrong: ['No change', 'It quadruples', 'It halves'], why: 'rate = k[RX][Nu]: doubling [Nu] doubles the rate.', mech: 'sn2' },
  { q: 'In an SN1 reaction, what happens to the rate if you double the nucleophile concentration?', a: 'No change', wrong: ['It doubles', 'It quadruples', 'It halves'], why: 'The nucleophile isn’t in the slow step, so it isn’t in the rate law.', mech: 'sn1' },
  { q: 'SN2 at a stereocenter gives what stereochemistry?', a: 'Inversion of configuration', wrong: ['Racemization', 'Retention of configuration', 'No change to the stereocenter'], why: 'Backside attack flips the carbon like an umbrella in the wind: inversion.', mech: 'sn2' },
  { q: 'SN1 at a stereocenter usually gives what stereochemistry?', a: 'Racemization (often a slight excess of inversion)', wrong: ['Complete inversion', 'Complete retention', 'No new stereocenter'], why: 'The flat carbocation can be attacked from either face. The leaving group briefly shields one face, so inversion is often slightly favored.', mech: 'sn1' },
  { q: 'Which mechanism goes through an intermediate?', a: 'SN1 (a carbocation)', wrong: ['SN2 (a carbocation)', 'Both', 'Neither'], why: 'SN1 forms a carbocation that lasts long enough to be an intermediate. SN2 has only a transition state.', mech: 'sn1' },
  { q: 'How many steps does an SN2 reaction have?', a: 'One (concerted)', wrong: ['Two', 'Three', 'It depends on the solvent'], why: 'Bond forming and bond breaking happen together, in one step.', mech: 'sn2' },
  { q: 'Which mechanism can involve carbocation rearrangements?', a: 'SN1', wrong: ['SN2', 'Both', 'Neither'], why: 'Only SN1 makes a carbocation, which can rearrange (hydride or methyl shifts) to a more stable one.', mech: 'sn1' },
  { q: 'What does the carbocation in SN1 look like?', a: 'Flat (trigonal planar, sp²)', wrong: ['Tetrahedral (sp³)', 'Linear (sp)', 'Pyramidal, like NH₃'], why: 'Three groups and an empty p orbital: trigonal planar, 120°.', mech: 'sn1' },
]
function rxnFact(i: number): Question {
  const f = RXN_FACTS[i]
  const { choices, answer } = withChoices(f.a, f.wrong)
  return {
    id: `rxnfact:${i}`,
    topic: 'reactions',
    visual: { kind: 'sn2', s: f.mech === 'sn2' ? 0.5 : 0.43, mech: f.mech },
    question: f.q,
    choices,
    answer,
    explain: `${f.a}. ${f.why}`,
    hint: 'Think about what happens in the slow step.',
    review: rxnReview,
  }
}

const SOLVENTS: Record<string, { name: string; kind: 'aprotic' | 'protic' }> = {
  acetone: { name: 'acetone', kind: 'aprotic' },
  dmso: { name: 'DMSO', kind: 'aprotic' },
  dmf: { name: 'DMF', kind: 'aprotic' },
  mecn: { name: 'acetonitrile', kind: 'aprotic' },
  water: { name: 'water', kind: 'protic' },
  etoh: { name: 'ethanol', kind: 'protic' },
  meoh: { name: 'methanol', kind: 'protic' },
}
function rxnSolvent(key: string): Question {
  const s = SOLVENTS[key]
  const correct = s.kind === 'aprotic' ? 'SN2' : 'SN1'
  const { choices, answer } = withChoices(correct, ['SN1', 'SN2'])
  return {
    id: `rxnsolv:${key}`,
    topic: 'reactions',
    visual: { kind: 'sn2', s: s.kind === 'aprotic' ? 0.5 : 0.43, mech: s.kind === 'aprotic' ? 'sn2' : 'sn1' },
    question: `Which mechanism does the solvent ${s.name} favor?`,
    choices,
    answer,
    explain:
      s.kind === 'aprotic'
        ? `${s.name[0].toUpperCase() + s.name.slice(1)} is polar aprotic (no O–H or N–H). It doesn’t cage anions by hydrogen bonding, so the nucleophile stays reactive: SN2.`
        : `${s.name[0].toUpperCase() + s.name.slice(1)} is polar protic (has O–H). It stabilizes the carbocation and the leaving group by hydrogen bonding, favoring SN1, and it weakens anionic nucleophiles.`,
    hint: 'Does the solvent have an O–H bond (protic) or not (aprotic)?',
    review: rxnReview,
  }
}

const NUCLEOPHILES: Record<string, { f: string; strong: boolean }> = {
  ho: { f: 'HO⁻', strong: true },
  meo: { f: 'CH₃O⁻', strong: true },
  cn: { f: 'CN⁻', strong: true },
  hs: { f: 'HS⁻', strong: true },
  i: { f: 'I⁻', strong: true },
  h2o: { f: 'H₂O', strong: false },
  meoh: { f: 'CH₃OH', strong: false },
}
function rxnNucleophile(key: string): Question {
  const n = NUCLEOPHILES[key]
  const correct = n.strong ? 'SN2' : 'SN1'
  const { choices, answer } = withChoices(correct, ['SN1', 'SN2'])
  return {
    id: `rxnnuc:${key}`,
    topic: 'reactions',
    visual: { kind: 'sn2', s: n.strong ? 0.5 : 0.43, mech: n.strong ? 'sn2' : 'sn1' },
    question: `Between SN1 and SN2, which does the nucleophile ${n.f} favor?`,
    choices,
    answer,
    explain: n.strong
      ? `${n.f} is a strong (anionic) nucleophile, so it attacks directly: SN2.${key === 'ho' || key === 'meo' ? ' (It is also a strong base, so with crowded 2° and 3° substrates, elimination (E2) competes; that comes later in organic chemistry.)' : ''}`
      : `${n.f} is a weak, neutral nucleophile: it waits for a carbocation to form, so SN1 (especially in a protic solvent).`,
    hint: 'Strong, negatively charged nucleophiles attack right away. Weak, neutral ones wait.',
    review: rxnReview,
  }
}

/* Leaving group ability: I⁻ > Br⁻ > Cl⁻ >> F⁻ (weaker base = better leaving group). */
const HALIDES = ['F', 'Cl', 'Br', 'I']
const LG_SETS = [...subsets([0, 1, 2, 3], 2), ...subsets([0, 1, 2, 3], 3)].map((s) => s.join(''))
function rxnLeaving(set: string): Question {
  const idx = set.split('').map(Number)
  const best = Math.max(...idx)
  const name = (i: number) => `${HALIDES[i]}⁻`
  const { choices, answer } = withChoices(name(best), idx.filter((i) => i !== best).map(name))
  return {
    id: `rxnlg:${set}`,
    topic: 'reactions',
    visual: { kind: 'sn2', s: 0.5 },
    question: `Which is the best leaving group: ${idx.map(name).join(', ')}?`,
    choices,
    answer,
    explain: `${name(best)}. Good leaving groups are weak bases that are stable on their own: I⁻ > Br⁻ > Cl⁻ >> F⁻ (larger ions spread their charge over more space).`,
    hint: 'The weaker the base, the happier it is to leave with the electrons.',
    review: rxnReview,
  }
}

const CATIONS = ['CH₃⁺ (methyl)', 'CH₃CH₂⁺ (1°)', '(CH₃)₂CH⁺ (2°)', '(CH₃)₃C⁺ (3°)']
const CAT_SETS = [...subsets([0, 1, 2, 3], 2), ...subsets([0, 1, 2, 3], 3)].map((s) => s.join(''))
function rxnCation(set: string): Question {
  const idx = set.split('').map(Number)
  const best = Math.max(...idx)
  const { choices, answer } = withChoices(CATIONS[best], idx.filter((i) => i !== best).map((i) => CATIONS[i]))
  return {
    id: `rxncat:${set}`,
    topic: 'reactions',
    visual: { kind: 'sn2', s: 0.43, mech: 'sn1' },
    question: 'Which carbocation is the most stable?',
    choices,
    answer,
    explain: `${CATIONS[best]}. Each alkyl group donates electron density to the positive carbon (hyperconjugation and induction): 3° > 2° > 1° > methyl.`,
    hint: 'More carbon groups attached to the positive carbon means more stabilization.',
    review: rxnReview,
  }
}

/* ======================================================================= POLARITY */

const polReview = { module: 'polarity' as const, label: 'Polarity' }
const sym = (s: string) => ELEMENTS.find((e) => e.symbol === s)!
const en = (s: string) => sym(s).values.en!
const BONDS = ['C-H', 'N-H', 'O-H', 'H-F', 'H-Cl', 'H-Br', 'C-O', 'C-N', 'C-F', 'C-Cl', 'N-O', 'S-O', 'P-Cl', 'B-F', 'Si-O', 'O-F', 'N-F', 'S-H', 'C-Br', 'P-O']
const dEN = (b: string) => {
  const [x, y] = b.split('-')
  return Math.abs(en(x) - en(y))
}
const bondName = (b: string) => b.replace('-', '–')
/** Pairs of bonds whose polarities differ clearly (by at least 0.3). */
const BOND_PAIRS = subsets(BONDS, 2).filter(([a, b]) => Math.abs(dEN(a) - dEN(b)) >= 0.3)

function bondPolarity(a: string, b: string): Question {
  const more = dEN(a) > dEN(b) ? a : b
  const less = more === a ? b : a
  const { choices, answer } = withChoices(bondName(more), [bondName(less)])
  const els = [...new Set([...a.split('-'), ...b.split('-')])].map((s) => sym(s).z)
  return {
    id: `bondpol:${a}:${b}`,
    topic: 'polarity',
    visual: { kind: 'trends', before: { props: [], flat: true, focus: els }, after: { props: ['en'], flat: false, focus: els } },
    question: `Which bond is more polar: ${bondName(a)} or ${bondName(b)}?`,
    choices,
    answer,
    explain: `${bondName(more)}: electronegativity difference ${dEN(more).toFixed(2)}, versus ${dEN(less).toFixed(2)} for ${bondName(less)} (Pauling values). The bigger the difference, the more polar the bond.`,
    hint: 'Compare the electronegativity difference between the two atoms in each bond.',
    review: polReview,
  }
}

const NEG_BONDS = BONDS.filter((b) => dEN(b) >= 0.3)
function bondNegative(b: string): Question {
  const [x, y] = b.split('-')
  const neg = en(x) > en(y) ? x : y
  const pos = neg === x ? y : x
  const { choices, answer } = withChoices(`${neg} is δ−`, [`${pos} is δ−`])
  return {
    id: `bondneg:${b}`,
    topic: 'polarity',
    visual: { kind: 'trends', before: { props: [], flat: true, focus: [sym(x).z, sym(y).z] }, after: { props: ['en'], flat: false, focus: [sym(x).z, sym(y).z] } },
    question: `In a ${bondName(b)} bond, which atom carries the partial negative charge (δ−)?`,
    choices,
    answer,
    explain: `${neg} (electronegativity ${en(neg).toFixed(2)}) pulls the shared electrons harder than ${pos} (${en(pos).toFixed(2)}), so ${neg} is δ− and ${pos} is δ+.`,
    hint: 'The more electronegative atom pulls the electrons toward itself.',
    review: polReview,
  }
}

/** Polar or not, from the 3D shape of molecules on the Lewis page (measured dipoles are 0 or not). */
const SHAPE_POLARITY: Record<string, { polar: boolean; why: string }> = {
  h2o: { polar: true, why: 'Bent: the two O–H dipoles point partly the same way and don’t cancel.' },
  nh3: { polar: true, why: 'Trigonal pyramidal: the three N–H dipoles all tilt the same way.' },
  ch4: { polar: false, why: 'Tetrahedral and symmetric: the four C–H dipoles cancel (and are small anyway).' },
  co2: { polar: false, why: 'Linear: the two C=O dipoles point in opposite directions and cancel.' },
  hcn: { polar: true, why: 'Linear, but the two ends are different (H vs N), so the dipoles add up instead of cancelling.' },
  ch2o: { polar: true, why: 'The C=O dipole isn’t balanced by the small C–H dipoles.' },
  bf3: { polar: false, why: 'Trigonal planar and symmetric: the three B–F dipoles cancel.' },
  pcl5: { polar: false, why: 'Trigonal bipyramidal and symmetric: the dipoles cancel.' },
  sf6: { polar: false, why: 'Octahedral: every S–F dipole has an opposite partner.' },
  xef4: { polar: false, why: 'Square planar: opposite Xe–F dipoles cancel (the two lone pairs are opposite each other too).' },
  sf4: { polar: true, why: 'Seesaw: the lone pair makes the shape lopsided, so the S–F dipoles don’t cancel.' },
  clf3: { polar: true, why: 'T-shaped: the dipoles don’t cancel.' },
  xef2: { polar: false, why: 'Linear: the two Xe–F dipoles are opposite and cancel.' },
  so2: { polar: true, why: 'Bent (a lone pair on S): the S–O dipoles don’t cancel.' },
  o3: { polar: true, why: 'Bent, and the central O is electron-poor compared with the outer ones (formal charge +1), so there is a small dipole (0.53 D), even though every atom is oxygen.' },
  becl2: { polar: false, why: 'Linear: the two Be–Cl dipoles cancel.' },
}
function polarShape(id: string): Question {
  const m = lewisById(id)
  const p = SHAPE_POLARITY[id]
  const correct = p.polar ? 'Polar' : 'Nonpolar'
  const { choices, answer } = withChoices(correct, ['Polar', 'Nonpolar'])
  const state = sceneFor(m, m.forms[0])!
  return {
    id: `polarshape:${id}`,
    topic: 'polarity',
    visual: { kind: 'vsepr', before: { ...state, arcs: [] }, after: state, arcsAfter: false },
    question: `${m.formula} (${m.name}) has this 3D shape. Is it polar or nonpolar?`,
    choices,
    answer,
    explain: `${correct}. ${p.why}`,
    hint: 'Are the bonds polar? Then: does the shape let their pulls cancel?',
    review: polReview,
  }
}

/* ======================================================================= ENZYMES */

const enzReview = { module: 'enzymes' as const, lessonId: 'kinetics', label: 'Enzymes: Michaelis–Menten kinetics' }
/* v/Vmax = [S]/(Km + [S]) = m/(1 + m) when [S] = m·Km. */
const FRACTIONS: Record<string, { m: string; frac: string }> = {
  '1': { m: '[S] = Km', frac: '½' },
  '3': { m: '[S] = 3 × Km', frac: '¾' },
  '9': { m: '[S] = 9 × Km', frac: '9⁄10' },
  '4': { m: '[S] = 4 × Km', frac: '⅘' },
  '0.333': { m: '[S] = Km ÷ 3', frac: '¼' },
  '0.25': { m: '[S] = Km ÷ 4', frac: '⅕' },
}
function enzFraction(key: string): Question {
  const f = FRACTIONS[key]
  const { choices, answer } = withChoices(f.frac, someWrong(f.frac, Object.values(FRACTIONS).map((x) => x.frac)))
  return {
    id: `enzfrac:${key}`,
    topic: 'enzymes',
    visual: { kind: 'kinetics', before: { plot: 'mm', type: 'none', inhibitor: 0, substrate: DEMO.km * Number(key) } },
    question: `With no inhibitor, at ${f.m}, the rate is what fraction of Vmax?`,
    choices,
    answer,
    explain: `v = Vmax·[S] / (Km + [S]). With ${f.m}, that is ${f.frac} of Vmax.`,
    hint: 'Put [S] = (multiple) × Km into v/Vmax = [S] / (Km + [S]); the Km cancels.',
    review: enzReview,
  }
}

const LB_FACTS: { q: string; a: string; wrong: string[]; why: string }[] = [
  { q: 'On a Lineweaver–Burk plot, the y-intercept equals…', a: '1/Vmax', wrong: ['−1/Km', 'Km/Vmax', 'Vmax'], why: 'At 1/[S] = 0 (infinite substrate), 1/v = 1/Vmax.' },
  { q: 'On a Lineweaver–Burk plot, the x-intercept equals…', a: '−1/Km', wrong: ['1/Vmax', '−Km', 'Km/Vmax'], why: 'Setting 1/v = 0 in 1/v = (Km/Vmax)(1/[S]) + 1/Vmax gives 1/[S] = −1/Km.' },
  { q: 'On a Lineweaver–Burk plot, the slope equals…', a: 'Km/Vmax', wrong: ['Vmax/Km', '1/Km', '1/Vmax'], why: 'The double-reciprocal equation is 1/v = (Km/Vmax)(1/[S]) + 1/Vmax.' },
  { q: 'Km is the substrate concentration at which…', a: 'the rate is half of Vmax', wrong: ['the rate equals Vmax', 'the enzyme stops working', 'the rate is zero'], why: 'Putting [S] = Km into the Michaelis–Menten equation gives v = Vmax/2.' },
]
function enzLb(i: number): Question {
  const f = LB_FACTS[i]
  const { choices, answer } = withChoices(f.a, f.wrong)
  return {
    id: `enzlb:${i}`,
    topic: 'enzymes',
    visual: { kind: 'kinetics', before: { plot: i < 3 ? 'lb' : 'mm', type: 'none', inhibitor: 0, substrate: DEMO.km } },
    question: f.q,
    choices,
    answer,
    explain: `${f.a}. ${f.why}`,
    hint: 'Start from the Michaelis–Menten equation (or its double-reciprocal form).',
    review: enzReview,
  }
}

/* Apparent constants with inhibitor at [I] = k × Ki (from enzymes/kinetics.ts, which the Enzymes page uses). */
const APP_TYPES: Exclude<Inhibition, 'none'>[] = ['competitive', 'noncompetitive', 'uncompetitive']
const times = (x: number, base: string) => (Math.abs(x - 1) < 1e-9 ? `${base} (unchanged)` : x > 1 ? `${+x.toFixed(2)} × ${base}` : `${base} ÷ ${+(1 / x).toFixed(2)}`)
function enzApparent(type: Exclude<Inhibition, 'none'>, k: number, what: 'km' | 'vmax'): Question {
  const p = { ...DEMO, ki: 1 }
  const app = apparent(type, p, k)
  const ratio = what === 'km' ? app.km / p.km : app.vmax / p.vmax
  const base = what === 'km' ? 'Km' : 'Vmax'
  const correct = times(ratio, base)
  const pool = [1, 1 + k, 1 / (1 + k), 2 * (1 + k)].map((r) => times(r, base))
  const { choices, answer } = withChoices(correct, someWrong(correct, pool))
  return {
    id: `enzapp:${type}:${k}:${what}`,
    topic: 'enzymes',
    visual: { kind: 'kinetics', before: { plot: 'lb', type, inhibitor: k, substrate: DEMO.km } },
    question: `A ${type} inhibitor is present at [I] = ${k === 1 ? '' : `${k} × `}Ki. What is the apparent ${base}?`,
    choices,
    answer,
    explain: `${correct}. The factor is 1 + [I]/Ki = ${1 + k}. ${
      type === 'competitive'
        ? 'A competitive inhibitor raises the apparent Km by that factor; Vmax is unchanged (enough substrate still wins).'
        : type === 'noncompetitive'
          ? 'A (pure) noncompetitive inhibitor lowers Vmax by that factor; Km is unchanged.'
          : 'An uncompetitive inhibitor lowers BOTH Vmax and Km by that factor.'
    }`,
    hint: 'Work out 1 + [I]/Ki, then decide which constants that factor changes for this inhibitor type.',
    review: { module: 'enzymes', lessonId: 'inhibitors', label: 'Enzymes: Inhibitors' },
  }
}

/* ======================================================================= ORBITALS */

const orbReview = { module: 'orbitals' as const, lessonId: 'orbitals-basics', label: 'Orbitals: Where electrons live' }
const LETTER = ['s', 'p', 'd', 'f']
/** A real orbital shape to show for a given l. */
const SHAPE_FOR_L = ['3s', '3pz', '3dz2']

function qnCount(kind: 'orb' | 'el', n: number): Question {
  const correct = kind === 'orb' ? n * n : 2 * n * n
  const pool = [n, 2 * n, n * n, 2 * n * n, n + 1, 2 * (n + 1)].map(String)
  const { choices, answer } = withChoices(String(correct), someWrong(String(correct), pool))
  return {
    id: `qn${kind}:${n}`,
    topic: 'orbitals',
    visual: { kind: 'orbital', before: { kind: 'orbital', id: n >= 3 ? '3dxy' : n === 2 ? '2pz' : '1s', axes: true } },
    question: kind === 'orb' ? `How many orbitals are in the n = ${n} shell?` : `How many electrons can the n = ${n} shell hold?`,
    choices,
    answer,
    explain:
      kind === 'orb'
        ? `n² = ${n * n}: ${Array.from({ length: n }, (_, l) => `${2 * l + 1} ${LETTER[l]}`).join(' + ')}.`
        : `2n² = ${2 * n * n}: n² = ${n * n} orbitals, each holding 2 electrons.`,
    hint: kind === 'orb' ? 'List the subshells (l = 0 to n − 1) and add up 2l + 1 orbitals for each.' : 'Count the orbitals first; each holds 2 electrons.',
    review: orbReview,
  }
}

function qnSubshell(n: number, l: number): Question {
  const correct = `${n}${LETTER[l]}`
  const pool = [`${n}${LETTER[(l + 1) % 4]}`, `${n + 1}${LETTER[l]}`, `${Math.max(1, n - 1)}${LETTER[l]}`, `${l}${LETTER[n % 4]}`, `${n}${LETTER[Math.max(0, l - 1)]}`]
  const { choices, answer } = withChoices(correct, someWrong(correct, pool))
  return {
    id: `qnsub:${n}:${l}`,
    topic: 'orbitals',
    visual: { kind: 'orbital', before: { kind: 'orbital', id: SHAPE_FOR_L[Math.min(l, 2)], axes: true } },
    question: `Which subshell has n = ${n} and l = ${l}?`,
    choices,
    answer,
    explain: `${correct}: n is the shell number, and l = 0, 1, 2, 3 means s, p, d, f.${l <= 2 ? ` The shape shown is a ${LETTER[l]} orbital.` : ''}`,
    hint: 'l = 0 → s, 1 → p, 2 → d, 3 → f.',
    review: orbReview,
  }
}

/* "Which set of quantum numbers is NOT allowed?" Variants are numbered; a seeded random
   generator makes each number always give the same question. */
function seeded(seed: number) {
  let s = (seed * 2654435761) % 4294967296
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const QN_VARIANTS = 120
function qnBad(v: number): Question {
  const r = seeded(v + 1)
  const ri = (k: number) => Math.floor(r() * k)
  const valid = () => {
    const n = 1 + ri(4)
    const l = ri(n)
    const ml = ri(2 * l + 1) - l
    return [n, l, ml, r() < 0.5 ? '+½' : '−½'] as const
  }
  const num = (x: number | string) => (typeof x === 'number' && x < 0 ? `−${-x}` : String(x))
  const fmtSet = (q: readonly (number | string)[]) => `n = ${num(q[0])}, l = ${num(q[1])}, mₗ = ${num(q[2])}, mₛ = ${q[3]}`
  // The broken one: l too big, mₗ too big, or l negative.
  const n = 1 + ri(4)
  const mode = ri(3)
  const bad =
    mode === 0
      ? ([n, n, 0, '+½'] as const)
      : mode === 1
        ? (() => {
            const l = ri(n)
            return [n, l, l + 1, '−½'] as const
          })()
        : ([n, -1, 0, '+½'] as const)
  const why =
    mode === 0 ? `l must be less than n (here l can be 0 to ${n - 1}).` : mode === 1 ? 'mₗ must be between −l and +l.' : 'l can never be negative.'
  const goods = new Set<string>()
  while (goods.size < 3) goods.add(fmtSet(valid()))
  const correct = fmtSet(bad)
  const { choices, answer } = withChoices(correct, [...goods])
  return {
    id: `qnbad:${v}`,
    topic: 'orbitals',
    visual: { kind: 'orbital', before: { kind: 'orbital', id: '2pz', axes: true } },
    question: 'Which set of quantum numbers is NOT allowed?',
    choices,
    answer,
    explain: `${correct}: ${why} Rules: l = 0 … n − 1; mₗ = −l … +l; mₛ = +½ or −½.`,
    hint: 'Check each set: is l less than n? Is mₗ between −l and +l?',
    review: orbReview,
  }
}

/** Nodes for orbitals beyond the ones drawn (4s, 4p, 5d, ...). */
const NODE_ORBITALS = [
  [4, 0], [5, 0], [4, 1], [5, 1], [6, 1], [4, 2], [5, 2], [3, 1], [3, 2], [2, 1], [3, 0],
] as const
function nodesMore(n: number, l: number, kind: 'r' | 'a' | 't'): Question {
  const radial = n - l - 1
  const correct = String(kind === 'r' ? radial : kind === 'a' ? l : n - 1)
  const { choices, answer } = withChoices(correct, someWrong(correct, ['0', '1', '2', '3', '4', String(n)].filter((x) => x !== correct)))
  const what = kind === 'r' ? 'radial (spherical)' : kind === 'a' ? 'angular (planar or cone-shaped)' : 'nodes in total'
  return {
    id: `nodesx:${n}:${l}:${kind}`,
    topic: 'orbitals',
    visual: { kind: 'orbital', before: { kind: 'orbital', id: SHAPE_FOR_L[Math.min(l, 2)], cutaway: true, axes: true } },
    question: `How many ${kind === 't' ? what : `${what} nodes`} does a ${n}${LETTER[l]} orbital have?`,
    choices,
    answer,
    explain: `Angular nodes = l = ${l}; radial nodes = n − l − 1 = ${radial}; total = n − 1 = ${n - 1}.`,
    hint: 'Angular nodes = l. Total nodes = n − 1. Radial = total − angular.',
    review: orbReview,
  }
}

/* ======================================================================= SHAPES (real molecules) */

const shpReview = { module: 'vsepr' as const, lessonId: 'lone-pairs', label: 'Shapes lessons' }
/** Molecules with one central atom and a valid VSEPR shape (from the Lewis page). */
const REAL = LEWIS.filter((m) => {
  if (m.center === undefined || m.debated) return false
  const s = shapeOf(m, m.forms[0])!
  return isValid(s.neighbors.length, s.lone)
}).map((m) => m.id)
const realInfo = (id: string) => {
  const m = lewisById(id)
  const s = shapeOf(m, m.forms[0])!
  return { m, s, shape: shapeFor(s.neighbors.length, s.lone) }
}
const ALL_SHAPES = ['Linear', 'Bent', 'Trigonal planar', 'Trigonal pyramidal', 'Tetrahedral', 'T-shaped', 'Seesaw', 'Trigonal bipyramidal', 'Square planar', 'Square pyramidal', 'Octahedral']
const ALL_EG = ['Linear', 'Trigonal planar', 'Tetrahedral', 'Trigonal bipyramidal', 'Octahedral']

function realShape(id: string, ask: 'shape' | 'eg' | 'hyb' | 'angle'): Question {
  const { m, s, shape } = realInfo(id)
  const groups = s.neighbors.length + s.lone
  const counted = `${s.neighbors.length} bonded atom${s.neighbors.length === 1 ? '' : 's'} + ${s.lone} lone pair${s.lone === 1 ? '' : 's'} on ${s.central} = ${groups} electron groups`
  let correct: string
  let pool: string[]
  let explain: string
  let q: string
  if (ask === 'shape') {
    correct = shape.name
    pool = [shape.electronGeometry, ...ALL_SHAPES]
    q = `What is the molecular shape of ${m.formula}?`
    explain = `${shape.name}. ${counted}: ${shape.electronGeometry.toLowerCase()} electron geometry${s.lone ? `; with ${s.lone} lone pair${s.lone === 1 ? '' : 's'}, the atoms form a ${shape.name.toLowerCase()} shape` : ''}.`
  } else if (ask === 'eg') {
    correct = shape.electronGeometry
    pool = ALL_EG
    q = `What is the ELECTRON geometry around ${s.central} in ${m.formula}?`
    explain = `${shape.electronGeometry}. ${counted}. Electron geometry counts lone pairs too.`
  } else if (ask === 'hyb') {
    correct = shape.hybridization.replace('*', '')
    pool = ['sp', 'sp²', 'sp³', 'sp³d', 'sp³d²']
    q = `What is the hybridization of ${s.central} in ${m.formula}?`
    explain = `${correct}: ${counted}, and 2/3/4/5/6 groups go with sp/sp²/sp³/sp³d/sp³d².${groups >= 5 ? ` ${HYBRID_FOOTNOTE.replace('*', '')}` : ''}`
  } else {
    correct = shape.idealAngles.replace('less than', '<')
    pool = ['180°', '120°', '109.5°', '90°', '< 120°', '< 109.5°', '90° and 120°', '90° and 180°'].filter((x) => x !== correct)
    q = `What bond angle(s) does VSEPR predict for ${m.formula}?`
    explain = `${correct}. ${counted}; ${s.lone ? 'lone pairs push harder than bonds, squeezing the angles below the ideal value' : 'with no lone pairs the ideal angle holds'}.`
  }
  const { choices, answer } = withChoices(correct, someWrong(correct, pool))
  return {
    id: `real${ask}:${id}`,
    topic: 'shapes',
    visual: { kind: 'lewis', molecule: id, before: { show: 'form' }, after: { show: 'form' }, show3dAfter: true },
    question: q,
    choices,
    answer,
    explain,
    hint: 'Count electron groups on the central atom in the Lewis structure: each bond (single, double, or triple) is one group, and each lone pair is one group.',
    review: shpReview,
  }
}

/* ======================================================================= TRENDS (more) */

const trendReview = (prop: PropId) => ({
  module: 'trends' as const,
  lessonId: prop === 'radius' ? 'atomic-radius' : prop === 'ie' ? 'ionization-energy' : 'electronegativity',
  label: `Trends: ${propInfo(prop).name}`,
})
const MOST: Record<string, { more: string; most: string }> = {
  radius: { more: 'largest atom', most: 'largest' },
  ie: { more: 'highest ionization energy', most: 'highest ionization energy' },
  en: { more: 'highest electronegativity', most: 'most electronegative' },
}
/** Main-group elements of periods 2–5 in a row or column, whose data follows a clean trend. */
function lineOf(z: number, row: boolean) {
  const a = byZ(z)
  return ELEMENTS.filter((e) => isMainGroup(e) && e.period >= 2 && e.period <= 5 && (row ? e.period === a.period : e.group === a.group) && e.group !== 18)
}
/** A random set of `k` elements from one row or column, all clearly different in `prop`. */
function trendSet(prop: PropId, k: number): number[] | null {
  for (let tries = 0; tries < 60; tries++) {
    const row = Math.random() < 0.5
    const line = lineOf(pick(ELEMENTS.filter((e) => isMainGroup(e) && e.period >= 2 && e.period <= 5 && e.group !== 18)).z, row).filter((e) => e.values[prop] !== null)
    if (line.length < k) continue
    const set = shuffle(line).slice(0, k)
    // Order by position (left→right in a row, top→bottom in a column) and require the data to
    // follow the textbook trend that way, with clear gaps: exceptions are taught in the lessons.
    const byPos = [...set].sort((a, b) => (row ? a.group! - b.group! : a.period - b.period))
    const v = byPos.map((e) => e.values[prop]!)
    const growsWithPos = prop === 'radius' ? !row : row // radius grows down a column; IE and EN grow across a row
    const ok = v.every((x, i) => i === 0 || (growsWithPos ? x / v[i - 1] > 1.06 : v[i - 1] / x > 1.06))
    if (ok) return set.map((e) => e.z).sort((x, y) => x - y)
  }
  return null
}
const symOf = (z: number) => byZ(z).symbol

function trendMost(prop: PropId, zs: number[]): Question {
  const best = zs.reduce((a, b) => (byZ(b).values[prop]! > byZ(a).values[prop]! ? b : a))
  const { choices, answer } = withChoices(`${symOf(best)} (${byZ(best).name})`, zs.filter((z) => z !== best).map((z) => `${symOf(z)} (${byZ(z).name})`))
  return {
    id: `most:${prop}:${zs.join(':')}`,
    topic: 'trends',
    visual: { kind: 'trends', before: { props: [], flat: true, focus: zs }, after: { props: [prop], flat: false, focus: zs } },
    question: `Which of these has the ${MOST[prop].more}?`,
    choices,
    answer,
    explain: `${symOf(best)}: ${zs.map((z) => `${symOf(z)} ${fmtProp(prop, byZ(z).values[prop]!)}`).join(', ')}.`,
    hint: prop === 'radius' ? 'Atoms get bigger going down and to the left.' : 'This trend increases going up and to the right.',
    review: trendReview(prop),
  }
}

function trendRank(prop: PropId, zs: number[]): Question {
  const order = [...zs].sort((a, b) => byZ(a).values[prop]! - byZ(b).values[prop]!)
  const fmt = (o: number[]) => o.map(symOf).join(' < ')
  const correct = fmt(order)
  const perms = [
    [order[0], order[2], order[1]],
    [order[1], order[0], order[2]],
    [order[2], order[1], order[0]],
    [order[1], order[2], order[0]],
    [order[2], order[0], order[1]],
  ].map(fmt)
  const { choices, answer } = withChoices(correct, someWrong(correct, perms))
  return {
    id: `rank:${prop}:${zs.join(':')}`,
    topic: 'trends',
    visual: { kind: 'trends', before: { props: [], flat: true, focus: zs }, after: { props: [prop], flat: false, focus: zs } },
    question: `Put these in order of increasing ${propInfo(prop).name.toLowerCase()}.`,
    choices,
    answer,
    explain: `${correct}: ${order.map((z) => `${symOf(z)} ${fmtProp(prop, byZ(z).values[prop]!)}`).join(', ')}.`,
    hint: 'Find where each sits on the table and follow the trend across the row or down the column.',
    review: trendReview(prop),
  }
}

/** Click card: click the element with the most of `prop` among the highlighted ones. */
function trendPick(prop: PropId, zs: number[]): Question {
  const best = zs.reduce((a, b) => (byZ(b).values[prop]! > byZ(a).values[prop]! ? b : a))
  return {
    id: `pickel:${prop}:${zs.join(':')}`,
    topic: 'trends',
    visual: { kind: 'trends', before: { props: [], flat: true, focus: zs }, after: { props: [prop], flat: false, focus: zs } },
    question: `Click the highlighted element that is the ${MOST[prop].most}.`,
    choices: [],
    answer: -1,
    interaction: { kind: 'click-element', correct: [best], among: zs },
    explain: `${symOf(best)} (${byZ(best).name}): ${zs.map((z) => `${symOf(z)} ${fmtProp(prop, byZ(z).values[prop]!)}`).join(', ')}.`,
    hint: prop === 'radius' ? 'Down and to the left is bigger.' : 'Up and to the right is higher.',
    review: trendReview(prop),
  }
}
const fmtProp = (prop: PropId, v: number) => (prop === 'en' ? v.toFixed(2) : `${v} ${propInfo(prop).unit}`)

/* ======================================================================= MO (more) */

const moReview = (lessonId: string) => ({ module: 'mo' as const, lessonId, label: 'MO theory lessons' })
/** Molecules and ions for fill and click cards: [molecule, electron change]. */
const MO_SPECIES: [string, number][] = [
  ['h2', 0], ['h2', -1], ['he2', 0], ['he2', -1], ['li2', 0], ['b2', 0], ['c2', 0], ['n2', 0], ['n2', -1], ['n2', 1],
  ['o2', 0], ['o2', -1], ['o2', 1], ['o2', 2], ['f2', 0], ['f2', -1], ['co', 0], ['no', 0], ['no', -1], ['no', 1], ['hf', 0],
]
const lessonFor = (id: string) => (['h2', 'he2'].includes(id) ? 'basics' : ['co', 'no', 'hf'].includes(id) ? 'unequal' : id === 'o2' || id === 'b2' ? 'oxygen' : 'second-row')

function moFill(id: string, d: number): Question {
  const m = diatomicById(id)
  const n = m.electrons + d
  const f = fill(DIAGRAMS[m.diagram], n)
  return {
    id: `mofill:${id}:${d}`,
    topic: 'mo',
    visual: { kind: 'mo', molecule: id, electrons: n, filledBefore: false },
    question: `Fill in the diagram for ${ionFormula(m, n)} (${n} valence electron${n === 1 ? '' : 's'}). Click a line to add an electron; click again to pair it.`,
    choices: [],
    answer: -1,
    interaction: { kind: 'fill-mo' },
    explain: `Lowest levels first, one electron in each orbital of a pair before pairing. Bond order (${f.bonding} − ${f.antibonding}) ÷ 2 = ${fmtOrder(f.bondOrder)}, with ${f.unpaired} unpaired electron${f.unpaired === 1 ? '' : 's'}.`,
    hint: 'Fill from the bottom up. In a pair of equal-energy orbitals (π), put one electron in each before pairing.',
    review: moReview(lessonFor(id)),
  }
}

type MoClick = 'homo' | 'lumo' | 'unpaired'
function moClickAnswer(id: string, d: number, kind: MoClick): string[] {
  const m = diatomicById(id)
  const dg = DIAGRAMS[m.diagram]
  const f = fill(dg, m.electrons + d)
  const levels = byEnergy(dg)
  if (kind === 'homo') {
    const occ = levels.filter((l) => f.count[l.id] > 0)
    return occ.length ? [occ[occ.length - 1].id] : []
  }
  if (kind === 'lumo') {
    // The lowest level with room for another electron.
    const open = levels.find((l) => f.count[l.id] < 2 * l.deg)
    return open ? [open.id] : []
  }
  return levels.filter((l) => f.arrows[l.id].some((x) => x === 1)).map((l) => l.id)
}
const MO_CLICKS: string[] = MO_SPECIES.flatMap(([id, d]) =>
  (['homo', 'lumo', 'unpaired'] as MoClick[]).filter((k) => moClickAnswer(id, d, k).length).map((k) => `${k}:${id}:${d}`),
)
function moClick(kind: MoClick, id: string, d: number): Question {
  const m = diatomicById(id)
  const n = m.electrons + d
  const correct = moClickAnswer(id, d, kind)
  const ask = {
    homo: 'the highest level that holds electrons (the HOMO)',
    lumo: 'the lowest level with room for another electron',
    unpaired: correct.length > 1 ? 'a level holding unpaired electrons' : 'the level holding the unpaired electron(s)',
  }[kind]
  const label = DIAGRAMS[m.diagram].levels.find((l) => l.id === correct[0])!.label.replace('_', '')
  return {
    id: `moclick:${kind}:${id}:${d}`,
    topic: 'mo',
    visual: { kind: 'mo', molecule: id, electrons: n, filledBefore: true },
    question: `In ${ionFormula(m, n)}, click ${ask}.`,
    choices: [],
    answer: -1,
    interaction: { kind: 'click-level', correct },
    explain: `${label}. ${kind === 'unpaired' ? 'Single arrows are unpaired electrons: they make the molecule paramagnetic.' : kind === 'homo' ? 'It is the top filled (or partly filled) level.' : 'The next electron would go here.'}`,
    hint: kind === 'unpaired' ? 'Look for single arrows.' : 'Levels are drawn by energy: higher on the page is higher energy.',
    review: moReview(lessonFor(id)),
  }
}

/** Which of two species has the stronger (or longer) bond, from bond order. */
const CMP_SPECIES = MO_SPECIES.filter(([id, d]) => fill(DIAGRAMS[diatomicById(id).diagram], diatomicById(id).electrons + d).bondOrder > 0)
const MO_PAIRS = subsets(CMP_SPECIES.map(([id, d]) => `${id}_${d}`), 2).filter(([a, b]) => {
  const bo = (s: string) => {
    const [id, d] = s.split('_')
    return fill(DIAGRAMS[diatomicById(id).diagram], diatomicById(id).electrons + Number(d)).bondOrder
  }
  // Same kind of atoms (so bond order is a fair guide) and different bond orders.
  return a.split('_')[0] === b.split('_')[0] && bo(a) !== bo(b)
})
function moCompare(a: string, b: string, ask: 'stronger' | 'longer'): Question {
  const info = (s: string) => {
    const [id, d] = s.split('_')
    const m = diatomicById(id)
    const n = m.electrons + Number(d)
    return { id, d: Number(d), f: ionFormula(m, n), bo: fill(DIAGRAMS[m.diagram], n).bondOrder }
  }
  const A = info(a)
  const B = info(b)
  const hi = A.bo > B.bo ? A : B
  const lo = hi === A ? B : A
  const win = ask === 'stronger' ? hi : lo
  const { choices, answer } = withChoices(win.f, [win === A ? B.f : A.f])
  return {
    id: `mocmp:${a}:${b}:${ask}`,
    topic: 'mo',
    visual: { kind: 'mo', molecule: A.id, electrons: diatomicById(A.id).electrons + A.d, filledBefore: true },
    question: `Which has the ${ask} bond: ${A.f} or ${B.f}? (${A.f}’s diagram is shown; work out ${B.f}’s.)`,
    choices,
    answer,
    explain: `Bond orders: ${A.f} ${fmtOrder(A.bo)}, ${B.f} ${fmtOrder(B.bo)}. Higher bond order means a stronger, shorter bond, so ${win.f} has the ${ask} bond.`,
    hint: 'Work out both bond orders. Higher bond order = stronger and shorter.',
    review: moReview('oxygen'),
  }
}

/** Name the molecular orbital from its 3D shape. */
const MO_SHAPE_NAMES: Record<string, string> = {
  'h2-bonding': 'σ (bonding)',
  'h2-antibonding': 'σ* (antibonding)',
  'p-pi': 'π (bonding)',
  'mo-p-pi*': 'π* (antibonding)',
  'p-sigma': 'σ from p (bonding)',
  'mo-p-sigma*': 'σ* from p (antibonding)',
}
function moShape(key: string): Question {
  const correct = MO_SHAPE_NAMES[key]
  const { choices, answer } = withChoices(correct, someWrong(correct, Object.values(MO_SHAPE_NAMES)))
  return {
    id: `moshape:${key}`,
    topic: 'mo',
    visual: { kind: 'orbital', before: { kind: 'bond', id: key, axes: false } },
    question: 'The two white dots are the nuclei. Which molecular orbital is this?',
    choices,
    answer,
    explain: `${correct}. ${key.includes('anti') || key.includes('*') ? 'There is a node (no electron density) between the nuclei: antibonding.' : 'Electron density builds up between the nuclei: bonding.'} ${key.includes('pi') ? 'π orbitals have lobes above and below the bond axis.' : 'σ orbitals are symmetric around the bond axis.'}`,
    hint: 'Is there density between the nuclei, or a node? Are the lobes on the axis (σ) or above and below it (π)?',
    review: moReview('second-row'),
  }
}

/* ======================================================================= LEWIS (build and click) */

const lwReview = (lessonId: string, label: string) => ({ module: 'lewis' as const, lessonId, label })
function lewisBuild(id: string): Question {
  const m = lewisById(id)
  const lesson = m.center === undefined && m.atoms.length > 2 ? 'harder' : m.exception ? 'exceptions' : m.forms.length > 1 ? 'resonance' : 'drawing'
  return {
    id: `lewisbuild:${id}`,
    topic: 'lewis',
    visual: { kind: 'lewis', molecule: id, before: { show: 'form' }, build: true },
    question: `Build the Lewis structure of ${m.formula} (${m.name}). Click an atom to add lone pairs, click a bond to change it, then press Check.`,
    choices: [],
    answer: -1,
    interaction: { kind: 'build-lewis' },
    explain: m.note ?? (m.forms.length > 1 ? `One of ${m.forms.length} resonance structures.` : 'Every atom is satisfied with the smallest possible formal charges.'),
    hint: 'Count valence electrons, give outer atoms their octets, put leftovers on the center, then share lone pairs as multiple bonds if the center is short.',
    review: lwReview(lesson, 'Lewis structures lessons'),
  }
}

type AtomClick = 'neg' | 'pos' | 'over8' | 'under8' | 'unpaired'
function atomClickAnswer(id: string, kind: AtomClick): number[] {
  const m = lewisById(id)
  const f = m.forms[0]
  const fc = formalCharges(m, f)
  const around = electronsAround(m, f)
  return m.atoms
    .map((_, i) => i)
    .filter((i) =>
      kind === 'neg'
        ? fc[i] < 0
        : kind === 'pos'
          ? fc[i] > 0
          : kind === 'over8'
            ? around[i] > 8
            : kind === 'under8'
              ? m.atoms[i].el !== 'H' && around[i] < 8 && allowedAround(m, i).min < 8
              : (f.single?.[i] ?? 0) > 0,
    )
}
const LEWIS_CLICKS: string[] = LEWIS.filter((m) => m.forms.length === 1 && !m.debated).flatMap((m) =>
  (['neg', 'pos', 'over8', 'under8', 'unpaired'] as AtomClick[]).filter((k) => atomClickAnswer(m.id, k).length).map((k) => `${k}:${m.id}`),
)
function lewisClick(kind: AtomClick, id: string): Question {
  const m = lewisById(id)
  const correct = atomClickAnswer(id, kind)
  const ask = {
    neg: 'an atom with a negative formal charge',
    pos: 'the atom with a positive formal charge',
    over8: 'the atom with more than 8 electrons around it',
    under8: 'the atom with fewer than 8 electrons around it',
    unpaired: 'the atom with the unpaired electron',
  }[kind]
  const el = m.atoms[correct[0]].el
  return {
    id: `lewisclick:${kind}:${id}`,
    topic: 'lewis',
    visual: { kind: 'lewis', molecule: id, before: { show: 'form' }, after: { show: 'form', formal: true, highlight: correct } },
    question: `In ${m.formula}, click ${ask}.`,
    choices: [],
    answer: -1,
    interaction: { kind: 'click-atom', correct },
    explain:
      kind === 'neg' || kind === 'pos'
        ? `The ${el}: formal charge = valence − (dots + bonds) = ${formalCharges(m, m.forms[0])[correct[0]] > 0 ? '+' : '−'}${Math.abs(formalCharges(m, m.forms[0])[correct[0]])}.`
        : kind === 'unpaired'
          ? `The ${el} holds the single dot.`
          : `The ${el} has ${electronsAround(m, m.forms[0])[correct[0]]} electrons around it (2 per bond plus its lone-pair electrons).`,
    hint: kind === 'neg' || kind === 'pos' ? 'Formal charge = valence electrons − (dots + bonds).' : 'Count 2 electrons per bond plus the dots on each atom.',
    review: lwReview(kind === 'neg' || kind === 'pos' ? 'formal-charge' : 'exceptions', 'Lewis structures lessons'),
  }
}

/* ======================================================================= the registry */

export interface Skill {
  topic: Topic
  /** What students see in the focus line, e.g. "formal charge". */
  name: string
  /** How often this kind of card comes up relative to others in its topic. */
  share: number
  random: () => string
}

const FACT_IDS = RXN_FACTS.map((_, i) => String(i))
const PROPS: PropId[] = ['radius', 'ie', 'en']

export const MORE_SKILLS: Record<string, Skill> = {
  rxnsub: { topic: 'reactions', name: 'substrates for SN1 and SN2', share: 1.2, random: () => { const m = pick(['sn2', 'sn1'] as const); const [a, b] = pick(SUB_PAIRS[m]); return `rxnsub:${m}:${a}:${b}` } },
  rxnsn1: { topic: 'reactions', name: 'the SN1 mechanism', share: 0.7, random: () => `rxnsn1:${pick(Object.keys(SN1_FRAMES))}` },
  rxnfact: { topic: 'reactions', name: 'SN1 vs SN2 basics', share: 1.4, random: () => `rxnfact:${pick(FACT_IDS)}` },
  rxnsolv: { topic: 'reactions', name: 'solvent effects', share: 0.8, random: () => `rxnsolv:${pick(Object.keys(SOLVENTS))}` },
  rxnnuc: { topic: 'reactions', name: 'nucleophiles', share: 0.8, random: () => `rxnnuc:${pick(Object.keys(NUCLEOPHILES))}` },
  rxnlg: { topic: 'reactions', name: 'leaving groups', share: 0.7, random: () => `rxnlg:${pick(LG_SETS)}` },
  rxncat: { topic: 'reactions', name: 'carbocation stability', share: 0.7, random: () => `rxncat:${pick(CAT_SETS)}` },
  bondpol: { topic: 'polarity', name: 'comparing bond polarity', share: 1.2, random: () => { const [a, b] = pick(BOND_PAIRS); return `bondpol:${a}:${b}` } },
  bondneg: { topic: 'polarity', name: 'which end is δ−', share: 0.8, random: () => `bondneg:${pick(NEG_BONDS)}` },
  polarshape: { topic: 'polarity', name: 'polarity from 3D shape', share: 1.2, random: () => `polarshape:${pick(Object.keys(SHAPE_POLARITY))}` },
  enzfrac: { topic: 'enzymes', name: 'Michaelis–Menten rates', share: 0.8, random: () => `enzfrac:${pick(Object.keys(FRACTIONS))}` },
  enzlb: { topic: 'enzymes', name: 'Lineweaver–Burk plots', share: 0.7, random: () => `enzlb:${pick(['0', '1', '2', '3'])}` },
  enzapp: { topic: 'enzymes', name: 'inhibitors and Km/Vmax', share: 1, random: () => `enzapp:${pick(APP_TYPES)}:${pick([1, 2, 3])}:${pick(['km', 'vmax'])}` },
  qnorb: { topic: 'orbitals', name: 'quantum numbers', share: 0.4, random: () => `qnorb:${pick([1, 2, 3, 4])}` },
  qnel: { topic: 'orbitals', name: 'quantum numbers', share: 0.4, random: () => `qnel:${pick([1, 2, 3, 4])}` },
  qnsub: { topic: 'orbitals', name: 'quantum numbers', share: 0.6, random: () => { const n = pick([1, 2, 3, 4, 5]); return `qnsub:${n}:${pick(Array.from({ length: Math.min(n, 4) }, (_, l) => l))}` } },
  qnbad: { topic: 'orbitals', name: 'quantum numbers', share: 0.8, random: () => `qnbad:${Math.floor(Math.random() * QN_VARIANTS)}` },
  nodesx: { topic: 'orbitals', name: 'counting nodes', share: 0.8, random: () => { const [n, l] = pick(NODE_ORBITALS); return `nodesx:${n}:${l}:${pick(['r', 'a', 't'])}` } },
  realshape: { topic: 'shapes', name: 'shapes of real molecules', share: 1.2, random: () => `realshape:${pick(REAL)}` },
  realeg: { topic: 'shapes', name: 'electron geometry', share: 0.7, random: () => `realeg:${pick(REAL)}` },
  realhyb: { topic: 'shapes', name: 'hybridization', share: 0.7, random: () => `realhyb:${pick(REAL)}` },
  realangle: { topic: 'shapes', name: 'bond angles', share: 0.7, random: () => `realangle:${pick(REAL)}` },
  most: { topic: 'trends', name: 'periodic trends', share: 0.8, random: () => { const p = pick(PROPS); const s = trendSet(p, 4) ?? trendSet(p, 3); return s ? `most:${p}:${s.join(':')}` : 'most:radius:3:6:9' } },
  rank: { topic: 'trends', name: 'ranking by trend', share: 0.8, random: () => { const p = pick(PROPS); const s = trendSet(p, 3); return s ? `rank:${p}:${s.join(':')}` : 'rank:radius:3:6:9' } },
  pickel: { topic: 'trends', name: 'periodic trends', share: 0.7, random: () => { const p = pick(PROPS); const s = trendSet(p, 4) ?? trendSet(p, 3); return s ? `pickel:${p}:${s.join(':')}` : 'pickel:radius:3:6:9' } },
  mofill: { topic: 'mo', name: 'filling MO diagrams', share: 1.2, random: () => { const [id, d] = pick(MO_SPECIES); return `mofill:${id}:${d}` } },
  moclick: { topic: 'mo', name: 'reading MO diagrams', share: 0.8, random: () => `moclick:${pick(MO_CLICKS)}` },
  mocmp: { topic: 'mo', name: 'bond order and bond strength', share: 0.8, random: () => { const [a, b] = pick(MO_PAIRS); return `mocmp:${a}:${b}:${pick(['stronger', 'longer'])}` } },
  moshape: { topic: 'mo', name: 'σ and π orbital shapes', share: 0.6, random: () => `moshape:${pick(Object.keys(MO_SHAPE_NAMES))}` },
  lewisbuild: { topic: 'lewis', name: 'drawing Lewis structures', share: 1.6, random: () => `lewisbuild:${pick(LEWIS).id}` },
  lewisclick: { topic: 'lewis', name: 'reading Lewis structures', share: 0.8, random: () => `lewisclick:${pick(LEWIS_CLICKS)}` },
}

/** Rebuild one of these cards from its ID (or null if it isn't one of them / is malformed). */
export function moreFromId(kind: string, p: string[]): Question | null {
  switch (kind) {
    case 'rxnsub': {
      const m = p[0] as 'sn2' | 'sn1'
      const a = Number(p[1])
      const b = Number(p[2])
      return SUB_PAIRS[m]?.some(([x, y]) => x === a && y === b) ? rxnSubstrate(m, a, b) : null
    }
    case 'rxnsn1':
      return SN1_FRAMES[p[0]] ? rxnSn1Stage(p[0]) : null
    case 'rxnfact':
      return RXN_FACTS[Number(p[0])] ? rxnFact(Number(p[0])) : null
    case 'rxnsolv':
      return SOLVENTS[p[0]] ? rxnSolvent(p[0]) : null
    case 'rxnnuc':
      return NUCLEOPHILES[p[0]] ? rxnNucleophile(p[0]) : null
    case 'rxnlg':
      return LG_SETS.includes(p[0]) ? rxnLeaving(p[0]) : null
    case 'rxncat':
      return CAT_SETS.includes(p[0]) ? rxnCation(p[0]) : null
    case 'bondpol':
      return BOND_PAIRS.some(([a, b]) => a === p[0] && b === p[1]) ? bondPolarity(p[0], p[1]) : null
    case 'bondneg':
      return NEG_BONDS.includes(p[0]) ? bondNegative(p[0]) : null
    case 'polarshape':
      return SHAPE_POLARITY[p[0]] ? polarShape(p[0]) : null
    case 'enzfrac':
      return FRACTIONS[p[0]] ? enzFraction(p[0]) : null
    case 'enzlb':
      return LB_FACTS[Number(p[0])] ? enzLb(Number(p[0])) : null
    case 'enzapp':
      return APP_TYPES.includes(p[0] as never) && [1, 2, 3].includes(Number(p[1])) && (p[2] === 'km' || p[2] === 'vmax')
        ? enzApparent(p[0] as Exclude<Inhibition, 'none'>, Number(p[1]), p[2])
        : null
    case 'qnorb':
    case 'qnel':
      return [1, 2, 3, 4].includes(Number(p[0])) ? qnCount(kind === 'qnorb' ? 'orb' : 'el', Number(p[0])) : null
    case 'qnsub': {
      const n = Number(p[0])
      const l = Number(p[1])
      return n >= 1 && n <= 5 && l >= 0 && l < Math.min(n, 4) ? qnSubshell(n, l) : null
    }
    case 'qnbad':
      return Number(p[0]) >= 0 && Number(p[0]) < QN_VARIANTS ? qnBad(Number(p[0])) : null
    case 'nodesx':
      return NODE_ORBITALS.some(([n, l]) => n === Number(p[0]) && l === Number(p[1])) && ['r', 'a', 't'].includes(p[2])
        ? nodesMore(Number(p[0]), Number(p[1]), p[2] as 'r' | 'a' | 't')
        : null
    case 'realshape':
    case 'realeg':
    case 'realhyb':
    case 'realangle':
      return REAL.includes(p[0]) ? realShape(p[0], kind.slice(4) as 'shape' | 'eg' | 'hyb' | 'angle') : null
    case 'most':
    case 'rank':
    case 'pickel': {
      const prop = p[0] as PropId
      const zs = p.slice(1).map(Number)
      if (!PROPS.includes(prop) || zs.length < 3 || zs.some((z) => !byZ(z) || byZ(z).values[prop] === null)) return null
      return kind === 'most' ? trendMost(prop, zs) : kind === 'rank' ? (zs.length === 3 ? trendRank(prop, zs) : null) : trendPick(prop, zs)
    }
    case 'mofill':
      return MO_SPECIES.some(([id, d]) => id === p[0] && d === Number(p[1])) ? moFill(p[0], Number(p[1])) : null
    case 'moclick':
      return MO_CLICKS.includes(p.join(':')) ? moClick(p[0] as MoClick, p[1], Number(p[2])) : null
    case 'mocmp':
      return MO_PAIRS.some(([a, b]) => a === p[0] && b === p[1]) && (p[2] === 'stronger' || p[2] === 'longer') ? moCompare(p[0], p[1], p[2]) : null
    case 'moshape':
      return MO_SHAPE_NAMES[p[0]] ? moShape(p[0]) : null
    case 'lewisbuild':
      return LEWIS.some((m) => m.id === p[0]) ? lewisBuild(p[0]) : null
    case 'lewisclick':
      return LEWIS_CLICKS.includes(p.join(':')) ? lewisClick(p[0] as AtomClick, p[1]) : null
  }
  return null
}
