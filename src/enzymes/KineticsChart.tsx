/*
  KineticsChart.tsx — rate vs substrate concentration (Michaelis–Menten), or its
  double-reciprocal form (Lineweaver–Burk). Always draws the no-inhibitor reference line
  (faint) next to the inhibited one, with Vmax and Km marked for both, so students can SEE
  which constant an inhibitor changes.
*/
import { useMemo } from 'react'
import { apparent, DEMO, lineweaverBurk, rate, type Inhibition } from './kinetics'

const W = 640
const H = 420
const PAD = { l: 62, r: 30, t: 30, b: 50 }

export type KineticsPlot = 'mm' | 'lb'

interface Props {
  plot: KineticsPlot
  type: Inhibition
  /** inhibitor concentration (mM) */
  inhibitor: number
  /** substrate concentration (mM) */
  substrate: number
}

const S_MAX = 20
const V_MAX_AXIS = 110

export default function KineticsChart({ plot, type, inhibitor, substrate }: Props) {
  const base = { vmax: DEMO.vmax, km: DEMO.km }
  const app = apparent(type, DEMO, type === 'none' ? 0 : inhibitor)
  const inhibited = type !== 'none' && inhibitor > 0
  return (
    <figure className="enz-chart">
      <figcaption className="enz-chart-head">
        <span>{plot === 'mm' ? 'Michaelis–Menten: rate vs [S]' : 'Lineweaver–Burk: 1/rate vs 1/[S]'}</span>
        <span className="tag tag-illustrative">Example numbers</span>
      </figcaption>
      {plot === 'mm' ? <MM base={base} app={app} inhibited={inhibited} substrate={substrate} /> : <LB base={base} app={app} inhibited={inhibited} />}
    </figure>
  )
}

type K = { vmax: number; km: number }

