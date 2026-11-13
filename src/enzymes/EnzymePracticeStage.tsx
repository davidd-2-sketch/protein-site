/*
  EnzymePracticeStage.tsx — a real enzyme structure for a Practice question.
  Loaded only when such a question appears (it pulls in the Mol* viewer), so Practice
  stays light otherwise. Shows one structure, optionally one highlighted, labeled residue,
  and switches to `after` once the question is answered.
*/
import { useEffect, useRef, useState } from 'react'
import OverlayLabels from '../lessons/OverlayLabels'
import { ProteinViewer } from '../protein/ProteinViewer'
import { STRUCTURES, type StructureId } from './structures'
import { VIEWS } from './views'
// Styles for the labels pinned to atoms (shared with the Proteins and Enzymes pages).
import '../pages/ProteinPage.css'

interface Props {
  structure: StructureId
  after?: StructureId
  highlight?: { chain: string; seq: number; label: string }
  revealed: boolean
}

export default function EnzymePracticeStage({ structure, after, highlight, revealed }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<ProteinViewer | null>(null)
  const [shown, setShown] = useState<StructureId | null>(null)
  const [failed, setFailed] = useState(false)
  const current = revealed && after ? after : structure

  useEffect(() => {
    let disposed = false
    let v: ProteinViewer | null = null
    ;(async () => {
      try {
        v = await ProteinViewer.create(host.current!)
        if (disposed) return v.dispose()
        setViewer(v)
      } catch {
        if (!disposed) setFailed(true)
      }
    })()
    return () => {
      disposed = true
      v?.dispose()
      setViewer(null)
    }
  }, [])

  const framedFor = useRef('')
  useEffect(() => {
    if (!viewer) return
    let cancelled = false
    const view = VIEWS[current]
    ;(async () => {
      await viewer.load(STRUCTURES[current].file, { key: current, transform: view.transform })
      if (cancelled) return
      viewer.useStructure(current)
      viewer.setChainStyles(view.chainStyles)
      await viewer.setView({
        chains: view.chains,
        style: 'cartoon',
        color: 'chain',
        hemes: false,
        ligands: view.ligands,
        // One highlighted residue, or (for before/after questions) the usual site colors.
        groups: highlight ? [{ residues: [{ chain: highlight.chain, seq: highlight.seq }], color: '#5ee4ff' }] : view.groups.map((g) => ({ residues: g.residues, color: g.group === 'lid' ? '#ff9a3d' : '#4fe3b0' })),
        pick: 'residue',
      })
      if (cancelled) return
      // Frame once per question, so revealing the second structure keeps the same viewpoint.
      const key = `${structure}-${highlight?.seq ?? ''}`
      if (framedFor.current !== key) {
        framedFor.current = key
        viewer.focusResidues(highlight ? [{ chain: highlight.chain, seq: highlight.seq }] : view.focus, highlight ? 10 : 16, 0)
      }
      setShown(current)
    })().catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [viewer, current, structure, highlight])

  const atom = highlight ? (highlight.seq === 193 ? 'N' : highlight.seq === 57 ? 'NE2' : highlight.seq === 102 ? 'CG' : 'OG') : null
  const labels = highlight && atom ? [{ text: highlight.label, at: { chain: highlight.chain, seq: highlight.seq, atom }, tone: 'accent' as const }] : []

  return (
    <div className="practice-canvas" ref={host}>
      {viewer && shown && <OverlayLabels key={shown} viewer={viewer} labels={labels} lines={[]} />}
      {!shown && !failed && (
        <p className="practice-busy" role="status">
          Loading the enzyme…
        </p>
      )}
      {failed && <p className="practice-busy">This 3D view couldn’t start in this browser.</p>}
      <span className="practice-source tag tag-experimental">Experimental structure · PDB {STRUCTURES[current].pdb}</span>
    </div>
  )
}
