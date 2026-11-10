/*
  VseprPage.tsx — Molecular shapes (VSEPR).

  Two modes, switched from the left panel:
    • Lessons: four short lessons that teach VSEPR step by step, with
      predict-then-reveal questions and builder tasks.
    • Explore: build any shape (+/− bonds and lone pairs) or pick a real molecule
      to compare its MEASURED angles with the ideal ones.

  One function, sceneFor(), turns "what should be shown" into a description the
  3D scene understands, whether that comes from a lesson step or from exploring.
*/
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import LessonPanel, { DepthSwitch } from '../lessons/LessonPanel'
import RichText from '../lessons/RichText'
import { useStoredState } from '../lessons/progress'
import type { Depth } from '../lessons/types'
import { useLessons } from '../lessons/useLessons'
import { VSEPR_LESSONS, type VseprView } from '../vsepr/lessons'
import { MOLECULES, type Molecule } from '../vsepr/molecules'
import { HYBRID_FOOTNOTE, SLOTS, idealDomains, isValid, shapeFor, type ShapeInfo } from '../vsepr/shapes'
import { VseprScene, type SceneState } from '../vsepr/VseprScene'
import ModeSwitch from '../components/ModeSwitch'
import './VseprPage.css'

/** "109.5°" from a 3D angle; drops a trailing ".0". */
const fmtAngle = (deg: number) => `${deg.toFixed(1).replace(/\.0$/, '')}°`
const byFormula = (f?: string) => MOLECULES.find((m) => m.formula === f) ?? null

