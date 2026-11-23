/*
  LewisPage.tsx — Lewis structures.

  Two modes, like the other topics:
    • Lessons: drawing, formal charge, resonance, and octet exceptions, with predict-first
      questions and "your turn" build steps.
    • Explore: pick a molecule and build its Lewis structure. Click an atom to change its
      lone pairs, click a bond to make it single/double/triple, then press Check. The checker
      explains what to fix (electron count, octets, formal charges). Once it's right, the
      structure appears beside it in 3D (its VSEPR shape).
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import ModeSwitch from '../components/ModeSwitch'
import TopicLayout, { Toggle, ToolButton } from '../components/TopicLayout'
import LessonPanel from '../lessons/LessonPanel'
import { lessonPeek } from '../lessons/peek'
import { useStoredState } from '../lessons/progress'
import type { Depth } from '../lessons/types'
import { useLessons } from '../lessons/useLessons'
import { LEWIS_LESSONS, type LewisView } from '../lewis/lessons'
import LewisDrawing, { type Selection } from '../lewis/LewisDrawing'
import {
  checkStructure,
  electronsAround,
  electronsUsed,
  fmtCharge,
  formalCharges,
  hybridOf,
  lewisById,
  skeleton,
  valenceTotal,
  type CheckResult,
  type LewisMolecule,
  type LForm,
} from '../lewis/molecules'
import { sceneFor } from '../lewis/shape3d'
import { play } from '../sound/sound'
import SceneLabelsOverlay from '../vsepr/SceneLabels'
import { VseprScene } from '../vsepr/VseprScene'
import './LewisPage.css'

const GROUPS: { name: string; ids: string[] }[] = [
  { name: 'Start here', ids: ['h2o', 'nh3', 'ch4', 'co2', 'hcn', 'ch2o', 'n2', 'nh4'] },
  { name: 'Formal charge', ids: ['co'] },
  { name: 'Resonance', ids: ['o3', 'co3', 'no3'] },
  { name: 'Octet exceptions', ids: ['bf3', 'no', 'pcl5', 'sf6', 'xef4'] },
]

/** Everything that starts fresh on a new molecule or lesson step. */
interface Work {
  key: string
  form: LForm
  selected: Selection
  result: CheckResult | null
  /** Explore: the finished structure (checked, or shown as the answer). */
  solved: { form: LForm; shown: boolean } | null
  showForms: boolean
}
const freshWork = (key: string, m: LewisMolecule): Work => ({ key, form: skeleton(m), selected: null, result: null, solved: null, showForms: false })

/**
 * The structure being built. It is keyed: when the molecule or lesson step changes, the
 * state resets during render (React's recommended pattern, instead of an effect).
 */
function useBuilder(m: LewisMolecule, key: string) {
  const [st, setSt] = useState<Work>(() => freshWork(key, m))
  const cur = st.key === key ? st : freshWork(key, m)
  if (st.key !== key) setSt(cur)
  const set = (patch: Partial<Work>) => setSt((s) => ({ ...(s.key === key ? s : freshWork(key, m)), ...patch }))
  return {
    work: cur.form,
    selected: cur.selected,
    result: cur.result,
    solved: cur.solved,
    showForms: cur.showForms,
    setWork: (form: LForm) => set({ form, result: null }),
    setSelected: (selected: Selection) => set({ selected }),
    setResult: (result: CheckResult | null) => set({ result }),
    setSolved: (solved: Work['solved']) => set({ solved }),
    setShowForms: (showForms: boolean) => set({ showForms }),
    reset: () => set({ form: skeleton(m), selected: null, result: null }),
  }
}

