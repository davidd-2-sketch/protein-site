/*
  RichText.tsx — turns lesson text into formatted text.

  Supported markup (deliberately tiny):
    **bold**                   → bold
    p_z, d_x²−y²               → subscript after an underscore
    [[term]]                   → glossary term with a hover/tap definition
    [[shown text|term]]        → same, when the wording differs from the glossary key
*/
import { useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GLOSSARY } from './glossary'
import './lessons.css'

export default function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  // Split into **bold**, [[term]], and _subscript tokens (e.g. p_z, d_z², ψ_bonding);
  // keep everything else as plain text.
  const re = /\*\*(.+?)\*\*|\[\[(.+?)\]\]|_([A-Za-z0-9²−-]+)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>)
    else if (m[3]) parts.push(<sub key={m.index}>{m[3]}</sub>)
    else {
      const [shown, key = shown] = m[2].split('|')
      parts.push(<Term key={m.index} shown={shown} term={key} />)
    }
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

/** A dotted-underlined word that shows its definition on hover, keyboard focus, or tap. */
function Term({ shown, term }: { shown: string; term: string }) {
  const definition = GLOSSARY[term]
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  if (!definition) return <>{shown}</> // unknown term: show it as plain text

  const open = () => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ x: Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150), y: r.bottom + 8 })
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
        aria-describedby={pos ? id : undefined}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        // Click/tap only opens. (A tap also fires a hover first, so toggling here would
        // open and instantly close it on phones.) Tapping anywhere else closes it via blur.
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
      {/* Rendered at the end of <body> so a scrolling panel can never cut it off. */}
      {pos &&
        createPortal(
          <div role="tooltip" id={id} className="term-tip" style={{ left: pos.x, top: pos.y }}>
            <strong>{term}</strong>
            <span>{definition}</span>
          </div>,
          document.body,
        )}
    </>
  )
}