/** An ideal shape with given counts (generic A/X atoms unless elements are given). */
function idealState(bonds: number, lone: number, central = 'A', ligand = 'X'): SceneState {
  const domains = idealDomains(bonds, lone)
  const shape = shapeFor(bonds, lone)
  const bondDirs = domains.filter((d) => d.kind === 'bond').map((d) => d.dir)
  // Lone pairs squeeze bond angles, so for those shapes the drawn (ideal) angle is an upper
  // limit: label it "< 109.5°" rather than "109.5°" so nobody memorizes the wrong number.
  const squeezed = /less|squeezed/.test(shape.idealAngles)
  const arcs = shape.arcs.map(([i, j]): [number, number, string] => {
    const [a, b] = [bondDirs[i], bondDirs[j]]
    const angle = (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI
    return [i, j, `${squeezed ? '< ' : ''}${fmtAngle(angle)}`]
  })
  return { central, ligand, order: 1, domains, arcs }
}

const moleculeState = (m: Molecule): SceneState => ({ central: m.central, ligand: m.ligand, order: m.order, domains: m.domains, arcs: m.arcs })

/** What the 3D view shows, plus the shape facts that go with it. */
function sceneFor(view: VseprView, builder: { bonds: number; lone: number } | null) {
  const molecule = byFormula(view.molecule)
  // Builder steps show the student's current counts.
  if (builder) {
    return { state: idealState(builder.bonds, builder.lone, view.central, view.ligand), shape: shapeFor(builder.bonds, builder.lone), molecule: null, mystery: false }
  }
  const bonds = molecule?.bonds ?? view.bonds ?? 4
  const lone = molecule?.lone ?? view.lone ?? 0
  const central = molecule?.central ?? view.central ?? 'A'
  const ligand = molecule?.ligand ?? view.ligand ?? 'X'
  if (view.mystery) {
    // Only the central atom; optionally the empty dashed outline of where groups could go.
    const state: SceneState = { central, ligand, order: 1, domains: [], arcs: [], hullDirs: view.hull ? SLOTS[bonds + lone] : undefined }
    return { state, shape: shapeFor(bonds, lone), molecule, mystery: true }
  }
  return { state: molecule ? moleculeState(molecule) : idealState(bonds, lone, central, ligand), shape: shapeFor(bonds, lone), molecule, mystery: false }
}

export default function VseprPage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<VseprScene | null>(null)
  const [mode, setMode] = useStoredState<'lessons' | 'explore'>('ps.vsepr.mode', 'lessons')
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const L = useLessons(VSEPR_LESSONS, 'vsepr')

  // Explore-mode choices
  const [exploreView, setExploreView] = useState<VseprView>({ molecule: 'CH₄' })
  // Builder counts (explore mode, and lesson steps with a builder task). They're stored together
  // with the step they belong to, so opening a new step automatically starts from that step's shape.
  const [countsState, setCountsState] = useState({ key: 'explore', bonds: 4, lone: 0 })
  const [showHull, setShowHull] = useState(false)
  const [showArcs, setShowArcs] = useState(true)
  const [spin, setSpin] = useState(false)

  const inLesson = mode === 'lessons' && L.step !== null
  const lessonView = L.step ? (L.revealed && L.step.revealView ? L.step.revealView : L.step.view) : null
  const view: VseprView = inLesson && lessonView ? lessonView : exploreView
  const building = inLesson ? !!view.build : !view.molecule
  const hull = inLesson ? !!view.hull : showHull

  const stepKey = inLesson ? `${L.lesson?.id}:${L.stepIndex}` : 'explore'
  const stepStart = () => {
    const m = byFormula(view.molecule)
    return { bonds: m?.bonds ?? view.bonds ?? 4, lone: m?.lone ?? view.lone ?? 0 }
  }
  const counts = countsState.key === stepKey ? countsState : stepStart()
  const setCounts = (c: { bonds: number; lone: number }) => setCountsState({ key: stepKey, ...c })

  const { state, shape, molecule, mystery } = useMemo(() => sceneFor(view, building ? counts : null), [view, building, counts])

  /* ---------- 3D scene ---------- */
  useEffect(() => {
    const sc = new VseprScene(hostRef.current!)
    setScene(sc)
    return () => {
      sc.dispose()
      setScene(null)
    }
  }, [])
  useEffect(() => scene?.setState(state), [scene, state])
  useEffect(() => scene?.setOptions({ hull, arcs: showArcs }), [scene, hull, showArcs])
  useEffect(() => scene?.stage.setAutoRotate(spin), [scene, spin])

  /* ---------- Builder ---------- */
  const change = (db: number, dl: number) => {
    const next = { bonds: counts.bonds + db, lone: counts.lone + dl }
    if (!isValid(next.bonds, next.lone)) return
    setCounts(next)
    if (!inLesson) setExploreView({})
    L.report(next) // checks the lesson step's builder task, if there is one
  }
  // Clicking +/− while viewing a real molecule in explore mode starts building from that shape.
  const startBuildingFrom = (bonds: number, lone: number) => {
    setCounts({ bonds, lone })
    setExploreView({})
  }

  return (
    <div className="vsepr-page">
      <div className="vsepr-backdrop" aria-hidden="true" />
      <div className="vsepr-stage">
        <div
          ref={hostRef}
          className="vsepr-canvas"
          role="img"
          aria-label={
            mystery
              ? 'A central atom. Predict the shape, then the model will appear.'
              : `3D model: ${molecule ? molecule.name : 'a central atom'} with ${shape.bonds} bonded atoms and ${shape.lone} lone pairs, ${shape.name} shape. Drag to rotate.`
          }
        />
        {scene && <SceneLabelsOverlay scene={scene} />}
        {/* A compact name tag for the shape on screen (lesson mode has no facts panel). */}
        {inLesson && (
          <p className="shape-tag">
            {mystery ? (
              <>Predict the shape</>
            ) : (
              <>
                {molecule ? `${molecule.formula} · ` : ''}
                {shape.name} · AX<sub>{shape.bonds}</sub>
                {shape.lone > 0 && (
                  <>
                    E<sub>{shape.lone}</sub>
                  </>
                )}
              </>
            )}
          </p>
        )}
      </div>

      {/* ===== Left: lessons or the facts panel ===== */}
      {mode === 'lessons' ? (
        <LessonPanel
          listTitle="Learn VSEPR"
          listBlurb="Four short lessons: why molecules have shapes, what lone pairs do, and how to predict any shape."
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
        <ShapePanel shape={shape} molecule={molecule} depth={depth} onDepth={setDepth} onLessons={() => setMode('lessons')} />
      )}

      {/* ===== Top-right toggles ===== */}
      <div className="vsepr-toggles panel" role="group" aria-label="Show or hide">
        <Toggle label="Angles" on={showArcs} onChange={setShowArcs} />
        {!inLesson && <Toggle label="Electron geometry" on={showHull} onChange={setShowHull} />}
        <Toggle label="Spin" on={spin} onChange={setSpin} />
        <button className="tool-btn" onClick={() => scene?.stage.fit(3.2, true)}>
          Reset view
        </button>
      </div>

      {/* ===== Bottom: molecule chips (explore) + builder (explore, or lesson tasks) ===== */}
      <div className="vsepr-bottom">
        {!inLesson && (
          <div className="chips" role="group" aria-label="Real molecules">
            {MOLECULES.map((m) => (
              <button
                key={m.formula}
                className={`chip ${exploreView.molecule === m.formula ? 'is-active' : ''}`}
                aria-pressed={exploreView.molecule === m.formula}
                onClick={() => setExploreView({ molecule: m.formula })}
                title={m.name}
              >
                {m.formula}
              </button>
            ))}
          </div>
        )}

        {(!inLesson || view.build) && (
          <Builder
            bonds={building ? counts.bonds : shape.bonds}
            lone={building ? counts.lone : shape.lone}
            onChange={(db, dl) => {
              if (!building) startBuildingFrom(shape.bonds + db, shape.lone + dl)
              else change(db, dl)
            }}
          />
        )}
      </div>
    </div>
  )
}

