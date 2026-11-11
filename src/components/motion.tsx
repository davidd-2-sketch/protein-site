/*
  motion.tsx — small building blocks that make the interface move smoothly instead of jumping.

    • <SmoothHeight>    a box whose height glides when its content grows or shrinks.
    • <StepTransition>  swaps content like turning a page: the old content slides out
                        (left when moving forward, right when going back), THEN the new
                        slides in. They never overlap.
    • <SlidingPill>     the highlight behind the selected option of a switch, which slides
                        from option to option instead of jumping.

  All of it respects "reduce motion" (see global.css): animations finish instantly there.
  Styles live in styles/motion.css.
*/
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/* ---------------------------------------------------------------- SmoothHeight */

export function SmoothHeight({
  children,
  className = '',
  onSettled,
  active = true,
}: {
  children: ReactNode
  className?: string
  onSettled?: () => void
  /** When false, the box simply follows its content (height: auto) with no animation. */
  active?: boolean
}) {
  const inner = useRef<HTMLDivElement>(null)
  const last = useRef<number | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  // Clip only while the height is changing, so glows and focus rings aren't cut off at rest.
  const [moving, setMoving] = useState(false)
  const activeRef = useRef(active)
  useLayoutEffect(() => {
    activeRef.current = active
  }, [active])

  useLayoutEffect(() => {
    const el = inner.current!
    const measure = () => {
      const h = el.offsetHeight
      if (activeRef.current && last.current !== null && Math.abs(last.current - h) > 1) setMoving(true)
      last.current = h
      setHeight(h)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      className={`smooth-height ${moving ? 'is-moving' : ''} ${className}`}
      style={{ height: active && height !== null ? height : undefined }}
      onTransitionEnd={(e) => {
        if (e.target !== e.currentTarget) return
        setMoving(false)
        onSettled?.()
      }}
    >
      <div ref={inner} className="smooth-height-inner">
        {children}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- StepTransition */

interface Shown {
  id: string
  order: number
  /** 1 = moved forward, −1 = moved back, 0 = first appearance (no slide). */
  dir: number
}

/**
 * Pass a different `id` for each step. `order` gives the direction: a larger order than
 * before slides forward (old exits left, new enters from the right), smaller slides back.
 */
export function StepTransition({ id, order = 0, children, className = '' }: { id: string; order?: number; children: ReactNode; className?: string }) {
  const [current, setCurrent] = useState<Shown>({ id, order, dir: 0 })
  const [leaving, setLeaving] = useState<{ id: string; dir: number; node: ReactNode } | null>(null)
  // The last content shown for the current step: what slides out when the step changes.
  const [lastNode, setLastNode] = useState<ReactNode>(children)
  // True from the moment the step changes until the new step has settled. Only then does the
  // box animate its height; otherwise inner content (like quiz feedback) resizes it directly.
  const [changing, setChanging] = useState(false)

  // React's "adjust state while rendering" pattern: the moment the id changes, start the exit.
  if (id !== current.id) {
    const dir = order >= current.order ? 1 : -1
    setLeaving({ id: current.id, dir, node: lastNode })
    setCurrent({ id, order, dir })
    setChanging(true)
  } else if (!leaving && lastNode !== children) {
    setLastNode(children)
  }

  return (
    <SmoothHeight className={className} active={changing} onSettled={() => setChanging(false)}>
      {leaving ? (
        // Same key as when it was showing, so it keeps its state (e.g. an answered quiz) while it exits.
        <div
          key={leaving.id}
          className="step-out"
          style={{ '--dir': leaving.dir } as CSSProperties}
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget) return
            setLastNode(children)
            setLeaving(null)
          }}
        >
          {leaving.node}
        </div>
      ) : (
        <div
          key={current.id}
          className={current.dir ? 'step-in' : ''}
          style={{ '--dir': current.dir } as CSSProperties}
          // If the height didn't need to change, there is no transition to wait for.
          onAnimationEnd={(e) => e.target === e.currentTarget && window.setTimeout(() => setChanging(false), 160)}
        >
          {children}
        </div>
      )}
    </SmoothHeight>
  )
}

/* ---------------------------------------------------------------- SlidingPill */

/**
 * Put this INSIDE a switch whose options are direct children; the selected option has the
 * class in `selector`. Give the switch the class "has-pill". Re-measures when `active` changes.
 */
export function SlidingPill({ active, selector = '.is-active' }: { active: unknown; selector?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const pill = ref.current!
    const parent = pill.parentElement!
    const place = () => {
      const target = parent.querySelector<HTMLElement>(`:scope > ${selector}`)
      if (!target) {
        pill.style.opacity = '0'
        return
      }
      pill.style.opacity = '1'
      pill.style.width = `${target.offsetWidth}px`
      pill.style.height = `${target.offsetHeight}px`
      pill.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`
    }
    place()
    // Turn on sliding only after the first placement, so it doesn't fly in from the corner.
    const id = requestAnimationFrame(() => pill.classList.add('is-ready'))
    const ro = new ResizeObserver(place)
    ro.observe(parent)
    return () => {
      cancelAnimationFrame(id)
      ro.disconnect()
    }
  }, [active, selector])
  return <span ref={ref} className="seg-pill" aria-hidden="true" />
}

/* ---------------------------------------------------------------- icons that draw themselves */

export const CheckIcon = () => (
  <svg className="draw-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M3.2 8.4l3 3 6.6-7" pathLength={1} />
  </svg>
)

export const CrossIcon = () => (
  <svg className="draw-icon" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" pathLength={1} />
  </svg>
)

