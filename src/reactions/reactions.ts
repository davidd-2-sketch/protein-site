/*
  reactions.ts — everything the Reactions page needs to know about each mechanism,
  so one page can show SN2, SN1, or both side by side.
*/
import type { Quiz } from '../lessons/types'
import type { Mechanism } from './mechanism'
import { SN1_CHECKPOINTS, SN1_LABELS, SN1_STEP_STOPS, SN1_STEPS } from './sn1'
import { makeSn1, sn1Configuration, sn1Energy } from './sn1Geometry'
import { energyAt, SN2_CHECKPOINTS, SN2_LABELS, SN2_STEPS, type ReactionLabel, type ReactionStep } from './sn2'
import { configuration, SN2, type ReactionAtom } from './sn2Geometry'

export type ReactionId = 'sn2' | 'sn1'
/** SN1 only: which face of the flat carbocation water attacks. −1 = opposite bromide, +1 = bromide’s side. */
export type Face = 1 | -1

export interface EnergyNote {
  s: number
  text: string
  /** Put the text under the curve (valleys) instead of above it (peaks). */
  below?: boolean
  anchor?: 'start' | 'middle' | 'end'
}

export interface ReactionDef {
  id: ReactionId
  /** "SN2" / "SN1" (rendered with a subscript N). */
  number: '1' | '2'
  equation: (face: Face) => string
  steps: ReactionStep[]
  stepStops: number[]
  labels: ReactionLabel[]
  checkpoints: { at: number; quiz: Quiz }[]
  mechanism: (face: Face) => Mechanism
  configuration: (atoms: ReactionAtom[], s: number) => 'R' | 'S' | null
  stereoAtom: string
  energy: (s: number) => number
  energyNotes: EnergyNote[]
  /** Where the activation-energy bracket is drawn (the highest peak). */
  eaAt: number
  summary: string
  ariaName: string
}

export const REACTIONS: Record<ReactionId, ReactionDef> = {
  sn2: {
    id: 'sn2',
    number: '2',
    equation: () => 'HO⁻ + (S)-2-bromobutane → (R)-butan-2-ol + Br⁻',
    steps: SN2_STEPS,
    stepStops: [0.06, 0.32, 0.5, 0.72, 1],
    labels: SN2_LABELS,
    checkpoints: SN2_CHECKPOINTS,
    mechanism: () => SN2,
    configuration: (atoms) => configuration(atoms),
    stereoAtom: 'C2',
    energy: energyAt,
    energyNotes: [
      { s: 0.03, text: 'Reactants', below: true, anchor: 'start' },
      { s: 0.5, text: '‡ Transition state' },
      { s: 0.97, text: 'Products', anchor: 'end' },
    ],
    eaAt: 0.5,
    summary: 'One step (concerted)',
    ariaName: 'an SN2 reaction',
  },
  sn1: {
    id: 'sn1',
    number: '1',
    equation: (face) => `H₂O + (S)-3-bromo-3-methylhexane → ${face === -1 ? '(R)' : '(S)'}-3-methylhexan-3-ol + H₃O⁺ + Br⁻`,
    steps: SN1_STEPS,
    stepStops: SN1_STEP_STOPS,
    labels: SN1_LABELS,
    checkpoints: SN1_CHECKPOINTS,
    mechanism: makeSn1,
    configuration: sn1Configuration,
    stereoAtom: 'C3',
    energy: sn1Energy,
    energyNotes: [
      { s: 0.03, text: 'Reactants', below: true, anchor: 'start' },
      { s: 0.24, text: '‡ slow step' },
      { s: 0.43, text: 'C⁺', below: true },
      { s: 0.97, text: 'Products', anchor: 'end' },
    ],
    eaAt: 0.24,
    summary: 'Three steps, through a carbocation',
    ariaName: 'an SN1 reaction',
  },
}
