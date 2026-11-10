/*
  HeroMolecule.tsx — the live 3D "specimen" on the home page.

  React and Three.js have different jobs:
    • React draws the page's HTML (panels, text, readouts).
    • Three.js draws into a <canvas> inside that HTML.
  useEffect is the bridge: it runs after React has put the <div> on the page,
  creates the Three.js scene inside it, and cleans up when the page closes.
*/
import { useEffect, useRef, useState } from 'react'
import type { HoveredAtom } from '../three/MoleculeScene'
import { ELEMENTS } from '../three/elements' // tiny file, safe to load right away
import './HeroMolecule.css'

export default function HeroMolecule() {
  const canvasHost = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<HoveredAtom | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let scene: { dispose(): void } | undefined
    let cancelled = false

    // Download Three.js + the ATP data only now (keeps the first page load fast).
    Promise.all([import('../three/MoleculeScene'), import('../data/molecules/atp')]).then(
      ([{ MoleculeScene }, { default: atp }]) => {
        if (cancelled || !canvasHost.current) return
        const s = new MoleculeScene(canvasHost.current, { autoRotate: true, enableZoom: false, onHover: setHovered })
        s.setMolecule(atp)
        scene = s
        setReady(true)
      },
    )

    return () => {
      cancelled = true
      scene?.dispose()
    }
  }, [])

  return (
    <figure className="specimen" aria-label="Interactive 3D model of ATP. Drag to rotate.">
      {/* Header strip, like the title bar of a lab instrument. */}
      <div className="specimen-head">
        <span className="specimen-id">
          <span className="live-dot" aria-hidden="true" />
          Specimen 01
        </span>
        <span>Adenosine triphosphate</span>
      </div>

      <div className="specimen-stage">
        <div ref={canvasHost} className={`specimen-canvas ${ready ? 'is-ready' : ''}`} />
        {/* Corner brackets: a viewfinder detail. Purely decorative. */}
        <span className="corner tl" aria-hidden="true" />
        <span className="corner tr" aria-hidden="true" />
        <span className="corner bl" aria-hidden="true" />
        <span className="corner br" aria-hidden="true" />

        <div className="specimen-hover" aria-live="polite">
          {hovered ? (
            <>
              <span className="hover-symbol">{hovered.element}</span>
              <span>
                {hovered.elementName}
                <span className="hover-meta">
                  atom #{hovered.index + 1} · {hovered.bondCount} {hovered.bondCount === 1 ? 'bond' : 'bonds'}
                </span>
              </span>
            </>
          ) : (
            <span className="hover-hint">Drag to rotate · hover an atom</span>
          )}
        </div>
      </div>

      {/* Data readouts. Formula and molar mass are standard reference values for ATP. */}
      <dl className="specimen-readout">
        <div>
          <dt>Formula</dt>
          <dd>
            C<sub>10</sub>H<sub>16</sub>N<sub>5</sub>O<sub>13</sub>P<sub>3</sub>
          </dd>
        </div>
        <div>
          <dt>Molar mass</dt>
          <dd>507.18 g/mol</dd>
        </div>
        <div>
          <dt>Atoms</dt>
          <dd>47</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd className="readout-model">Computed · PubChem 5957</dd>
        </div>
      </dl>

      <ElementLegend />
    </figure>
  )
}

/* Color legend: element symbol always shown in text, so color is never the only cue. */
function ElementLegend() {
  return (
    <ul className="legend" aria-label="Element colors">
      {['C', 'H', 'N', 'O', 'P'].map((sym) => (
        <li key={sym} title={ELEMENTS[sym].name}>
          <span className="legend-swatch" style={{ background: ELEMENTS[sym].color }} aria-hidden="true" />
          {sym}
          <span className="legend-name">{ELEMENTS[sym].name}</span>
        </li>
      ))}
    </ul>
  )
}
