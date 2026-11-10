/*
  PracticeStage.tsx — draws the visual for a practice question, using the same 3D scenes
  as the lessons. Each kind of visual keeps its scene while consecutive questions use it,
  and swaps scenes only when the kind changes.
*/
import { useEffect, useRef, useState } from 'react'
import AxisLabels from '../orbitals/AxisLabels'
import { OrbitalScene } from '../orbitals/OrbitalScene'
import ReactionLabels from '../reactions/ReactionLabels'
import { ReactionScene } from '../reactions/ReactionScene'
import SymbolLabels from '../trends/SymbolLabels'
import { TrendsScene } from '../trends/TrendsScene'
import SceneLabelsOverlay from '../vsepr/SceneLabels'
import { VseprScene } from '../vsepr/VseprScene'
import type { Visual } from './questions'

export default function PracticeStage({ visual, revealed }: { visual: Visual; revealed: boolean }) {
  switch (visual.kind) {
    case 'vsepr':
      return <VseprStage visual={visual} revealed={revealed} />
    case 'orbital':
      return <OrbitalStage visual={visual} revealed={revealed} />
    case 'trends':
      return <TrendsStage visual={visual} revealed={revealed} />
    case 'sn2':
      return <Sn2Stage visual={visual} />
  }
}

/** Create a scene inside a <div> once, and dispose of it when the stage goes away. */
function useScene<S extends { dispose(): void }>(make: (el: HTMLDivElement) => S) {
  const host = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<S | null>(null)
  useEffect(() => {
    const s = make(host.current!)
    setScene(s)
    return () => {
      s.dispose()
      setScene(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return [host, scene] as const
}

function VseprStage({ visual, revealed }: { visual: Extract<Visual, { kind: 'vsepr' }>; revealed: boolean }) {
  const [host, scene] = useScene((el) => new VseprScene(el))
  useEffect(() => {
    if (!scene) return
    scene.setState(revealed ? visual.after : visual.before)
    scene.setOptions({ hull: revealed ? !!visual.hullAfter : !!visual.hullBefore, arcs: revealed && visual.arcsAfter })
  }, [scene, visual, revealed])
  return (
    <div className="practice-canvas" ref={host}>
      {scene && <SceneLabelsOverlay scene={scene} />}
    </div>
  )
}

function OrbitalStage({ visual, revealed }: { visual: Extract<Visual, { kind: 'orbital' }>; revealed: boolean }) {
  const [busy, setBusy] = useState(true)
  const [host, scene] = useScene((el) => new OrbitalScene(el, setBusy))
  const view = revealed && visual.after ? visual.after : visual.before
  const axes = view.axes ?? true
  useEffect(() => void scene?.setView(view), [scene, view])
  useEffect(() => scene?.setAxes(axes), [scene, axes])
  return (
    <div className="practice-canvas" ref={host}>
      {scene && axes && <AxisLabels scene={scene} />}
      {busy && (
        <p className="practice-busy" role="status">
          Computing surface…
        </p>
      )}
    </div>
  )
}

function TrendsStage({ visual, revealed }: { visual: Extract<Visual, { kind: 'trends' }>; revealed: boolean }) {
  const [host, scene] = useScene((el) => new TrendsScene(el, () => {}, () => {}))
  useEffect(() => scene?.setView({ ...(revealed ? visual.after : visual.before), selected: null }), [scene, visual, revealed])
  return (
    <div className="practice-canvas" ref={host}>
      {scene && <SymbolLabels scene={scene} />}
    </div>
  )
}

function Sn2Stage({ visual }: { visual: Extract<Visual, { kind: 'sn2' }> }) {
  const [host, scene] = useScene((el) => new ReactionScene(el))
  useEffect(() => {
    if (!scene) return
    scene.setOptions({ arrows: false })
    scene.setProgress(visual.s)
  }, [scene, visual])
  return (
    <div className="practice-canvas" ref={host}>
      {/* Only element symbols and group names: role labels would give the answers away. */}
      {scene && <ReactionLabels scene={scene} s={visual.s} kinds={['element', 'group']} />}
    </div>
  )
}
