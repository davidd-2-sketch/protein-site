/*
  make-contours.mjs — draws the home page's faint background contour lines ONCE, ahead of
  time, and saves them as a small picture: public/contours.svg.

  Run it only if you want to change the pattern:   node scripts/make-contours.mjs

  Why a saved picture? The lines never change, so there is no reason for every visitor's
  phone or laptop to recalculate them each time the page opens.

  How the lines are made (good to understand, not required):
    • We place a few invisible "nuclei". Each one creates a bell-shaped (Gaussian)
      density that is high at its center and fades with distance.
    • We sample the total density on a grid of points.
    • For each chosen density level, an algorithm called "marching squares" walks the
      grid square by square and finds where the density crosses that level. The little
      pieces are then joined end to end into long smooth lines.
  This is decorative (not real data).
*/
import { writeFileSync } from 'node:fs'

const WIDTH = 1440
const HEIGHT = 900
const STEP = 12 // grid spacing in pixels (smaller = smoother but a bigger file)

/** Invisible nuclei: x, y, strength, spread. Arranged loosely like a small molecule. */
const NUCLEI = [
  { x: 1060, y: 330, a: 1.0, s: 150 },
  { x: 1230, y: 470, a: 0.7, s: 105 },
  { x: 900, y: 500, a: 0.65, s: 100 },
  { x: 180, y: 760, a: 0.85, s: 170 },
  { x: 90, y: 140, a: 0.45, s: 120 },
]
const LEVELS = [0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.9]

function density(x, y) {
  let d = 0
  for (const n of NUCLEI) d += n.a * Math.exp(-((x - n.x) ** 2 + (y - n.y) ** 2) / (2 * n.s * n.s))
  return d
}

const cols = Math.ceil(WIDTH / STEP) + 1
const rows = Math.ceil(HEIGHT / STEP) + 1
const grid = []
for (let j = 0; j < rows; j++) {
  grid.push([])
  for (let i = 0; i < cols; i++) grid[j].push(density(i * STEP, j * STEP))
}

/** All the short line pieces for one density level. */
function segments(level) {
  const out = []
  const lerp = (x1, y1, v1, x2, y2, v2) => {
    const t = (level - v1) / (v2 - v1)
    return `${(x1 + t * (x2 - x1)).toFixed(1)} ${(y1 + t * (y2 - y1)).toFixed(1)}`
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
      const table = {
        1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]], 4: [[top, right]],
        5: [[left, top], [bottom, right]], 6: [[top, bottom]], 7: [[left, top]], 8: [[left, top]],
        9: [[top, bottom]], 10: [[left, bottom], [top, right]], 11: [[top, right]], 12: [[left, right]],
        13: [[bottom, right]], 14: [[left, bottom]],
      }
      out.push(...table[code])
    }
  }
  return out
}

/** Join pieces that share an end point into long lines (a much smaller file). */
function join(segs) {
  const at = new Map() // point → pieces touching it
  segs.forEach((s, i) => s.forEach((p) => at.set(p, [...(at.get(p) ?? []), i])))
  const used = new Set()
  const walk = (start, first) => {
    const line = [start]
    let point = start
    let piece = first
    while (piece !== undefined && !used.has(piece)) {
      used.add(piece)
      point = segs[piece][0] === point ? segs[piece][1] : segs[piece][0]
      line.push(point)
      piece = at.get(point).find((i) => !used.has(i))
    }
    return line
  }
  let d = ''
  // Open lines first (they start at an end that only one piece touches), then closed loops.
  for (const pass of [1, 2]) {
    segs.forEach((s, i) => {
      if (used.has(i)) return
      const start = pass === 1 ? s.find((p) => at.get(p).length === 1) : s[0]
      if (!start) return
      const line = walk(start, i)
      d += `M${line[0]}L${line.slice(1).join(' ')}`
    })
  }
  return d
}

const paths = LEVELS.map((level, i) => `<path vector-effect="non-scaling-stroke" d="${join(segments(level))}" opacity="${(0.35 + (i / LEVELS.length) * 0.65).toFixed(2)}"/>`)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#a8b0ff" stroke-opacity=".17" stroke-width="1">${paths.join('')}</svg>\n`
writeFileSync(new URL('../public/contours.svg', import.meta.url), svg)
console.log(`public/contours.svg written: ${(svg.length / 1024).toFixed(1)} KB`)
