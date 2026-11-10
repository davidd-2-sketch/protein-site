/*
  EnergyDiagram.tsx — a small energy-vs-progress chart with a dot that follows the
  timeline, so students see "where on the hill" each moment of the reaction is.
  Clicking the chart jumps the reaction to that point.
*/
import { useMemo } from 'react'
import { energyAt } from './sn2'

const W = 300
const H = 160
const PAD = { l: 28, r: 12, t: 22, b: 26 }
const xOf = (s: number) => PAD.l + s * (W - PAD.l - PAD.r)
// Energy goes from −0.6 (products) to 1 (TS); map to the chart's height.
const yOf = (e: number) => PAD.t + (1 - (e + 0.6) / 1.6) * (H - PAD.t - PAD.b)

export default function EnergyDiagram({ s, onSeek }: { s: number; onSeek: (s: number) => void }) {
  const path = useMemo(() => {
    let d = ''
    for (let i = 0; i <= 100; i++) {
      const t = i / 100
      d += `${i ? 'L' : 'M'}${xOf(t).toFixed(1)},${yOf(energyAt(t)).toFixed(1)}`
    }
    return d
  }, [])

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    onSeek(Math.min(1, Math.max(0, (x - PAD.l) / (W - PAD.l - PAD.r))))
  }

  return (
    <figure className="energy panel">
      <figcaption className="energy-head">
        <span>Energy diagram</span>
        <span className="tag tag-illustrative">Schematic</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onClick={handleClick}
        role="img"
        aria-label={`Energy diagram. The reaction is ${Math.round(s * 100)}% of the way from reactants to products.`}
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

        {/* activation energy bracket */}
        <line x1={xOf(0.5)} y1={yOf(0)} x2={xOf(0.5)} y2={yOf(1) + 4} className="energy-ea" />
        <line x1={xOf(0.02)} y1={yOf(0)} x2={xOf(0.5)} y2={yOf(0)} className="energy-guide" />
        <text x={xOf(0.5) + 5} y={(yOf(0) + yOf(1)) / 2 + 4} className="energy-note">
          Eₐ
        </text>

        {/* the curve, with the part already travelled highlighted */}
        <path d={path} className="energy-curve" />
        <clipPath id="travelled">
          <rect x={0} y={0} width={xOf(s)} height={H} />
        </clipPath>
        <path d={path} className="energy-curve is-travelled" clipPath="url(#travelled)" />

        {/* labels */}
        <text x={xOf(0.03)} y={yOf(0) + 13} className="energy-note">
          Reactants
        </text>
        <text x={xOf(0.5)} y={yOf(1) - 7} className="energy-note" textAnchor="middle">
          ‡ Transition state
        </text>
        <text x={xOf(0.97)} y={yOf(-0.6) - 7} className="energy-note" textAnchor="end">
          Products
        </text>

        {/* current position */}
        <circle cx={xOf(s)} cy={yOf(energyAt(s))} r={5.5} className="energy-dot" />
      </svg>
    </figure>
  )
}