/* ---------- Builder: +/− bonded atoms and lone pairs ---------- */

function Builder({ bonds, lone, onChange }: { bonds: number; lone: number; onChange: (db: number, dl: number) => void }) {
  return (
    <div className="builder panel" role="group" aria-label="Build a shape">
      <Stepper label="Bonded atoms" value={bonds} onMinus={() => onChange(-1, 0)} onPlus={() => onChange(1, 0)} canMinus={isValid(bonds - 1, lone)} canPlus={isValid(bonds + 1, lone)} />
      <span className="builder-divider" aria-hidden="true" />
      <Stepper label="Lone pairs" value={lone} onMinus={() => onChange(0, -1)} onPlus={() => onChange(0, 1)} canMinus={isValid(bonds, lone - 1)} canPlus={isValid(bonds, lone + 1)} lone />
      <span className="builder-divider" aria-hidden="true" />
      <p className="builder-sn">
        <span className="builder-sn-value mono">{bonds + lone}</span>
        <span>
          electron
          <br />
          groups
        </span>
      </p>
    </div>
  )
}

/* ---------- Left panel in explore mode: what this shape is and why ---------- */

const ShapePanel = memo(function ShapePanel(props: {
  shape: ShapeInfo
  molecule: Molecule | null
  depth: Depth
  onDepth: (d: Depth) => void
  onLessons: () => void
}) {
  const { shape, molecule, depth } = props
  const measured = molecule?.arcs.map((a) => a[2]).join(' and ')
  return (
    <section className="lesson vsepr-panel panel" aria-label="Shape explanation">
      <ModeSwitch mode="explore" onChange={props.onLessons} />
      <header className="vsepr-panel-head">
        <div>
          <p className="lesson-kicker">{molecule ? `${molecule.name} · ${molecule.formula}` : 'Build your own'}</p>
          <h1 className="vsepr-title">{shape.name}</h1>
          <p className="axe mono" aria-label={`A X ${shape.bonds} E ${shape.lone}`}>
            AX<sub>{shape.bonds}</sub>
            {shape.lone > 0 && (
              <>
                E<sub>{shape.lone}</sub>
              </>
            )}
          </p>
        </div>
      </header>

      <p className="vsepr-idea">
        <RichText text="[[VSEPR]]: [[electron groups|electron group]] around a central atom push each other as far apart as possible." />
      </p>

      <dl className="vsepr-facts">
        <div>
          <dt>
            <RichText text="[[Electron groups|steric number]]" />
          </dt>
          <dd>
            {shape.bonds + shape.lone} ({shape.bonds} bonded, {shape.lone} lone pair{shape.lone === 1 ? '' : 's'})
          </dd>
        </div>
        <div>
          <dt>
            <RichText text="[[Electron geometry|electron geometry]]" />
          </dt>
          <dd>{shape.electronGeometry}</dd>
        </div>
        <div>
          <dt>
            <RichText text="[[Molecular shape|molecular shape]]" />
          </dt>
          <dd>{shape.name}</dd>
        </div>
        <div>
          <dt>Ideal angle{/,|and/.test(shape.idealAngles) ? 's' : ''}</dt>
          <dd>{shape.idealAngles}</dd>
        </div>
        {molecule && (
          <div>
            <dt>Measured</dt>
            <dd>
              {measured}
              <span className={`confidence is-${molecule.confidence}`}>
                {molecule.confidence === 'exact' ? 'measured' : molecule.confidence === 'approx' ? 'approx.' : 'uncertain'}
              </span>
            </dd>
          </div>
        )}
        <div>
          <dt>
            <RichText text="[[Hybridization|hybridization]]" />
          </dt>
          <dd>{shape.hybridization}</dd>
        </div>
      </dl>

      <div className="lesson-body" key={`${shape.bonds}-${shape.lone}`}>
        <p className="lesson-text">
          <RichText text={shape.text[depth]} />
        </p>
      </div>

      <DepthSwitch depth={depth} onDepth={props.onDepth} />

      <div className="lesson-note">
        {molecule?.note && <p>{molecule.note}</p>}
        {shape.hybridization.includes('*') && <p>{HYBRID_FOOTNOTE}</p>}
        <p>
          Angles for real molecules are measured values (≈ means sources agree only to about a degree). Bond lengths
          are approximate, and lone-pair clouds are drawn for teaching: lone pairs can't be seen directly.
        </p>
      </div>
    </section>
  )
})

