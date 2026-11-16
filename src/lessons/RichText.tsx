/*
  RichText.tsx — turns lesson text into formatted text.

  Supported markup (deliberately tiny):
    **bold**                   → bold
    p_z, d_x²−y²               → subscript after an underscore
    [[term]]                   → glossary term with a hover/tap definition
    [[shown text|term]]        → same, when the wording differs from the glossary key

  With `auto`, glossary words that the writer did NOT mark are underlined too (the first
  time each appears in that piece of text), so a beginner can always ask "what does this
  word mean?". Words with an everyday meaning (group, period, phase, ...) are never
  auto-marked: see AUTO_SKIP in glossary.ts.
*/
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AUTO_SKIP, GLOSSARY } from './glossary'
import './lessons.css'

/* One pattern that finds any auto-markable glossary word, longest first ("pi bond" before
   "bond"). All-lowercase keys match any capitalization and a plural "s"; keys with capitals
   (Km, Vmax, pKa) must match exactly. The character before and after must not be a letter
   or digit, so "node" never matches inside "anode". */
const esc = (k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const AUTO_KEYS = Object.keys(GLOSSARY)
  .filter((k) => !AUTO_SKIP.includes(k))
  .sort((a, b) => b.length - a.length)
const LOOKUP = new Map(AUTO_KEYS.map((k) => [k === k.toLowerCase() ? k : `=${k}`, k]))
const AUTO_RE = new RegExp(
  `(^|[^\\p{L}\\p{N}])(${AUTO_KEYS.map((k) => (k === k.toLowerCase() ? `(?:${[...esc(k)].map((c) => (/[a-z]/.test(c) ? `[${c}${c.toUpperCase()}]` : c)).join('')})s?` : esc(k))).join('|')})(?![\\p{L}\\p{N}])`,
  'gu',
)
/** Which glossary key a matched word belongs to. */
function keyOf(found: string): string | undefined {
  if (LOOKUP.has(`=${found}`)) return LOOKUP.get(`=${found}`)
  const low = found.toLowerCase()
  return LOOKUP.get(low) ?? (low.endsWith('s') ? LOOKUP.get(low.slice(0, -1)) : undefined)
}

export default function RichText({ text, auto = false }: { text: string; auto?: boolean }) {
  const parts: ReactNode[] = []
  /** Terms already underlined in this text: each is marked once. */
  const used = new Set<string>()
  // Split into **bold**, [[term]], and _subscript tokens (e.g. p_z, d_z², ψ_bonding);
  // keep everything else as plain text.
  const re = /\*\*(.+?)\*\*|\[\[(.+?)\]\]|_([A-Za-z0-9²−-]+)/g
  if (auto) for (const m of text.matchAll(/\[\[(.+?)\]\]/g)) used.add(m[1].split('|').pop()!)

  /** Plain text, with unmarked glossary words underlined when `auto` is on. */
  const plain = (chunk: string, at: number) => {
    if (!auto) return parts.push(chunk)
    let from = 0
    for (const m of chunk.matchAll(AUTO_RE)) {
      const key = keyOf(m[2])
      if (!key || used.has(key)) continue
      used.add(key)
      const start = m.index + m[1].length
      if (start > from) parts.push(chunk.slice(from, start))
      parts.push(<Term key={`a${at + start}`} shown={m[2]} term={key} />)
      from = start + m[2].length
    }
    if (from < chunk.length) parts.push(chunk.slice(from))
  }

  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) plain(text.slice(last, m.index), last)
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>)
    else if (m[3]) parts.push(<sub key={m.index}>{m[3]}</sub>)
    else {
      const [shown, key = shown] = m[2].split('|')
      parts.push(<Term key={m.index} shown={shown} term={key} />)
    }
    last = re.lastIndex
  }
  if (last < text.length) plain(text.slice(last), last)
  return <>{parts}</>
}

const TIP_WIDTH = 280

/** A dotted-underlined word that shows its definition on hover, keyboard focus, or tap. */
function Term({ shown, term }: { shown: string; term: string }) {
  const definition = GLOSSARY[term]
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null)
  const isOpen = pos !== null

  // While open: a tap anywhere else, or scrolling the text, closes it (phones have no hover).
  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setPos(null)
    const onScroll = () => setPos(null)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [isOpen])

  if (!definition) return <>{shown}</> // unknown term: show it as plain text

  const open = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // Keep the definition inside the lesson panel, so it never covers the 3D model.
    const bounds = el.closest('[data-tip-bounds]')?.getBoundingClientRect()
    const left = Math.max(bounds?.left ?? 0, 0) + 8
    const right = Math.min(bounds?.right ?? window.innerWidth, window.innerWidth) - 8
    const half = Math.min(TIP_WIDTH, right - left) / 2
    const x = Math.min(Math.max(r.left + r.width / 2, left + half), right - half)
    // Not enough room underneath: show it above the word instead.
    const above = window.innerHeight - r.bottom < 170 && r.top > 170
    setPos({ x, y: above ? r.top - 8 : r.bottom + 8, above })
  }
  const close = () => setPos(null)

  return (
    <>
      {/* A <span> (not a <button>) so the word wraps like normal text. role/tabIndex/onKeyDown
          give it the same keyboard behavior as a real button. */}
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        className="term"
        aria-describedby={id}
        aria-expanded={isOpen}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        // Click/tap only opens. (A tap also fires a hover first, so toggling here would
        // open and instantly close it on phones.) Tapping anywhere else closes it.
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (pos) close()
            else open()
          }
          if (e.key === 'Escape') close()
        }}
      >
        {shown}
      </span>
      {/* Always in the page (but not shown), so screen readers can read the definition. */}
      <span id={id} hidden>
        {term}: {definition}
      </span>
      {/* Rendered at the end of <body> so a scrolling panel can never cut it off. */}
      {pos &&
        createPortal(
          <div className={`term-tip ${pos.above ? 'is-above' : ''}`} aria-hidden="true" style={{ left: pos.x, top: pos.y }}>
            <strong>{term}</strong>
            <span>{definition}</span>
          </div>,
          document.body,
        )}
    </>
  )
}
