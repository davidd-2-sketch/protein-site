/*
  sn1.ts — what the SN1 viewer says and labels at each moment of the reaction:
  (S)-3-bromo-3-methylhexane + H₂O → 3-methylhexan-3-ol (racemic) + HBr (as H₃O⁺ + Br⁻).

  Facts used (standard organic chemistry, e.g. Klein; Clayden; Wade):
    • SN1 is stepwise. Step 1 (C–X bond breaking to a carbocation) is the slow,
      rate-determining step, so rate = k[RX]: unimolecular, independent of the nucleophile.
    • Carbocations are sp², trigonal planar (120°), with an empty p orbital.
      Stability: tertiary > secondary > primary, from hyperconjugation and the
      electron-donating (inductive) effect of alkyl groups.
    • The flat carbocation can be attacked from either face → racemization. In practice
      often slightly more inversion than retention, because the departing bromide briefly
      shields the face it left from (ion pairing).
    • With a neutral nucleophile like water, the first product is an oxonium ion
      (R–OH₂⁺); a second water removes a proton to give the alcohol and H₃O⁺.
    • Polar protic solvents (water, alcohols) stabilize the ions and speed SN1.
    • Tertiary halides with heat also undergo E1 (elimination); this viewer shows only SN1.
  R/S of the start and both products are computed from the 3D geometry (tests/sn1.test.ts).
*/
import type { Quiz } from '../lessons/types'
import type { ReactionLabel, ReactionStep } from './sn2'

export const SN1_STEPS: ReactionStep[] = [
  {
    title: 'Meet the reactants',
    from: 0,
    to: 0.1,
    text: {
      simple:
        'On the right of carbon is **bromine**, attached to a crowded carbon that carries three other carbon groups. Waiting nearby is plain **water**: no charge, and only a weak pull toward positive things.',
      standard:
        'The substrate, (S)-3-bromo-3-methylhexane, is a **tertiary** alkyl halide: the carbon holding Br has three carbon groups. Its back side is too crowded for [[backside attack]], so SN2 is blocked. Water is a weak, neutral [[nucleophile]], and here it is also the solvent.',
      deep:
        'Tertiary substrate, weak nucleophile, polar protic solvent: all three point to SN1. Water’s hydrogen bonds stabilize the ions that will form, lowering the energy of the first step. The stereocenter starts as (S) (priorities: Br > propyl > ethyl > methyl).',
    },
  },
  {
    title: 'Bromide leaves first',
    from: 0.1,
    to: 0.38,
    text: {
      simple:
        'Nothing attacks yet. The C–Br bond breaks **on its own**, and bromine leaves with both electrons as bromide (Br⁻). This is slow: it’s the hardest part of the whole reaction.',
      standard:
        'Step 1: the C–Br bond breaks [[heterolytically|heterolytic]]: both bonding electrons go to bromine. Water isn’t involved, so the rate depends only on the substrate: rate = k[RBr]. That’s the "1" in SN1: unimolecular. This is the [[rate-determining step]], the highest hump on the energy diagram.',
      deep:
        'Because the slow step involves only the substrate, doubling the nucleophile’s concentration does not speed up an SN1 reaction (it would double an SN2 rate). What does help: a better [[leaving group]], a more stable carbocation, and a polar protic solvent to stabilize the developing charges.',
    },
  },
  {
    title: 'The carbocation',
    from: 0.38,
    to: 0.48,
    text: {
      simple:
        'What’s left is a **carbocation**: a carbon with a positive charge and only three groups. Watch the three groups lie **flat**, like a propeller. Unlike the SN2 peak, this is a real (but short-lived) stop along the way.',
      standard:
        'The [[carbocation]] is an [[intermediate]]: a valley on the energy diagram, not a peak. Its carbon is sp² and trigonal planar (120°), with an empty p orbital above and below the plane. It has only three groups, so it is not a stereocenter: the original (S) information is lost.',
      deep:
        'Tertiary carbocations are the most stable kind because the three alkyl groups donate electron density, by [[hyperconjugation]] (neighboring C–H and C–C bonds overlapping the empty p orbital) and inductively. Secondary carbocations can rearrange (hydride or methyl shifts) to become tertiary; this one is already tertiary.',
    },
  },
  {
    title: 'Water attacks either face',
    from: 0.48,
    to: 0.68,
    text: {
      simple:
        'A water molecule uses a lone pair to bond to the positive carbon. The carbocation is flat, so water can come from **either side**: this animation shows one side, and you can switch to the other.',
      standard:
        'Step 2: water’s lone pair fills the empty p orbital. Because both faces are equally open, half the molecules are attacked from one face and half from the other. That gives (R) and (S) products in about equal amounts: [[racemization]]. Switch "Water attacks from" to see both.',
      deep:
        'Real SN1 reactions usually give slightly more inversion than retention: right after leaving, bromide still sits near the face it left (an ion pair), partly shielding it. So "racemic" is the textbook idealization; expect near-racemic with a small excess of the inverted product.',
    },
  },
  {
    title: 'A proton leaves',
    from: 0.68,
    to: 0.9,
    text: {
      simple:
        'The new oxygen has three bonds and a positive charge. Another water molecule grabs one of its hydrogens (as H⁺), leaving a neutral alcohol.',
      standard:
        'Step 3: the oxonium ion (R–OH₂⁺) loses a proton to a second water molecule, which becomes H₃O⁺. The O–H bond’s electrons stay on oxygen. This acid–base step is fast.',
      deep:
        'Whenever a neutral nucleophile (water, an alcohol) does SN1 or SN2, a deprotonation step follows to give the neutral product. Mechanism questions often expect this step drawn with its own curved arrows.',
    },
  },
  {
    title: 'The products',
    from: 0.9,
    to: 1,
    text: {
      simple:
        'Done: **3-methylhexan-3-ol** (an alcohol), plus H₃O⁺ and Br⁻ (together, hydrobromic acid). Because water could attack either side, the flask holds both mirror-image versions.',
      standard:
        'Products: 3-methylhexan-3-ol as a (nearly) [[racemic mixture]] of (R) and (S), plus H₃O⁺ and Br⁻. Compare SN2, which gave a single product with inverted configuration.',
      deep:
        'Heating a tertiary halide in water or alcohol also gives alkenes by E1, which shares the same carbocation: instead of attacking carbon, water removes a proton from a neighboring carbon. SN1 and E1 usually occur together; this viewer shows only the SN1 pathway.',
    },
  },
]

