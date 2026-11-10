/*
  PolarityPage.tsx — is a molecule polar? Two questions, shown in 3D:
    1. Are its bonds polar? (an arrow on each bond, toward the more electronegative atom)
    2. Does its shape let those arrows cancel? (slide them tip-to-tail and see where they end)

  Molecules come in look-alike pairs (CO₂ vs H₂O, ...). For each one the student predicts
  "polar or nonpolar?" first; answering slides the arrows together to show why.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { QuizBox } from '../lessons/LessonPanel'
import { useStoredState } from '../lessons/progress'
import { bondDipoles, byId, PAIRS, type PolarMolecule } from '../polarity/molecules'
import PolarityLabels from '../polarity/PolarityLabels'
import { PolarityScene } from '../polarity/PolarityScene'
import './PolarityPage.css'

export default function PolarityPage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<PolarityScene | null>(null)
  const [pairId, setPairId] = useStoredState('ps.polarity.pair', PAIRS[0].id)
  const pair = PAIRS.find((p) => p.id === pairId) ?? PAIRS[0]
  const [which, setWhich] = useState(0)
  const molecule = byId(pair.molecules[which])
  const [summed, setSummed] = useState(false)
  const [charges, setCharges] = useState(true)
  const [lonePairs, setLonePairs] = useState(true)
  const [done, setDone] = useStoredState<string[]>('ps.polarity.done', [])

  useEffect(() => {
    const sc = new PolarityScene(hostRef.current!)
    setScene(sc)
    return () => {
      sc.dispose()
      setScene(null)
    }
  }, [])

  // New molecule: arrows start beside their bonds.
  useEffect(() => {
    if (!scene) return
    scene.setMolecule(molecule)
    scene.setSum(false, true)
  }, [scene, molecule])
  useEffect(() => scene?.setSum(summed), [scene, summed])
  useEffect(() => scene?.setOptions({ lonePairs }), [scene, lonePairs])

  /** Switching molecule (or pair) starts with the arrows beside their bonds again. */
  const chooseMolecule = (i: number) => {
    setWhich(i)
    setSummed(false)
  }
  const choosePair = (id: string) => {
    setPairId(id)
    chooseMolecule(0)
  }

  return (
    <div className="pol-page">
      <div className="pol-backdrop" aria-hidden="true" />
      <div className="pol-stage">
        <div
          ref={hostRef}
          className="pol-canvas"
          role="img"
          aria-label={`3D model of ${molecule.name} (${molecule.formula}) with bond dipole arrows${summed ? ', added tip to tail' : ''}. Drag to rotate.`}
        />
        {scene && <PolarityLabels scene={scene} molecule={molecule} charges={charges} />}

        <div className="pol-steps panel" role="radiogroup" aria-label="Arrows">
          <button role="radio" aria-checked={!summed} className={`pol-step ${!summed ? 'is-active' : ''}`} onClick={() => setSummed(false)}>
            <span className="pol-step-num">1</span> Bond dipoles
          </button>
          <button role="radio" aria-checked={summed} className={`pol-step ${summed ? 'is-active' : ''}`} onClick={() => setSummed(true)}>
            <span className="pol-step-num">2</span> Add them up
          </button>
        </div>
      </div>

      <section className="lesson pol-panel panel" aria-label="Polarity">
        <header>
          <h1 className="pol-title">Polarity</h1>
          <p className="pol-sub">
            A molecule is polar when its bond dipoles don’t cancel. Ask two questions: are the bonds polar, and does the
            shape let them cancel?
          </p>
        </header>

        <div className="pair-tabs" role="tablist" aria-label="Look-alike pairs">
          {PAIRS.map((p) => (
            <button key={p.id} role="tab" aria-selected={p.id === pair.id} className={`pair-tab ${p.id === pair.id ? 'is-active' : ''}`} onClick={() => choosePair(p.id)}>
              {p.title}
              {p.molecules.every((id) => done.includes(id)) && <span className="pair-done" aria-label="(both done)"> ✓</span>}
            </button>
          ))}
        </div>
        <p className="pol-pair-lesson">{pair.lesson}</p>

        <div className="mol-switch" role="radiogroup" aria-label="Molecule">
          {pair.molecules.map((id, i) => {
            const m = byId(id)
            return (
              <button key={id} role="radio" aria-checked={i === which} className={`mol-btn ${i === which ? 'is-active' : ''}`} onClick={() => chooseMolecule(i)}>
                <span className="mol-formula">{m.formula}</span>
                <span className="mol-name">
                  {m.name}
                  {done.includes(id) && ' ✓'}
                </span>
              </button>
            )
          })}
        </div>

        <QuizBox
          key={molecule.id}
          quiz={{
            question: `Is ${molecule.formula} polar or nonpolar?`,
            choices: ['Polar', 'Nonpolar'],
            answer: molecule.dipole > 0 ? 0 : 1,
            explain: `${molecule.why} Measured dipole moment: ${molecule.dipole === 0 ? '0 D' : `${molecule.dipole.toFixed(2)} D`}.`,
            hint: 'Picture the arrows sliding tip to tail. Do they end up back where they started?',
          }}
          number={which + 1}
          total={2}
          reveals={false}
          label="Predict first"
          prompt="Look at the shape and the bond arrows, then decide."
          onDone={() => {
            setSummed(true)
            if (!done.includes(molecule.id)) setDone([...done, molecule.id])
          }}
        />

        <Facts molecule={molecule} />

        {which === 0 && (
          <button className="btn" onClick={() => chooseMolecule(1)}>
            Now try {byId(pair.molecules[1]).formula} <span className="arrow">→</span>
          </button>
        )}

        <p className="lesson-note">
          Bond lengths and angles are measured values. Arrow lengths come from electronegativity differences (Pauling
          scale), drawn to scale within each molecule (and between HF and HCl). It is a simple model that predicts polar vs nonpolar but not exact sizes: lone pairs also contribute. Arrows
          point toward the δ− end, with a + on the tail (the usual chemistry convention).
        </p>
      </section>

      <div className="pol-toggles panel" role="group" aria-label="Show or hide">
        <Toggle label="Partial charges" on={charges} onChange={setCharges} />
        <Toggle label="Lone pairs" on={lonePairs} onChange={setLonePairs} />
        <button className="tool-btn" onClick={() => scene?.resetView()}>
          Reset view
        </button>
      </div>
    </div>
  )
}

function Facts({ molecule }: { molecule: PolarMolecule }) {
  // One row per kind of bond, e.g. "C–O 0.89".
  const bonds = useMemo(() => {
    const seen = new Map<string, number>()
    for (const b of bondDipoles(molecule)) seen.set(`${molecule.atoms[b.from].el}–${molecule.atoms[b.to].el}`, b.delta)
    return [...seen]
  }, [molecule])
  return (
    <dl className="pol-facts">
      <div>
        <dt>Shape</dt>
        <dd>{molecule.shape}</dd>
      </div>
      <div>
        <dt>Electronegativity difference</dt>
        <dd className="mono">{bonds.map(([k, d]) => `${k} ${d.toFixed(2)}`).join(' · ')}</dd>
      </div>
    </dl>
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
