/*
  PracticeStage.tsx — draws the visual for a practice question, using the same 3D scenes
  as the lessons. Each kind of visual keeps its scene while consecutive questions use it,
  and swaps scenes only when the kind changes.
*/
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import EnergyChart from '../enzymes/EnergyChart'
import KineticsChart from '../enzymes/KineticsChart'
import '../pages/EnzymesPage.css'

// The 3D enzyme stage pulls in the Mol* viewer, so it loads only when an enzyme structure question appears.
const EnzymePracticeStage = lazy(() => import('../enzymes/EnzymePracticeStage'))
import AxisLabels from '../orbitals/AxisLabels'
import { OrbitalScene } from '../orbitals/OrbitalScene'
import ReactionLabels from '../reactions/ReactionLabels'
import { ReactionScene } from '../reactions/ReactionScene'
import { byId as polarById } from '../polarity/molecules'
import PolarityLabels from '../polarity/PolarityLabels'
import { PolarityScene } from '../polarity/PolarityScene'
import SymbolLabels from '../trends/SymbolLabels'
import { byZ } from '../trends/elements'
import { TrendsScene } from '../trends/TrendsScene'
import SceneLabelsOverlay from '../vsepr/SceneLabels'
import { VseprScene } from '../vsepr/VseprScene'
import LewisDrawing, { type Selection } from '../lewis/LewisDrawing'
import { SelectionEditor } from '../lewis/LewisEditor'
import { checkStructure, electronsUsed, lewisById, skeleton, valenceTotal, type LForm } from '../lewis/molecules'
import { sceneFor } from '../lewis/shape3d'
import { arrowCount, checkFill, DIAGRAMS, diatomicById, emptyArrows, type Arrows } from '../mo/diatomics'
import MoDiagram from '../mo/MoDiagram'
import { REACTIONS } from '../reactions/reactions'
import Icon from '../components/Icon'
import type { Interaction, LewisCard, Visual } from './questions'

/** What a click or build card reports: right or not, and what to tell the student. */
export type Attempt = (ok: boolean, message?: string) => void

interface StageProps {
  visual: Visual
  revealed: boolean
  /** Click and build cards: how this card is answered, and where attempts go. */
  interaction?: Interaction
  onAttempt?: Attempt
  /** Changes for every card, so build/click state starts fresh. */
  cardId?: string
}

export default function PracticeStage({ visual, revealed, interaction, onAttempt, cardId }: StageProps) {
  const live = !revealed && !!interaction && !!onAttempt
  switch (visual.kind) {
    case 'vsepr':
      return <VseprStage visual={visual} revealed={revealed} />
    case 'orbital':
      return <OrbitalStage visual={visual} revealed={revealed} />
    case 'trends':
      return <TrendsStage visual={visual} revealed={revealed} pick={live && interaction?.kind === 'click-element' ? { ...interaction, onAttempt: onAttempt! } : undefined} />
    case 'sn2':
      // A fresh scene for each mechanism (SN1 and SN2 move different atoms).
      return <Sn2Stage key={visual.mech ?? 'sn2'} visual={visual} />
    case 'lewis':
      return <LewisStage key={cardId} visual={visual} revealed={revealed} interaction={live ? interaction : undefined} onAttempt={onAttempt} />
    case 'mo':
      return <MoStage key={cardId} visual={visual} revealed={revealed} interaction={live ? interaction : undefined} onAttempt={onAttempt} />
    case 'polarity':
      return <PolarityStage visual={visual} revealed={revealed} />
    case 'kinetics': {
      const k = revealed && visual.after ? visual.after : visual.before
      return (
        <div className="practice-canvas practice-chart">
          <KineticsChart plot={k.plot} type={k.type} inhibitor={k.inhibitor} substrate={k.substrate} />
        </div>
      )
    }
    case 'energy':
      return (
        <div className="practice-canvas practice-chart">
          <EnergyChart showUncatalyzed showCatalyzed hints={false} />
        </div>
      )
    case 'enzyme3d':
      return (
        <Suspense fallback={<p className="practice-busy">Loading the enzyme…</p>}>
          <EnzymePracticeStage structure={visual.structure} after={visual.after} highlight={visual.highlight} revealed={revealed} />
        </Suspense>
      )
  }
}

