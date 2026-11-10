/*
  EnergyDiagram.tsx — a small energy-vs-progress chart with a dot that follows the
  timeline, so students see "where on the hill" each moment of the reaction is.
  Clicking the chart jumps the reaction to that point. Works for any reaction:
  pass its energy curve, the notes to write on it, and where its highest peak is.
*/
import { useId, useMemo } from 'react'
import type { EnergyNote } from './reactions'

const W = 300
const H = 132
const PAD = { l: 28, r: 12, t: 22, b: 26 }
const xOf = (s: number) => PAD.l + s * (W - PAD.l - PAD.r)
// Energy goes from −0.6 (lowest products) to 1 (highest peak); map to the chart's height.
const yOf = (e: number) => PAD.t + (1 - (e + 0.6) / 1.6) * (H - PAD.t - PAD.b)

interface Props {
  s: number
  onSeek: (s: number) => void
  energy: (s: number) => number
  notes: EnergyNote[]
  eaAt: number
  title?: string
}

export default function EnergyDiagram({ s, onSeek, energy, notes, eaAt, title = 'Energy diagram' }: Props) {
  // Unique id, so two diagrams on one page don't share a clip path.
  const clipId = useId()
  const path = useMemo(() => {
    let d = ''
    for (let i = 0; i <= 120; i++) {
      const t = i / 120
      d += `${i ? 'L' : 'M'}${xOf(t).toFixed(1)},${yOf(energy(t)).toFixed(1)}`
    }
    return d
  }, [energy])

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    onSeek(Math.min(1, Math.max(0, (x - PAD.l) / (W - PAD.l - PAD.r))))
  }

  const peak = energy(eaAt)
  return (
    <figure className="energy panel">
      <figcaption className="energy-head">
        <span>{title}</span>
        <span className="tag tag-illustrative">Schematic</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onClick={handleClick}
        role="img"
        aria-label={`${title}. The reaction is ${Math.round(s * 100)}% of the way from reactants to products.`}
      >
        {/* axes */}
        <line x1={PAD.l} y1={PAD.t - 8} x2={PAD.l} y2={H - PAD.b} className="energy-axis" />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} className="energy-axis" />
        <text x={10} y={(H - PAD.b + PAD.t) / 2} className="energy-axis-label" transform={`rotate(-90 10 ${(H - PAD.b + PAD.t) / 2})`} textAnchor="middle">
          Energy
        </text>
        <text x={(W + PAD.l) / 2} y={H - 6} className="energy-axis-label" textAnchor="middle">
          Reaction progress →
        </text>

        {/* activation energy bracket, at the highest peak */}
        <line x1={xOf(eaAt)} y1={yOf(0)} x2={xOf(eaAt)} y2={yOf(peak) + 4} className="energy-ea" />
        <line x1={xOf(0.02)} y1={yOf(0)} x2={xOf(eaAt)} y2={yOf(0)} className="energy-guide" />
        <text x={xOf(eaAt) + 5} y={(yOf(0) + yOf(peak)) / 2 + 4} className="energy-note">
          Eₐ
        </text>

        {/* the curve, with the part already travelled highlighted */}
        <path d={path} className="energy-curve" />
        <clipPath id={clipId}>
          <rect x={0} y={0} width={xOf(s)} height={H} />
        </clipPath>
        <path d={path} className="energy-curve is-travelled" clipPath={`url(#${clipId})`} />

        {notes.map((n) => (
          <text key={n.text} x={xOf(n.s)} y={yOf(energy(n.s)) + (n.below ? 13 : -7)} className="energy-note" textAnchor={n.anchor ?? 'middle'}>
            {n.text}
          </text>
        ))}

        {/* current position */}
        <circle cx={xOf(s)} cy={yOf(energy(s))} r={5.5} className="energy-dot" />
      </svg>
    </figure>
  )
}
