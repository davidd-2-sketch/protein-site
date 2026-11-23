/*
  LewisDrawing.tsx — draws a Lewis structure as SVG: element symbols, bond lines (single,
  double, triple), lone pairs as pairs of dots, unpaired electrons as single dots, and
  (optionally) formal charges. Ions get square brackets and their charge.

  When `editable`, every atom and bond is a button (click, or Tab + Enter) so the student
  can select it and change it with the controls under the drawing.

  Lone pairs are placed automatically in the most open directions around each atom, so any
  structure (even a half-finished one) is drawn clearly.
*/
import type { KeyboardEvent } from 'react'
import { fmtCharge, formalCharges, type LewisMolecule, type LForm } from './molecules'
import './LewisDrawing.css'

const S = 66 // pixels per unit of the molecule's 2D layout
const PAD = 1.05 // units of margin around the atoms
const DOT_R = 3.3

export type Selection = { kind: 'atom' | 'bond'; i: number } | null

interface Props {
  molecule: LewisMolecule
  form: LForm
  formal?: boolean
  editable?: boolean
  selected?: Selection
  onSelect?: (s: Selection) => void
  /** Atoms to point out (warm ring), e.g. the one a hint is about. */
  highlight?: number[]
  /** Resonance hybrid: fractional bond orders drawn with a dashed partial line, no lone pairs. */
  hybrid?: { bonds: number[]; charges: number[] }
  /** Smaller, for side-by-side resonance structures and practice cards. */
  size?: 'normal' | 'small'
  /** Hide the ion brackets (for resonance rows that draw one set around all forms). */
  noBrackets?: boolean
  label?: string
}

const angle = (dx: number, dy: number) => Math.atan2(dy, dx)
const diff = (a: number, b: number) => {
  const d = Math.abs(a - b) % (2 * Math.PI)
  return d > Math.PI ? 2 * Math.PI - d : d
}

/**
 * Pick `n` directions around an atom (for its lone pairs, unpaired electrons, and charge)
 * that stay as far as possible from its bonds and from each other. Every combination of 24
 * candidate directions (every 15°) is tried (n is at most 4 here, so this is quick), so crowded atoms
 * like the middle of I₃⁻ get evenly spread dots instead of a bunched-up corner.
 */
function freeDirections(taken: number[], n: number) {
  const C = Array.from({ length: 24 }, (_, k) => (k * Math.PI) / 12)
  // Straight up/down/left/right look tidiest: a small bonus breaks ties toward them.
  const tidy = (c: number) => (Math.abs(Math.sin(2 * c)) < 1e-6 ? 0.02 : 0)
  let best: number[] = []
  let bestScore = -Infinity
  const pick: number[] = []
  const search = (start: number) => {
    if (pick.length === n) {
      const dirs = pick.map((k) => C[k])
      let minD = Math.PI
      for (let i = 0; i < dirs.length; i++) {
        for (const t of taken) minD = Math.min(minD, diff(dirs[i], t))
        for (let j = i + 1; j < dirs.length; j++) minD = Math.min(minD, diff(dirs[i], dirs[j]))
      }
      const score = minD + dirs.reduce((s, d) => s + tidy(d), 0)
      if (score > bestScore + 1e-9) {
        bestScore = score
        best = dirs
      }
      return
    }
    for (let k = start; k < C.length; k++) {
      pick.push(k)
      search(k + 1)
      pick.pop()
    }
  }
  if (n > 0) search(0)
  // Put the most "natural" directions first (the charge uses the last one).
  return best.sort((x, y) => tidy(y) - tidy(x))
}

/** Width of an element symbol, roughly, for shortening bond lines. */
const halfWidth = (el: string) => (el.length > 1 ? 17 : 11)