/** Create a scene inside a <div> once, and dispose of it when the stage goes away. */
function useScene<S extends { dispose(): void }>(make: (el: HTMLDivElement) => S) {
  const host = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<S | null>(null)
  useEffect(() => {
    const s = make(host.current!)
    setScene(s)
    return () => {
      s.dispose()
      setScene(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return [host, scene] as const
}

function VseprStage({ visual, revealed }: { visual: Extract<Visual, { kind: 'vsepr' }>; revealed: boolean }) {
  const [host, scene] = useScene((el) => new VseprScene(el))
  useEffect(() => {
    if (!scene) return
    scene.setState(revealed ? visual.after : visual.before)
    scene.setOptions({ hull: revealed ? !!visual.hullAfter : !!visual.hullBefore, arcs: revealed && visual.arcsAfter })
  }, [scene, visual, revealed])
  return (
    <div className="practice-canvas" ref={host}>
      {scene && <SceneLabelsOverlay scene={scene} />}
    </div>
  )
}

function OrbitalStage({ visual, revealed }: { visual: Extract<Visual, { kind: 'orbital' }>; revealed: boolean }) {
  const [busy, setBusy] = useState(true)
  const [host, scene] = useScene((el) => new OrbitalScene(el, setBusy))
  const view = revealed && visual.after ? visual.after : visual.before
  const axes = view.axes ?? true
  useEffect(() => void scene?.setView(view), [scene, view])
  useEffect(() => scene?.setAxes(axes), [scene, axes])
  return (
    <div className="practice-canvas" ref={host}>
      {scene && axes && <AxisLabels scene={scene} />}
      {busy && (
        <p className="practice-busy" role="status">
          Computing surface…
        </p>
      )}
    </div>
  )
}

function TrendsStage(p: {
  visual: Extract<Visual, { kind: 'trends' }>
  revealed: boolean
  /** Click card: which highlighted element is right. */
  pick?: { correct: number[]; among: number[]; onAttempt: Attempt }
}) {
  const { visual, revealed } = p
  // The scene keeps the first callback it was given, so it calls through a ref to the latest card.
  const pickRef = useRef(p.pick)
  useEffect(() => {
    pickRef.current = p.pick
  })
  const [host, scene] = useScene(
    (el) =>
      new TrendsScene(
        el,
        (z) => {
          const card = pickRef.current
          if (!card) return
          if (!card.among.includes(z)) return card.onAttempt(false, `${byZ(z).symbol} isn’t one of the highlighted elements. Pick one of those.`)
          card.onAttempt(card.correct.includes(z), card.correct.includes(z) ? undefined : `Not ${byZ(z).symbol}.`)
        },
        () => {},
      ),
  )
  useEffect(() => scene?.setView({ ...(revealed ? visual.after : visual.before), selected: null }), [scene, visual, revealed])
  return (
    <div className="practice-canvas" ref={host}>
      {scene && <SymbolLabels scene={scene} />}
    </div>
  )
}

function Sn2Stage({ visual }: { visual: Extract<Visual, { kind: 'sn2' }> }) {
  const def = REACTIONS[visual.mech ?? 'sn2']
  const [host, scene] = useScene((el) => new ReactionScene(el, def.mechanism(-1)))
  useEffect(() => {
    if (!scene) return
    scene.setOptions({ arrows: false })
    scene.setProgress(visual.s)
  }, [scene, visual])
  return (
    <div className="practice-canvas" ref={host}>
      {/* Only element symbols and group names: role labels would give the answers away. */}
      {scene && <ReactionLabels scene={scene} s={visual.s} labels={def.labels} kinds={['element', 'group']} />}
    </div>
  )
}

function PolarityStage({ visual, revealed }: { visual: Extract<Visual, { kind: 'polarity' }>; revealed: boolean }) {
  const [host, scene] = useScene((el) => new PolarityScene(el))
  const molecule = polarById(visual.id)
  useEffect(() => {
    if (!scene) return
    scene.setMolecule(molecule)
    scene.setSum(false, true)
  }, [scene, molecule])
  // Answering slides the arrows tip to tail, showing whether they cancel.
  useEffect(() => scene?.setSum(revealed), [scene, revealed])
  return (
    <div className="practice-canvas" ref={host}>
      {scene && <PolarityLabels scene={scene} molecule={molecule} charges />}
    </div>
  )
}

/** A Lewis structure card: one structure, all resonance structures, a build card, or a click card. */
function LewisStage({ visual, revealed, interaction, onAttempt }: { visual: Extract<Visual, { kind: 'lewis' }>; revealed: boolean; interaction?: Interaction; onAttempt?: Attempt }) {
  const m = lewisById(visual.molecule)
  const card: LewisCard = revealed && visual.after ? visual.after : visual.before
  const [work, setWork] = useState<LForm>(() => skeleton(m))
  const [selected, setSelected] = useState<Selection>(null)
  const [flag, setFlag] = useState<number[]>([])
  const building = interaction?.kind === 'build-lewis'
  const clicking = interaction?.kind === 'click-atom' ? interaction : null

  if (card.show === 'resonance' && !building)
    return (
      <div className="practice-canvas practice-flat practice-resonance" role="img" aria-label={`The resonance structures of ${m.formula}`}>
        {m.forms.map((f, k) => (
          <div key={k} className="practice-resonance-item">
            {k > 0 && <span aria-hidden="true">↔</span>}
            <LewisDrawing molecule={m} form={f} formal={card.formal} size="small" />
          </div>
        ))}
      </div>
    )

  // Build cards show the student's work, then (once answered) a correct structure.
  const form = building ? work : visual.build && revealed ? m.forms[0] : card.show === 'skeleton' ? skeleton(m) : card.show === 'custom' && card.custom ? card.custom : m.forms[0]
  const check = () => {
    const r = checkStructure(m, work)
    setFlag(!r.ok && r.atom !== undefined ? [r.atom] : [])
    onAttempt?.(r.ok, r.message)
  }
  const onSelect = (s: Selection) => {
    if (clicking) {
      if (s?.kind !== 'atom') return
      const ok = clicking.correct.includes(s.i)
      onAttempt?.(ok, ok ? undefined : `Not that ${m.atoms[s.i].el}.`)
      return
    }
    setSelected(s)
  }
  const used = electronsUsed(work)
  const total = valenceTotal(m)
  const scene3d = revealed && visual.show3dAfter ? sceneFor(m, m.forms[0]) : null

  const drawing = (
    <LewisDrawing
      molecule={m}
      form={form}
      formal={card.formal}
      highlight={building ? flag : card.highlight}
      editable={building || !!clicking}
      selected={building ? selected : null}
      onSelect={onSelect}
      label={building ? `Your Lewis structure of ${m.formula}: ${used} of ${total} electrons placed.` : clicking ? `Lewis structure of ${m.formula}. Click an atom to answer.` : undefined}
    />
  )
  return (
    <div className={`practice-canvas practice-flat ${building ? 'has-tools' : ''} ${scene3d ? 'has-3d' : ''}`}>
      {scene3d ? (
        <div className="practice-split">
          <div className="practice-split-2d">{drawing}</div>
          <Mini3D state={scene3d} />
        </div>
      ) : (
        drawing
      )}
      {building && (
        <div className="builder-tools" role="group" aria-label="Build controls">
          <p className={`lewis-count ${used === total ? 'is-full' : used > total ? 'is-over' : ''}`} aria-live="polite">
            <span className="mono">
              {used}/{total}
            </span>{' '}
            electrons
          </p>
          <SelectionEditor molecule={m} work={work} selected={selected} odd={total % 2 === 1} onChange={setWork} />
          <div className="builder-actions">
            <button className="btn btn-sm btn-primary" onClick={check}>
              Check
            </button>
            <button className="btn btn-sm btn-quiet" onClick={() => setWork(skeleton(m))} aria-label="Start over">
              <Icon name="reset" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** A small 3D VSEPR model (shown beside a Lewis structure once a shapes card is answered). */
function Mini3D({ state }: { state: NonNullable<ReturnType<typeof sceneFor>> }) {
  const [host, scene] = useScene((el) => new VseprScene(el))
  useEffect(() => {
    if (!scene) return
    scene.setState(state)
    scene.setOptions({ arcs: true, hull: false })
  }, [scene, state])
  return (
    <div className="practice-split-3d" ref={host} role="img" aria-label="3D shape">
      {scene && <SceneLabelsOverlay scene={scene} />}
    </div>
  )
}

/** An MO diagram card: read it, click a level, or fill it in yourself. */
function MoStage({ visual, revealed, interaction, onAttempt }: { visual: Extract<Visual, { kind: 'mo' }>; revealed: boolean; interaction?: Interaction; onAttempt?: Attempt }) {
  const m = diatomicById(visual.molecule)
  const d = DIAGRAMS[m.diagram]
  const [arrows, setArrows] = useState<Arrows>(() => emptyArrows(d))
  const [flag, setFlag] = useState<string | undefined>()
  const filling = interaction?.kind === 'fill-mo'
  const clicking = interaction?.kind === 'click-level' ? interaction : null
  const toggle = (level: string, i: number) => {
    setFlag(undefined)
    setArrows((a) => ({ ...a, [level]: a[level].map((x, j) => (j === i ? (x + 1) % 3 : x)) }))
  }
  const check = () => {
    const r = checkFill(d, visual.electrons, arrows)
    setFlag(r.level)
    onAttempt?.(r.ok, r.message)
  }
  const n = arrowCount(arrows)
  return (
    <div className={`practice-canvas practice-flat ${filling ? 'has-tools is-slim' : ''}`}>
      <MoDiagram
        molecule={m}
        electrons={visual.electrons}
        filled={revealed || visual.filledBefore}
        compact
        build={filling ? { arrows, onToggle: toggle, highlight: flag } : undefined}
        onSelect={
          clicking
            ? (lv) => {
                const ok = clicking.correct.includes(lv.id)
                onAttempt?.(ok, ok ? undefined : `Not ${lv.label.replace('_', '')}.`)
              }
            : undefined
        }
      />
      {filling && (
        <div className="builder-tools" role="group" aria-label="Fill controls">
          <p className={`lewis-count ${n === visual.electrons ? 'is-full' : n > visual.electrons ? 'is-over' : ''}`} aria-live="polite">
            <span className="mono">
              {n}/{visual.electrons}
            </span>{' '}
            electrons
          </p>
          <p className="lewis-edit-hint mo-fill-tip">Click a line: ↑, then ↑↓, then empty.</p>
          <div className="builder-actions">
            <button className="btn btn-sm btn-primary" onClick={check}>
              Check
            </button>
            <button className="btn btn-sm btn-quiet" onClick={() => setArrows(emptyArrows(d))} aria-label="Clear the diagram">
              <Icon name="reset" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
