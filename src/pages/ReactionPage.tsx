/*
  ReactionPage.tsx — the animated SN2 mechanism viewer.

  One number drives everything: s, the reaction progress (0 → 1).
    • The 3D scene moves atoms, bonds, and arrows to match s.
    • The left panel shows the step that s is in (with three depth levels).
    • The energy diagram's dot sits at s.
    • The timeline plays s forward, or lets you drag it anywhere.

  Layout (laptop):
    ┌──────────── 3D stage ──────────────────────────────┐
    │ [Step panel]         [floating labels] [toggles]   │
    │                                                    │
    │       [ ▶  ───────●─────────────  ¼× ½× 1× ]  [⌁]  │
    └────────────────────────────────────────────────────┘
*/
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DepthSwitch, QuizBox } from '../lessons/LessonPanel'
import RichText from '../lessons/RichText'
import { useStoredState } from '../lessons/progress'
import type { Depth } from '../lessons/types'
import EnergyDiagram from '../reactions/EnergyDiagram'
import { ReactionScene } from '../reactions/ReactionScene'
import Timeline from '../reactions/Timeline'
import { DURATION_SECONDS, type Speed } from '../reactions/playback'
import { SN2_CHECKPOINTS, SN2_STEPS, stepAt } from '../reactions/sn2'
import { configuration, sn2Atoms } from '../reactions/sn2Geometry'
import ReactionLabels from '../reactions/ReactionLabels'
import './ReactionPage.css'

/* Where clicking a step jumps to on the reaction coordinate. */
const STEP_STOPS = [0.06, 0.32, 0.5, 0.72, 1]

export default function ReactionPage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<ReactionScene | null>(null)
  const [s, setS] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(0.5)
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const [showArrows, setShowArrows] = useState(true)
  const [showLabels, setShowLabels] = useState(true)

  // Pause-and-ask: while playing, stop at each checkpoint and ask a prediction question.
  const [questionsOn, setQuestionsOn] = useStoredState('ps.sn2.questions', true)
  /** Which checkpoint is on screen right now (null = none). */
  const [asking, setAsking] = useState<number | null>(null)
  /** Checkpoints already answered or skipped: playback won't stop at these again. */
  const [passed, setPassed] = useState<number[]>([])
  const [answered, setAnswered] = useState(false)

  const stepIndex = Math.max(0, stepAt(s))
  const step = SN2_STEPS[stepIndex]
  // R/S only changes twice during the reaction; memo keeps the same value between frames.
  const config = useMemo(() => configuration(sn2Atoms(s)), [s])

  /* ---------- Create the 3D scene once ---------- */
  useEffect(() => {
    const sc = new ReactionScene(hostRef.current!)
    setScene(sc)
    return () => {
      sc.dispose()
      setScene(null)
    }
  }, [])

  useEffect(() => scene?.setProgress(s), [scene, s])
  useEffect(() => scene?.setOptions({ arrows: showArrows }), [scene, showArrows])

  /* ---------- Playback: advance s in real time while playing ---------- */
  // The loop reads the latest s through a ref, so it doesn't restart every frame.
  const sRef = useRef(s)
  useEffect(() => {
    sRef.current = s
  }, [s])
  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    let id = 0
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      let next = Math.min(1, sRef.current + (dt * speed) / DURATION_SECONDS)
      // Did this frame cross a question that hasn't been asked yet? Stop exactly on it.
      const hit = questionsOn ? SN2_CHECKPOINTS.findIndex((c, i) => !passed.includes(i) && sRef.current < c.at && next >= c.at) : -1
      if (hit >= 0) next = SN2_CHECKPOINTS[hit].at
      sRef.current = next
      setS(next)
      if (hit >= 0) {
        setAsking(hit)
        setAnswered(false)
        setPlaying(false)
      } else if (next >= 1) setPlaying(false)
      else id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, speed, questionsOn, passed])

  /** Leave the current question (answered or skipped) so playback can move past it. */
  const closeQuestion = useCallback(() => {
    if (asking !== null) setPassed((p) => (p.includes(asking) ? p : [...p, asking]))
    setAsking(null)
  }, [asking])

  const togglePlay = useCallback(() => {
    closeQuestion() // pressing play on a question skips it
    if (s >= 1) setS(0) // replay from the start
    setPlaying((p) => !p || s >= 1)
  }, [s, closeQuestion])

  const seek = useCallback(
    (v: number) => {
      closeQuestion()
      setPlaying(false)
      setS(v)
    },
    [closeQuestion],
  )

  const continueAfterAnswer = useCallback(() => {
    closeQuestion()
    setPlaying(true)
  }, [closeQuestion])

  /* Keyboard: Space plays/pauses, ← → step through the reaction in small increments. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || e.metaKey || e.ctrlKey) return
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
      if (e.key === 'ArrowRight') seek(Math.min(1, s + 0.02))
      if (e.key === 'ArrowLeft') seek(Math.max(0, s - 0.02))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, seek, s])

  return (
    <div className="reaction-page">
      <div className="reaction-backdrop" aria-hidden="true" />

      <div className="reaction-stage">
        <div
          ref={hostRef}
          className="reaction-canvas"
          role="img"
          aria-label={`3D animation of an SN2 reaction, currently at: ${step.title}. Drag to rotate, scroll to zoom.`}
        />
        {scene && showLabels && <ReactionLabels scene={scene} s={s} />}
      </div>

      {/* ===== Left: what's happening now ===== */}
      <ReactionPanel
        stepIndex={stepIndex}
        depth={depth}
        config={config}
        asking={questionsOn ? asking : null}
        answered={answered}
        onAnswered={() => setAnswered(true)}
        onContinue={continueAfterAnswer}
        onDepth={setDepth}
        onSeek={seek}
      />

      {/* ===== Top-right: what to show ===== */}
      <div className="reaction-toggles panel" role="group" aria-label="Show or hide">
        <Toggle label="Questions" on={questionsOn} onChange={setQuestionsOn} />
        <Toggle label="Electron arrows" on={showArrows} onChange={setShowArrows} />
        <Toggle label="Labels" on={showLabels} onChange={setShowLabels} />
        <button className="tool-btn" onClick={() => scene?.resetCamera()}>
          Reset view
        </button>
      </div>

      {/* ===== Bottom: timeline + energy diagram ===== */}
      <div className="reaction-bottom">
        <Timeline
          s={s}
          playing={playing}
          speed={speed}
          steps={SN2_STEPS}
          marks={questionsOn ? SN2_CHECKPOINTS.map((c) => c.at) : []}
          onSeek={seek}
          onTogglePlay={togglePlay}
          onSpeed={setSpeed}
        />
      </div>
      <div className="reaction-energy">
        <EnergyDiagram s={s} onSeek={seek} />
      </div>
    </div>
  )
}

