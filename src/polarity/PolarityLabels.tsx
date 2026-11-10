/*
  PolarityLabels.tsx — HTML labels pinned to the polarity scene: atom symbols, δ+/δ−,
  and the net dipole (shown only once the arrows have been added up).
  Used by the Polarity page and by Practice.
*/
import { useEffect, useMemo, useRef } from 'react'
import type { PolarMolecule } from './molecules'
import { polarityLabels, type PolarityScene } from './PolarityScene'
import './PolarityLabels.css'

export default function PolarityLabels({ scene, molecule, charges }: { scene: PolarityScene; molecule: PolarMolecule; charges: boolean }) {
  const labels = useMemo(() => polarityLabels(molecule), [molecule])
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const place = () => {
      labels.forEach((l, i) => {
        const el = refs.current[i]
        if (!el) return
        const q = scene.stage.project(scene.toWorld(l.pos))
        const hidden = q.behind || (l.kind === 'charge' && !charges) || (l.kind === 'net' && scene.progress < 0.98)
        el.style.visibility = hidden ? 'hidden' : 'visible'
        el.style.transform = `translate(${q.x}px, ${q.y}px) translate(-50%, -50%)`
      })
    }
    place()
    return scene.stage.onAfterRender(place)
  }, [scene, labels, charges])

  return (
    <div className="overlay" aria-hidden="true">
      {labels.map((l, i) => (
        <div key={`${molecule.id}-${i}`} ref={(el) => void (refs.current[i] = el)} className={`pol-label is-${l.kind} ${l.text.endsWith('−') ? 'is-neg' : ''}`}>
          {l.text}
        </div>
      ))}
    </div>
  )
}

