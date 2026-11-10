/*
  OverlayLabels.tsx — HTML labels and dashed lines that stick to atoms in the 3D view.

  How it works:
    1. Look up the 3D position of each labeled atom once.
    2. After every frame Mol* draws, convert those 3D positions to screen pixels
       ("projection") and move the labels there.
  We move the elements directly (not through React state) because this runs up to
  60 times per second, and re-rendering React that often would be wasteful.
*/
import { useEffect, useMemo, useRef } from 'react'
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra'
import type { ProteinViewer } from '../protein/ProteinViewer'
import type { MeasureLine, PinLabel } from './types'

interface Props {
  viewer: ProteinViewer | null
  labels: PinLabel[]
  lines: MeasureLine[]
}

export default function OverlayLabels({ viewer, labels, lines }: Props) {
  const labelEls = useRef<(HTMLDivElement | null)[]>([])
  const lineEls = useRef<(SVGLineElement | null)[]>([])
  const lineTextEls = useRef<(HTMLDivElement | null)[]>([])

  // Resolve 3D positions once per step.
  const resolved = useMemo(() => {
    if (!viewer) return { labels: [], lines: [] }
    return {
      labels: labels.map((l) => {
        const a = l.at
        if ('chainCenter' in a) return viewer.chainCenter(a.chainCenter)
        if ('between' in a) {
          const p = viewer.atomPosition(a.between[0])
          const q = viewer.atomPosition(a.between[1])
          return p && q ? Vec3.lerp(Vec3(), p, q, 0.5) : null
        }
        return viewer.atomPosition(a)
      }),
      lines: lines.map((l) => {
        const p = viewer.atomPosition(l.from)
        const q = viewer.atomPosition(l.to)
        return p && q ? { p, q, distance: Vec3.distance(p, q) } : null
      }),
    }
  }, [viewer, labels, lines])

  // Re-position everything after each frame.
  useEffect(() => {
    if (!viewer) return
    const place = () => {
      resolved.labels.forEach((p, i) => {
        const el = labelEls.current[i]
        if (!el) return
        const s = p && viewer.project(p)
        el.style.visibility = s && !s.behind ? 'visible' : 'hidden'
        if (s) el.style.transform = `translate(${s.x}px, ${s.y}px)`
      })
      resolved.lines.forEach((ln, i) => {
        const el = lineEls.current[i]
        const txt = lineTextEls.current[i]
        if (!el || !txt || !ln) return
        const a = viewer.project(ln.p)
        const b = viewer.project(ln.q)
        if (!a || !b) return
        el.setAttribute('x1', String(a.x))
        el.setAttribute('y1', String(a.y))
        el.setAttribute('x2', String(b.x))
        el.setAttribute('y2', String(b.y))
        txt.style.transform = `translate(${(a.x + b.x) / 2}px, ${(a.y + b.y) / 2}px)`
      })
    }
    place()
    return viewer.onDraw(place)
  }, [viewer, resolved])

  if (!labels.length && !lines.length) return null

  return (
    <div className="overlay" aria-hidden="true">
      <svg className="overlay-lines">
        {lines.map((_, i) => (
          <line key={i} ref={(el) => void (lineEls.current[i] = el)} />
        ))}
      </svg>
      {lines.map((l, i) => (
        <div key={i} ref={(el) => void (lineTextEls.current[i] = el)} className="overlay-line-label">
          <span>
            {l.label} · {resolved.lines[i]?.distance.toFixed(2)} Å
          </span>
        </div>
      ))}
      {labels.map((l, i) => (
        <div key={i} ref={(el) => void (labelEls.current[i] = el)} className={`overlay-label tone-${l.tone ?? 'default'}`}>
          <span>{l.text}</span>
        </div>
      ))}
    </div>
  )
}
