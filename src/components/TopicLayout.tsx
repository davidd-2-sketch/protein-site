/*
  TopicLayout.tsx — the ONE layout every topic page uses (Proteins, Enzymes, Reactions,
  Shapes, Orbitals, Polarity, Trends, and Practice), so they can't drift apart.

  Five slots, always in the same place:
    1. panel    left side: lessons or explore controls (Lessons | Explore switch on top)
    2. label    top-left of the model: the honesty label + what the model is
    3. options  top-right of the model: view switches (Labels, Spin, Reset view, ...)
    4. control  bottom-center: the one main thing you play with (style, timeline, builder)
    5. legend   bottom-right: the color key, in words as well as colors

  Phones and tablets (under 900 px wide): the model is on top and the panel is a sheet at
  the bottom. Drag its handle (or tap it) to shrink the sheet to one line and give the model
  nearly the whole screen. The model's area ENDS where the sheet begins, so the sheet never
  covers the model. View options fold into one button. Held sideways, the model sits on the
  left and the panel on the right.
*/
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Icon from './Icon'
import './TopicLayout.css'

export interface ModelLabel {
  /** Measured data (Protein Data Bank) or a teaching model. */
  kind: 'experimental' | 'illustrative'
  /** What the model is, e.g. "Hemoglobin". */
  name: ReactNode
  /** Where it comes from or how it was made, e.g. a "PDB 4HHB ↗" link. */
  source?: ReactNode
}

export interface Peek {
  /** Small line above the title, e.g. "Step 2 of 5". */
  kicker?: string
  title: ReactNode
  /** Optional button on the collapsed sheet, e.g. Next. */
  action?: { label: string; onClick: () => void }
}

interface Props {
  /** Extra class for page-specific styles. */
  className?: string
  panel: ReactNode
  label: ModelLabel | null
  options?: ReactNode
  control?: ReactNode
  legend?: ReactNode
  /** What the collapsed sheet shows on phones. */
  peek: Peek
  /** The 3D canvas and anything pinned to it. */
  children: ReactNode
}

export default function TopicLayout({ className = '', panel, label, options, control, legend, peek, children }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const sheet = useRef<HTMLElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  /* ---------- dragging the sheet (phones) ---------- */
  const drag = useRef<{ startY: number; base: number; max: number; moved: boolean } | null>(null)
  const onGrabDown = (e: React.PointerEvent) => {
    const el = sheet.current
    if (!el) return
    const peekHeight = parseFloat(getComputedStyle(el).getPropertyValue('--sheet-peek')) || 76
    const max = el.offsetHeight - peekHeight // how far down the sheet can slide
    drag.current = { startY: e.clientY, base: collapsed ? max : 0, max, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onGrabMove = (e: React.PointerEvent) => {
    const d = drag.current
    const el = sheet.current
    if (!d || !el) return
    const dy = e.clientY - d.startY
    if (Math.abs(dy) > 6) d.moved = true
    if (!d.moved) return
    el.style.transition = 'none'
    el.style.transform = `translateY(${Math.min(d.max, Math.max(0, d.base + dy))}px)`
  }
  const onGrabUp = (e: React.PointerEvent) => {
    const d = drag.current
    const el = sheet.current
    drag.current = null
    if (!d || !el) return
    el.style.transition = ''
    el.style.transform = ''
    if (!d.moved) return // a tap: the button's click handler toggles it
    const at = Math.min(d.max, Math.max(0, d.base + (e.clientY - d.startY)))
    setCollapsed(at > d.max / 2)
    suppressClick.current = true
  }
  // After a drag, ignore the click that follows the pointer release.
  const suppressClick = useRef(false)
  const onGrabClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    setCollapsed((c) => !c)
  }

  /* ---------- the folded "view options" menu (phones) ---------- */
  const closeOptions = useCallback(() => setOptionsOpen(false), [])
  useEffect(() => {
    if (!optionsOpen) return
    const onDown = (e: PointerEvent) => !optionsRef.current?.contains(e.target as Node) && closeOptions()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeOptions()
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [optionsOpen, closeOptions])

  const hasOptions = Boolean(options || legend)

  return (
    <div className={`topic ${className} ${collapsed ? 'is-collapsed' : ''} ${control ? 'has-control' : ''}`}>
      <div className="topic-backdrop" aria-hidden="true" />

      <div className="topic-stage">
        {children}

        {label && (
          <div className="topic-label">
            <span className={`tag ${label.kind === 'experimental' ? 'tag-experimental' : 'tag-illustrative'}`}>
              {label.kind === 'experimental' ? 'Experimental structure' : 'Illustrative'}
            </span>
            <span className="topic-label-text">
              <strong>{label.name}</strong>
              {label.source && <span className="topic-label-source"> · {label.source}</span>}
            </span>
          </div>
        )}

        {hasOptions && (
          <div className={`topic-options ${optionsOpen ? 'is-open' : ''}`} ref={optionsRef}>
            <button className="topic-options-btn" aria-label="View options" aria-expanded={optionsOpen} onClick={() => setOptionsOpen((o) => !o)}>
              <Icon name="settings" />
            </button>
            <div className="topic-options-bar" role="group" aria-label="View options">
              {options}
              {legend && <div className="topic-options-legend">{legend}</div>}
            </div>
          </div>
        )}

        {control && <div className="topic-control">{control}</div>}
        {legend && <div className="topic-legend">{legend}</div>}
      </div>

      {/* data-tip-bounds: glossary definitions open inside this panel, never over the model. */}
      <aside className="topic-panel" ref={sheet} data-tip-bounds>
        <button
          className="topic-grab"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Show the lesson panel' : 'Shrink the lesson panel to see more of the model'}
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={onGrabUp}
          onClick={onGrabClick}
        >
          <span className="topic-grab-bar" aria-hidden="true" />
        </button>
        <div className="topic-peek">
          <div className="topic-peek-text">
            {peek.kicker && <p className="topic-peek-kicker">{peek.kicker}</p>}
            <p className="topic-peek-title">{peek.title}</p>
          </div>
          {peek.action && (
            <button className="btn btn-primary btn-sm" onClick={peek.action.onClick}>
              {peek.action.label} <Icon name="arrow" size={16} />
            </button>
          )}
        </div>
        <div className="topic-panel-body">{panel}</div>
      </aside>
    </div>
  )
}

/* ---------- small shared controls for the option and control slots ---------- */

/** An on/off switch with a text label. */
export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${on ? 'is-on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      {label}
    </button>
  )
}

/** A plain text button for the options bar, e.g. "Reset view". */
export function ToolButton({ children, onClick, pressed, title }: { children: ReactNode; onClick: () => void; pressed?: boolean; title?: string }) {
  return (
    <button className={`tool-btn ${pressed ? 'is-on' : ''}`} aria-pressed={pressed} onClick={onClick} title={title}>
      {children}
    </button>
  )
}

/** The color key: each color with its meaning in words. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  if (!items.length) return null
  return (
    <ul className="legend-list" aria-label="Color key">
      {items.map((i) => (
        <li key={i.label}>
          <span className={`legend-chip ${i.color.startsWith('linear') ? 'is-wide' : ''}`} style={{ background: i.color }} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
