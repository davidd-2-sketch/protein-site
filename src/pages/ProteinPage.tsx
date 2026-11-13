/*
  ProteinPage.tsx — the hemoglobin viewer.

  Two ways to use it:
    • Explore (default): just the protein and a small toolbar. Calm on purpose.
    • Lessons (optional): a panel on the left walks through six short lessons.
      Each lesson step controls what the 3D view shows.

  Layout (laptop):
    ┌──────────── full-screen 3D canvas (Mol*) ────────────┐
    │ [Lessons panel]                       [Info panel]   │
    │                 floating labels on atoms             │
    │                 [sequence strip, some steps]         │
    │              [ Ribbon · Atoms · Surface · More ]     │
    └──────────────────────────────────────────────────────┘
*/
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LoadingScreen from '../components/LoadingScreen'
import InfoPanel from '../protein/InfoPanel'
import SequenceStrip from '../protein/SequenceStrip'
import { ALL_CHAINS, CHAINS, SEQUENCES, type ChainId as HbChain } from '../protein/hemoglobin'
import {
  ProteinViewer,
  RAINBOW,
  type ColorMode,
  type PickInfo,
  type RenderStyle,
  type ResidueRef,
  type ViewState,
} from '../protein/ProteinViewer'
import LessonPanel, { type TaskStatus } from '../lessons/LessonPanel'
import OverlayLabels from '../lessons/OverlayLabels'
import { PROTEIN_LESSONS } from '../lessons/proteinLessons'
import { useStoredState } from '../lessons/progress'
import type { Depth, LessonStep } from '../lessons/types'
import ModeSwitch from '../components/ModeSwitch'
import { readLessonLink, rememberPlace } from '../lessons/place'
import { play } from '../sound/sound'
import './ProteinPage.css'

/* The three main styles are always visible; the rest live under "More". */
const MAIN_STYLES: { id: RenderStyle; label: string }[] = [
  { id: 'cartoon', label: 'Ribbon' },
  { id: 'ball-and-stick', label: 'Atoms' },
  { id: 'surface', label: 'Surface' },
]
const MORE_STYLES: { id: RenderStyle; label: string }[] = [
  { id: 'spacefill', label: 'Space-filling' },
  { id: 'line', label: 'Wireframe' },
]
const COLORS: { id: ColorMode; label: string; hint: string }[] = [
  { id: 'chain', label: 'By chain', hint: 'Each of the four chains has its own color' },
  { id: 'secondary', label: 'By shape', hint: 'Helices pink, loops grey' },
  { id: 'rainbow', label: 'Start → end', hint: 'Blue at the start of each chain, red at the end' },
  { id: 'element', label: 'By element', hint: 'Nitrogen blue, oxygen red, sulfur yellow' },
]

/** Turn a lesson step's view into a full ViewState, filling in defaults. */
function lessonView(step: LessonStep): ViewState {
  const v = step.view
  return { ...v, chains: v.chains ?? [], style: v.style ?? 'cartoon', color: v.color ?? 'chain', hemes: v.hemes ?? false }
}

