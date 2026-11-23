/*
  MoDiagram.tsx — a molecular orbital energy diagram, drawn as SVG.

    left atom's AOs   |   molecular orbitals   |   right atom's AOs
  Dashed lines show which atomic orbitals make each molecular orbital. Electrons are
  arrows (↑ / ↓). Each MO level is a button: click (or Tab + Enter) to select it and see
  its 3D shape. Energies are schematic, so the diagram carries a "Schematic" tag.
*/
import type { KeyboardEvent } from 'react'
import { DIAGRAMS, fill, type Diatomic, type Level } from './diatomics'
import './MoDiagram.css'

const W = 520
const H = 470
const TOP = 44
const BOTTOM = H - 30
const X = { L: 80, M: 260, R: 440 }
const LINE = 40 // width of one orbital line
const GAP = 10

/** Valence electrons of a neutral atom, for drawing the atomic orbitals' arrows. */
const VALENCE: Record<string, number> = { H: 1, He: 2, Li: 1, Be: 2, B: 3, C: 4, N: 5, O: 6, F: 7, Ne: 8 }

/** "σ*_2p" → σ* with a subscript 2p, as SVG text. */
function Label({ text, x, y, anchor = 'start' }: { text: string; x: number; y: number; anchor?: 'start' | 'end' | 'middle' }) {
  const [main, sub] = text.split('_')
  return (
    <text x={x} y={y} textAnchor={anchor} className="mo-label">
      {main}
      {sub && (
        <tspan dy="5" fontSize="0.78em">
          {sub}
        </tspan>
      )}
    </text>
  )
}

/** The x positions of a level's orbital lines, centered on `cx`. */
const lines = (cx: number, n: number) => Array.from({ length: n }, (_, i) => cx - ((n - 1) * (LINE + GAP)) / 2 + i * (LINE + GAP))

/** Arrows for an orbital holding 0, 1 or 2 electrons. */
function Arrows({ x, y, n }: { x: number; y: number; n: number }) {
  if (n === 0) return null
  const up = <path d={`M${x - (n === 2 ? 7 : 0)} ${y + 9} V${y - 11} M${x - (n === 2 ? 7 : 0) - 4.5} ${y - 6} L${x - (n === 2 ? 7 : 0)} ${y - 11} L${x - (n === 2 ? 7 : 0) + 4.5} ${y - 6}`} />
  const down = n === 2 ? <path d={`M${x + 7} ${y - 11} V${y + 9} M${x + 2.5} ${y + 4} L${x + 7} ${y + 9} L${x + 11.5} ${y + 4}`} /> : null
  return (
    <g className="mo-arrows" aria-hidden="true">
      {up}
      {down}
    </g>
  )
}

/** Fill a neutral atom's AOs (2s then 2p, Hund's rule) for the side columns. */
function atomArrows(el: string, aos: { id: string; deg: number; e: number }[]) {
  let left = VALENCE[el] ?? 0
  const out: Record<string, number[]> = {}
  for (const ao of [...aos].sort((a, b) => a.e - b.e)) {
    const n = Math.min(left, 2 * ao.deg)
    left -= n
    const a: number[] = Array.from({ length: ao.deg }, (_, i) => (n > i ? 1 : 0))
    for (let i = 0; i < ao.deg && n - ao.deg > i; i++) a[i] = 2
    out[ao.id] = a
  }
  return out
}

interface Props {
  molecule: Diatomic
  electrons: number
  /** Show electrons (false = empty diagram, for "predict first"). */
  filled?: boolean
  selected?: string | null
  onSelect?: (level: Level) => void
  /** Smaller text and no atom arrows (for practice cards). */
  compact?: boolean
}

