/*
  TrendsPage.tsx — Periodic trends.

  Two modes, like the other pages:
    • Lessons: four lessons that explain the trends with predictions and click tasks.
    • Explore: tick any of the four properties to raise them as columns on the table.
      Tick several to compare them side by side on every element.

  Click any element for its details. A switch flattens the 3D skyline into a normal table.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import ModeSwitch from '../components/ModeSwitch'
import LessonPanel from '../lessons/LessonPanel'
import { useStoredState } from '../lessons/progress'
import type { Depth } from '../lessons/types'
import { useLessons } from '../lessons/useLessons'
import { play } from '../sound/sound'
import { MAIN_GROUP_Z, PROPS, byZ, formatValue, isMainGroup, type PropId } from '../trends/elements'
import { TREND_LESSONS } from '../trends/lessons'
import { TrendsScene, type TrendsView } from '../trends/TrendsScene'
import SymbolLabels from '../trends/SymbolLabels'
import './TrendsPage.css'

export default function TrendsPage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<TrendsScene | null>(null)
  const [mode, setMode] = useStoredState<'lessons' | 'explore'>('ps.trends.mode', 'lessons')
  const [depth, setDepth] = useStoredState<Depth>('ps.depth', 'standard')
  const L = useLessons(TREND_LESSONS, 'trends')
  // Arriving from a "continue" link always shows the lesson.
  useEffect(() => {
    if (L.fromLink) setMode('lessons')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Explore-mode choices
  const [props, setProps] = useState<PropId[]>(['radius'])
  const [mainOnly, setMainOnly] = useState(true)
  const [flat, setFlat] = useState(false)
  const [spin, setSpin] = useState(false)

  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  const inLesson = mode === 'lessons' && L.step !== null
  const lessonView = L.step ? (L.revealed && L.step.revealView ? L.step.revealView : L.step.view) : null

  const view: TrendsView = useMemo(
    () =>
      inLesson && lessonView
        ? { props: lessonView.props, flat: !!lessonView.flat, focus: lessonView.focus ?? [], selected }
        : { props, flat, focus: mainOnly ? MAIN_GROUP_Z : [], selected },
    [inLesson, lessonView, props, flat, mainOnly, selected],
  )

  /* ---------- 3D scene ---------- */
  // The scene is created once, so its click handler reads the latest lesson state through a ref.
  const reportRef = useRef(L.report)
  const hasTaskRef = useRef(false)
  useEffect(() => {
    reportRef.current = L.report
    hasTaskRef.current = inLesson && !!L.step?.task && L.taskStatus !== 'correct'
  })
  useEffect(() => {
    const sc = new TrendsScene(
      hostRef.current!,
      (z) => {
        setSelected(z)
        // During a lesson task, the click is an answer (right/wrong sound); otherwise a soft tap.
        if (hasTaskRef.current) reportRef.current(z)
        else play('pick')
      },
      setHovered,
    )
    setScene(sc)
    return () => {
      sc.dispose()
      setScene(null)
    }
  }, [])
  useEffect(() => scene?.setView(view), [scene, view])
  useEffect(() => scene?.stage.setAutoRotate(spin), [scene, spin])

  // Moving to another lesson step clears the selection.
  const stepKey = inLesson ? `${L.lesson?.id}:${L.stepIndex}` : 'explore'
  const [selKey, setSelKey] = useState(stepKey)
  if (selKey !== stepKey) {
    setSelKey(stepKey)
    setSelected(null)
  }

  const toggleProp = (id: PropId) => setProps(props.includes(id) ? props.filter((p) => p !== id) : [...props, id])

  const hoverEl = hovered ? byZ(hovered) : null
  const shown = view.props

  return (
    <div className={`trends-page ${selected !== null ? 'has-card' : ''}`}>
      <div className="trends-backdrop" aria-hidden="true" />
      <div className="trends-stage">
        <div
          ref={hostRef}
          className="trends-canvas"
          role="img"
          aria-label={`Periodic table${shown.length ? ` showing ${shown.map((p) => PROPS.find((x) => x.id === p)!.name.toLowerCase()).join(' and ')} as column heights` : ''}. Click an element for details.`}
        />
        {scene && <SymbolLabels scene={scene} />}
        <p className="trends-hover mono" aria-hidden="true">
          {hoverEl
            ? `${hoverEl.z} · ${hoverEl.name}${shown.map((p) => ` · ${formatValue(p, hoverEl.values[p])}`).join('')}`
            : 'Click an element for details · drag to rotate'}
        </p>
      </div>

      {/* ===== Left: lessons, or the property picker ===== */}
      {mode === 'lessons' ? (
        <LessonPanel
          listTitle="Learn periodic trends"
          listBlurb="Four short lessons: how to read the table, then radius, ionization energy, and electronegativity."
          lessons={L.lessons}
          lesson={L.lesson}
          stepIndex={L.stepIndex}
          depth={depth}
          taskStatus={L.taskStatus}
          completed={L.completed}
          onDepth={setDepth}
          onOpen={L.open}
          onStep={L.goTo}
          onExit={L.exit}
          onClose={() => setMode('explore')}
          onQuizDone={L.onQuizDone}
        />
      ) : (
        <section className="lesson trends-panel panel" aria-label="Choose what to show">
          <ModeSwitch mode="explore" onChange={() => setMode('lessons')} />
          <header>
            <h1 className="trends-title">Periodic trends</h1>
            <p className="trends-sub">Pick one or more properties to show. Taller column = larger value.</p>
          </header>

          <div className="prop-list" role="group" aria-label="Properties to show">
            {PROPS.map((p) => {
              const on = props.includes(p.id)
              return (
                <button key={p.id} className={`prop ${on ? 'is-on' : ''}`} role="checkbox" aria-checked={on} onClick={() => toggleProp(p.id)}>
                  <span className="prop-check" style={on ? { background: p.color, borderColor: p.color } : undefined} aria-hidden="true">
                    {on ? '✓' : ''}
                  </span>
                  <span className="prop-text">
                    <span className="prop-name">
                      {p.name} <span className="prop-unit">({p.unit})</span>
                    </span>
                    <span className="prop-blurb">{p.blurb}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <button className={`toggle ${mainOnly ? 'is-on' : ''}`} role="switch" aria-checked={mainOnly} onClick={() => setMainOnly(!mainOnly)}>
            <span className="toggle-track" aria-hidden="true">
              <span className="toggle-thumb" />
            </span>
            Main-group elements only
          </button>

          <div className="lesson-note">
            <p>
              Trends are cleanest for the main-group elements (the two left columns and the six right ones). Transition
              metals follow them only loosely.
            </p>
            {props.map((id) => (
              <p key={id}>
                {PROPS.find((p) => p.id === id)!.name}: {PROPS.find((p) => p.id === id)!.source}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ===== Top-right toggles ===== */}
      <div className="trends-toggles panel" role="group" aria-label="View options">
        {!inLesson && <Toggle label="Flat table" on={flat} onChange={setFlat} />}
        <Toggle label="Spin" on={spin} onChange={setSpin} />
        <button className="tool-btn" onClick={() => scene?.setCamera(view.flat)}>
          Reset view
        </button>
      </div>

      {/* ===== Right: the element you clicked ===== */}
      {selected !== null && <ElementCard z={selected} shown={shown} onClose={() => setSelected(null)} />}
    </div>
  )
}

/* ---------- Details for one element ---------- */

function ElementCard({ z, shown, onClose }: { z: number; shown: PropId[]; onClose: () => void }) {
  const e = byZ(z)
  return (
    <aside className="element-card panel" aria-live="polite" aria-label={`${e.name} details`}>
      <button className="element-close" onClick={onClose} aria-label="Close details">
        ×
      </button>
      <div className="element-head">
        <span className="element-symbol">{e.symbol}</span>
        <div>
          <h2>{e.name}</h2>
          <p className="element-meta">
            Element {e.z} · {e.category}
          </p>
        </div>
      </div>
      <dl className="element-facts">
        <div>
          <dt>Position</dt>
          <dd>
            Period {e.period}
            {e.group ? `, group ${e.group}` : ', f-block'}
          </dd>
        </div>
        <div>
          <dt>Electron configuration</dt>
          <dd className="mono">{e.config}</dd>
        </div>
      </dl>

      {/* Only the properties on screen are listed, so predict-first questions aren't given away. */}
      {shown.length > 0 && (
        <ul className="element-values">
          {shown.map((id) => {
            const p = PROPS.find((x) => x.id === id)!
            const v = e.values[id]
            return (
              <li key={id}>
                <span className="element-value-name">{p.name}</span>
                <span className="element-value mono">{formatValue(id, v)}</span>
                <span className="element-bar" aria-hidden="true">
                  <span style={{ width: `${v === null ? 0 : (v / p.max) * 100}%`, background: p.color }} />
                </span>
                {v === null && (
                  <span className="element-missing">
                    {id === 'ea' ? 'No stable negative ion, or not measured.' : id === 'en' ? 'No value on the Pauling scale.' : 'No data for this element.'}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {!isMainGroup(e) && <p className="element-note">Not a main-group element: the simple trends apply only loosely here.</p>}
    </aside>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${on ? 'is-on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      {label}
    </button>
  )
}

