/*
  MoDiagram.tsx — a molecular orbital energy diagram, drawn as SVG.

    left atom's AOs   |   molecular orbitals   |   right atom's AOs
  Dashed lines show which atomic orbitals make each molecular orbital. Electrons are
  arrows (↑ / ↓). Each MO level is a button: click (or Tab + Enter) to select it and see
  its 3D shape. Energies are schematic, so the diagram carries a "Schematic" tag.

  Keeping it readable:
    • levels are spaced by layoutLevels (src/mo/layout.ts): close levels in one column are
      pushed apart, but the order of every level is kept;
    • the dashed lines are masked out wherever they would cross an orbital, its electrons,
      or a label, so they pass BEHIND everything instead of through it.
*/
import { useId, type KeyboardEvent } from 'react'
import { DIAGRAMS, fill, ionFormula, type Arrows as ArrowState, type Diatomic, type Level } from './diatomics'
import { layoutLevels } from './layout'
import './MoDiagram.css'

const W = 640
const H = 500
const TOP = 62
const BOTTOM = H - 52
const X = { L: 128, M: 320, R: 512 }
/** Molecular orbital lines (middle column). */
const MO = { len: 46, gap: 14 }
/** Atomic orbital lines (side columns): a little shorter, so three fit beside the axis. */
const AO = { len: 34, gap: 9 }
/** Closest two levels in one column may sit (room for arrows above and below each line). */
const MIN_GAP = { L: 40, M: 44, R: 40 }

/** Valence electrons of a neutral atom, for drawing the atomic orbitals' arrows. */
const VALENCE: Record<string, number> = { H: 1, He: 2, Li: 1, Be: 2, B: 3, C: 4, N: 5, O: 6, F: 7, Ne: 8 }

/** Left and right ends of a row of `n` orbital lines centered on `cx`. */
const span = (cx: number, n: number, s: { len: number; gap: number }) => {
  const w = n * s.len + (n - 1) * s.gap
  return [cx - w / 2, cx + w / 2] as const
}
/** Centers of a row of `n` orbital lines. */
const centers = (cx: number, n: number, s: { len: number; gap: number }) =>
  Array.from({ length: n }, (_, i) => cx - ((n - 1) * (s.len + s.gap)) / 2 + i * (s.len + s.gap))

/** Rough width of a label like "σ*_2p" (main text + smaller subscript), for hit areas and masks. */
const labelWidth = (text: string, size: number) => {
  const [main, sub = ''] = text.split('_')
  return main.length * size * 0.62 + sub.length * size * 0.5
}

interface LabelSpec {
  id: string
  text: string
  x: number
  y: number
  anchor: 'start' | 'end'
}

/** "σ*_2p" → σ* with a subscript 2p, as SVG text. */
function Label({ text, x, y, anchor, className = 'mo-label' }: LabelSpec & { className?: string }) {
  const [main, sub] = text.split('_')
  return (
    <text x={x} y={y} textAnchor={anchor} className={className}>
      {main}
      {sub && (
        <tspan dy="5" fontSize="0.74em">
          {sub}
        </tspan>
      )}
    </text>
  )
}