export default function ProteinPage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<ProteinViewer | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  // Explore-mode choices
  const [style, setStyle] = useState<RenderStyle>('cartoon')
  const [color, setColor] = useState<ColorMode>('chain')
  // Spin starts OFF: a spinning model redraws ~60–120×/second and heats up laptops.
  // When still, the 3D view only redraws when something changes.
  const [spin, setSpin] = useState(false)

  // Lessons (panel visibility, depth and finished lessons are remembered on this device)
  const [lessonsOpen, setLessonsOpen] = useStoredState('ps.lessonsOpen', true)
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const [completed, setCompleted] = useStoredState<string[]>('ps.completedLessons', [])
  // Opened from a "continue" link? Start at that lesson and step.
  const [link] = useState(() => readLessonLink(PROTEIN_LESSONS.map((l) => l.id)))
  const [lessonId, setLessonId] = useState<string | null>(link?.lessonId ?? null)
  const [stepIndex, setStepIndex] = useState(link?.step ?? 0)
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('waiting')

  const [pick, setPick] = useState<PickInfo | null>(null)
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)

  const lesson = PROTEIN_LESSONS.find((l) => l.id === lessonId) ?? null
  const step = lesson ? (lesson.steps[stepIndex] ?? null) : null

  useEffect(() => {
    if (link) setLessonsOpen(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lesson && step) rememberPlace({ module: 'protein', lessonId: lesson.id, lessonTitle: lesson.title, step: stepIndex, steps: lesson.steps.length })
  }, [lesson, step, stepIndex])

  const view: ViewState = useMemo(
    () => (step ? lessonView(step) : { chains: ALL_CHAINS, style, color, hemes: true }),
    [step, style, color],
  )

  /* ---------- Create the viewer once ---------- */
  useEffect(() => {
    let disposed = false
    let v: ProteinViewer | null = null
    ;(async () => {
      try {
        v = await ProteinViewer.create(hostRef.current!)
        if (disposed) return v.dispose()
        await v.load('/structures/4hhb.bcif')
        if (disposed) return
        v.onHover(setHoverLabel)
        // Development only: lets automated tests find atoms on screen. Not in the published site.
        if (import.meta.env.DEV) (window as unknown as { __viewer: ProteinViewer }).__viewer = v
        setViewer(v)
        setStatus('ready')
      } catch (err) {
        console.error(err)
        if (!disposed) setStatus('error')
      }
    })()
    return () => {
      disposed = true
      v?.dispose()
      setViewer(null)
    }
  }, [])

  /* ---------- Clicks: show info, and check lesson tasks ---------- */
  // The click handler is created once, so it reads the current step through a ref.
  const stepRef = useRef(step)
  const taskStatusRef = useRef(taskStatus)
  useEffect(() => {
    stepRef.current = step
    taskStatusRef.current = taskStatus
  }, [step, taskStatus])
  useEffect(() => {
    if (!viewer) return
    return viewer.onPick((p) => {
      setPick(p)
      if (!p) return
      const task = stepRef.current?.task
      if (task && taskStatusRef.current !== 'correct') {
        // A lesson task is waiting: this click is an answer, so it gets right/wrong feedback.
        const ok = task.check(p)
        play(ok ? 'correct' : 'wrong')
        setTaskStatus(ok ? 'correct' : 'wrong')
      } else {
        play('pick') // a soft glassy tap: "you selected something"
      }
    })
  }, [viewer])

  /* ---------- Rebuild the 3D scene whenever the view changes ---------- */
  // The camera only moves when the *step* (or mode) changes, not when style/color change.
  const cameraKey = lesson ? `${lesson.id}:${stepIndex}` : 'explore'
  const framedKey = useRef<string | null>(null)
  useEffect(() => {
    if (!viewer) return
    let cancelled = false
    // Dim the canvas briefly while the new view is built (a soft crossfade).
    // We toggle the class directly: it's purely visual, so no React re-render is needed.
    const host = hostRef.current
    host?.classList.add('is-switching')
    viewer.setView(view).then(() => {
      if (cancelled) return
      host?.classList.remove('is-switching')
      if (framedKey.current === cameraKey) return
      const firstFrame = framedKey.current === null
      framedKey.current = cameraKey
      const cam = step?.camera
      // The very first framing is instant: there's nothing to animate from yet.
      const duration = firstFrame ? 0 : 900
      if (cam && cam !== 'all') viewer.focusResidues(cam.residues, cam.radius ?? 6, duration)
      else if (cam === 'all' || !step || firstFrame) viewer.resetCamera(duration)
    })
    return () => {
      cancelled = true
    }
  }, [viewer, view, cameraKey, step])

  useEffect(() => {
    viewer?.setSpin(spin)
  }, [spin, viewer])

  /* ---------- Lesson navigation ---------- */
  const markDone = useCallback(
    (id: string) => {
      if (!completed.includes(id)) setCompleted([...completed, id])
    },
    [completed, setCompleted],
  )

  const openLesson = useCallback(
    (id: string) => {
      if (lesson) markDone(lesson.id) // moving on from a finished lesson
      setLessonId(id)
      setStepIndex(0)
      setTaskStatus('waiting')
      setPick(null)
      setSpin(false) // a still model is easier to click and read
    },
    [lesson, markDone],
  )

  const goToStep = useCallback((i: number) => {
    setStepIndex(i)
    setTaskStatus('waiting')
    setPick(null)
  }, [])

  const exitLesson = useCallback(() => {
    if (lesson && stepIndex === lesson.steps.length - 1) markDone(lesson.id)
    setLessonId(null)
    setPick(null)
  }, [lesson, stepIndex, markDone])

  const focusResidue = useCallback(
    (r: ResidueRef) => {
      setSpin(false)
      viewer?.focusResidues([r], 5)
    },
    [viewer],
  )

  /* Keyboard: ← → move through lesson steps, R resets the camera, Esc closes details. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (lesson && e.key === 'ArrowRight' && stepIndex < lesson.steps.length - 1) goToStep(stepIndex + 1)
      if (lesson && e.key === 'ArrowLeft' && stepIndex > 0) goToStep(stepIndex - 1)
      if (e.key.toLowerCase() === 'r') viewer?.resetCamera()
      if (e.key === 'Escape') setPick(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lesson, stepIndex, goToStep, viewer])

  const ready = status === 'ready'

  return (
    <div className={`protein-page ${pick ? 'has-pick' : ''} ${lessonsOpen ? 'has-lessons' : ''}`}>
      <div className="protein-backdrop" aria-hidden="true" />
      {/* The "stage" holds the 3D canvas and its floating labels. When the lessons panel is open,
          the stage starts to the right of it, so the panel never covers the model. */}
      <div className="stage">
        <div
          ref={hostRef}
          className={`protein-canvas ${ready ? 'is-ready' : ''}`}
          aria-label="3D model of hemoglobin. Drag to rotate, scroll to zoom, click a part for details."
          role="img"
        />
        {ready && step && <OverlayLabels viewer={viewer} labels={step.labels ?? []} lines={step.lines ?? []} />}
      </div>

      {status === 'loading' && <LoadingScreen label="Loading hemoglobin" />}
      {status === 'error' && (
        <div className="protein-error panel" role="alert">
          <h2>The 3D viewer couldn't start</h2>
          <p>Your browser may have 3D graphics (WebGL) turned off. Try another browser, or update this one.</p>
        </div>
      )}

      {/* ===== Left: optional lessons ===== */}
      {lessonsOpen ? (
        <LessonPanel
          listTitle="Learn with hemoglobin"
          listBlurb="Six short lessons, from one amino acid to a whole working protein."
          lessons={PROTEIN_LESSONS}
          lesson={lesson}
          stepIndex={stepIndex}
          depth={depth}
          taskStatus={taskStatus}
          completed={completed}
          onDepth={setDepth}
          onOpen={openLesson}
          onStep={goToStep}
          onExit={exitLesson}
          onClose={() => {
            exitLesson() // Explore always shows the whole protein, not a lesson's view
            setLessonsOpen(false)
          }}
        />
      ) : (
        <div className="title-card">
          <ModeSwitch mode="explore" onChange={() => setLessonsOpen(true)} />
          <p className="title-card-name">Hemoglobin</p>
          <p className="title-card-meta">
            <span className="tag tag-experimental">Experimental structure</span>
            <a href="https://www.rcsb.org/structure/4HHB" target="_blank" rel="noreferrer" className="mono">
              PDB 4HHB ↗
            </a>
          </p>
          <p className="title-card-hint">Click any part of the protein to learn what it is.</p>
        </div>
      )}

      {/* ===== Right: what you clicked ===== */}
      {pick && <InfoPanel pick={pick} onClose={() => setPick(null)} onFocus={focusResidue} />}

      {/* ===== Sequence strip (some lesson steps) ===== */}
      {ready && step?.showSequence && (
        <div className="sequence-wrap">
          <SequenceStrip
            chain="A"
            sequence={SEQUENCES.alpha}
            onHover={(r) => viewer?.highlightResidue(r)}
            onSelect={focusResidue}
          />
        </div>
      )}

      {/* ===== Bottom toolbar ===== */}
      <div className="protein-bottom">
        <div className="toolbar panel" role="toolbar" aria-label="View controls">
          {!lesson && (
            <>
              <div className="segmented" role="radiogroup" aria-label="Style">
                {MAIN_STYLES.map((o) => (
                  <button
                    key={o.id}
                    role="radio"
                    aria-checked={style === o.id}
                    className={`segmented-btn ${style === o.id ? 'is-active' : ''}`}
                    onClick={() => setStyle(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <MoreMenu style={style} color={color} onStyle={setStyle} onColor={setColor} />
              <span className="toolbar-divider" aria-hidden="true" />
            </>
          )}
          <button className="tool-btn" onClick={() => viewer?.resetCamera()} title="Reset view (R)">
            Reset view
          </button>
          <button className={`tool-btn ${spin ? 'is-on' : ''}`} aria-pressed={spin} onClick={() => setSpin((s) => !s)}>
            Spin
          </button>
        </div>
      </div>

      <div className="readout">
        <p className="readout-hover mono">{hoverLabel ?? 'Drag to rotate · scroll to zoom · click for details'}</p>
        <Legend view={view} />
      </div>
    </div>
  )
}

/* ---------- "More" menu: extra styles and color options ---------- */

function MoreMenu(props: {
  style: RenderStyle
  color: ColorMode
  onStyle: (s: RenderStyle) => void
  onColor: (c: ColorMode) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const extraStyleActive = MORE_STYLES.some((s) => s.id === props.style)

  return (
    <div className="more" ref={ref}>
      <button
        className={`tool-btn ${open || extraStyleActive ? 'is-on' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        More ▾
      </button>
      {open && (
        <div className="more-menu panel">
          <p className="more-heading">More styles</p>
          {MORE_STYLES.map((s) => (
            <button
              key={s.id}
              className={`more-item ${props.style === s.id ? 'is-active' : ''}`}
              aria-pressed={props.style === s.id}
              onClick={() => props.onStyle(s.id)}
            >
              {s.label}
            </button>
          ))}
          <p className="more-heading">Color</p>
          {COLORS.map((c) => (
            <button
              key={c.id}
              className={`more-item ${props.color === c.id ? 'is-active' : ''}`}
              aria-pressed={props.color === c.id}
              onClick={() => props.onColor(c.id)}
            >
              {c.label}
              <span className="more-hint">{c.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Color key for whatever is on screen. Every swatch has a text label. ---------- */

function Legend({ view }: { view: ViewState }) {
  const items: { label: string; swatch: string }[] = []
  if (view.chains.length && (view.color === 'chain' || view.color === 'element')) {
    view.chains.forEach((c) => items.push({ label: `${CHAINS[c as HbChain].label} chain`, swatch: CHAINS[c as HbChain].color }))
  }
  if (view.chains.length && view.color === 'secondary') {
    items.push({ label: 'α-helix', swatch: '#e879c9' }, { label: 'Loop', swatch: '#b4b9d6' })
  }
  if (view.chains.length && view.color === 'rainbow') {
    items.push({ label: 'Start → end of chain', swatch: `linear-gradient(90deg, ${RAINBOW.join(',')})` })
  }
  if (view.detail?.length || view.color === 'element') {
    if (view.detail?.length) items.push({ label: 'Carbon', swatch: '#aab1d6' })
    items.push({ label: 'Nitrogen', swatch: '#3050f8' }, { label: 'Oxygen', swatch: '#ff0d0d' })
  }
  if (view.hemes) items.push({ label: 'Heme', swatch: '#c9cde6' })
  if (view.hydrophobic) items.push({ label: 'Oily (hydrophobic) side chain', swatch: '#ff9a3d' })
  if (view.highlights?.length) items.push({ label: 'Highlighted', swatch: '#5ee4ff' })

  return (
    <ul className="legend-list" aria-label="Color key">
      {items.map((i) => (
        <li key={i.label}>
          <span className={`legend-chip ${i.swatch.startsWith('linear') ? 'is-wide' : ''}`} style={{ background: i.swatch }} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
