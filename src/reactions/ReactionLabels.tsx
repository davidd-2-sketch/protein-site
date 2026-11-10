/*
  ReactionLabels.tsx — labels pinned to atoms in a reaction animation (SN2 by default). `kinds` limits which
  labels appear (practice mode shows only element symbols and group names).
*/
import { useEffect, useMemo, useRef } from 'react'
import type { ReactionScene } from './ReactionScene'
import { SN2_LABELS, type ReactionLabel } from './sn2'

/* ---------- Floating labels pinned to atoms ---------- */
export default function ReactionLabels({
  scene,
  s,
  kinds,
  labels = SN2_LABELS,
}: {
  scene: ReactionScene
  s: number
  kinds?: ReactionLabel['kind'][]
  labels?: ReactionLabel[]
}) {
  // A short "signature" of which labels are visible. It changes only a few times per
  // playthrough, so the list below (and the effect that positions it) rarely rebuilds.
  const visibleKey = labels.map((l) => (s >= l.from && s <= l.to && (!kinds || kinds.includes(l.kind)) ? 1 : 0)).join('')
  const active = useMemo(() => labels.filter((_, i) => visibleKey[i] === '1'), [labels, visibleKey])
  const refs = useRef<(HTMLDivElement | null)[]>([])

  // Re-position after every redraw (the camera or atoms may have moved).
  useEffect(() => {
    const place = () => {
      active.forEach((l, i) => {
        const el = refs.current[i]
        const p = scene.atomPosition(l.atom)
        if (!el || !p) return
        const q = scene.project(p)
        el.style.visibility = q.behind ? 'hidden' : 'visible'
        el.style.transform = `translate(${q.x}px, ${q.y}px)`
      })
    }
    place()
    return scene.onRender(place)
  }, [scene, active])

  return (
    <div className="overlay" aria-hidden="true">
      {active.map((l, i) => (
        <div key={`${l.text}-${l.atom}`} ref={(el) => void (refs.current[i] = el)} className={`rx-label rx-${l.kind}`}>
          <span>{l.text}</span>
        </div>
      ))}
    </div>
  )
}
