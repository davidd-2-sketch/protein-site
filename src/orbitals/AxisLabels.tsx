/* AxisLabels.tsx — x / y / z labels at the ends of the orbital axes. Used by Orbitals and practice. */
import { useEffect, useRef } from 'react'
import type { OrbitalScene } from './OrbitalScene'

/** x / y / z labels at the ends of the axes, moved after each redraw. */
export default function AxisLabels({ scene }: { scene: OrbitalScene }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([])
  useEffect(() => {
    const place = () =>
      scene.axisLabelPositions().forEach((a, i) => {
        const el = refs.current[i]
        if (!el) return
        const p = scene.stage.project(a.position)
        el.style.visibility = p.behind ? 'hidden' : 'visible'
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`
      })
    place()
    return scene.stage.onAfterRender(place)
  }, [scene])
  return (
    <div className="overlay" aria-hidden="true">
      {['x', 'y', 'z'].map((t, i) => (
        <span key={t} ref={(el) => void (refs.current[i] = el)} className="axis-label">
          {t}
        </span>
      ))}
    </div>
  )
}
