/*
  EnzymesPage.tsx — how enzymes work, shown on real structures from the Protein Data Bank.

  Explore → Structure: two real enzymes in the Mol* viewer.
    • Chymotrypsin (6CHA with a transition-state mimic, 4CHA empty): the catalytic triad,
      the oxyanion hole, and the specificity pocket. Every residue is clickable.
    • Glucokinase (1V4T open, 1V4S closed around glucose): induced fit.
  Switching between the two forms of one enzyme keeps the camera still, and the structures
  are lined up on their rigid parts, so whatever moves on screen really moves in the data.
*/
import { useEffect, useRef, useState } from 'react'
import LoadingScreen from '../components/LoadingScreen'
import { SlidingPill } from '../components/motion'
import OverlayLabels from '../lessons/OverlayLabels'
import { useStoredState } from '../lessons/progress'
import { BY_THREE } from '../protein/aminoAcids'
import { ProteinViewer } from '../protein/ProteinViewer'
import { CHYMO_SITE, GK_GLUCOSE_SITE, GK_OPEN_MISSING, STRUCTURES, type StructureId } from '../enzymes/structures'
import { GK_LID, GROUP_COLORS, GROUP_NAMES, siteInfo, VIEWS } from '../enzymes/views'
import '../components/ModeSwitch.css'
import './ProteinPage.css'
import './EnzymesPage.css'

type Enzyme = 'chymo' | 'gk'
type Style = 'cartoon' | 'surface'

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
  const structureId = form[enzyme]
  /** What's actually on screen (labels wait for the new structure to be drawn). */
  const [shown, setShown] = useState<StructureId | null>(null)
  const [switching, setSwitching] = useState(false)
  const [style, setStyle] = useState<Style>('cartoon')
  const [labelsOn, setLabelsOn] = useState(true)
  const [spin, setSpin] = useState(false)
  const [pick, setPick] = useState<{ chain: string; seq: number; comp: string } | null>(null)
  const [hover, setHover] = useState<string | null>(null)

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
          style,
          color: 'chain',
          hemes: false,
          ligands: view.ligands,
          groups: view.groups.map((g) => ({ residues: g.residues, color: GROUP_COLORS[g.group] })),
          pick: 'residue',
        })
        if (cancelled) return
        // Frame the active site when a different ENZYME appears; keep the camera still when
        // switching forms of the same enzyme, so the real movement is easy to see.
        if (lastEnzyme.current !== enzyme) viewer.focusResidues(view.focus, 14, lastEnzyme.current ? 700 : 0)
        lastEnzyme.current = enzyme
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
  }, [viewer, structureId, style, enzyme])

  useEffect(() => viewer?.setSpin(spin), [viewer, spin])

  /* ---------- clicks ---------- */
  useEffect(() => {
    if (!viewer) return
    return viewer.onPick((p) => setPick(p?.kind === 'atom' ? { chain: p.atom.chain, seq: p.atom.seq, comp: p.atom.comp } : null))
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

  const s = STRUCTURES[structureId]
  const ready = status === 'ready'
  const labels = shown && labelsOn ? VIEWS[shown].labels : []

  return (
    <div className="protein-page enzymes-page has-lessons">
      <div className="protein-backdrop" aria-hidden="true" />
      <div className="stage">
        <div
          ref={hostRef}
          className={`protein-canvas ${ready ? 'is-ready' : ''} ${switching && ready ? 'is-switching' : ''}`}
          role="img"
          aria-label={`3D model of ${s.enzyme}, ${s.state} (PDB ${s.pdb}). Drag to rotate, scroll to zoom, click a residue for details.`}
        />
        {ready && shown && <OverlayLabels key={shown} viewer={viewer} labels={labels} lines={[]} />}
      </div>

      {status === 'loading' && <LoadingScreen label="Loading enzyme" />}
      {status === 'error' && (
        <div className="protein-error panel" role="alert">
          <h2>The 3D viewer couldn't start</h2>
          <p>Your browser may have 3D graphics (WebGL) turned off. Try another browser, or update this one.</p>
        </div>
      )}

      <section className="lesson enzyme-panel panel" aria-label="Enzymes">
        <header>
          <h1 className="enz-title">Enzymes</h1>
          <p className="enz-sub">Two real enzymes from the Protein Data Bank. Click any residue to see what it does.</p>
        </header>

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
      </section>

      <div className="protein-bottom">
        <div className="toolbar panel" role="toolbar" aria-label="View controls">
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
          <button className={`tool-btn ${labelsOn ? 'is-on' : ''}`} aria-pressed={labelsOn} onClick={() => setLabelsOn((l) => !l)}>
            Labels
          </button>
          <button className="tool-btn" onClick={() => viewer?.focusResidues(VIEWS[structureId].focus, 14, 700)}>
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
          {VIEWS[structureId].groups.map((g) => (
            <li key={g.group}>
              <span className="legend-chip" style={{ background: GROUP_COLORS[g.group] }} aria-hidden="true" />
              {GROUP_NAMES[g.group]}
            </li>
          ))}
          {VIEWS[structureId].ligands.length > 0 && (
            <li>
              <span className="legend-chip" style={{ background: '#ff9ee6' }} aria-hidden="true" />
              Bound molecule{VIEWS[structureId].ligands.length > 1 ? 's' : ''}
            </li>
          )}
        </ul>
      </div>
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
