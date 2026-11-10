/*
  types.ts — the shape of a lesson.

  A lesson is a list of steps. Each step says:
    • what to SAY (at three depth levels the student can switch between),
    • what to SHOW in 3D (which chains/residues, style, colors),
    • where to point the camera,
    • optional floating labels and measured lines,
    • an optional "try it" task the student does by clicking the model.

  Lessons are plain data, so writing a new one doesn't require touching any
  viewer code. The same format will be used for reactions, enzymes, and orbitals.
*/
import type { ChainId } from '../protein/hemoglobin'
import type { AtomRef, ColorMode, PickInfo, RenderStyle, ResidueRef, ViewState } from '../protein/ProteinViewer'

/** Simpler = analogies and plain words. Standard = AP Bio / intro college. Deeper = biochem detail. */
export type Depth = 'simple' | 'standard' | 'deep'

export const DEPTHS: { id: Depth; label: string }[] = [
  { id: 'simple', label: 'Simpler' },
  { id: 'standard', label: 'Standard' },
  { id: 'deep', label: 'Deeper' },
]

/** What the 3D view shows. Anything left out uses a sensible default. */
export type LessonView = Partial<Omit<ViewState, 'style' | 'color'>> & {
  style?: RenderStyle
  color?: ColorMode
}

/** A label pinned to an atom, to the midpoint of two atoms, or to the middle of a chain. */
export interface PinLabel {
  text: string
  at: AtomRef | { between: [AtomRef, AtomRef] } | { chainCenter: ChainId }
  tone?: 'default' | 'accent' | 'warm'
}

/** A dashed line between two atoms, labeled with its measured length (e.g. a hydrogen bond). */
export interface MeasureLine {
  from: AtomRef
  to: AtomRef
  /** Shown before the measured distance, e.g. "H-bond" → "H-bond · 2.95 Å" */
  label: string
}

/**
 * A "do it" task. `P` is whatever the module reports when the student acts:
 * a clicked atom (protein), the builder's counts (VSEPR), etc.
 */
export interface LessonTask<P = PickInfo> {
  /** What to do, e.g. "Click the α-carbon." */
  prompt: string
  /** Returns true when the student did the right thing. */
  check: (input: P) => boolean
  /** Shown after success. */
  success: string
  /** Shown after a wrong attempt. Friendly, never punishing. */
  hint: string
}

/** A multiple-choice "predict / check yourself" question. */
export interface Quiz {
  question: string
  choices: string[]
  /** Index of the correct choice. */
  answer: number
  /** Shown once answered correctly (or revealed): WHY that's the answer. */
  explain: string
  /** Shown after a wrong pick (before the student tries again). */
  hint?: string
}

/** What every lesson step has, whatever the module. `V` = the module's view description. */
export interface BaseStep<V = unknown, P = never> {
  title: string
  text: Record<Depth, string>
  view: V
  /** If set, the 3D view switches to this AFTER the quiz is answered (predict, then reveal). */
  revealView?: V
  task?: LessonTask<P>
  quiz?: Quiz
  /** Small print, e.g. an honest note about the data. */
  note?: string
}

/** Any step, from any module (used by the shared lesson panel). */
export type AnyStep = BaseStep<unknown, never>

/** A hemoglobin lesson step: the base, plus protein-specific camera, labels, and lines. */
export interface LessonStep extends BaseStep<LessonView, PickInfo> {
  /** 'all' fits everything on screen; a residue list flies the camera to those residues. */
  camera?: 'all' | { residues: ResidueRef[]; radius?: number }
  labels?: PinLabel[]
  lines?: MeasureLine[]
  /** Show the amino-acid sequence strip under the model. */
  showSequence?: boolean
}

export interface Lesson<S extends AnyStep = LessonStep> {
  id: string
  title: string
  summary: string
  minutes: number
  steps: S[]
}
