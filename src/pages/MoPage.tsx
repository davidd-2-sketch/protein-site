/*
  MoPage.tsx — molecular orbital (MO) theory for two-atom molecules.

  Two modes, like the other topics:
    • Lessons: bonding vs antibonding, second-row molecules, why O₂ is magnetic, and
      molecules made of two different atoms (CO, NO, HF).
    • Explore: pick a molecule, add or remove electrons (to make ions like O₂⁺ or O₂²⁻),
      and read off the bond order and magnetism. Click any level to see its 3D shape.

  The diagram (MoDiagram) is schematic; the 3D surfaces use OrbitalScene with simple
  "add or subtract atomic orbitals" shapes (orbitals/wavefunctions.ts).
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ModeSwitch from '../components/ModeSwitch'
import TopicLayout, { Legend, Toggle, ToolButton } from '../components/TopicLayout'
import LessonPanel from '../lessons/LessonPanel'
import { lessonPeek } from '../lessons/peek'
import { useStoredState } from '../lessons/progress'
import RichText from '../lessons/RichText'
import type { Depth } from '../lessons/types'
import { useLessons } from '../lessons/useLessons'
import { arrowCount, byEnergy, capacity, checkFill, DIAGRAMS, diatomicById, emptyArrows, fill, fmtOrder, ionFormula, type Arrows, type Level } from '../mo/diatomics'
import { play } from '../sound/sound'
import Icon from '../components/Icon'
import { MO_LESSONS, type MoView } from '../mo/lessons'
import MoDiagram from '../mo/MoDiagram'
import { OrbitalScene } from '../orbitals/OrbitalScene'
import { afterFirstPaint } from '../perf/afterPaint'
import './MoPage.css'

const GROUPS: { name: string; ids: string[] }[] = [
  { name: 'First row', ids: ['h2', 'he2'] },
  { name: 'Second row', ids: ['li2', 'be2', 'b2', 'c2', 'n2', 'o2', 'f2', 'ne2'] },
  { name: 'Two different atoms', ids: ['co', 'no', 'hf'] },
]

/** The highest level holding electrons (a sensible thing to show first). */
function homo(diagramId: string, electrons: number) {
  const d = DIAGRAMS[diagramId]
  const f = fill(d, electrons)
  const occupied = byEnergy(d).filter((l) => f.count[l.id] > 0)
  return (occupied[occupied.length - 1] ?? byEnergy(d)[0]).id
}

