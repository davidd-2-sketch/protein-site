/*
  ReactionPage.tsx — animated substitution mechanisms: SN2, SN1, and the two side by side.

  One number drives everything: s, the reaction progress (0 → 1).
    • The 3D scene moves atoms, bonds, and arrows to match s.
    • The left panel shows the step that s is in (with three depth levels).
    • The energy diagram's dot sits at s.
    • The timeline plays s forward, or lets you drag it anywhere.

  The view (SN2 | SN1 | Compare) is kept in the address (?m=sn1, ?m=compare), so it can be linked.

  Layout (laptop):
    ┌──────────── 3D stage ──────────────────────────────┐
    │ [Step panel]         [floating labels] [toggles]   │
    │                                                    │
    │       [ ▶  ───────●─────────────  ¼× ½× 1× ]  [⌁]  │
    └────────────────────────────────────────────────────┘
*/
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidingPill, StepTransition } from '../components/motion'
import { DepthSwitch, QuizBox } from '../lessons/LessonPanel'
import RichText from '../lessons/RichText'
import { useStoredState } from '../lessons/progress'
import type { Depth } from '../lessons/types'
import EnergyDiagram from '../reactions/EnergyDiagram'
import { ReactionScene } from '../reactions/ReactionScene'
import Timeline from '../reactions/Timeline'
import { DURATION_SECONDS, type Speed } from '../reactions/playback'
import { REACTIONS, type Face, type ReactionDef } from '../reactions/reactions'
import ReactionLabels from '../reactions/ReactionLabels'
import '../components/ModeSwitch.css'
import './ReactionPage.css'

type View = 'sn2' | 'sn1' | 'compare'
const VIEWS: View[] = ['sn2', 'sn1', 'compare']

export default function ReactionPage() {
  const [params, setParams] = useSearchParams()
  const m = params.get('m') as View | null
  const view: View = m && VIEWS.includes(m) ? m : 'sn2'
  const setView = useCallback((v: View) => setParams(v === 'sn2' ? {} : { m: v }, { replace: true }), [setParams])
  // key: switching views starts that view fresh (its own scene, timeline at the start).
  return view === 'compare' ? <CompareView key="compare" onView={setView} /> : <SingleReaction key={view} def={REACTIONS[view]} onView={setView} />
}

