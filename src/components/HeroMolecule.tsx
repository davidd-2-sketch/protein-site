/*
  HeroMolecule.tsx — the live 3D molecule on the home page.

  React and Three.js have different jobs:
    • React draws the page's HTML (the caption and labels).
    • Three.js draws into a <canvas> inside that HTML.
  useEffect is the bridge: it runs after React has put the <div> on the page,
  creates the Three.js scene inside it, and cleans up when the page closes.

  The caption, honesty label, and "drag to rotate" hint sit UNDER the model, so
  nothing is ever drawn on top of it.
*/
import { useEffect, useRef, useState } from 'react'
import type { HoveredAtom } from '../three/MoleculeScene'
import './HeroMolecule.css'

export default function HeroMolecule() {
  const canvasHost = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<HoveredAtom | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let scene: { dispose(): void } | undefined
    let cancelled = false
    // Download Three.js + the ATP data only once the page itself is on screen and the
    // browser is idle: the text appears first, the molecule a moment later.
    const start = () =>
      Promise.all([import('../three/MoleculeScene'), import('../data/molecules/atp')]).then(([{ MoleculeScene }, { default: atp }]) => {
        if (cancelled || !canvasHost.current) return
        const s = new MoleculeScene(canvasHost.current, { autoRotate: true, enableZoom: false, onHover: setHovered })
        s.setMolecule(atp)
        scene = s
        setReady(true)
      })
    // (requestIdleCallback isn't in every browser; a short timer is the fallback.)
    const idle = 'requestIdleCallback' in window
    const id = idle ? window.requestIdleCallback(() => void start(), { timeout: 1500 }) : window.setTimeout(() => void start(), 300)
    return () => {
      cancelled = true
      if (idle) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
      scene?.dispose()
    }
  }, [])

  return (
    <figure className="hero-mol">
      <div ref={canvasHost} className={`hero-mol-canvas ${ready ? 'is-ready' : ''}`} role="img" aria-label="Interactive 3D model of ATP. Drag to rotate." />
      <figcaption className="hero-mol-cap">
        <p className="hero-mol-name">
          ATP <span>· the cell’s energy currency</span>
        </p>
        <p className="hero-mol-meta">
          <span className="tag tag-illustrative">Illustrative</span>
          <span>Computed 3D shape from PubChem</span>
        </p>
        {/* One line that is either the hint or the atom under the pointer (never over the model). */}
        <p className="hero-mol-hint" aria-live="polite">
          {hovered ? (
            <>
              <strong>{hovered.elementName}</strong> ({hovered.element}) · {hovered.bondCount} {hovered.bondCount === 1 ? 'bond' : 'bonds'}
            </>
          ) : (
            'Drag to rotate · point at an atom'
          )}
        </p>
      </figcaption>
    </figure>
  )
}
