/*
  StereoPage.tsx — Stereochemistry: chirality, R and S, enantiomers and diastereomers,
  meso compounds, and Fischer projections.

  Part 1 (this version): five lessons. The 3D view (StereoScene) animates each step: turning a
  molecule so its lowest-priority group points away, drawing the 1 → 2 → 3 arrow, showing and
  overlaying the mirror image, swapping groups, and turning a bond to reveal a mirror plane.
  Molecules come from PubChem's isomeric SMILES; every R/S is checked in tests/stereo.test.ts.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import TopicLayout, { Legend, Toggle, ToolButton } from '../components/TopicLayout'
import LessonPanel from '../lessons/LessonPanel'
import { lessonPeek } from '../lessons/peek'
import { useStoredState } from '../lessons/progress'
import type { Depth } from '../lessons/types'
import { useLessons } from '../lessons/useLessons'
import { fischer } from '../stereo/fischer'
import FischerDrawing from '../stereo/FischerDrawing'
import { STEREO_LESSONS, type StereoLessonView } from '../stereo/lessons'
import { stereoById } from '../stereo/molecules'
import { StereoScene, type StereoLabel } from '../stereo/StereoScene'
import { stereocenters } from '../stereo/cip'
import './StereoPage.css'

/** Shown while the lesson list is open. */
const COVER: StereoLessonView = { molecule: 'l-alanine', orient: 'free', rs: true }

/** HTML labels pinned to the 3D scene: element symbols, priorities, R/S, mismatch marks. */
function StereoLabels({ scene, opts }: { scene: StereoScene; opts: { priorities: boolean; rs: boolean } }) {
  const [labels, setLabels] = useState<StereoLabel[]>([])
  const refs = useRef(new Map<string, HTMLDivElement>())
  const sig = useRef('')
  useEffect(() => {
    const place = () => {
      const list = scene.labels({ ...opts, elements: true })
      const s = list.map((l) => `${l.key}:${l.text}`).join('|')
      if (s !== sig.current) {
        sig.current = s
        setLabels(list)
      }
      for (const l of list) {
        const el = refs.current.get(l.key)
        if (!el) continue
        const q = scene.stage.project(l.pos)
        el.style.visibility = q.behind ? 'hidden' : 'visible'
        el.style.transform = `translate(${q.x}px, ${q.y}px) translate(-50%, -50%)`
      }
    }
    place()
    return scene.stage.onAfterRender(place)
  }, [scene, opts])
  return (
    <div className="overlay" aria-hidden="true">
      {labels.map((l) => (
        <div
          key={l.key}
          ref={(el) => {
            if (el) refs.current.set(l.key, el)
            else refs.current.delete(l.key)
          }}
          className={`st-label is-${l.kind} ${l.rank ? `is-p${l.rank}` : ''}`}
        >
          {l.text}
        </div>
      ))}
    </div>
  )
}

export default function StereoPage() {
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const L = useLessons(STEREO_LESSONS, 'stereo')
  const [spin, setSpin] = useState(false)

  const view: StereoLessonView = L.step ? (L.revealed && L.step.revealView ? L.step.revealView : L.step.view) : COVER
  const molecule = stereoById(view.molecule)
  const compare = view.compare ? stereoById(view.compare) : null

  /* ---------- 3D ---------- */
  const hostRef = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<StereoScene | null>(null)
  useEffect(() => {
    const sc = new StereoScene(hostRef.current!)
    setScene(sc)
    return () => {
      sc.dispose()
      setScene(null)
    }
  }, [])
  useEffect(() => {
    scene?.setView({
      model: molecule.model,
      center: view.center,
      orient: view.orient,
      fischerAxis: view.fischerAxis,
      arrow: view.arrow,
      mirror: view.mirror ?? null,
      align: view.align,
      swap: view.swap ?? null,
      eclipse: view.eclipse ?? null,
      plane: view.plane,
      compare: compare?.model ?? null,
    })
  }, [scene, molecule, compare, view])
  useEffect(() => scene?.stage.setAutoRotate(spin), [scene, spin])
  const labelOpts = useMemo(() => ({ priorities: !!view.priorities, rs: !!view.rs }), [view.priorities, view.rs])

  // A click (not a drag) on an atom answers "click the stereocenter" tasks.
  const down = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => (down.current = { x: e.clientX, y: e.clientY })
  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current
    down.current = null
    if (!scene || !d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || !L.step?.task) return
    const r = hostRef.current!.getBoundingClientRect()
    const atom = scene.pick(e.clientX - r.left, e.clientY - r.top)
    if (atom !== null) L.report({ atom })
  }

  /* ---------- Fischer card ---------- */
  const fis = useMemo(() => {
    if (!view.fischer || !molecule.chain) return null
    const centers = new Set(stereocenters(molecule.model))
    return fischer(molecule.model, molecule.chain, (a) => centers.has(a))
  }, [view.fischer, molecule])

  const caption = compare ? `${molecule.name} (left) · ${compare.name} (right)` : view.mirror ? `${molecule.name} and its mirror image` : molecule.name

  const panel = (
    <LessonPanel
      listTitle="Learn stereochemistry"
      listBlurb="Five short lessons: chirality, naming R and S, two stereocenters, meso compounds, and Fischer projections."
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
      onQuizDone={L.onQuizDone}
    />
  )

  return (
    <TopicLayout
      className="stereo-page"
      panel={panel}
      label={{ kind: 'illustrative', name: caption, source: 'ideal bond angles, built from PubChem’s structure' }}
      options={
        <>
          <Toggle label="Spin" on={spin} onChange={setSpin} />
          <ToolButton onClick={() => scene?.resetView()}>Reset view</ToolButton>
        </>
      }
      legend={
        <Legend
          items={[
            { label: 'Stereocenter', color: '#6fe3ff' },
            ...(view.arrow ? [{ label: '1 → 2 → 3', color: '#ffd27a' }] : []),
          ]}
        />
      }
      peek={lessonPeek(L, 'Stereochemistry', L.goTo)}
    >
      <div
        ref={hostRef}
        className={`topic-canvas stereo-canvas ${L.step?.task && L.taskStatus !== 'correct' ? 'is-picking' : ''}`}
        role="img"
        aria-label={`3D model of ${caption}. Drag to rotate.`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
      {scene && <StereoLabels scene={scene} opts={labelOpts} />}
      {fis && (
        <div className="stereo-fischer">
          <FischerDrawing f={fis} title={`Fischer · ${molecule.name}`} />
        </div>
      )}
    </TopicLayout>
  )
}
