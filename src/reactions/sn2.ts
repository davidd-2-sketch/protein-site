/*
  sn2.ts — what the SN2 viewer says and labels at each moment of the reaction.

  The timeline runs the reaction coordinate s from 0 (reactants) to 1 (products).
  Each step covers a range of s. Text follows the same rules as the protein lessons:
  one idea per step, three depth levels, real terms always included.

  Facts used (standard organic chemistry, e.g. Klein; Clayden):
    • SN2 is concerted (one step, no intermediate), bimolecular: rate = k[RX][Nu⁻].
    • Backside attack is required because the C–X σ* orbital's large lobe points away from X.
    • Rates: methyl > primary > secondary ≫ tertiary (steric hindrance).
    • Inversion of configuration (Walden inversion). Here (S) → (R), checked numerically
      from the 3D geometry in sn2Geometry.ts.
    • pKa of HBr ≈ −9, so Br⁻ is a very weak base and a good leaving group.
    • A secondary halide with a strong base like HO⁻ also undergoes E2; we say so.
*/
import type { Depth, Quiz } from '../lessons/types'

export interface ReactionStep {
  title: string
  /** Where on the reaction coordinate this step starts and ends. */
  from: number
  to: number
  text: Record<Depth, string>
}

export const SN2_STEPS: ReactionStep[] = [
  {
    title: 'Meet the reactants',
    from: 0,
    to: 0.15,
    text: {
      simple:
        "On the left is **hydroxide** (HO⁻): an oxygen with extra electrons and a negative charge, so it's electron-rich and looking for something positive. On the right is **2-bromobutane**. Bromine pulls electrons toward itself, leaving its carbon slightly positive (δ+).",
      standard:
        'Hydroxide (HO⁻) is the [[nucleophile]]: it has lone pairs and a negative charge to donate. In 2-bromobutane, bromine is more electronegative than carbon, so the C–Br bond is polar and that carbon is a partially positive [[electrophile]] (δ+). Bromine will be the [[leaving group]].',
      deep:
        'The carbon bearing Br is a [[stereocenter]] with (S) configuration (priorities: Br > ethyl > methyl > H). It is a secondary carbon, which matters: SN2 rates fall sharply from methyl > primary > secondary, and tertiary carbons essentially do not react by SN2 because their back side is blocked.',
    },
  },
  {
    title: 'Attack from the back',
    from: 0.15,
    to: 0.42,
    text: {
      simple:
        'Hydroxide comes in from the side directly opposite the bromine, like using the back door because the front door is blocked. The gold arrows show where electrons go: a lone pair from oxygen heads toward carbon, and the C–Br bond’s electrons head onto bromine.',
      standard:
        'This is [[backside attack]]: the nucleophile approaches 180° from the leaving group. The curved arrows show electron flow: one from an oxygen lone pair to the carbon, and one from the C–Br bond onto bromine. Both happen at the same time.',
      deep:
        'Backside attack is required by orbital overlap: the empty C–Br σ* orbital, which accepts the nucleophile’s electrons, has its large lobe on the side opposite bromine. Filling σ* weakens the C–Br bond as the C–O bond forms. Groups crowding that side slow the reaction (steric hindrance).',
    },
  },
  {
    title: 'The transition state',
    from: 0.42,
    to: 0.58,
    text: {
      simple:
        'This is the peak moment. For an instant, carbon is half-bonded to both oxygen and bromine (dashed lines), and its other three groups lie flat, like an umbrella turned sideways. It can’t stay like this: it’s the top of the energy hill.',
      standard:
        'At the [[transition state]] (‡), carbon has partial bonds to both O and Br, the negative charge is shared between them (δ−), and the three other groups lie flat. Both the nucleophile and the substrate are in this single step, so the rate depends on both: rate = k[RBr][HO⁻]. That’s the "2" in SN2: bimolecular.',
      deep:
        'SN2 is concerted: one transition state, no intermediate. Carbon is pentacoordinate (trigonal bipyramidal), with O and Br in the apical positions and the other three groups equatorial. The [[activation energy]] is this peak’s height above the reactants; crowding the back side or using a poorer leaving group raises it.',
    },
  },
  {
    title: 'Inside out',
    from: 0.58,
    to: 0.85,
    text: {
      simple:
        'Now the umbrella flips inside out in the wind! The three groups swing over to the other side of carbon. The molecule ends up as the mirror-image arrangement of how it started.',
      standard:
        'As the new bond finishes forming, the three groups flip to the other side of carbon. This [[inversion of configuration]] (Walden inversion) is the signature of SN2. Here the (S) starting material becomes the (R) product: watch the configuration label change.',
      deep:
        'Inversion is geometric: the nucleophile ends up on the face opposite where the leaving group was. The letter flips from S to R here only because OH takes over bromine’s top priority. In other SN2 reactions the letter can stay the same even though the geometry inverts, so always re-assign priorities.',
    },
  },
  {
    title: 'The products',
    from: 0.85,
    to: 1,
    text: {
      simple:
        'Done! Oxygen is now attached, making **butan-2-ol** (an alcohol), and bromine drifts away as bromide (Br⁻), taking the bond’s two electrons with it.',
      standard:
        'The products are (R)-butan-2-ol and bromide ion. Bromide is a good [[leaving group]] because it is a weak base: a large ion that holds its negative charge comfortably. Overall, the reaction goes downhill in energy.',
      deep:
        'Leaving-group ability tracks the strength of the conjugate acid: HBr (pKa ≈ −9) is a strong acid, so Br⁻ is a very weak base and leaves easily. In a real flask, a secondary substrate with a strong base like HO⁻ also undergoes E2 elimination to give butenes; this viewer shows only the SN2 pathway.',
    },
  },
]

