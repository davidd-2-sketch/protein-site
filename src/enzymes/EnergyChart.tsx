/*
  EnergyChart.tsx — the uncatalyzed vs enzyme-catalyzed energy diagram (schematic).
  Shows: both paths, the two activation-energy barriers, and the overall ΔG, which is the
  SAME for both (the curves start and end at the same heights).
*/
import { useMemo } from 'react'
import { CATALYZED, catalyzedEnergy, UNCATALYZED, uncatalyzedEnergy } from './energy'

const W = 720
const H = 420
const PAD = { l: 56, r: 230, t: 34, b: 46 }
const X = (s: number) => PAD.l + s * (W - PAD.l - PAD.r)
/** x positions of the three brackets, right of the plot. */
const BX = { un: X(1) + 24, cat: X(1) + 70, dg: X(1) + 214 }
const Y = (e: number) => PAD.t + (1 - (e + 0.65) / 1.8) * (H - PAD.t - PAD.b)

const pathOf = (fn: (s: number) => number) => {
  let d = ''
  for (let i = 0; i <= 200; i++) d += `${i ? 'L' : 'M'}${X(i / 200).toFixed(1)},${Y(fn(i / 200)).toFixed(1)}`
  return d
}

export default function EnergyChart({ showUncatalyzed, showCatalyzed }: { showUncatalyzed: boolean; showCatalyzed: boolean }) {
  const paths = useMemo(() => ({ un: pathOf(uncatalyzedEnergy), cat: pathOf(catalyzedEnergy) }), [])
  const start = UNCATALYZED[0][1]
  const end = UNCATALYZED[UNCATALYZED.length - 1][1]
  const unPeak = 1
  const es = CATALYZED[2] // [s, energy] of the ES complex
  const ts = CATALYZED[3] // the stabilized transition state
  const ep = CATALYZED[4]

  return (
    <figure className="enz-chart">
      <figcaption className="enz-chart-head">
        <span>Energy along the reaction</span>
        <span className="tag tag-illustrative">Schematic</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Energy diagram. Without the enzyme there is one high barrier. With the enzyme the highest barrier is much lower, but the reaction starts and ends at the same energies, so ΔG is unchanged.">
        <defs>
          <linearGradient id="catGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#5ee4ff" />
            <stop offset="1" stopColor="#b68cff" />
          </linearGradient>
          <marker id="tip" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
          </marker>
        </defs>

        {/* axes */}
        <line x1={PAD.l} y1={PAD.t - 10} x2={PAD.l} y2={H - PAD.b} className="ec-axis" />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r + 20} y2={H - PAD.b} className="ec-axis" />
        <text x={18} y={(H - PAD.b + PAD.t) / 2} transform={`rotate(-90 18 ${(H - PAD.b + PAD.t) / 2})`} textAnchor="middle" className="ec-axis-label">
          Free energy (G)
        </text>
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 12} textAnchor="middle" className="ec-axis-label">
          Reaction progress →
        </text>

        {/* start and end levels, carried across so the equal ΔG is easy to see */}
        <line x1={X(0)} y1={Y(start)} x2={BX.dg} y2={Y(start)} className="ec-guide" />
        <line x1={X(0.9)} y1={Y(end)} x2={BX.dg} y2={Y(end)} className="ec-guide" />

        {/* Brackets sit to the right of the plot (textbook style), with dotted guides from
            each peak and valley, so labels never sit on top of the curves. */}
        {showUncatalyzed && (
          <g className="ec-un">
            <path d={paths.un} className="ec-curve is-un" />
            <line x1={X(0.5)} y1={Y(unPeak)} x2={BX.un} y2={Y(unPeak)} className="ec-guide" />
            <line x1={BX.un} y1={Y(start)} x2={BX.un} y2={Y(unPeak) + 2} className="ec-bracket is-un" markerStart="url(#tip)" markerEnd="url(#tip)" />
            <text x={BX.un - 8} y={Y(0.72)} textAnchor="end" className="ec-note is-un">
              Eₐ
            </text>
            <text x={BX.un - 8} y={Y(0.72) + 15} textAnchor="end" className="ec-note-small">
              no enzyme
            </text>
            <text x={X(0.5)} y={Y(unPeak) - 10} textAnchor="middle" className="ec-note is-un">
              S‡ (transition state)
            </text>
          </g>
        )}

        {showCatalyzed && (
          <g className="ec-cat">
            <path d={paths.cat} className="ec-curve is-cat" />
            <line x1={X(ts[0])} y1={Y(ts[1])} x2={BX.cat} y2={Y(ts[1])} className="ec-guide is-cat" />
            <line x1={X(es[0])} y1={Y(es[1])} x2={BX.cat} y2={Y(es[1])} className="ec-guide is-cat" />
            <line x1={BX.cat} y1={Y(es[1])} x2={BX.cat} y2={Y(ts[1]) + 2} className="ec-bracket is-cat" markerStart="url(#tip)" markerEnd="url(#tip)" />
            <text x={BX.cat + 8} y={(Y(es[1]) + Y(ts[1])) / 2} className="ec-note is-cat">
              Eₐ
            </text>
            <text x={BX.cat + 8} y={(Y(es[1]) + Y(ts[1])) / 2 + 15} className="ec-note-small">
              with enzyme
            </text>
            <text x={X(ts[0])} y={Y(ts[1]) - 10} textAnchor="middle" className="ec-note is-cat">
              ES‡ (stabilized)
            </text>
            <text x={X(es[0])} y={Y(es[1]) + 20} textAnchor="middle" className="ec-note is-cat">
              ES
            </text>
            <text x={X(ep[0])} y={Y(ep[1]) + 20} textAnchor="middle" className="ec-note is-cat">
              EP
            </text>
          </g>
        )}

        {/* ΔG: identical for both paths */}
        <line x1={BX.dg} y1={Y(start)} x2={BX.dg} y2={Y(end) - 2} className="ec-bracket is-dg" markerEnd="url(#tip)" />
        <text x={BX.dg - 8} y={(Y(start) + Y(end)) / 2 + 2} textAnchor="end" className="ec-note is-dg">
          ΔG
        </text>
        <text x={BX.dg - 8} y={(Y(start) + Y(end)) / 2 + 17} textAnchor="end" className="ec-note-small">
          same either way
        </text>

        <text x={X(0)} y={Y(start) + 20} className="ec-note">
          {showCatalyzed ? 'S (+ E)' : 'S'}
        </text>
        <text x={X(1)} y={Y(end) + 22} textAnchor="end" className="ec-note">
          {showCatalyzed ? 'P (+ E)' : 'P'}
        </text>
      </svg>
    </figure>
  )
}
