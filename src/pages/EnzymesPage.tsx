/*
  EnzymesPage.tsx — how enzymes work, shown on real structures from the Protein Data Bank.

  Explore → Structure: two real enzymes in the Mol* viewer.
    • Chymotrypsin (6CHA with a transition-state mimic, 4CHA empty): the catalytic triad,
      the oxyanion hole, and the specificity pocket. Every residue is clickable.
    • Glucokinase (1V4T open, 1V4S closed around glucose): induced fit.
  Switching between the two forms of one enzyme keeps the camera still, and the structures
  are lined up on their rigid parts, so whatever moves on screen really moves in the data.

  Explore → Energy and Kinetics: the schematic energy diagram and interactive kinetics.
  Lessons: six guided lessons; each step chooses a structure (with camera, labels, and
  measured lines) or one of the charts.
*/
import { useEffect, useRef, useState } from 'react'
import ModeSwitch from '../components/ModeSwitch'
import LessonPanel from '../lessons/LessonPanel'
import type { Depth } from '../lessons/types'
import { useLessons } from '../lessons/useLessons'
import { ENZYME_LESSONS, type EnzymePick } from '../enzymes/lessons'
import LoadingScreen from '../components/LoadingScreen'
import { SlidingPill } from '../components/motion'
import OverlayLabels from '../lessons/OverlayLabels'
import { useStoredState } from '../lessons/progress'
import { BY_THREE } from '../protein/aminoAcids'
import { ProteinViewer } from '../protein/ProteinViewer'
import { CHYMO_SITE, GK_GLUCOSE_SITE, GK_OPEN_MISSING, STRUCTURES, type StructureId } from '../enzymes/structures'
import { GK_LID, GROUP_COLORS, GROUP_NAMES, siteInfo, VIEWS } from '../enzymes/views'
import EnergyChart from '../enzymes/EnergyChart'
import KineticsChart, { type KineticsPlot } from '../enzymes/KineticsChart'
import { apparent, DEMO, INHIBITION_INFO, rate, type Inhibition } from '../enzymes/kinetics'
import '../components/ModeSwitch.css'
import './ProteinPage.css'
import './EnzymesPage.css'

type Enzyme = 'chymo' | 'gk'
type Style = 'cartoon' | 'surface'
type Tab = 'structure' | 'energy' | 'kinetics'

const TABS: { id: Tab; label: string }[] = [
  { id: 'structure', label: 'Structure' },
  { id: 'energy', label: 'Energy' },
  { id: 'kinetics', label: 'Kinetics' },
]

const ENZYMES: { id: Enzyme; name: string; blurb: string }[] = [
  { id: 'chymo', name: 'Chymotrypsin', blurb: 'Cuts proteins. Catalytic triad.' },
  { id: 'gk', name: 'Glucokinase', blurb: 'Traps glucose. Induced fit.' },
]

/** The two forms of each enzyme, in the order shown on the switch. */
const FORMS: Record<Enzyme, { id: StructureId; label: string }[]> = {
  chymo: [
    { id: 'chymo-ts', label: 'Mimic bound' },
    { id: 'chymo-free', label: 'Empty' },
  ],
  gk: [
    { id: 'gk-open', label: 'Open (no glucose)' },
    { id: 'gk-closed', label: 'Closed (glucose)' },
  ],
}

