/*
  FischerDrawing.tsx — a Fischer projection drawn as SVG: a vertical chain with one cross per
  carbon. Horizontal bonds come toward you (drawn as wedge-like heavier lines, with a small
  "toward you" key); vertical bonds go away.
*/
import type { Fischer } from './fischer'
import './FischerDrawing.css'

const ROW = 64
const W = 230

/** "CH₂OH" etc. as SVG text (subscripts are already Unicode). */
function Group({ x, y, text, anchor }: { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" className="fis-group">
      {text}
    </text>
  )
}

export default function FischerDrawing({ f, title }: { f: Fischer; title: string }) {
  const n = f.rows.length
  const top = 34
  const H = top + (n + 1) * ROW + 30
  const cx = W / 2
  const yRow = (i: number) => top + (i + 1) * ROW
  return (
    <figure className="fischer">
      <figcaption className="fischer-title">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Fischer projection: ${f.top} on top, ${f.rows.map((r) => `${r.left} left and ${r.right} right`).join(', then ')}, ${f.bottom} at the bottom.`}>
        {/* The vertical chain (bonds going away from you). */}
        <line className="fis-bond is-back" x1={cx} y1={top + 14} x2={cx} y2={yRow(n) + ROW - 14} />
        <Group x={cx} y={top} text={f.top} anchor="middle" />
        {f.rows.map((r, i) => (
          <g key={r.atom} className={r.stereo ? 'fis-row is-stereo' : 'fis-row'}>
            <line className="fis-bond is-front" x1={cx - 52} y1={yRow(i)} x2={cx + 52} y2={yRow(i)} />
            <Group x={cx - 58} y={yRow(i)} text={r.left} anchor="end" />
            <Group x={cx + 58} y={yRow(i)} text={r.right} anchor="start" />
            {r.stereo && <circle className="fis-center" cx={cx} cy={yRow(i)} r={3.5} />}
          </g>
        ))}
        <Group x={cx} y={yRow(n) + ROW} text={f.bottom} anchor="middle" />
      </svg>
      <p className="fischer-key">
        <span className="fis-key is-front" /> toward you <span className="fis-key is-back" /> away
      </p>
    </figure>
  )
}