/* ---------- Small controls ---------- */

function Stepper(props: {
  label: string
  value: number
  onMinus: () => void
  onPlus: () => void
  canMinus: boolean
  canPlus: boolean
  lone?: boolean
}) {
  return (
    <div className="stepper" role="group" aria-label={props.label}>
      <span className="stepper-label">
        {props.lone ? <span className="dot-lone" aria-hidden="true" /> : <span className="dot-bond" aria-hidden="true" />}
        {props.label}
      </span>
      <button className="stepper-btn" onClick={props.onMinus} disabled={!props.canMinus} aria-label={`Fewer ${props.label.toLowerCase()}`}>
        −
      </button>
      <span className="stepper-value mono" aria-live="polite">
        {props.value}
      </span>
      <button className="stepper-btn" onClick={props.onPlus} disabled={!props.canPlus} aria-label={`More ${props.label.toLowerCase()}`}>
        +
      </button>
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

/* ---------- HTML labels for atoms and angles, moved after every redraw ---------- */

function SceneLabelsOverlay({ scene }: { scene: VseprScene }) {
  const [signature, setSignature] = useState('')
  const atomRefs = useRef<(HTMLSpanElement | null)[]>([])
  const arcRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const place = () => {
      const { atoms, arcs } = scene.getLabels()
      // Re-render the list only when WHICH labels exist changes (rare); otherwise just move them.
      const sig = atoms.map((a) => a.text).join(',') + '|' + arcs.map((a) => a.text).join(',')
      setSignature((prev) => (prev === sig ? prev : sig))
      atoms.forEach((a, i) => move(atomRefs.current[i], scene.stage.project(a.position)))
      arcs.forEach((a, i) => move(arcRefs.current[i], scene.stage.project(a.position)))
    }
    place()
    return scene.stage.onAfterRender(place)
  }, [scene, signature])

  const { atoms, arcs } = scene.getLabels()
  return (
    <div className="overlay" aria-hidden="true">
      {atoms.map((a, i) => (
        <span key={`a${i}`} ref={(el) => void (atomRefs.current[i] = el)} className="v-atom">
          {a.text}
        </span>
      ))}
      {arcs.map((a, i) => (
        <span key={`r${i}`} ref={(el) => void (arcRefs.current[i] = el)} className="v-angle">
          {a.text}
        </span>
      ))}
    </div>
  )
}

function move(el: HTMLElement | null, p: { x: number; y: number; behind: boolean }) {
  if (!el) return
  el.style.visibility = p.behind ? 'hidden' : 'visible'
  el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`
}