/* ---------- SN2 | SN1 | Compare switch (same look as Lessons | Explore) ---------- */
function ReactionSwitch({ view, onView }: { view: View; onView: (v: View) => void }) {
  const options: { id: View; label: React.ReactNode }[] = [
    { id: 'sn2', label: <>S<sub>N</sub>2</> },
    { id: 'sn1', label: <>S<sub>N</sub>1</> },
    { id: 'compare', label: 'Compare' },
  ]
  return (
    <div className="mode-switch is-three has-pill" role="radiogroup" aria-label="Reaction">
      <SlidingPill active={view} />
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={view === o.id} className={`mode-btn ${view === o.id ? 'is-active' : ''}`} onClick={() => view !== o.id && onView(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Playback: s advances in real time; optionally pauses at question checkpoints ---------- */
function usePlayback(checkpoints: { at: number }[], questionsOn: boolean) {
  const [s, setS] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(0.5)
  /** Which checkpoint is on screen right now (null = none). */
  const [asking, setAsking] = useState<number | null>(null)
  /** Checkpoints already answered or skipped: playback won't stop at these again. */
  const [passed, setPassed] = useState<number[]>([])
  const [answered, setAnswered] = useState(false)

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
      const hit = questionsOn ? checkpoints.findIndex((c, i) => !passed.includes(i) && sRef.current < c.at && next >= c.at) : -1
      if (hit >= 0) next = checkpoints[hit].at
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
  }, [playing, speed, questionsOn, passed, checkpoints])

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

  return { s, playing, speed, setSpeed, asking: questionsOn ? asking : null, answered, setAnswered, togglePlay, seek, continueAfterAnswer }
}

/** Create a ReactionScene in a div, rebuilt when the mechanism changes. */
function useReactionScene(def: ReactionDef, face: Face) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<ReactionScene | null>(null)
  useEffect(() => {
    const sc = new ReactionScene(hostRef.current!, def.mechanism(face))
    setScene(sc)
    return () => {
      sc.dispose()
      setScene(null)
    }
  }, [def, face])
  return [hostRef, scene] as const
}

/* ===================================================================== single reaction */

function SingleReaction({ def, onView }: { def: ReactionDef; onView: (v: View) => void }) {
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const [showArrows, setShowArrows] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [questionsOn, setQuestionsOn] = useStoredState(`ps.${def.id}.questions`, true)
  /** SN1 only: which face water attacks (−1 = opposite bromide). */
  const [face, setFace] = useState<Face>(-1)

  const p = usePlayback(def.checkpoints, questionsOn)
  const { s, seek } = p
  const [hostRef, scene] = useReactionScene(def, face)

  const stepIndex = Math.max(0, def.steps.findIndex((st) => s >= st.from && s <= st.to + 1e-9))
  const step = def.steps[stepIndex]
  // R/S only changes a few times during the reaction; memo keeps the same value between frames.
  const config = useMemo(() => def.configuration(def.mechanism(face).atoms(s), s), [def, face, s])

  useEffect(() => scene?.setProgress(s), [scene, s])
  useEffect(() => scene?.setOptions({ arrows: showArrows }), [scene, showArrows])

  return (
    <div className="reaction-page">
      <div className="reaction-backdrop" aria-hidden="true" />

      <div className="reaction-stage">
        <div
          ref={hostRef}
          className="reaction-canvas"
          role="img"
          aria-label={`3D animation of ${def.ariaName}, currently at: ${step.title}. Drag to rotate, scroll to zoom.`}
        />
        {scene && showLabels && <ReactionLabels scene={scene} s={s} labels={def.labels} />}
      </div>

      {/* ===== Left: what's happening now ===== */}
      <ReactionPanel
        def={def}
        stepIndex={stepIndex}
        depth={depth}
        config={config}
        face={face}
        onFace={setFace}
        asking={p.asking}
        answered={p.answered}
        onAnswered={() => p.setAnswered(true)}
        onContinue={p.continueAfterAnswer}
        onDepth={setDepth}
        onSeek={seek}
        onView={onView}
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
          playing={p.playing}
          speed={p.speed}
          steps={def.steps}
          marks={questionsOn ? def.checkpoints.map((c) => c.at) : []}
          middle={def.id === 'sn1' ? { at: 0.43, label: 'Carbocation' } : undefined}
          onSeek={seek}
          onTogglePlay={p.togglePlay}
          onSpeed={p.setSpeed}
        />
      </div>
      <div className="reaction-energy">
        <EnergyDiagram s={s} onSeek={seek} energy={def.energy} notes={def.energyNotes} eaAt={def.eaAt} />
      </div>
    </div>
  )
}

/*
  The explanation panel. PERFORMANCE: wrapped in memo(), so during playback (60 updates
  per second) React skips it entirely unless the step, depth level, or R/S label changes.
*/
const ReactionPanel = memo(function ReactionPanel(props: {
  def: ReactionDef
  stepIndex: number
  depth: Depth
  config: 'R' | 'S' | null
  face: Face
  onFace: (f: Face) => void
  /** Index of the question being asked right now, or null. */
  asking: number | null
  answered: boolean
  onAnswered: () => void
  onContinue: () => void
  onDepth: (d: Depth) => void
  onSeek: (s: number) => void
  onView: (v: View) => void
}) {
  const { def, stepIndex, depth, config, onDepth, asking } = props
  const seek = props.onSeek
  return (
    <section className="lesson reaction-panel panel" aria-label="Reaction explanation">
      <ReactionSwitch view={def.id} onView={props.onView} />
      <header className="reaction-head">
        <div className="reaction-tags">
          <span className="tag tag-illustrative">Illustrative motion</span>
        </div>
        <h1>
          S<sub>N</sub>
          {def.number} substitution
        </h1>
        <p className="reaction-equation">{def.equation(props.face)}</p>
      </header>

      <ol className="reaction-steps" aria-label="Steps">
        {def.steps.map((st, i) => (
          <li key={st.title}>
            <button
              className={`reaction-step ${i === stepIndex ? 'is-current' : ''} ${i < stepIndex ? 'is-done' : ''}`}
              onClick={() => seek(def.stepStops[i])}
              aria-current={i === stepIndex ? 'step' : undefined}
            >
              <span className="reaction-step-num">{i + 1}</span>
              <span className="sr-only">{st.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <StepTransition id={asking !== null ? `q${asking}` : `s${stepIndex}`} order={asking !== null ? stepIndex + 0.5 : stepIndex}>
      {asking !== null ? (
        // The reaction is paused on a question: it takes the place of the step text.
        <div className="lesson-body reaction-question">
          <p className="lesson-kicker">Paused for a question</p>
          <QuizBox
            quiz={def.checkpoints[asking].quiz}
            number={asking + 1}
            total={def.checkpoints.length}
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
        <div className="lesson-body">
          <p className="lesson-kicker">
            Step {stepIndex + 1} of {def.steps.length}
          </p>
          <h2>{def.steps[stepIndex].title}</h2>
          <p className="lesson-text">
            <RichText text={def.steps[stepIndex].text[depth]} />
          </p>
        </div>
      )}
      </StepTransition>

      <dl className="reaction-facts">
        <div>
          <dt>Configuration at C{def.stereoAtom.slice(1)}</dt>
          <dd className="mono">{config ? `(${config})` : 'flat, no R/S'}</dd>
        </div>
        <div>
          <dt>Mechanism</dt>
          <dd>{def.summary}</dd>
        </div>
      </dl>

      {def.id === 'sn1' && (
        <div className="face-switch">
          <span id="face-label">Water attacks from</span>
          <div className="speed has-pill" role="radiogroup" aria-labelledby="face-label">
            <SlidingPill active={props.face} />
            {(
              [
                [-1, 'The back', 'Opposite where bromide left: gives (R)'],
                [1, 'The front', 'The side bromide left from: gives (S)'],
              ] as const
            ).map(([f, label, hint]) => (
              <button key={f} role="radio" aria-checked={props.face === f} title={hint} className={`speed-btn ${props.face === f ? 'is-active' : ''}`} onClick={() => props.onFace(f)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <DepthSwitch depth={depth} onDepth={onDepth} />

      <p className="lesson-note">
        Illustrative motion: starting and ending shapes use standard bond lengths and angles. The path between them
        and the transition-state distances are approximate. The energy diagram shows the shape, not real values.
      </p>
    </section>
  )
})

/* ===================================================================== side by side */

const COMPARE_ROWS: [string, string, string][] = [
  ['Steps', 'One (concerted)', 'Two or more, through a carbocation'],
  ['Rate law', 'rate = k[RX][Nu]', 'rate = k[RX]'],
  ['Intermediate', 'None', 'Carbocation (flat, sp²)'],
  ['Stereochemistry', 'Inversion', 'Racemization (often a slight excess of inversion)'],
  ['Best substrates', 'Methyl > 1° > 2°; not 3°', '3° > 2°; not methyl or 1°'],
  ['Nucleophile', 'Strong, often anionic (HO⁻, CN⁻, RS⁻)', 'Weak is fine (H₂O, ROH)'],
  ['Solvent', 'Polar aprotic (acetone, DMSO, DMF)', 'Polar protic (water, alcohols)'],
  ['Rearrangements', 'Never', 'Possible (carbocation shifts)'],
]

function CompareView({ onView }: { onView: (v: View) => void }) {
  const p = usePlayback([], false)
  const { s, seek } = p
  const sn2 = REACTIONS.sn2
  const sn1 = REACTIONS.sn1
  const [host2, scene2] = useReactionScene(sn2, -1)
  const [host1, scene1] = useReactionScene(sn1, -1)
  useEffect(() => scene2?.setProgress(s), [scene2, s])
  useEffect(() => scene1?.setProgress(s), [scene1, s])
  const config2 = useMemo(() => sn2.configuration(sn2.mechanism(-1).atoms(s), s), [sn2, s])
  const config1 = useMemo(() => sn1.configuration(sn1.mechanism(-1).atoms(s), s), [sn1, s])
  const step2 = sn2.steps[Math.max(0, sn2.steps.findIndex((st) => s >= st.from && s <= st.to + 1e-9))]
  const step1 = sn1.steps[Math.max(0, sn1.steps.findIndex((st) => s >= st.from && s <= st.to + 1e-9))]

  return (
    <div className="reaction-page is-compare">
      <div className="reaction-backdrop" aria-hidden="true" />

      <div className="compare-stage">
        {(
          [
            [sn2, host2, scene2, step2, config2],
            [sn1, host1, scene1, step1, config1],
          ] as const
        ).map(([def, host, scene, step, config]) => (
          <div className="compare-half" key={def.id}>
            <div className="compare-title panel">
              <strong>
                S<sub>N</sub>
                {def.number}
              </strong>
              <span>{step.title}</span>
              <span className="mono">C{def.stereoAtom.slice(1)}: {config ? `(${config})` : 'flat'}</span>
            </div>
            <div ref={host} className="reaction-canvas" role="img" aria-label={`3D animation of ${def.ariaName}, currently at: ${step.title}.`} />
            {scene && <ReactionLabels scene={scene} s={s} labels={def.labels} kinds={['element', 'group', 'charge']} />}
            <div className="compare-energy">
              <EnergyDiagram s={s} onSeek={seek} energy={def.energy} notes={def.energyNotes} eaAt={def.eaAt} title={`Sₙ${def.number} energy`} />
            </div>
          </div>
        ))}
      </div>

      <section className="lesson reaction-panel panel" aria-label="SN1 and SN2 compared">
        <ReactionSwitch view="compare" onView={onView} />
        <header className="reaction-head">
          <h1>
            S<sub>N</sub>2 vs S<sub>N</sub>1
          </h1>
          <p className="compare-intro">
            Both play on one timeline, so you can compare the same stage of each. Near the middle, S<sub>N</sub>2 is at its
            only peak, while S<sub>N</sub>1 dips into a valley: the carbocation, an intermediate that S<sub>N</sub>2 never forms.
          </p>
        </header>
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">
                S<sub>N</sub>2
              </th>
              <th scope="col">
                S<sub>N</sub>1
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map(([label, a, b]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{a}</td>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="lesson-note">
          Both need a good leaving group. The shared timeline is not a real clock: it lines up the start, middle, and
          end of each reaction. The S<sub>N</sub>1 view shows water attacking from the back; switch to S<sub>N</sub>1 to
          see the front.
        </p>
      </section>

      <div className="reaction-bottom">
        <Timeline s={s} playing={p.playing} speed={p.speed} steps={[]} middle={null} onSeek={seek} onTogglePlay={p.togglePlay} onSpeed={p.setSpeed} />
      </div>
    </div>
  )
}

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