export default function MoDiagram({ molecule, electrons, filled = true, selected, onSelect, compact }: Props) {
  const d = DIAGRAMS[molecule.diagram]
  const f = fill(d, electrons)
  const all = [...d.aos.map((a) => a.e), ...d.levels.map((l) => l.e)]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const y = (e: number) => BOTTOM - ((e - lo) / (hi - lo || 1)) * (BOTTOM - TOP)
  const isNeutral = electrons === molecule.electrons
  const [elL, elR] = molecule.atoms
  const leftAOs = d.aos.filter((a) => a.side === 'L')
  const rightAOs = d.aos.filter((a) => a.side === 'R')
  const aoArrows = { ...atomArrows(elL, leftAOs), ...atomArrows(elR, rightAOs) }

  const key = (lv: Level) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(lv)
    }
  }

  return (
    <svg
      className={`mo-diagram ${compact ? 'is-compact' : ''}`}
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-label={`Molecular orbital diagram for ${molecule.formula}${filled ? `, ${electrons} valence electrons` : ', not yet filled'}`}
    >
      {/* Energy axis */}
      <g className="mo-axis" aria-hidden="true">
        <path d={`M26 ${BOTTOM} V${TOP - 14} M21 ${TOP - 7} L26 ${TOP - 14} L31 ${TOP - 7}`} />
        <text x="0" y="0" className="mo-axis-label" transform={`translate(10 ${(TOP + BOTTOM) / 2}) rotate(-90)`} textAnchor="middle">
          Energy
        </text>
      </g>

      {/* Column headings */}
      <g className="mo-heads" aria-hidden="true">
        <text x={X.L} y="20" textAnchor="middle">
          {elL} atom
        </text>
        <text x={X.M} y="20" textAnchor="middle">
          {molecule.formula}
        </text>
        <text x={X.R} y="20" textAnchor="middle">
          {elR} atom
        </text>
      </g>

      {/* Dashed lines from atomic to molecular orbitals */}
      <g className="mo-links" aria-hidden="true">
        {d.levels.flatMap((lv) =>
          lv.from.map((id) => {
            const ao = d.aos.find((a) => a.id === id)!
            const aoEdge = ao.side === 'L' ? X.L + (ao.deg * (LINE + GAP)) / 2 - GAP / 2 + 4 : X.R - (ao.deg * (LINE + GAP)) / 2 + GAP / 2 - 4
            const moEdge = ao.side === 'L' ? X.M - (lv.deg * (LINE + GAP)) / 2 + GAP / 2 - 4 : X.M + (lv.deg * (LINE + GAP)) / 2 - GAP / 2 + 4
            return <line key={`${lv.id}-${id}`} x1={aoEdge} y1={y(ao.e)} x2={moEdge} y2={y(lv.e)} />
          }),
        )}
      </g>

      {/* Atomic orbitals */}
      {d.aos.map((ao) => {
        const cx = ao.side === 'L' ? X.L : X.R
        return (
          <g key={ao.id} className="mo-ao" aria-hidden="true">
            {lines(cx, ao.deg).map((lx, i) => (
              <g key={i}>
                <line x1={lx - LINE / 2} x2={lx + LINE / 2} y1={y(ao.e)} y2={y(ao.e)} />
                {filled && isNeutral && !compact && <Arrows x={lx} y={y(ao.e) - 2} n={aoArrows[ao.id]?.[i] ?? 0} />}
              </g>
            ))}
            <Label text={ao.label} x={ao.side === 'L' ? cx - (ao.deg * (LINE + GAP)) / 2 - 4 : cx + (ao.deg * (LINE + GAP)) / 2 + 4} y={y(ao.e) + 5} anchor={ao.side === 'L' ? 'end' : 'start'} />
          </g>
        )
      })}

      {/* Molecular orbitals: each level is a button */}
      {d.levels.map((lv) => {
        const n = filled ? f.count[lv.id] : 0
        const xs = lines(X.M, lv.deg)
        const w = lv.deg * (LINE + GAP) + 16
        const isSel = selected === lv.id
        const kindWord = lv.kind === 'bonding' ? 'bonding' : lv.kind === 'antibonding' ? 'antibonding' : 'nonbonding'
        return (
          <g
            key={lv.id}
            className={`mo-level is-${lv.kind} ${isSel ? 'is-selected' : ''} ${onSelect ? 'is-clickable' : ''}`}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-pressed={onSelect ? isSel : undefined}
            aria-label={`${lv.label.replace('_', ' ')}, ${kindWord}${filled ? `, ${n} electron${n === 1 ? '' : 's'}` : ''}`}
            onClick={onSelect ? () => onSelect(lv) : undefined}
            onKeyDown={onSelect ? key(lv) : undefined}
          >
            <rect x={X.M - w / 2} y={y(lv.e) - 19} width={w} height={30} rx={8} className="mo-hit" />
            {xs.map((lx, i) => (
              <g key={i}>
                <line className="mo-line" x1={lx - LINE / 2} x2={lx + LINE / 2} y1={y(lv.e)} y2={y(lv.e)} />
                <Arrows x={lx} y={y(lv.e) - 2} n={filled ? f.arrows[lv.id][i] : 0} />
              </g>
            ))}
            {/* Nonbonding levels sit level with their atom's orbitals on the right, so label them on the left. */}
            {lv.kind === 'nonbonding' ? (
              <Label text={lv.label} x={X.M - (lv.deg * (LINE + GAP)) / 2 - 6} y={y(lv.e) + 5} anchor="end" />
            ) : (
              <Label text={lv.label} x={X.M + (lv.deg * (LINE + GAP)) / 2 + 6} y={y(lv.e) + 5} />
            )}
          </g>
        )
      })}

      <g transform={`translate(36 ${H - 22})`} aria-hidden="true">
        <rect width="86" height="20" rx="10" className="mo-tag" />
        <text x="43" y="14" textAnchor="middle" className="mo-tag-text">
          ◆ Schematic
        </text>
      </g>
    </svg>
  )
}