/** Arrows for an orbital holding 0, 1 or 2 electrons, centered on the line at (x, y). */
function Arrows({ x, y, n }: { x: number; y: number; n: number }) {
  if (n === 0) return null
  const ux = n === 2 ? x - 6 : x
  const dx = x + 6
  return (
    <g className="mo-arrows" aria-hidden="true">
      <path d={`M${ux} ${y + 10} V${y - 12} M${ux - 4.5} ${y - 7} L${ux} ${y - 12} L${ux + 4.5} ${y - 7}`} />
      {n === 2 && <path d={`M${dx} ${y - 12} V${y + 10} M${dx - 4.5} ${y + 5} L${dx} ${y + 10} L${dx + 4.5} ${y + 5}`} />}
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
  /** Larger text and no atom arrows (for practice cards). */
  compact?: boolean
  /**
   * "Fill it yourself": each orbital line is a button. A click cycles it empty → ↑ → ↑↓ → empty.
   * The diagram then shows the student's electrons instead of the correct filling.
   */
  build?: { arrows: ArrowState; onToggle: (level: string, orbital: number) => void; highlight?: string }
}

export default function MoDiagram({ molecule, electrons, filled = true, selected, onSelect, compact, build }: Props) {
  const maskId = `mo-mask-${useId().replace(/:/g, '')}`
  const d = DIAGRAMS[molecule.diagram]
  const f = fill(d, electrons)
  const { y } = layoutLevels(d, TOP, BOTTOM, MIN_GAP)
  const isNeutral = electrons === molecule.electrons
  const [elL, elR] = molecule.atoms
  const aoArrows = { ...atomArrows(elL, d.aos.filter((a) => a.side === 'L')), ...atomArrows(elR, d.aos.filter((a) => a.side === 'R')) }
  const fontSize = compact ? 17 : 15

  // Labels: atomic orbitals outside their row; MOs on the right (nonbonding ones on the left,
  // since they sit level with the right atom's orbitals they came from).
  const aoLabels: LabelSpec[] = d.aos.map((ao) => {
    const [l, r] = span(ao.side === 'L' ? X.L : X.R, ao.deg, AO)
    return { id: ao.id, text: ao.label, x: ao.side === 'L' ? l - 8 : r + 8, y: y(ao.e) + 5, anchor: ao.side === 'L' ? 'end' : 'start' }
  })
  const moLabel = (lv: Level): LabelSpec => {
    const [l, r] = span(X.M, lv.deg, MO)
    return lv.kind === 'nonbonding'
      ? { id: lv.id, text: lv.label, x: l - 10, y: y(lv.e) + 5, anchor: 'end' }
      : { id: lv.id, text: lv.label, x: r + 10, y: y(lv.e) + 5, anchor: 'start' }
  }
  const moLabels = d.levels.map(moLabel)

  /** The box around one MO level (its lines, arrows, and label): hit area and selection. */
  const levelBox = (lv: Level) => {
    const [l, r] = span(X.M, lv.deg, MO)
    const lw = labelWidth(lv.label, fontSize) + 10
    const x0 = lv.kind === 'nonbonding' ? l - 8 - lw : l - 8
    const x1 = lv.kind === 'nonbonding' ? r + 8 : r + 8 + lw
    return { x: x0, y: y(lv.e) - 19, width: x1 - x0, height: 32 }
  }

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
      aria-label={`Molecular orbital diagram for ${ionFormula(molecule, electrons)}${filled ? `, ${electrons} valence electrons` : ', not yet filled'}`}
    >
      {/* Mask: the dashed lines stop short of every orbital row and label. */}
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect width={W} height={H} fill="#fff" />
          <g fill="#000">
            {d.aos.map((ao) => {
              const [l, r] = span(ao.side === 'L' ? X.L : X.R, ao.deg, AO)
              return <rect key={ao.id} x={l - 3} y={y(ao.e) - 14} width={r - l + 6} height={26} rx={4} />
            })}
            {d.levels.map((lv) => {
              const [l, r] = span(X.M, lv.deg, MO)
              return <rect key={lv.id} x={l - 3} y={y(lv.e) - 14} width={r - l + 6} height={26} rx={4} />
            })}
            {[...aoLabels, ...moLabels].map((p) => (
              <Label key={p.id} {...p} className="mo-label mo-label-mask" />
            ))}
          </g>
        </mask>
      </defs>

      {/* Energy axis */}
      <g className="mo-axis" aria-hidden="true">
        <path d={`M30 ${BOTTOM + 14} V${TOP - 22} M25 ${TOP - 15} L30 ${TOP - 22} L35 ${TOP - 15}`} />
        <text x="0" y="0" className="mo-axis-label" transform={`translate(16 ${(TOP + BOTTOM) / 2}) rotate(-90)`} textAnchor="middle">
          Energy
        </text>
      </g>

      {/* Column headings */}
      <g className="mo-heads" aria-hidden="true">
        <text x={X.L} y="26" textAnchor="middle">
          {elL} atom
        </text>
        <text x={X.M} y="26" textAnchor="middle" className="mo-head-main">
          {ionFormula(molecule, electrons)}
        </text>
        <text x={X.R} y="26" textAnchor="middle">
          {elR} atom
        </text>
      </g>

      {/* Dashed lines from atomic to molecular orbitals */}
      <g className="mo-links" aria-hidden="true" mask={`url(#${maskId})`}>
        {d.levels.flatMap((lv) =>
          lv.from.map((id) => {
            const ao = d.aos.find((a) => a.id === id)!
            const [al, ar] = span(ao.side === 'L' ? X.L : X.R, ao.deg, AO)
            const [ml, mr] = span(X.M, lv.deg, MO)
            const x1 = ao.side === 'L' ? ar + 3 : al - 3
            const x2 = ao.side === 'L' ? ml - 3 : mr + 3
            return <line key={`${lv.id}-${id}`} x1={x1} y1={y(ao.e)} x2={x2} y2={y(lv.e)} />
          }),
        )}
      </g>

      {/* Atomic orbitals */}
      {d.aos.map((ao, k) => (
        <g key={ao.id} className="mo-ao" aria-hidden="true">
          {centers(ao.side === 'L' ? X.L : X.R, ao.deg, AO).map((lx, i) => (
            <g key={i}>
              <line x1={lx - AO.len / 2} x2={lx + AO.len / 2} y1={y(ao.e)} y2={y(ao.e)} />
              {filled && isNeutral && !compact && <Arrows x={lx} y={y(ao.e)} n={aoArrows[ao.id]?.[i] ?? 0} />}
            </g>
          ))}
          <Label {...aoLabels[k]} />
        </g>
      ))}

      {/* Fill-it-yourself mode: every orbital line is its own button. */}
      {build &&
        d.levels.map((lv, k) => (
          <g key={lv.id} className={`mo-level is-${lv.kind} is-building ${build.highlight === lv.id ? 'is-flagged' : ''}`}>
            {centers(X.M, lv.deg, MO).map((lx, i) => {
              const n = build.arrows[lv.id]?.[i] ?? 0
              const toggle = () => build.onToggle(lv.id, i)
              return (
                <g
                  key={i}
                  className="mo-slot"
                  role="button"
                  tabIndex={0}
                  aria-label={`${lv.label.replace('_', ' ')}${lv.deg > 1 ? `, orbital ${i + 1}` : ''}: ${n} electron${n === 1 ? '' : 's'}. Press to add an electron.`}
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggle()
                    }
                  }}
                >
                  <rect x={lx - MO.len / 2 - 5} y={y(lv.e) - 19} width={MO.len + 10} height={32} rx={7} className="mo-hit" />
                  <line className="mo-line" x1={lx - MO.len / 2} x2={lx + MO.len / 2} y1={y(lv.e)} y2={y(lv.e)} />
                  <Arrows x={lx} y={y(lv.e)} n={n} />
                </g>
              )
            })}
            <Label {...moLabels[k]} />
          </g>
        ))}

      {/* Molecular orbitals: each level is a button */}
      {!build &&
        d.levels.map((lv, k) => {
          const n = filled ? f.count[lv.id] : 0
          const isSel = selected === lv.id
          return (
            <g
              key={lv.id}
              className={`mo-level is-${lv.kind} ${isSel ? 'is-selected' : ''} ${onSelect ? 'is-clickable' : ''}`}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-pressed={onSelect ? isSel : undefined}
              aria-label={`${lv.label.replace('_', ' ')}, ${lv.kind}${filled ? `, ${n} electron${n === 1 ? '' : 's'}` : ''}`}
              onClick={onSelect ? () => onSelect(lv) : undefined}
              onKeyDown={onSelect ? key(lv) : undefined}
            >
              <rect {...levelBox(lv)} rx={9} className="mo-hit" />
              {centers(X.M, lv.deg, MO).map((lx, i) => (
                <g key={i}>
                  <line className="mo-line" x1={lx - MO.len / 2} x2={lx + MO.len / 2} y1={y(lv.e)} y2={y(lv.e)} />
                  <Arrows x={lx} y={y(lv.e)} n={filled ? f.arrows[lv.id][i] : 0} />
                </g>
              ))}
              <Label {...moLabels[k]} />
            </g>
          )
        })}

      <g transform={`translate(44 ${H - 28})`} aria-hidden="true">
        <rect width="92" height="22" rx="11" className="mo-tag" />
        <text x="46" y="15" textAnchor="middle" className="mo-tag-text">
          ◆ Schematic
        </text>
      </g>
    </svg>
  )
}