/*
  The explanation panel. PERFORMANCE: wrapped in memo(), so during playback (60 updates
  per second) React skips it entirely unless the step, depth level, or R/S label changes.
*/
const ReactionPanel = memo(function ReactionPanel(props: {
  stepIndex: number
  depth: Depth
  config: 'R' | 'S' | null
  /** Index of the question being asked right now, or null. */
  asking: number | null
  answered: boolean
  onAnswered: () => void
  onContinue: () => void
  onDepth: (d: Depth) => void
  onSeek: (s: number) => void
}) {
  const { stepIndex, depth, config, onDepth, asking } = props
  const seek = props.onSeek
  return (
  <section className="lesson reaction-panel panel" aria-label="Reaction explanation">
    <header className="reaction-head">
      <div className="reaction-tags">
        <span className="tag tag-illustrative">Illustrative motion</span>
      </div>
      <h1>
        S<sub>N</sub>2 substitution
      </h1>
      <p className="reaction-equation">
        HO⁻ + (S)-2-bromobutane → (R)-butan-2-ol + Br⁻
      </p>
    </header>

    <ol className="reaction-steps" aria-label="Steps">
      {SN2_STEPS.map((st, i) => (
        <li key={st.title}>
          <button
            className={`reaction-step ${i === stepIndex ? 'is-current' : ''} ${i < stepIndex ? 'is-done' : ''}`}
            onClick={() => seek(STEP_STOPS[i])}
            aria-current={i === stepIndex ? 'step' : undefined}
          >
            <span className="reaction-step-num">{i + 1}</span>
            <span className="sr-only">{st.title}</span>
          </button>
        </li>
      ))}
    </ol>

    {asking !== null ? (
      // The reaction is paused on a question: it takes the place of the step text.
      <div className="lesson-body reaction-question" key={`q${asking}`}>
        <p className="lesson-kicker">Paused for a question</p>
        <QuizBox
          quiz={SN2_CHECKPOINTS[asking].quiz}
          number={asking + 1}
          total={SN2_CHECKPOINTS.length}
          reveals={false}
          label="Predict first"
          prompt="Pick an answer, then watch what happens."
          onDone={props.onAnswered}
        />
        <button className={`btn ${props.answered ? 'btn-primary' : ''} reaction-continue`} onClick={props.onContinue}>
          {props.answered ? 'Watch what happens' : 'Skip and keep playing'} <span className="arrow">→</span>
        </button>
      </div>
    ) : (
      <div className="lesson-body" key={stepIndex}>
        <p className="lesson-kicker">
          Step {stepIndex + 1} of {SN2_STEPS.length}
        </p>
        <h2>{SN2_STEPS[stepIndex].title}</h2>
        <p className="lesson-text">
          <RichText text={SN2_STEPS[stepIndex].text[depth]} />
        </p>
      </div>
    )}

    <dl className="reaction-facts">
      <div>
        <dt>Configuration at C2</dt>
        <dd className="mono">{config ? `(${config})` : 'flat, no R/S'}</dd>
      </div>
      <div>
        <dt>Mechanism</dt>
        <dd>One step (concerted)</dd>
      </div>
    </dl>

    <DepthSwitch depth={depth} onDepth={onDepth} />

    <p className="lesson-note">
      Illustrative motion: starting and ending shapes use standard bond lengths and angles. The path between them
      and the transition-state distances are approximate. The energy diagram shows the shape, not real values.
    </p>
  </section>
  )
})

/* ---------- Small on/off switch ---------- */
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${on ? 'is-on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      {label}
    </button>
  )
}