export const SN1_STEP_STOPS = [0.04, 0.26, 0.44, 0.6, 0.84, 1]

export const SN1_LABELS: ReactionLabel[] = [
  { text: 'Tertiary carbon', atom: 'C3', kind: 'name', from: 0, to: 0.1 },
  { text: 'Leaving group', atom: 'Br', kind: 'name', from: 0, to: 0.3 },
  { text: 'Bromide (Br⁻)', atom: 'Br', kind: 'name', from: 0.4, to: 1 },
  { text: 'Carbocation', atom: 'C3', kind: 'name', from: 0.38, to: 0.5 },
  { text: 'Water (nucleophile)', atom: 'O1', kind: 'name', from: 0.3, to: 0.56 },
  { text: 'Water (base)', atom: 'O2', kind: 'name', from: 0.66, to: 0.84 },
  { text: 'H₃O⁺', atom: 'O2', kind: 'name', from: 0.9, to: 1 },
  { text: 'δ+', atom: 'C3', kind: 'charge', from: 0.1, to: 0.36 },
  { text: 'δ−', atom: 'Br', kind: 'charge', from: 0.1, to: 0.3 },
  { text: '+', atom: 'C3', kind: 'charge', from: 0.36, to: 0.56 },
  { text: '+', atom: 'O1', kind: 'charge', from: 0.62, to: 0.86 },
  { text: 'O', atom: 'O1', kind: 'element', from: 0, to: 1 },
  { text: 'O', atom: 'O2', kind: 'element', from: 0, to: 1 },
  { text: 'Br', atom: 'Br', kind: 'element', from: 0, to: 1 },
  { text: 'C', atom: 'C3', kind: 'element', from: 0, to: 1 },
  { text: 'CH₃', atom: 'Cm', kind: 'group', from: 0, to: 1 },
  { text: 'CH₂CH₃', atom: 'C1', kind: 'group', from: 0, to: 1 },
  { text: 'CH₂CH₂CH₃', atom: 'C6', kind: 'group', from: 0, to: 1 },
]

export const SN1_CHECKPOINTS: { at: number; quiz: Quiz }[] = [
  {
    at: 0.08,
    quiz: {
      question: 'This carbon is too crowded for water to reach its back side. What happens first?',
      choices: ['Water squeezes in anyway and pushes bromide out', 'The C–Br bond breaks on its own', 'Bromide and water swap places in one step'],
      answer: 1,
      explain:
        'The C–Br bond breaks first, without help. This slow step makes a [[carbocation]], and only then does water attack. Because the slow step involves only the substrate, rate = k[RBr].',
      hint: 'If no nucleophile can reach the carbon, the leaving group has to go by itself.',
    },
  },
  {
    at: 0.45,
    quiz: {
      question: 'The carbocation is flat. Which side can water attack from?',
      choices: ['Only the side opposite where bromide left', 'Only the side bromide left from', 'Either side, about equally'],
      answer: 2,
      explain:
        'Either side: the empty p orbital has two equal lobes, above and below the flat carbon. Attack from both faces gives both (R) and (S) products: [[racemization]]. (In reality, slightly more attack opposite bromide, which lingers nearby for an instant.)',
      hint: 'Look at the three groups around carbon right now. Is one face more blocked than the other?',
    },
  },
  {
    at: 0.68,
    quiz: {
      question: 'Oxygen now has three bonds and a + charge. What happens next?',
      choices: ['Another water removes a proton (H⁺) from it', 'The C–O bond breaks again', 'Bromide bonds to oxygen'],
      answer: 0,
      explain:
        'A second water molecule acts as a base and takes one of the O–H protons, leaving the neutral alcohol and forming H₃O⁺. Neutral nucleophiles always need this final deprotonation.',
      hint: 'Which is more stable: a positively charged oxygen, or a neutral one?',
    },
  },
]