export const stepAt = (s: number) => SN2_STEPS.findIndex((st) => s >= st.from && s <= st.to + 1e-9)

/* ---------- Floating labels: which appear when ---------- */

export interface ReactionLabel {
  text: string
  atom: string
  kind: 'name' | 'charge' | 'group' | 'element'
  /** Shown while s is in [from, to]. */
  from: number
  to: number
}

export const SN2_LABELS: ReactionLabel[] = [
  // Roles
  { text: 'Nucleophile (HO⁻)', atom: 'O', kind: 'name', from: 0, to: 0.4 },
  { text: 'Electrophile', atom: 'C2', kind: 'name', from: 0, to: 0.14 },
  { text: 'Leaving group', atom: 'Br', kind: 'name', from: 0, to: 0.4 },
  { text: 'Bromide (Br⁻)', atom: 'Br', kind: 'name', from: 0.8, to: 1 },
  // Partial charges
  { text: 'δ+', atom: 'C2', kind: 'charge', from: 0.14, to: 0.38 },
  { text: 'δ−', atom: 'Br', kind: 'charge', from: 0.1, to: 0.38 },
  { text: 'δ−', atom: 'O', kind: 'charge', from: 0.42, to: 0.58 },
  { text: 'δ−', atom: 'Br', kind: 'charge', from: 0.42, to: 0.58 },
  // Element symbols on the key atoms, so color is never the only cue
  { text: 'O', atom: 'O', kind: 'element', from: 0, to: 1 },
  { text: 'Br', atom: 'Br', kind: 'element', from: 0, to: 1 },
  { text: 'C', atom: 'C2', kind: 'element', from: 0, to: 1 },
  // The three groups that flip (always on, so students can follow the umbrella)
  { text: 'H', atom: 'H2', kind: 'group', from: 0, to: 1 },
  { text: 'CH₃', atom: 'C1', kind: 'group', from: 0, to: 1 },
  { text: 'CH₂CH₃', atom: 'C4', kind: 'group', from: 0, to: 1 },
]

/* ---------- Schematic energy diagram ---------- */

/**
 * Energy vs. reaction coordinate. SCHEMATIC: the shape is right (one hump, products
 * lower than reactants) but the heights are not real numbers.
 * Reactants = 0, transition state = 1, products = −0.6.
 */
export function energyAt(s: number) {
  if (s <= 0.5) return 0.5 * (1 - Math.cos(Math.PI * (s / 0.5)))
  return 1 - 1.6 * 0.5 * (1 - Math.cos(Math.PI * ((s - 0.5) / 0.5)))
}

/* ---------- Pause-and-ask questions ----------
   While the reaction plays, it pauses at each `at` and asks the student to predict what
   happens next. Answers are standard SN2 facts (see the notes at the top of this file). */

export interface Checkpoint {
  /** Where on the reaction coordinate playback pauses. */
  at: number
  quiz: Quiz
}

export const SN2_CHECKPOINTS: Checkpoint[] = [
  {
    at: 0.13,
    quiz: {
      // The view already shows hydroxide on the far side, so this asks WHY, not which side.
      question: 'Hydroxide is lined up on the side opposite bromine. Why does it attack from there?',
      choices: [
        'Bromine’s electrons block the front, and the back is where the new bond can form',
        'It is attracted to the hydrogens on that side',
        'No reason: any side works equally well',
      ],
      answer: 0,
      explain:
        'This is [[backside attack]]. Bromine is large and electron-rich, so it repels hydroxide from the front, and the empty orbital that accepts hydroxide’s electrons points out the back of the carbon.',
      hint: 'Hydroxide is negatively charged. What would push it away from the front?',
    },
  },
  {
    at: 0.36,
    quiz: {
      question: 'The C–O bond is starting to form. When does the C–Br bond break?',
      choices: ['First: bromide leaves before hydroxide arrives', 'At the same time, in one step', 'Later, in a separate second step'],
      answer: 1,
      explain:
        'At the same time. S_N2 is concerted: one bond forms as the other breaks, through a single [[transition state]] with no intermediate. That is why the rate depends on both reactants.',
      hint: 'Look at the energy diagram: how many humps does this reaction have?',
    },
  },
  {
    at: 0.5,
    quiz: {
      question: 'This is the transition state: the three groups on carbon lie flat. Where do they go next?',
      choices: ['Back to where they started', 'Over to the other side, like an umbrella flipping in the wind', 'They stay flat'],
      answer: 1,
      explain:
        'They flip to the other side. This [[inversion of configuration]] is the signature of S_N2: here the (S) starting material becomes the (R) product.',
      hint: 'Hydroxide is pushing in from the left, and bromide is leaving to the right.',
    },
  },
]
