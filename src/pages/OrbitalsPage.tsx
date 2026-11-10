/*
  OrbitalsPage.tsx — atomic orbitals, hybridization, and bonding.

  Like the Shapes page, two modes:
    • Lessons: three guided lessons with predict-then-reveal questions.
    • Explore: pick any orbital, hybrid set, or bond to view, with cutaway and axes.

  The surfaces are computed live from the real hydrogen-atom wavefunctions
  (see orbitals/wavefunctions.ts), each enclosing 90% of the electron probability.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import LessonPanel from '../lessons/LessonPanel'
import RichText from '../lessons/RichText'
import { useStoredState } from '../lessons/progress'
import type { Depth } from '../lessons/types'
import { useLessons } from '../lessons/useLessons'
import { ORBITAL_LESSONS } from '../orbitals/lessons'
import { OrbitalScene, type OrbitalView } from '../orbitals/OrbitalScene'
import { BONDS, ORBITALS } from '../orbitals/wavefunctions'
import ModeSwitch from '../components/ModeSwitch'
import AxisLabels from '../orbitals/AxisLabels'
import './OrbitalsPage.css'

type ExploreChoice = { label: string; view: OrbitalView }

const EXPLORE: { group: string; items: ExploreChoice[] }[] = [
  {
    group: 'Atomic orbitals',
    items: ['1s', '2s', '2px', '2py', '2pz', '3s', '3pz', '3dxy', '3dxz', '3dyz', '3dx2y2', '3dz2'].map((id) => ({
      label: ORBITALS[id].label,
      view: { kind: 'orbital', id },
    })),
  },
  {
    group: 'Hybrids',
    items: [
      { label: 'sp³', view: { kind: 'hybrids', set: 'sp3' } },
      { label: 'sp²', view: { kind: 'hybrids', set: 'sp2', leftover: true } },
      { label: 'sp', view: { kind: 'hybrids', set: 'sp', leftover: true } },
      { label: 'One sp³', view: { kind: 'hybrids', set: 'sp3', only: 0 } },
    ],
  },
  {
    group: 'Bonds',
    items: Object.entries(BONDS).map(([id, b]) => ({ label: b.label, view: { kind: 'bond', id } })),
  },
]

/** What to tell students about an atomic orbital: its quantum numbers and nodes. */
function orbitalFacts(view: OrbitalView) {
  if (view.kind !== 'orbital') return null
  const o = ORBITALS[view.id]
  return { label: o.label, n: o.n, l: o.l, angular: o.l, radial: o.n - o.l - 1 }
}

export default function OrbitalsPage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<OrbitalScene | null>(null)
  const [busy, setBusy] = useState(true)
  const [mode, setMode] = useStoredState<'lessons' | 'explore'>('ps.orbitals.mode', 'lessons')
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const L = useLessons(ORBITAL_LESSONS, 'orbitals')
  // Arriving from a "continue" link always shows the lesson.
  useEffect(() => {
    if (L.fromLink) setMode('lessons')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [explore, setExplore] = useState<ExploreChoice>(EXPLORE[0].items[0])
  const [cutaway, setCutaway] = useState(false)
  const [axes, setAxes] = useState(true)
  const [spin, setSpin] = useState(false)

  const inLesson = mode === 'lessons' && L.step !== null
  const lessonView = L.step ? (L.revealed && L.step.revealView ? L.step.revealView : L.step.view) : null
  const view: OrbitalView & { axes?: boolean } = useMemo(
    () => (inLesson && lessonView ? lessonView : { ...explore.view, cutaway }),
    [inLesson, lessonView, explore, cutaway],
  )
  const showAxes = inLesson ? !!view.axes : axes
  const facts = orbitalFacts(view)

  /* ---------- 3D scene ---------- */
  useEffect(() => {
    const sc = new OrbitalScene(hostRef.current!, setBusy)
    setScene(sc)
    return () => {
      sc.dispose()
      setScene(null)
    }
  }, [])
  useEffect(() => void scene?.setView(view), [scene, view])
  useEffect(() => scene?.setAxes(showAxes), [scene, showAxes])
  useEffect(() => scene?.stage.setAutoRotate(spin), [scene, spin])

  return (
    <div className="orb-page">
      <div className="orb-backdrop" aria-hidden="true" />
      <div className="orb-stage">
        <div ref={hostRef} className="orb-canvas" role="img" aria-label="3D orbital surface. Drag to rotate, scroll to zoom." />
        {scene && showAxes && <AxisLabels scene={scene} />}
        {busy && (
          <p className="orb-busy" role="status">
            Computing surface…
          </p>
        )}
      </div>

      {/* ===== Left: lessons, or the explore picker ===== */}
      {mode === 'lessons' ? (
        <LessonPanel
          listTitle="Learn orbitals"
          listBlurb="Three short lessons: orbital shapes and nodes, hybridization, and how overlap makes bonds."
          lessons={L.lessons}
          lesson={L.lesson}
          stepIndex={L.stepIndex}
          depth={depth}
          taskStatus={L.taskStatus}
          completed={L.completed}
          onDepth={setDepth}
          onOpen={L.open}
          onStep={L.goTo}
          onExit={L.exit}
          onClose={() => setMode('explore')}
          onQuizDone={L.onQuizDone}
        />
      ) : (
        <section className="lesson orb-panel panel" aria-label="Choose what to view">
          <ModeSwitch mode="explore" onChange={() => setMode('lessons')} />
          <header className="orb-panel-head">
            <h1>Orbitals</h1>
          </header>
          {EXPLORE.map((g) => (
            <div key={g.group} className="orb-group">
              <p className="orb-group-label">{g.group}</p>
              <div className="orb-choices">
                {g.items.map((item) => (
                  <button
                    key={item.label}
                    className={`chip ${explore.label === item.label ? 'is-active' : ''}`}
                    aria-pressed={explore.label === item.label}
                    onClick={() => setExplore(item)}
                  >
                    <RichText text={item.label} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {facts && (
            <dl className="orb-facts">
              <div>
                <dt>Orbital</dt>
                <dd>
                  <RichText text={facts.label} />
                </dd>
              </div>
              <div>
                <dt>n, l</dt>
                <dd className="mono">
                  {facts.n}, {facts.l}
                </dd>
              </div>
              <div>
                <dt>Nodes</dt>
                <dd>
                  {facts.radial} spherical + {facts.angular} angular = {facts.radial + facts.angular}
                </dd>
              </div>
            </dl>
          )}
          <p className="lesson-note">
            Surfaces are computed from hydrogen’s exact wavefunctions and enclose 90% of the electron probability.
            Orbitals of other atoms have the same shapes but different sizes. Bond surfaces use a simple model (adding
            or subtracting atomic orbitals).
          </p>
        </section>
      )}

      {/* ===== Top-right: toggles + phase legend ===== */}
      <div className="orb-toggles panel" role="group" aria-label="Show or hide">
        {!inLesson && <Toggle label="Cutaway" on={cutaway} onChange={setCutaway} />}
        {!inLesson && <Toggle label="Axes" on={axes} onChange={setAxes} />}
        <Toggle label="Spin" on={spin} onChange={setSpin} />
        <button className="tool-btn" onClick={() => scene?.stage.fit(4, true)}>
          Reset view
        </button>
      </div>
      <ul className="orb-legend panel" aria-label="Phase key">
        <li>
          <span className="swatch plus" aria-hidden="true" /> + phase
        </li>
        <li>
          <span className="swatch minus" aria-hidden="true" /> − phase (mesh pattern)
        </li>
      </ul>
    </div>
  )
}

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

