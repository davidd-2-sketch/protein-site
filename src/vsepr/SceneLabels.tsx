/*
  SceneLabels.tsx — atom symbols and angle values drawn over the VSEPR 3D view.
  Used by the Shapes page and by practice mode.
*/
import { useEffect, useRef, useState } from 'react'
import type { VseprScene } from './VseprScene'

/* ---------- HTML labels for atoms and angles, moved after every redraw ---------- */

export default function SceneLabelsOverlay({ scene }: { scene: VseprScene }) {
  const [signature, setSignature] = useState('')
  const atomRefs = useRef<(HTMLSpanElement | null)[]>([])
  const arcRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const place = () => {
      const { atoms, arcs } = scene.getLabels()
      // Re-render the list only when WHICH labels exist changes (rare); otherwise just move them.
      const sig = atoms.map((a) => a.text).join(',') + '|' + arcs.map((a) => a.text).join(',')
      setSignature((prev) => (prev === sig ? prev : sig))
      atoms.forEach((a, i) => move(atomRefs.current[i], scene.stage.project(a.position)))
      arcs.forEach((a, i) => move(arcRefs.current[i], scene.stage.project(a.position)))
    }
    place()
    return scene.stage.onAfterRender(place)
  }, [scene, signature])

  const { atoms, arcs } = scene.getLabels()
  return (
    <div className="overlay" aria-hidden="true">
      {atoms.map((a, i) => (
        <span key={`a${i}`} ref={(el) => void (atomRefs.current[i] = el)} className="v-atom">
          {a.text}
        </span>
      ))}
      {arcs.map((a, i) => (
        <span key={`r${i}`} ref={(el) => void (arcRefs.current[i] = el)} className="v-angle">
          {a.text}
        </span>
      ))}
    </div>
  )
}

function move(el: HTMLElement | null, p: { x: number; y: number; behind: boolean }) {
  if (!el) return
  el.style.visibility = p.behind ? 'hidden' : 'visible'
  el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`
}