export default function LewisPage() {
  const [mode, setMode] = useStoredState<'lessons' | 'explore'>('ps.lewis.mode', 'lessons')
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const L = useLessons(LEWIS_LESSONS, 'lewis')
  useEffect(() => {
    if (L.fromLink) setMode('lessons')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [exploreId, setExploreId] = useState('h2o')
  const [formalOn, setFormalOn] = useState(false)
  const [spin, setSpin] = useState(false)
  /** Phones show one pane at a time. */
  const [pane, setPane] = useState<'2d' | '3d'>('2d')

  const inLesson = mode === 'lessons' && L.step !== null
  const view: LewisView | null = inLesson && L.step ? (L.revealed && L.step.revealView ? L.step.revealView : L.step.view) : null
  const molecule = lewisById(view ? view.molecule : exploreId)
  // Each lesson step (or new molecule) starts fresh.
  const stepKey = inLesson ? `${L.lesson?.id}:${L.stepIndex}:${L.revealed}` : `explore:${exploreId}`
  const B = useBuilder(molecule, stepKey)
  const { solved, showForms } = B

  /* ---------- what to draw ---------- */
  const building = inLesson ? view?.show === 'build' && L.taskStatus !== 'correct' : !solved
  const finishedForm: LForm | null = inLesson
    ? view?.show === 'build'
      ? L.taskStatus === 'correct'
        ? B.work
        : null
      : view?.show === 'form' || view?.show === 'resonance' || view?.show === 'hybrid'
        ? molecule.forms[view.form ?? 0]
        : null
    : (solved?.form ?? null)
  const shownForm: LForm = inLesson
    ? view?.show === 'build'
      ? B.work
      : view?.show === 'skeleton'
        ? skeleton(molecule)
        : view?.show === 'custom' && view.custom
          ? view.custom
          : view?.show === 'alt'
            ? molecule.alternatives![view.alt ?? 0].form
            : molecule.forms[view?.form ?? 0]
    : (solved?.form ?? B.work)
  const formal = inLesson ? !!view?.formal || formalOn : formalOn
  const resonanceRow = inLesson ? view?.show === 'resonance' : showForms && molecule.forms.length > 1
  const hybrid = inLesson && view?.show === 'hybrid' ? hybridOf(molecule) : undefined
  const show3d = inLesson ? (view?.show === 'build' ? L.taskStatus === 'correct' : !!view?.show3d) : !!solved
  const scene3d = useMemo(() => (show3d && finishedForm ? sceneFor(molecule, finishedForm) : null), [show3d, finishedForm, molecule])

  /* ---------- the 3D shape ---------- */
  const hostRef = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<VseprScene | null>(null)
  useEffect(() => {
    const sc = new VseprScene(hostRef.current!)
    setScene(sc)
    return () => {
      sc.dispose()
      setScene(null)
    }
  }, [])
  useEffect(() => {
    if (scene && scene3d) {
      scene.setState(scene3d)
      scene.setOptions({ arcs: true, hull: false })
    }
  }, [scene, scene3d])
  useEffect(() => scene?.stage.setAutoRotate(spin), [scene, spin])

  /* ---------- checking ---------- */
  const check = () => {
    const r = checkStructure(molecule, B.work)
    B.setResult(r)
    if (inLesson) L.report({ molecule: molecule.id, ok: r.ok })
    else {
      play(r.ok ? 'correct' : 'wrong')
      if (r.ok) B.setSolved({ form: B.work, shown: false })
    }
  }
  const showAnswer = () => {
    B.setSolved({ form: molecule.forms[0], shown: true })
  }

  /* ---------- the panel ---------- */
  const status = B.result && (
    <div className={`lewis-status ${B.result.ok ? 'is-ok' : 'is-wrong'}`} role="status" aria-live="polite">
      <p className="lewis-status-label">{B.result.ok ? '✓ Correct' : 'Not yet'}</p>
      <p>{B.result.message}</p>
    </div>
  )

  const panel =
    mode === 'lessons' ? (
      <LessonPanel
        listTitle="Learn Lewis structures"
        listBlurb="Four short lessons: drawing structures, formal charge, resonance, and the exceptions to the octet rule."
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
        practiceTopic="lewis"
      />
    ) : (
      <section className="lesson lewis-panel" aria-label="Build a Lewis structure">
        <ModeSwitch mode="explore" onChange={() => setMode('lessons')} />
        <header>
          <p className="lesson-kicker">Build it</p>
          <h1 className="lewis-title">
            {molecule.formula} <span>{molecule.name}</span>
          </h1>
          <p className="lewis-sub">
            {valenceTotal(molecule)} valence electrons. Click an atom to add lone pairs, click a bond to make it double or triple, then press
            Check.
          </p>
        </header>

        {solved && (
          <div className="lewis-done" role="status">
            <p className="lewis-status-label">{solved.shown ? 'The answer' : '✓ Correct'}</p>
            {molecule.note && <p>{molecule.note}</p>}
            {molecule.forms.length > 1 && (
              <button className="btn btn-sm" onClick={() => B.setShowForms(!showForms)} aria-pressed={showForms}>
                {showForms ? 'Show one structure' : `Show all ${molecule.forms.length} resonance structures`}
              </button>
            )}
            {molecule.vsepr && (
              <Link className="btn btn-sm btn-quiet" to="/shapes">
                Measured angles on the Shapes page <Icon name="arrow" size={16} />
              </Link>
            )}
          </div>
        )}

        {GROUPS.map((g) => (
          <div key={g.name} className="lewis-group">
            <p className="lewis-group-name">{g.name}</p>
            <div className="lewis-chips" role="radiogroup" aria-label={g.name}>
              {g.ids.map((id) => (
                <button key={id} role="radio" aria-checked={exploreId === id} className={`chip ${exploreId === id ? 'is-active' : ''}`} onClick={() => setExploreId(id)}>
                  {lewisById(id).formula}
                </button>
              ))}
            </div>
          </div>
        ))}

        <details className="lewis-method">
          <summary>The method, step by step</summary>
          <ol>
            <li>Count all valence electrons (add one per − charge, remove one per + charge).</li>
            <li>Put the least electronegative atom in the center (never H).</li>
            <li>Connect the atoms with single bonds.</li>
            <li>Give the outer atoms octets with lone pairs (H only needs 2).</li>
            <li>Put any leftover electrons on the central atom.</li>
            <li>Center short of an octet? Turn outer lone pairs into double or triple bonds.</li>
            <li>Several options? Choose the one with formal charges closest to 0.</li>
          </ol>
        </details>

        <p className="lesson-note">
          Lewis structures are a bookkeeping model: they show where valence electrons are counted, not exactly where they are. The 3D shape uses VSEPR;
          angles shown are measured values (from the Shapes page), and lone pairs on outer atoms aren’t drawn in 3D.
        </p>
      </section>
    )

  /* ---------- controls under the drawing (while building) ---------- */
  const used = electronsUsed(B.work)
  const total = valenceTotal(molecule)
  const sel = B.selected
  const odd = total % 2 === 1
  const editor =
    sel?.kind === 'atom' ? (
      <AtomEditor molecule={molecule} work={B.work} i={sel.i} odd={odd} onChange={B.setWork} />
    ) : sel?.kind === 'bond' ? (
      <div className="lewis-edit" role="group" aria-label={`Bond between ${molecule.atoms[molecule.links[sel.i][0]].el} and ${molecule.atoms[molecule.links[sel.i][1]].el}`}>
        <span className="lewis-edit-name">
          {molecule.atoms[molecule.links[sel.i][0]].el}–{molecule.atoms[molecule.links[sel.i][1]].el}
        </span>
        <div className="segmented" role="radiogroup" aria-label="Bond order">
          {['Single', 'Double', 'Triple'].map((name, k) => (
            <button
              key={name}
              role="radio"
              aria-checked={B.work.bonds[sel.i] === k + 1}
              className={`segmented-btn ${B.work.bonds[sel.i] === k + 1 ? 'is-active' : ''}`}
              onClick={() => B.setWork({ ...B.work, bonds: B.work.bonds.map((b, j) => (j === sel.i ? k + 1 : b)) })}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    ) : (
      <p className="lewis-edit-hint">Select an atom or a bond in the drawing.</p>
    )

  const control = building ? (
    <div className="lewis-tools">
      {status}
      <p className={`lewis-count ${used === total ? 'is-full' : used > total ? 'is-over' : ''}`} aria-live="polite">
        <span className="mono">
          {used}/{total}
        </span>{' '}
        electrons
      </p>
      {editor}
      <div className="lewis-actions">
        <button className="btn btn-sm btn-primary" onClick={check}>
          Check
        </button>
        <button className="btn btn-sm btn-quiet" onClick={B.reset} aria-label="Start over from the skeleton">
          <Icon name="reset" size={16} />
        </button>
        {!inLesson && (
          <button className="btn btn-sm btn-quiet" onClick={showAnswer}>
            Show answer
          </button>
        )}
      </div>
    </div>
  ) : undefined

  /* ---------- the drawing ---------- */
  const drawing = resonanceRow ? (
    <div className="lewis-resonance" role="img" aria-label={`The ${molecule.forms.length} resonance structures of ${molecule.formula}`}>
      {molecule.forms.map((f, k) => (
        <div key={k} className="lewis-resonance-item">
          {k > 0 && (
            <span className="lewis-resonance-arrow" aria-hidden="true">
              ↔
            </span>
          )}
          <LewisDrawing molecule={molecule} form={f} formal={formal} size="small" />
        </div>
      ))}
    </div>
  ) : (
    <LewisDrawing
      molecule={molecule}
      form={shownForm}
      formal={formal}
      editable={building}
      selected={B.selected}
      onSelect={(s) => B.setSelected(s)}
      highlight={[...(view?.highlight ?? []), ...(B.result && !B.result.ok && B.result.atom !== undefined ? [B.result.atom] : [])]}
      hybrid={hybrid}
      label={
        building
          ? `Your Lewis structure of ${molecule.formula}. ${used} of ${total} electrons placed. Select an atom or bond to change it.`
          : hybrid
            ? `Resonance hybrid of ${molecule.formula}: partial bonds and partial charges`
            : undefined
      }
    />
  )

  const no3dReason = molecule.center === undefined ? 'Two atoms always make a straight line.' : building ? 'Finish the structure to see its 3D shape.' : null

  return (
    <TopicLayout
      className={`lewis-page ${building ? 'is-building' : ''}`}
      panel={panel}
      label={{ kind: 'illustrative', name: `${molecule.formula} · ${molecule.name}`, source: 'Lewis model; 3D shape from VSEPR' }}
      options={
        <>
          <Toggle label="Formal charges" on={formal} onChange={setFormalOn} />
          <Toggle label="Spin" on={spin} onChange={setSpin} />
          <ToolButton onClick={() => scene?.stage.fit(3.2, true)}>Reset view</ToolButton>
        </>
      }
      control={control}
      peek={lessonPeek(mode === 'lessons' ? L : { lesson: null, step: null, stepIndex: 0 }, 'Lewis structures', L.goTo)}
    >
      {scene3d && (
        <div className="pane-switch segmented" role="radiogroup" aria-label="Show">
          {(['2d', '3d'] as const).map((k) => (
            <button key={k} role="radio" aria-checked={pane === k} className={`segmented-btn ${pane === k ? 'is-active' : ''}`} onClick={() => setPane(k)}>
              {k === '2d' ? 'Drawing' : '3D shape'}
            </button>
          ))}
        </div>
      )}
      <div className={`topic-canvas lewis-split show-${scene3d ? pane : '2d'}`}>
        <div className="lewis-pane lewis-pane-2d">{drawing}</div>
        <div className={`lewis-pane lewis-pane-3d ${scene3d ? 'is-on' : ''}`}>
          <div ref={hostRef} className="lewis-3d" role="img" aria-label={scene3d ? `3D shape of ${molecule.formula}. Drag to rotate.` : 'No 3D shape yet'} />
          {scene && scene3d && <SceneLabelsOverlay scene={scene} />}
          {!scene3d && <p className="lewis-3d-empty">{no3dReason ?? (inLesson ? 'The 3D shape appears on some steps.' : '')}</p>}
        </div>
      </div>
    </TopicLayout>
  )
}

/** Lone pairs (and, for odd-electron molecules, an unpaired electron) on one atom. */
function AtomEditor({ molecule: m, work, i, odd, onChange }: { molecule: LewisMolecule; work: LForm; i: number; odd: boolean; onChange: (f: LForm) => void }) {
  const el = m.atoms[i].el
  const lone = work.lone[i]
  const single = work.single?.[i] ?? 0
  const setLone = (n: number) => onChange({ ...work, lone: work.lone.map((x, j) => (j === i ? n : x)) })
  const around = electronsAround(m, work)[i]
  const fc = formalCharges(m, work)[i]
  return (
    <div className="lewis-edit" role="group" aria-label={`${el} atom`}>
      <span className="lewis-edit-name">{el}</span>
      <div className="stepper" role="group" aria-label="Lone pairs">
        <button className="stepper-btn" onClick={() => setLone(lone - 1)} disabled={lone <= 0} aria-label={`Fewer lone pairs on ${el}`}>
          −
        </button>
        <span className="stepper-value mono" aria-live="polite">
          {lone}
        </span>
        <button className="stepper-btn" onClick={() => setLone(lone + 1)} disabled={lone >= 4} aria-label={`More lone pairs on ${el}`}>
          +
        </button>
        <span className="lewis-edit-unit">lone pair{lone === 1 ? '' : 's'}</span>
      </div>
      {odd && (
        <button
          className={`tool-btn ${single ? 'is-on' : ''}`}
          aria-pressed={!!single}
          onClick={() => onChange({ ...work, single: m.atoms.map((_, j) => (j === i ? (single ? 0 : 1) : (work.single?.[j] ?? 0))) })}
        >
          Unpaired e⁻
        </button>
      )}
      <span className="lewis-edit-info">
        {around} around · FC {fmtCharge(fc)}
      </span>
    </div>
  )
}
