/*
  Atmosphere.tsx — the decorative page background.

  Two layers:
    1. Soft indigo / blue / violet color haze (pure CSS gradients).
    2. Faint contour lines of a made-up "electron density" field: like the
       contour plots chemists use to show where electrons are likely to be.

  How the contour lines are made (good to understand, not required):
    • We place a few invisible "nuclei". Each one creates a bell-shaped (Gaussian)
      density that is high at its center and fades with distance.
    • We sample the total density on a grid of points.
    • For each chosen density level, an algorithm called "marching squares" walks
      the grid square by square and draws a tiny line segment wherever the density
      crosses that level. Together the segments form smooth closed contours.
  This is decorative (not real data), so it's marked aria-hidden for screen readers.
*/
import { useMemo } from 'react'
import './Atmosphere.css'

const WIDTH = 1440
const HEIGHT = 900
const STEP = 12 // grid spacing in pixels (smaller = smoother but slower)

/** Invisible nuclei: x, y, strength, spread. Arranged loosely like a small molecule. */
const NUCLEI = [
  { x: 1060, y: 330, a: 1.0, s: 150 },
  { x: 1230, y: 470, a: 0.7, s: 105 },
  { x: 900, y: 500, a: 0.65, s: 100 },
  { x: 180, y: 760, a: 0.85, s: 170 },
  { x: 90, y: 140, a: 0.45, s: 120 },
]

const LEVELS = [0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.9]

function density(x: number, y: number) {
  let d = 0
  for (const n of NUCLEI) {
    const dx = x - n.x
    const dy = y - n.y
    d += n.a * Math.exp(-(dx * dx + dy * dy) / (2 * n.s * n.s))
  }
  return d
}

/** Marching squares: returns one SVG path string per contour level. */
function contourPaths() {
  const cols = Math.ceil(WIDTH / STEP) + 1
  const rows = Math.ceil(HEIGHT / STEP) + 1
  const grid: number[][] = []
  for (let j = 0; j < rows; j++) {
    grid.push([])
    for (let i = 0; i < cols; i++) grid[j].push(density(i * STEP, j * STEP))
  }

  return LEVELS.map((level) => {
    let path = ''
    // Point along an edge where the density equals `level` (linear interpolation).
    const lerp = (x1: number, y1: number, v1: number, x2: number, y2: number, v2: number) => {
      const t = (level - v1) / (v2 - v1)
      return `${(x1 + t * (x2 - x1)).toFixed(1)},${(y1 + t * (y2 - y1)).toFixed(1)}`
    }
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const x = i * STEP
        const y = j * STEP
        const [a, b, c, d] = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]]
        // Which corners are above the level? Encoded as a 4-bit number (0–15).
        const code = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0)
        if (code === 0 || code === 15) continue
        const top = lerp(x, y, a, x + STEP, y, b)
        const right = lerp(x + STEP, y, b, x + STEP, y + STEP, c)
        const bottom = lerp(x, y + STEP, d, x + STEP, y + STEP, c)
        const left = lerp(x, y, a, x, y + STEP, d)
        const segs: Record<number, string[][]> = {
          1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]], 4: [[top, right]],
          5: [[left, top], [bottom, right]], 6: [[top, bottom]], 7: [[left, top]], 8: [[left, top]],
          9: [[top, bottom]], 10: [[left, bottom], [top, right]], 11: [[top, right]], 12: [[left, right]],
          13: [[bottom, right]], 14: [[left, bottom]],
        }
        for (const [p, q] of segs[code]) path += `M${p}L${q}`
      }
    }
    return path
  })
}

export default function Atmosphere() {
  // useMemo: compute the contours once, not on every re-render.
  const paths = useMemo(() => contourPaths(), [])
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="atmosphere-haze" />
      <svg className="atmosphere-contours" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice">
        {paths.map((d, i) => (
          <path key={i} d={d} style={{ opacity: 0.35 + (i / LEVELS.length) * 0.65 }} />
        ))}
      </svg>
    </div>
  )
}