export default function LewisDrawing({ molecule: m, form, formal, editable, selected, onSelect, highlight = [], hybrid, size = 'normal', noBrackets, label }: Props) {
  const xs = m.atoms.map((a) => a.x)
  const ys = m.atoms.map((a) => a.y)
  const minX = Math.min(...xs) - PAD
  const maxX = Math.max(...xs) + PAD
  const minY = Math.min(...ys) - PAD
  const maxY = Math.max(...ys) + PAD
  const bracket = m.charge !== 0 && !noBrackets
  const extra = bracket ? 0.55 : 0
  const vb = { x: (minX - extra * 0.4) * S, y: minY * S - (bracket ? 8 : 0), w: (maxX - minX + extra) * S, h: (maxY - minY) * S + (bracket ? 8 : 0) }
  const P = (i: number) => ({ x: m.atoms[i].x * S, y: m.atoms[i].y * S })
  const charges = hybrid ? hybrid.charges : formalCharges(m, form)

  // Directions of each atom's bonds (for placing lone pairs and charges).
  const bondDirs = m.atoms.map(() => [] as number[])
  m.links.forEach(([a, b]) => {
    const pa = P(a)
    const pb = P(b)
    bondDirs[a].push(angle(pb.x - pa.x, pb.y - pa.y))
    bondDirs[b].push(angle(pa.x - pb.x, pa.y - pb.y))
  })

  const key = (s: Selection) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(s)
    }
  }

  return (
    <svg
      className={`lewis is-${size} ${editable ? 'is-editable' : ''}`}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      role={editable ? 'group' : 'img'}
      aria-label={label ?? `Lewis structure of ${m.formula}`}
    >
      {/* Bonds */}
      {m.links.map(([a, b], k) => {
        const pa = P(a)
        const pb = P(b)
        const len = Math.hypot(pb.x - pa.x, pb.y - pa.y)
        const ux = (pb.x - pa.x) / len
        const uy = (pb.y - pa.y) / len
        const ra = halfWidth(m.atoms[a].el) + 4
        const rb = halfWidth(m.atoms[b].el) + 4
        const x1 = pa.x + ux * ra
        const y1 = pa.y + uy * ra
        const x2 = pb.x - ux * rb
        const y2 = pb.y - uy * rb
        const order = hybrid ? hybrid.bonds[k] : form.bonds[k]
        const whole = Math.floor(order + 1e-9)
        const partial = order - whole > 0.01
        const strokes = whole + (partial ? 1 : 0)
        const gap = 7
        const isSel = selected?.kind === 'bond' && selected.i === k
        const names = ['', 'single', 'double', 'triple']
        return (
          <g
            key={`b${k}`}
            className={`lewis-bond ${isSel ? 'is-selected' : ''}`}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-pressed={editable ? isSel : undefined}
            aria-label={editable ? `Bond between ${m.atoms[a].el} and ${m.atoms[b].el}: ${names[order] ?? order}` : undefined}
            onClick={editable ? () => onSelect?.({ kind: 'bond', i: k }) : undefined}
            onKeyDown={editable ? key({ kind: 'bond', i: k }) : undefined}
          >
            {editable && <line className="lewis-hit" x1={x1} y1={y1} x2={x2} y2={y2} />}
            {Array.from({ length: strokes }, (_, s) => {
              const off = (s - (strokes - 1) / 2) * gap
              return (
                <line
                  key={s}
                  className={partial && s === strokes - 1 ? 'is-partial' : undefined}
                  x1={x1 - uy * off}
                  y1={y1 + ux * off}
                  x2={x2 - uy * off}
                  y2={y2 + ux * off}
                />
              )
            })}
          </g>
        )
      })}

      {/* Atoms, lone pairs, unpaired electrons, formal charges */}
      {m.atoms.map((atom, i) => {
        const p = P(i)
        const pairs = hybrid ? 0 : form.lone[i]
        const singles = hybrid ? 0 : (form.single?.[i] ?? 0)
        // Dots first; then the formal charge goes in the most open spot that's left.
        const dots = freeDirections(bondDirs[i], pairs + singles)
        const dirs = [...dots, ...freeDirections([...bondDirs[i], ...dots], 1)]
        const isSel = selected?.kind === 'atom' && selected.i === i
        const fc = charges[i]
        // Crowded atoms (5+ things around them, like the middle of I₃⁻) get their dots set wider apart.
        const crowded = pairs + singles + bondDirs[i].length >= 5
        const r = halfWidth(atom.el) + (crowded ? 12 : 9)
        const chargeDir = dirs[pairs + singles]
        const showCharge = (formal || hybrid) && Math.abs(fc) > 0.01
        return (
          <g
            key={`a${i}`}
            className={`lewis-atom ${isSel ? 'is-selected' : ''} ${highlight.includes(i) ? 'is-highlight' : ''}`}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-pressed={editable ? isSel : undefined}
            aria-label={
              editable
                ? `${atom.el} atom, ${pairs} lone pair${pairs === 1 ? '' : 's'}${singles ? ', 1 unpaired electron' : ''}${formal ? `, formal charge ${fmtCharge(fc)}` : ''}`
                : undefined
            }
            onClick={editable ? () => onSelect?.({ kind: 'atom', i }) : undefined}
            onKeyDown={editable ? key({ kind: 'atom', i }) : undefined}
          >
            <circle className="lewis-ring" cx={p.x} cy={p.y} r={r + 6} />
            <text className="lewis-symbol" x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central">
              {atom.el}
            </text>
            {dirs.slice(0, pairs + singles).map((d, j) => {
              const cx = p.x + Math.cos(d) * r
              const cy = p.y + Math.sin(d) * r
              const px = -Math.sin(d) * 4.6
              const py = Math.cos(d) * 4.6
              return j < pairs ? (
                <g key={j} className="lewis-pair">
                  <circle cx={cx + px} cy={cy + py} r={DOT_R} />
                  <circle cx={cx - px} cy={cy - py} r={DOT_R} />
                </g>
              ) : (
                <circle key={j} className="lewis-single" cx={cx} cy={cy} r={DOT_R} />
              )
            })}
            {showCharge && (
              <text
                className={`lewis-charge ${fc > 0 ? 'is-plus' : 'is-minus'}`}
                x={p.x + Math.cos(chargeDir) * (r + 5)}
                y={p.y + Math.sin(chargeDir) * (r + 5)}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {hybrid ? fraction(fc) : fc > 0 ? (fc === 1 ? '+' : `${fc}+`) : fc === -1 ? '−' : `${-fc}−`}
              </text>
            )}
          </g>
        )
      })}

      {/* Ion brackets */}
      {bracket && (
        <g className="lewis-bracket" aria-hidden="true">
          <path d={`M${minX * S + 10} ${minY * S + 6} h-8 V${maxY * S - 6} h8`} />
          <path d={`M${maxX * S - 10} ${minY * S + 6} h8 V${maxY * S - 6} h-8`} />
          <text x={maxX * S + 4} y={minY * S + 8} className="lewis-ion-charge">
            {m.charge > 0 ? (m.charge === 1 ? '+' : `${m.charge}+`) : m.charge === -1 ? '−' : `${-m.charge}−`}
          </text>
        </g>
      )}
    </svg>
  )
}

/** −⅔, +⅓, etc. for hybrid charges. */
function fraction(c: number) {
  const sign = c < 0 ? '−' : '+'
  const a = Math.abs(c)
  const map: [number, string][] = [[1 / 3, '⅓'], [2 / 3, '⅔'], [0.5, '½'], [1, '1']]
  const hit = map.find(([v]) => Math.abs(v - a) < 0.01)
  return `${sign}${hit ? hit[1] : a.toFixed(2)}`
}
