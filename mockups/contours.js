// contours.js — draws the decorative contour lines into every <svg class="contours" data-o="0.17">.
// Same "marching squares" method as the real site's Atmosphere.tsx.
(() => {
  const W = 1440, H = 900, STEP = 12
  const NUCLEI = [{ x: 1060, y: 330, a: 1.0, s: 150 }, { x: 1230, y: 470, a: 0.7, s: 105 }, { x: 900, y: 500, a: 0.65, s: 100 }, { x: 180, y: 760, a: 0.85, s: 170 }, { x: 90, y: 140, a: 0.45, s: 120 }]
  const LEVELS = [0.06, 0.12, 0.2, 0.3, 0.42, 0.56, 0.72, 0.9]
  const dens = (x, y) => NUCLEI.reduce((d, n) => d + n.a * Math.exp(-((x - n.x) ** 2 + (y - n.y) ** 2) / (2 * n.s * n.s)), 0)
  const cols = Math.ceil(W / STEP) + 1, rows = Math.ceil(H / STEP) + 1
  const g = Array.from({ length: rows }, (_, j) => Array.from({ length: cols }, (_, i) => dens(i * STEP, j * STEP)))
  const paths = LEVELS.map((L) => {
    let p = ''
    const lerp = (x1, y1, v1, x2, y2, v2) => { const t = (L - v1) / (v2 - v1); return `${(x1 + t * (x2 - x1)).toFixed(1)},${(y1 + t * (y2 - y1)).toFixed(1)}` }
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const x = i * STEP, y = j * STEP, a = g[j][i], b = g[j][i + 1], c = g[j + 1][i + 1], d = g[j + 1][i]
      const code = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0)
      if (code === 0 || code === 15) continue
      const T = lerp(x, y, a, x + STEP, y, b), R = lerp(x + STEP, y, b, x + STEP, y + STEP, c), B = lerp(x, y + STEP, d, x + STEP, y + STEP, c), Lf = lerp(x, y, a, x, y + STEP, d)
      const segs = { 1: [[Lf, B]], 2: [[B, R]], 3: [[Lf, R]], 4: [[T, R]], 5: [[Lf, T], [B, R]], 6: [[T, B]], 7: [[Lf, T]], 8: [[Lf, T]], 9: [[T, B]], 10: [[Lf, B], [T, R]], 11: [[T, R]], 12: [[Lf, R]], 13: [[B, R]], 14: [[Lf, B]] }
      for (const [s, e] of segs[code]) p += `M${s}L${e}`
    }
    return p
  })
  document.querySelectorAll('svg.contours').forEach((svg) => {
    const o = Number(svg.dataset.o || 0.17)
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
    svg.innerHTML = paths.map((d, i) => `<path d="${d}" stroke-opacity="${(o * (0.35 + (i / LEVELS.length) * 0.65)).toFixed(3)}"/>`).join('')
  })
})()