export default function MoPage() {
  const [mode, setMode] = useStoredState<'lessons' | 'explore'>('ps.mo.mode', 'lessons')
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const L = useLessons(MO_LESSONS, 'mo')
  useEffect(() => {
    if (L.fromLink) setMode('lessons')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [exploreId, setExploreId] = useState('o2')
  const [electrons, setElectrons] = useState(() => diatomicById('o2').electrons)
  const [pick, setPick] = useState<{ key: string; level: string } | null>(null)
  const [spin, setSpin] = useState(false)
  /** Explore: fill the diagram yourself instead of seeing it filled. */
  const [fillOn, setFillOn] = useState(false)
  /** Phones show one pane at a time. */
  const [pane, setPane] = useState<'diagram' | '3d'>('diagram')

  const inLesson = mode === 'lessons' && L.step !== null
  const view: MoView | null = inLesson && L.step ? (L.revealed && L.step.revealView ? L.step.revealView : L.step.view) : null
  const molecule = diatomicById(view ? view.molecule : exploreId)
  const n = view ? (view.electrons ?? molecule.electrons) : electrons
  const filled = view ? view.filled !== false : true
  const d = DIAGRAMS[molecule.diagram]
  const f = fill(d, n)

  // The student's own click only counts for this step or molecule.
  const stepKey = inLesson ? `${L.lesson?.id}:${L.stepIndex}:${L.revealed}` : `explore:${exploreId}:${electrons}`

  /* ---------- fill it yourself ---------- */
  const building = inLesson ? !!view?.build && L.taskStatus !== 'correct' : fillOn
  // The student's electrons, reset for each step or molecule (keyed, so no effect is needed).
  const [work, setWork] = useState<{ key: string; arrows: Arrows; result: ReturnType<typeof checkFill> | null }>(() => ({ key: stepKey, arrows: emptyArrows(DIAGRAMS[molecule.diagram]), result: null }))
  const cur = work.key === `${stepKey}:${molecule.diagram}` ? work : { key: `${stepKey}:${molecule.diagram}`, arrows: emptyArrows(DIAGRAMS[molecule.diagram]), result: null }
  if (cur !== work) setWork(cur)
  // Functional update, so several quick clicks all count.
  const toggleSlot = (level: string, i: number) =>
    setWork((w) => {
      const base = w.key === cur.key ? w : cur
      return { ...base, result: null, arrows: { ...base.arrows, [level]: base.arrows[level].map((x, j) => (j === i ? (x + 1) % 3 : x)) } }
    })
  const checkWork = () => {
    const r = checkFill(DIAGRAMS[molecule.diagram], n, cur.arrows)
    setWork({ ...cur, result: r })
    if (inLesson) L.report({ filled: r.ok })
    else play(r.ok ? 'correct' : 'wrong')
  }
  const placed = arrowCount(cur.arrows)
  const picked = pick?.key === stepKey ? pick.level : null

  const selectedId = picked ?? view?.selected ?? homo(molecule.diagram, n)
  const selected: Level | undefined = d.levels.find((l) => l.id === selectedId)

  const chooseMolecule = (id: string) => {
    setExploreId(id)
    setElectrons(diatomicById(id).electrons)
  }
  const onSelect = (lv: Level) => {
    setPick({ key: stepKey, level: lv.id })
    if (inLesson) L.report({ level: lv.id })
  }

  /* ---------- 3D orbital ---------- */
  const hostRef = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<OrbitalScene | null>(null)
  const [busy, setBusy] = useState(true)
  useEffect(() => {
    const sc = new OrbitalScene(hostRef.current!, setBusy)
    setScene(sc)
    return () => {
      sc.dispose()
      setScene(null)
    }
  }, [])
  // The first surface is computed just after the page appears, so the diagram and text
  // show right away (computing a surface is the heaviest work on this page).
  const [painted, setPainted] = useState(false)
  useEffect(() => afterFirstPaint(() => setPainted(true)), [])
  const shape = useMemo(() => selected?.shape, [selected])
  useEffect(() => {
    if (scene && shape && painted) void scene.setView({ ...shape, fit: 3.4 })
  }, [scene, shape, painted])
  useEffect(() => scene?.setAxes(false), [scene])
  useEffect(() => scene?.stage.setAutoRotate(spin), [scene, spin])

  const formula = ionFormula(molecule, n)
  const neutral = n === molecule.electrons
  const predicted = f.unpaired > 0 ? 'paramagnetic' : 'diamagnetic'

  const panel =
    mode === 'lessons' ? (
      <LessonPanel
        listTitle="Learn MO theory"
        listBlurb="Four short lessons: bonding and antibonding, second-row molecules, why oxygen is magnetic, and molecules of two different atoms."
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
        practiceTopic="mo"
      />
    ) : (
      <section className="lesson mo-panel" aria-label="Explore molecular orbitals">
        <ModeSwitch mode="explore" onChange={() => setMode('lessons')} />
        <header>
          <p className="lesson-kicker">{molecule.name}</p>
          <h1 className="mo-title">{formula}</h1>
        </header>

        <dl className="mo-facts">
          <div>
            <dt>Bond order</dt>
            <dd>
              <span className="mono">{fmtOrder(f.bondOrder)}</span>
              <span className="mo-calc">
                ({f.bonding} − {f.antibonding}) ÷ 2
              </span>
            </dd>
          </div>
          <div>
            <dt>Unpaired electrons</dt>
            <dd>
              {f.unpaired} · {predicted}
            </dd>
          </div>
          {neutral && molecule.length && (
            <div>
              <dt>Measured bond length</dt>
              <dd>{molecule.length} pm</dd>
            </div>
          )}
          {neutral && molecule.energy && (
            <div>
              <dt>Measured bond energy</dt>
              <dd>{molecule.energy} kJ/mol</dd>
            </div>
          )}
          {neutral && molecule.magnetism && (
            <div>
              <dt>Measured</dt>
              <dd>{molecule.magnetism}</dd>
            </div>
          )}
        </dl>
        {neutral && molecule.note && <p className="mo-note">{molecule.note}</p>}
        {!neutral && (
          <p className="mo-note">
            {n < molecule.electrons ? 'Removing' : 'Adding'} electrons changes the bond order. Measured data is shown for the neutral molecule only.
          </p>
        )}

        {GROUPS.map((g) => (
          <div key={g.name} className="mo-group">
            <p className="mo-group-name">{g.name}</p>
            <div className="mo-chips" role="radiogroup" aria-label={g.name}>
              {g.ids.map((id) => (
                <button key={id} role="radio" aria-checked={exploreId === id} className={`chip ${exploreId === id ? 'is-active' : ''}`} onClick={() => chooseMolecule(id)}>
                  {diatomicById(id).formula}
                </button>
              ))}
            </div>
          </div>
        ))}

        {d.note && (
          <p className="mo-note">
            <RichText text={d.note} />
          </p>
        )}
        <Link to="/lewis" className="btn btn-sm btn-quiet mo-link">
          Compare with Lewis structures <Icon name="arrow" size={16} />
        </Link>
        <p className="lesson-note">
          Energy levels are schematic: their order is what the model predicts, but spacing is not to scale. Core (1s) electrons of second-row atoms are
          left out. 3D shapes add or subtract atomic orbitals in a simple model; for unequal atoms they are drawn lopsided toward the atom they resemble.
          Measured values: bond lengths from spectroscopy (Huber &amp; Herzberg), bond energies at 298 K (CRC Handbook).
        </p>
      </section>
    )

  const fillTools = building && (
    <div className="mo-fill" role="group" aria-label="Fill the diagram">
      {cur.result && (
        <div className={`mo-status ${cur.result.ok ? 'is-ok' : 'is-wrong'}`} role="status" aria-live="polite">
          <p className="mo-status-label">{cur.result.ok ? '✓ Correct' : 'Not yet'}</p>
          <p>{cur.result.message}</p>
        </div>
      )}
      <div className="mo-fill-row">
        <span className={`mo-fill-count ${placed === n ? 'is-full' : placed > n ? 'is-over' : ''}`} aria-live="polite">
          <span className="mono">
            {placed}/{n}
          </span>{' '}
          electrons
        </span>
        <span className="mo-fill-hint">Click a line: ↑, then ↑↓, then empty.</span>
        <button className="btn btn-sm btn-primary" onClick={checkWork}>
          Check
        </button>
        <button className="btn btn-sm btn-quiet" onClick={() => setWork({ ...cur, arrows: emptyArrows(DIAGRAMS[molecule.diagram]), result: null })} aria-label="Clear the diagram">
          <Icon name="reset" size={16} />
        </button>
      </div>
    </div>
  )

  const control = building ? (
    fillTools
  ) : !inLesson ? (
    <div className="mo-electrons" role="group" aria-label="Valence electrons">
      <button className="stepper-btn" onClick={() => setElectrons(Math.max(0, n - 1))} disabled={n <= 0} aria-label="Remove an electron">
        −
      </button>
      <span className="mo-electrons-value" aria-live="polite">
        <span className="mono">{n}</span> electrons · <strong>{formula}</strong>
      </span>
      <button className="stepper-btn" onClick={() => setElectrons(Math.min(capacity(d), n + 1))} disabled={n >= capacity(d)} aria-label="Add an electron">
        +
      </button>
      {!neutral && (
        <button className="btn btn-sm btn-quiet" onClick={() => setElectrons(molecule.electrons)}>
          Neutral
        </button>
      )}
    </div>
  ) : undefined

  return (
    <TopicLayout
      className={`mo-page ${building ? 'is-building' : ''}`}
      panel={panel}
      label={{ kind: 'illustrative', name: `${formula} MO diagram`, source: 'orbital surfaces from a simple model' }}
      options={
        <>
          {!inLesson && <Toggle label="Fill it yourself" on={fillOn} onChange={setFillOn} />}
          <Toggle label="Spin" on={spin} onChange={setSpin} />
          <ToolButton onClick={() => scene?.stage.fit(3.4, true)}>Reset view</ToolButton>
        </>
      }
      control={control}
      legend={
        <Legend
          items={[
            { label: 'Bonding', color: '#6fe3ff' },
            { label: 'Antibonding', color: '#a993ff' },
            ...(d.levels.some((l) => l.kind === 'nonbonding') ? [{ label: 'Nonbonding', color: '#b4b8d8' }] : []),
            { label: 'Electron (↑ or ↓ spin)', color: '#ffc94d' },
          ]}
        />
      }
      peek={lessonPeek(mode === 'lessons' ? L : { lesson: null, step: null, stepIndex: 0 }, 'MO theory', L.goTo)}
    >
      <div className="pane-switch segmented" role="radiogroup" aria-label="Show">
        {(['diagram', '3d'] as const).map((k) => (
          <button key={k} role="radio" aria-checked={pane === k} className={`segmented-btn ${pane === k ? 'is-active' : ''}`} onClick={() => setPane(k)}>
            {k === 'diagram' ? 'Diagram' : '3D orbital'}
          </button>
        ))}
      </div>
      <div className={`topic-canvas mo-split show-${pane}`}>
        <div className="mo-pane mo-pane-diagram">
          <MoDiagram
            molecule={molecule}
            electrons={n}
            filled={filled}
            selected={selectedId}
            onSelect={onSelect}
            build={building ? { arrows: cur.arrows, onToggle: toggleSlot, highlight: cur.result?.ok ? undefined : cur.result?.level } : undefined}
          />
        </div>
        <div className="mo-pane mo-pane-3d">
          <div ref={hostRef} className="mo-3d" role="img" aria-label={`3D shape of the ${selected?.label.replace('_', ' ') ?? ''} orbital. Drag to rotate.`} />
          {selected && (
            <p className="mo-3d-caption">
              <RichText text={selected.label} /> · {selected.kind}
              <span className="mo-3d-phase">blue + phase · orange − phase</span>
            </p>
          )}
          {busy && (
            <p className="topic-busy mo-busy" role="status">
              Computing surface…
            </p>
          )}
        </div>
      </div>
    </TopicLayout>
  )
}