function MM({ base, app, inhibited, substrate }: { base: K; app: K; inhibited: boolean; substrate: number }) {
  const X = (s: number) => PAD.l + (s / S_MAX) * (W - PAD.l - PAD.r)
  const Y = (v: number) => H - PAD.b - (v / V_MAX_AXIS) * (H - PAD.t - PAD.b)
  const curve = (k: K) => {
    let d = ''
    for (let i = 0; i <= 160; i++) {
      const s = (i / 160) * S_MAX
      d += `${i ? 'L' : 'M'}${X(s).toFixed(1)},${Y(rate(s, k.vmax, k.km)).toFixed(1)}`
    }
    return d
  }
  const paths = useMemo(() => ({ base: curve(base), app: curve(app) }), [app.vmax, app.km]) // eslint-disable-line react-hooks/exhaustive-deps
  const v = rate(substrate, app.vmax, app.km)
  const ticksS = [0, 5, 10, 15, 20]
  const ticksV = [0, 25, 50, 75, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rate versus substrate. Vmax ${app.vmax.toFixed(0)}, Km ${app.km.toFixed(2)} millimolar. At ${substrate.toFixed(1)} millimolar substrate the rate is ${v.toFixed(0)}.`}>
      <Axes
        xTicks={ticksS.map((t) => ({ at: X(t), label: String(t) }))}
        yTicks={ticksV.map((t) => ({ at: Y(t), label: String(t) }))}
        xLabel="[S], substrate (mM)"
        yLabel="Rate, v (µM/s)"
      />
      {/* reference: no inhibitor */}
      <line x1={X(0)} y1={Y(base.vmax)} x2={X(S_MAX)} y2={Y(base.vmax)} className="kc-guide" />
      <line x1={X(base.km)} y1={Y(base.vmax / 2)} x2={X(base.km)} y2={Y(0)} className="kc-guide" />
      <text x={X(S_MAX) - 4} y={Y(base.vmax) - 6} textAnchor="end" className="kc-note">
        Vmax
      </text>
      <text x={X(base.km) + 4} y={Y(0) - 8} className="kc-note">
        Km
      </text>
      <path d={paths.base} className={`kc-curve ${inhibited ? 'is-ref' : 'is-main'}`} />

      {inhibited && (
        <g>
          <line x1={X(0)} y1={Y(app.vmax)} x2={X(S_MAX)} y2={Y(app.vmax)} className="kc-guide is-app" />
          <line x1={X(Math.min(app.km, S_MAX))} y1={Y(app.vmax / 2)} x2={X(Math.min(app.km, S_MAX))} y2={Y(0)} className="kc-guide is-app" />
          <circle cx={X(Math.min(app.km, S_MAX))} cy={Y(app.vmax / 2)} r={4} className="kc-half" />
          {Math.abs(app.vmax - base.vmax) > 0.5 && (
            <text x={X(S_MAX) - 4} y={Y(app.vmax) - 6} textAnchor="end" className="kc-note is-app">
              Vmax with inhibitor
            </text>
          )}
          {Math.abs(app.km - base.km) > 0.01 && app.km <= S_MAX && (
            <text x={X(app.km) + 4} y={Y(0) - 24} className="kc-note is-app">
              Km with inhibitor
            </text>
          )}
          <path d={paths.app} className="kc-curve is-main" />
        </g>
      )}

      {/* where the chosen [S] sits on the curve */}
      <line x1={X(substrate)} y1={Y(0)} x2={X(substrate)} y2={Y(v)} className="kc-drop" />
      <circle cx={X(substrate)} cy={Y(v)} r={6.5} className="kc-dot" />
      <text x={X(substrate) + 10} y={Y(v) + (v > 90 ? 18 : -10)} className="kc-value mono">
        v = {v.toFixed(0)}
      </text>
    </svg>
  )
}

function LB({ base, app, inhibited }: { base: K; app: K; inhibited: boolean }) {
  const lines = [{ k: base, main: !inhibited }, ...(inhibited ? [{ k: app, main: true }] : [])]
  // Ranges grow to fit both x-intercepts (−1/Km) and the lines at the right edge.
  const xMin = -1.25 * Math.max(...lines.map((l) => 1 / l.k.km))
  const xMax = 2
  const yAt = (k: K, x: number) => {
    const lb = lineweaverBurk(k.vmax, k.km)
    return lb.slope * x + lb.yIntercept
  }
  const yMax = niceCeil(1.1 * Math.max(...lines.map((l) => yAt(l.k, xMax))))
  const X = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r)
  const Y = (y: number) => H - PAD.b - (y / yMax) * (H - PAD.t - PAD.b)
  const x0 = X(0)
  const xTicks = niceTicks(xMin, xMax)
  const yTicks = niceTicks(0, yMax)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Lineweaver–Burk plot. y-intercept 1/Vmax = ${(1 / app.vmax).toFixed(3)}, x-intercept −1/Km = ${(-1 / app.km).toFixed(2)}.`}>
      {/* axes cross at the origin; the x-axis extends left to show −1/Km */}
      <line x1={X(xMin)} y1={Y(0)} x2={X(xMax)} y2={Y(0)} className="ec-axis" />
      <line x1={x0} y1={Y(0)} x2={x0} y2={Y(yMax)} className="ec-axis" />
      {xTicks.map((t) => (
        <text key={`x${t}`} x={X(t)} y={Y(0) + 18} textAnchor="middle" className="kc-tick">
          {t}
        </text>
      ))}
      {yTicks.filter((t) => t > 0).map((t) => (
        <text key={`y${t}`} x={x0 - 8} y={Y(t) + 4} textAnchor="end" className="kc-tick">
          {t}
        </text>
      ))}
      <text x={X(xMax) - 4} y={Y(0) + 36} textAnchor="end" className="ec-axis-label">
        1/[S] (1/mM)
      </text>
      <text x={x0 + 8} y={Y(yMax) + 4} className="ec-axis-label">
        1/v (s/µM)
      </text>

      {lines.map(({ k, main }, i) => {
        const lb = lineweaverBurk(k.vmax, k.km)
        return (
          <g key={i}>
            <line x1={X(lb.xIntercept)} y1={Y(0)} x2={X(xMax)} y2={Y(yAt(k, xMax))} className={`kc-curve ${main ? 'is-main' : 'is-ref'}`} />
            <circle cx={x0} cy={Y(lb.yIntercept)} r={4} className={main ? 'kc-half' : 'kc-ref-dot'} />
            <circle cx={X(lb.xIntercept)} cy={Y(0)} r={4} className={main ? 'kc-half' : 'kc-ref-dot'} />
          </g>
        )
      })}
      {(() => {
        const lb = lineweaverBurk(app.vmax, app.km)
        return (
          <>
            <text x={x0 + 8} y={Y(lb.yIntercept) - 8} className="kc-note is-app">
              1/Vmax = {lb.yIntercept.toFixed(3)}
            </text>
            <text x={X(lb.xIntercept)} y={Y(0) - 10} textAnchor="middle" className="kc-note is-app">
              −1/Km = {lb.xIntercept.toFixed(2)}
            </text>
          </>
        )
      })()}
    </svg>
  )
}

function Axes(props: { xTicks: { at: number; label: string }[]; yTicks: { at: number; label: string }[]; xLabel: string; yLabel: string }) {
  return (
    <g>
      <line x1={PAD.l} y1={PAD.t - 8} x2={PAD.l} y2={H - PAD.b} className="ec-axis" />
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} className="ec-axis" />
      {props.xTicks.map((t) => (
        <text key={t.label} x={t.at} y={H - PAD.b + 18} textAnchor="middle" className="kc-tick">
          {t.label}
        </text>
      ))}
      {props.yTicks.map((t) => (
        <text key={t.label} x={PAD.l - 8} y={t.at + 4} textAnchor="end" className="kc-tick">
          {t.label}
        </text>
      ))}
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 10} textAnchor="middle" className="ec-axis-label">
        {props.xLabel}
      </text>
      <text x={16} y={(H - PAD.b + PAD.t) / 2} transform={`rotate(-90 16 ${(H - PAD.b + PAD.t) / 2})`} textAnchor="middle" className="ec-axis-label">
        {props.yLabel}
      </text>
    </g>
  )
}

/** Round up to 1, 2, or 5 × a power of ten. */
function niceCeil(v: number) {
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 5, 10]) if (m * p >= v) return m * p
  return 10 * p
}

/** About 5 evenly spaced round tick values between a and b. */
function niceTicks(a: number, b: number) {
  const step = niceCeil((b - a) / 5)
  const out: number[] = []
  for (let t = Math.ceil(a / step) * step; t <= b + 1e-9; t += step) out.push(Number(t.toFixed(4)))
  return out
}