export default function EnzymesPage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<ProteinViewer | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [enzyme, setEnzyme] = useStoredState<Enzyme>('ps.enzymes.enzyme', 'chymo')
  const [form, setForm] = useState<Record<Enzyme, StructureId>>({ chymo: 'chymo-ts', gk: 'gk-open' })
  /** Explore's choice (the panel's switches). */
  const structureId = form[enzyme]
  /** What's actually on screen (labels wait for the new structure to be drawn). */
  const [shown, setShown] = useState<StructureId | null>(null)
  const [switching, setSwitching] = useState(false)
  const [style, setStyle] = useState<Style>('cartoon')
  const [labelsOn, setLabelsOn] = useState(true)
  const [spin, setSpin] = useState(false)
  const [pick, setPick] = useState<{ chain: string; seq: number; comp: string } | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('structure')
  // Energy tab
  const [showUn, setShowUn] = useState(true)
  const [showCat, setShowCat] = useState(true)
  // Kinetics tab
  const [plot, setPlot] = useState<KineticsPlot>('mm')
  const [inhibition, setInhibition] = useState<Inhibition>('none')
  const [inhibitor, setInhibitor] = useState(2)
  const [substrate, setSubstrate] = useState(4)

  /* ---------- lessons ---------- */
  const [mode, setMode] = useStoredState<'lessons' | 'explore'>('ps.enzymes.mode', 'lessons')
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const L = useLessons(ENZYME_LESSONS, 'enzymes')
  useEffect(() => {
    if (L.fromLink) setMode('lessons')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const inLesson = mode === 'lessons' && L.step !== null
  const lv = L.step ? (L.revealed && L.step.revealView ? L.step.revealView : L.step.view) : null
  const lessonStructure = inLesson && lv?.kind === 'structure' ? lv : null

  // What's on screen: the lesson step's choice, or the Explore controls.
  const effTab: Tab = inLesson && lv ? (lv.kind === 'structure' ? 'structure' : lv.kind) : tab
  const effStructure: StructureId = lessonStructure ? lessonStructure.structure : form[enzyme]
  const effEnzyme: Enzyme = STRUCTURES[effStructure].enzyme === 'Chymotrypsin' ? 'chymo' : 'gk'
  const effStyle: Style = lessonStructure ? (lessonStructure.style ?? 'cartoon') : style
  const energy = inLesson && lv?.kind === 'energy' ? { un: lv.uncatalyzed, cat: lv.catalyzed } : { un: showUn, cat: showCat }
  const kin = inLesson && lv?.kind === 'kinetics' ? lv : { plot, type: inhibition, inhibitor, substrate }

  /* ---------- create the viewer once ---------- */
  useEffect(() => {
    let disposed = false
    let v: ProteinViewer | null = null
    ;(async () => {
      try {
        v = await ProteinViewer.create(hostRef.current!, { chains: VIEWS['chymo-ts'].chainStyles })
        if (disposed) return v.dispose()
        v.onHover(setHover)
        if (import.meta.env.DEV) (window as unknown as { __viewer: ProteinViewer }).__viewer = v
        setViewer(v)
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

  /* ---------- show the chosen structure ---------- */
  const lastEnzyme = useRef<Enzyme | null>(null)
  useEffect(() => {
    if (!viewer) return
    let cancelled = false
    const structureId = effStructure
    const view = VIEWS[structureId]
    ;(async () => {
      setSwitching(true)
      try {
        // Each structure downloads only the first time it's shown (about 300 KB each).
        await viewer.load(STRUCTURES[structureId].file, { key: structureId, transform: view.transform })
        if (cancelled) return
        viewer.useStructure(structureId)
        viewer.setChainStyles(view.chainStyles)
        await viewer.setView({
          chains: view.chains,
          style: effStyle,
          color: 'chain',
          hemes: false,
          ligands: view.ligands,
          groups: view.groups.map((g) => ({ residues: g.residues, color: GROUP_COLORS[g.group] })),
          pick: 'residue',
        })
        if (cancelled) return
        // Frame the active site when a different ENZYME appears; keep the camera still when
        // switching forms of the same enzyme, so the real movement is easy to see.
        // (In a lesson, each step frames the camera itself; see below.)
        if (!inLesson && lastEnzyme.current !== effEnzyme) viewer.focusResidues(view.focus, 14, lastEnzyme.current ? 700 : 0)
        lastEnzyme.current = effEnzyme
        setShown(structureId)
        setStatus('ready')
      } catch (err) {
        console.error(err)
        if (!cancelled) setStatus('error')
      } finally {
        if (!cancelled) setSwitching(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [viewer, effStructure, effStyle, effEnzyme, inLesson])

  // The 3D view is hidden (not destroyed) on the chart tabs; stop any spinning there.
  useEffect(() => viewer?.setSpin(spin && effTab === 'structure'), [viewer, spin, effTab])

  /* ---------- lesson camera: frame each step once (not again when its answer is revealed) ---------- */
  const stepKey = L.lesson ? `${L.lesson.id}-${L.stepIndex}` : ''
  const framed = useRef('')
  useEffect(() => {
    if (!viewer || !lessonStructure || shown !== lessonStructure.structure || framed.current === stepKey) return
    framed.current = stepKey
    const f = lessonStructure.focus ?? 'site'
    if (f === 'whole') viewer.resetCamera(700)
    else if (f === 'site') viewer.focusResidues(VIEWS[lessonStructure.structure].focus, lessonStructure.radius ?? 14, 700)
    else viewer.focusResidues(f, lessonStructure.radius ?? 8, 700)
  }, [viewer, lessonStructure, shown, stepKey])

  /* ---------- clicks (also checks "click the …" lesson tasks) ---------- */
  const reportRef = useRef<(p: EnzymePick) => void>(() => {})
  useEffect(() => {
    reportRef.current = (p) => inLesson && L.report(p)
  }, [inLesson, L])
  useEffect(() => {
    if (!viewer) return
    return viewer.onPick((p) => {
      const picked = p?.kind === 'atom' ? { chain: p.atom.chain, seq: p.atom.seq, comp: p.atom.comp } : null
      setPick(picked)
      if (picked) reportRef.current(picked)
    })
  }, [viewer])

  const chooseEnzyme = (e: Enzyme) => {
    setEnzyme(e)
    setPick(null)
  }
  const focusResidue = (chain: string, seq: number, comp: string) => {
    setPick({ chain, seq, comp })
    viewer?.focusResidues([{ chain, seq }], 7, 700)
    viewer?.highlightResidue({ chain, seq })
  }

  const s = STRUCTURES[effStructure]
  const ready = status === 'ready'
  const labels = !shown ? [] : lessonStructure ? (lessonStructure.labels ?? VIEWS[shown].labels) : labelsOn ? VIEWS[shown].labels : []
  const lines = lessonStructure?.lines ?? []

  return (
    <div className={`protein-page enzymes-page has-lessons is-${effTab}`}>
      <div className="protein-backdrop" aria-hidden="true" />
      <div className="stage">
        <div
          ref={hostRef}
          className={`protein-canvas ${ready ? 'is-ready' : ''} ${switching && ready ? 'is-switching' : ''}`}
          role="img"
          aria-label={`3D model of ${s.enzyme}, ${s.state} (PDB ${s.pdb}). Drag to rotate, scroll to zoom, click a residue for details.`}
        />
        {ready && shown && effTab === 'structure' && <OverlayLabels key={`${shown}-${stepKey}`} viewer={viewer} labels={labels} lines={lines} />}
      </div>

      {effTab !== 'structure' && (
        <div className="enz-chart-stage" key={effTab}>
          {effTab === 'energy' ? (
            <EnergyChart showUncatalyzed={energy.un} showCatalyzed={energy.cat} />
          ) : (
            <KineticsChart plot={kin.plot} type={kin.type} inhibitor={kin.inhibitor} substrate={kin.substrate} />
          )}
        </div>
      )}

      {status === 'loading' && <LoadingScreen label="Loading enzyme" />}
      {status === 'error' && (
        <div className="protein-error panel" role="alert">
          <h2>The 3D viewer couldn't start</h2>
          <p>Your browser may have 3D graphics (WebGL) turned off. Try another browser, or update this one.</p>
        </div>
      )}

      {mode === 'lessons' ? (
        <LessonPanel
          listTitle="Learn enzymes"
          listBlurb="Six short lessons on real enzymes: the active site, the catalytic triad, induced fit, lowering the barrier, kinetics, and inhibitors."
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
      <section className="lesson enzyme-panel panel" aria-label="Enzymes">
        <ModeSwitch mode="explore" onChange={() => setMode('lessons')} />
        <header>
          <h1 className="enz-title">Enzymes</h1>
          <p className="enz-sub">Two real enzymes from the Protein Data Bank. Click any residue to see what it does.</p>
        </header>

        <div className="mode-switch is-three has-pill" role="tablist" aria-label="What to explore">
          <SlidingPill active={tab} />
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`mode-btn ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'energy' && <EnergyPanel showUn={showUn} showCat={showCat} onUn={setShowUn} onCat={setShowCat} />}
        {tab === 'kinetics' && (
          <KineticsPanel
            plot={plot}
            onPlot={setPlot}
            type={inhibition}
            onType={setInhibition}
            inhibitor={inhibitor}
            onInhibitor={setInhibitor}
            substrate={substrate}
            onSubstrate={setSubstrate}
          />
        )}

        {tab === 'structure' && (
        <>
        <div className="enz-cards" role="radiogroup" aria-label="Enzyme">
          {ENZYMES.map((e) => (
            <button key={e.id} role="radio" aria-checked={enzyme === e.id} className={`enz-card ${enzyme === e.id ? 'is-active' : ''}`} onClick={() => chooseEnzyme(e.id)}>
              <span className="enz-card-name">{e.name}</span>
              <span className="enz-card-blurb">{e.blurb}</span>
            </button>
          ))}
        </div>

        <div className="mode-switch has-pill" role="radiogroup" aria-label="Form">
          <SlidingPill active={structureId} />
          {FORMS[enzyme].map((f) => (
            <button key={f.id} role="radio" aria-checked={structureId === f.id} className={`mode-btn ${structureId === f.id ? 'is-active' : ''}`} onClick={() => setForm({ ...form, [enzyme]: f.id })}>
              {f.label}
            </button>
          ))}
        </div>

        <StructureCard id={structureId} />

        {pick && <PickCard structure={structureId} pick={pick} onClose={() => setPick(null)} />}

        <SiteList enzyme={enzyme} structure={structureId} onSelect={focusResidue} />

        <EnzymeNote structure={structureId} />
        </>
        )}
      </section>
      )}

      {effTab === 'structure' && (
      <>
      <div className="protein-bottom">
        <div className="toolbar panel" role="toolbar" aria-label="View controls">
          {!inLesson && (
          <>
          <div className="segmented" role="radiogroup" aria-label="Style">
            {(
              [
                ['cartoon', 'Ribbon'],
                ['surface', 'Surface'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} role="radio" aria-checked={style === id} className={`segmented-btn ${style === id ? 'is-active' : ''}`} onClick={() => setStyle(id)}>
                {label}
              </button>
            ))}
          </div>
          <span className="toolbar-divider" aria-hidden="true" />
          </>
          )}
          <button className={`tool-btn ${labelsOn ? 'is-on' : ''}`} aria-pressed={labelsOn} onClick={() => setLabelsOn((l) => !l)}>
            Labels
          </button>
          <button className="tool-btn" onClick={() => viewer?.focusResidues(VIEWS[effStructure].focus, 14, 700)}>
            Active site
          </button>
          <button className="tool-btn" onClick={() => viewer?.resetCamera()}>
            Whole enzyme
          </button>
          <button className={`tool-btn ${spin ? 'is-on' : ''}`} aria-pressed={spin} onClick={() => setSpin((v) => !v)}>
            Spin
          </button>
        </div>
      </div>

      <div className="readout">
        <p className="readout-hover mono">{hover ?? 'Drag to rotate · scroll to zoom · click a residue'}</p>
        <ul className="legend-list" aria-label="Color key">
          {VIEWS[effStructure].groups.map((g) => (
            <li key={g.group}>
              <span className="legend-chip" style={{ background: GROUP_COLORS[g.group] }} aria-hidden="true" />
              {GROUP_NAMES[g.group]}
            </li>
          ))}
          {VIEWS[effStructure].ligands.length > 0 && (
            <li>
              <span className="legend-chip" style={{ background: '#ff9ee6' }} aria-hidden="true" />
              Bound molecule{VIEWS[effStructure].ligands.length > 1 ? 's' : ''}
            </li>
          )}
        </ul>
      </div>
      </>
      )}
    </div>
  )
}

/* ---------- the structure's ID card: what it is and where it comes from ---------- */
function StructureCard({ id }: { id: StructureId }) {
  const s = STRUCTURES[id]
  return (
    <div className="enz-source">
      <p className="enz-source-top">
        <span className="tag tag-experimental">Experimental structure</span>
        <a href={`https://www.rcsb.org/structure/${s.pdb}`} target="_blank" rel="noreferrer" className="mono">
          PDB {s.pdb} ↗
        </a>
      </p>
      <p className="enz-source-name">
        {s.enzyme}, {s.state}
      </p>
      <p className="enz-source-meta">
        {s.organism} · {s.method}, {s.resolution} Å · {s.year}
      </p>
      {Object.keys(s.ligands).length > 0 && (
        <p className="enz-source-meta">Bound: {Object.values(s.ligands).join('; ')}</p>
      )}
    </div>
  )
}

/* ---------- what was clicked ---------- */
function PickCard({ structure, pick, onClose }: { structure: StructureId; pick: { chain: string; seq: number; comp: string }; onClose: () => void }) {
  const info = siteInfo(structure, pick.chain, pick.seq)
  const aa = BY_THREE.get(pick.comp)
  const ligand = STRUCTURES[structure].ligands[pick.comp]
  return (
    <div className="enz-pick" style={info ? { borderColor: info.color } : undefined} role="status">
      <button className="enz-pick-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      {ligand ? (
        <>
          <p className="enz-pick-name">Bound molecule</p>
          <p>{ligand[0].toUpperCase() + ligand.slice(1)}.</p>
        </>
      ) : (
        <>
          <p className="enz-pick-name">
            {aa ? `${aa.name} ${pick.seq}` : `${pick.comp} ${pick.seq}`}
            <span className="mono"> {pick.comp}</span>
          </p>
          {info ? (
            <>
              <p className="enz-pick-group" style={{ color: info.color }}>
                {info.groupName}
              </p>
              <p>{info.role}</p>
            </>
          ) : (
            <p className="enz-pick-plain">Part of the enzyme’s structure, not one of the active-site residues highlighted here.</p>
          )}
        </>
      )}
    </div>
  )
}

/* ---------- the active-site residues, as a clickable list ---------- */
function SiteList({ enzyme, structure, onSelect }: { enzyme: Enzyme; structure: StructureId; onSelect: (chain: string, seq: number, comp: string) => void }) {
  const missing = (seq: number) => structure === 'gk-open' && seq >= GK_OPEN_MISSING.from && seq <= GK_OPEN_MISSING.to
  const groups =
    enzyme === 'chymo'
      ? (['triad', 'oxyanion', 'pocket'] as const).map((g) => ({ g, list: CHYMO_SITE.filter((r) => r.group === g) }))
      : [
          { g: 'glucose' as const, list: GK_GLUCOSE_SITE },
          { g: 'lid' as const, list: GK_LID },
        ]
  return (
    <div className="enz-site">
      {groups.map(({ g, list }) => (
        <div key={g}>
          <p className="enz-site-head">
            <span className="legend-chip" style={{ background: GROUP_COLORS[g] }} aria-hidden="true" />
            {GROUP_NAMES[g]}
          </p>
          <div className="enz-chips">
            {list.map((r) => {
              // Standard 3-letter code from the file (ASN → Asn), never a shortened full name.
              const name = `${r.comp[0]}${r.comp.slice(1).toLowerCase()}${r.seq}`
              return missing(r.seq) ? (
                <span key={r.seq} className="enz-chip is-missing" title="Not visible in the open structure: this loop is too floppy to locate">
                  {name}
                </span>
              ) : (
                <button key={r.seq} className="enz-chip" onClick={() => onSelect(r.chain, r.seq, r.comp)}>
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- one honest note per structure ---------- */
function EnzymeNote({ structure }: { structure: StructureId }) {
  const text: Record<StructureId, string> = {
    'chymo-ts':
      'The bound molecule is a transition-state mimic: it is attached to Ser195 and copies the shape of the reaction’s high-energy moment, so it sticks tightly. This file holds two copies of the enzyme; one is shown. Residue numbers follow the standard chymotrypsin numbering.',
    'chymo-free':
      'Nothing is bound. Switch to “Mimic bound”: the active site barely moves (less than 1 Å). Chymotrypsin’s pocket is already the right shape, close to the “lock and key” idea.',
    'gk-open':
      'Glucose site empty, lid open. Residues 157–179 (including Thr168 and Lys169) are missing: that loop is too floppy to see in the crystal. Switch to “Closed” to watch the lid swing shut.',
    'gk-closed':
      'With glucose bound, the lid has swung more than 10 Å to close over it (“induced fit”), and the floppy loop is now ordered. The pink molecule on the far side is a synthetic activator used to help crystallize this form; it binds a separate site.',
  }
  return <p className="lesson-note">{text[structure]}</p>
}

/* ---------- Energy tab: what the diagram shows ---------- */
function EnergyPanel(p: { showUn: boolean; showCat: boolean; onUn: (v: boolean) => void; onCat: (v: boolean) => void }) {
  return (
    <div className="enz-tab">
      <div className="enz-toggles">
        <button className={`enz-toggle is-un ${p.showUn ? 'is-on' : ''}`} aria-pressed={p.showUn} onClick={() => p.onUn(!p.showUn)}>
          <span aria-hidden="true" /> Without enzyme
        </button>
        <button className={`enz-toggle is-cat ${p.showCat ? 'is-on' : ''}`} aria-pressed={p.showCat} onClick={() => p.onCat(!p.showCat)}>
          <span aria-hidden="true" /> With enzyme
        </button>
      </div>
      <ul className="enz-points">
        <li>
          <strong>Lower barrier, faster reaction.</strong> The enzyme binds the transition state more tightly than the
          substrate, which lowers the activation energy (Eₐ). A lower barrier means many more molecules get over it each second.
        </li>
        <li>
          <strong>Same ΔG.</strong> Both paths start and end at the same energies. An enzyme can’t make an unfavorable
          reaction favorable, or change where equilibrium lies; it only gets there faster, in both directions.
        </li>
        <li>
          <strong>New stops along the way.</strong> With the enzyme, the path passes through bound complexes (ES, EP). The
          barrier that matters is measured from ES, the low point just before the peak.
        </li>
      </ul>
      <p className="lesson-note">
        Schematic: the shapes follow standard textbook diagrams, but the heights are not measured values.
      </p>
    </div>
  )
}

/* ---------- Kinetics tab: controls and live numbers ---------- */
function KineticsPanel(p: {
  plot: KineticsPlot
  onPlot: (v: KineticsPlot) => void
  type: Inhibition
  onType: (v: Inhibition) => void
  inhibitor: number
  onInhibitor: (v: number) => void
  substrate: number
  onSubstrate: (v: number) => void
}) {
  const app = apparent(p.type, DEMO, p.type === 'none' ? 0 : p.inhibitor)
  const v = rate(p.substrate, app.vmax, app.km)
  const change = (now: number, before: number) => (Math.abs(now - before) < 1e-9 ? 'same' : now > before ? 'up' : 'down')
  const types: { id: Inhibition; label: string }[] = [
    { id: 'none', label: 'No inhibitor' },
    { id: 'competitive', label: 'Competitive' },
    { id: 'noncompetitive', label: 'Noncompetitive' },
    { id: 'uncompetitive', label: 'Uncompetitive' },
  ]
  const info = p.type !== 'none' ? INHIBITION_INFO[p.type] : null
  return (
    <div className="enz-tab">
      <div className="mode-switch has-pill" role="radiogroup" aria-label="Graph">
        <SlidingPill active={p.plot} />
        {(
          [
            ['mm', 'Michaelis–Menten'],
            ['lb', 'Lineweaver–Burk'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="radio" aria-checked={p.plot === id} className={`mode-btn ${p.plot === id ? 'is-active' : ''}`} onClick={() => p.onPlot(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="enz-types" role="radiogroup" aria-label="Inhibitor">
        {types.map((t) => (
          <button key={t.id} role="radio" aria-checked={p.type === t.id} className={`enz-type ${p.type === t.id ? 'is-active' : ''}`} onClick={() => p.onType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <label className={`enz-slider ${p.type === 'none' ? 'is-off' : ''}`}>
        <span>
          Inhibitor [I] <b className="mono">{p.inhibitor.toFixed(1)} mM</b>
        </span>
        <input type="range" min={0} max={5} step={0.1} value={p.inhibitor} disabled={p.type === 'none'} onChange={(e) => p.onInhibitor(Number(e.target.value))} />
      </label>
      {p.plot === 'mm' && (
        <label className="enz-slider">
          <span>
            Substrate [S] <b className="mono">{p.substrate.toFixed(1)} mM</b>
          </span>
          <input type="range" min={0} max={20} step={0.1} value={p.substrate} onChange={(e) => p.onSubstrate(Number(e.target.value))} />
        </label>
      )}

      <dl className="enz-readout">
        <div>
          <dt>Vmax</dt>
          <dd className="mono">
            {app.vmax.toFixed(1)} <Change dir={change(app.vmax, DEMO.vmax)} />
          </dd>
        </div>
        <div>
          <dt>Km</dt>
          <dd className="mono">
            {app.km.toFixed(2)} mM <Change dir={change(app.km, DEMO.km)} />
          </dd>
        </div>
        {p.plot === 'mm' && (
          <div>
            <dt>Rate at this [S]</dt>
            <dd className="mono">{v.toFixed(1)}</dd>
          </div>
        )}
      </dl>

      {info ? (
        <div className="enz-info">
          <p>
            <strong>{info.name}:</strong> binds {info.binds}.
          </p>
          <p>{info.effect}</p>
          <p className="enz-info-lb">Lineweaver–Burk: {info.lb}</p>
        </div>
      ) : (
        <p className="enz-points-text">
          <strong>Vmax</strong> is the top speed when every enzyme is busy. <strong>Km</strong> is the substrate
          concentration that gives half of Vmax: a low Km means the enzyme reaches half speed with less substrate.
        </p>
      )}

      <p className="lesson-note">
        The equations are the standard ones; the numbers (Vmax = {DEMO.vmax} µM/s, Km = {DEMO.km} mM, Ki = {DEMO.ki} mM) are
        made-up examples. “Noncompetitive” here is the textbook (MCAT) case where the inhibitor binds the enzyme and the
        enzyme–substrate complex equally well. Real inhibitors often bind one a bit more tightly (“mixed” inhibition),
        which changes Km too.
      </p>
    </div>
  )
}

function Change({ dir }: { dir: 'up' | 'down' | 'same' }) {
  const text = { up: '↑ up', down: '↓ down', same: '· same' }[dir]
  return <span className={`enz-change is-${dir}`}>{text}</span>
}
