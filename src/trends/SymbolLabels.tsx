/* SymbolLabels.tsx — element symbols kept on top of each column. Used by Trends and practice. */
import { useEffect, useMemo, useRef } from 'react'
import type { TrendsScene } from './TrendsScene'

/* ---------- Element symbols, kept on top of each column ---------- */

export default function SymbolLabels({ scene }: { scene: TrendsScene }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([])
  const labels = useMemo(() => scene.labels(), [scene])
  useEffect(() => {
    const place = () =>
      scene.labels().forEach((l, i) => {
        const el = refs.current[i]
        if (!el) return
        const p = scene.stage.project(l.position)
        el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`
        el.style.opacity = l.dim ? '0.35' : '1'
      })
    place()
    return scene.stage.onAfterRender(place)
  }, [scene])
  return (
    <div className="overlay" aria-hidden="true">
      {labels.map((l, i) => (
        <span key={l.text} ref={(el) => void (refs.current[i] = el)} className="symbol">
          {l.text}
        </span>
      ))}
    </div>
  )
}
