/*
  TopBar.tsx — the navigation bar pinned to the top of every page.

  Wide screens: logo · General Chem ▾ · Organic ▾ · Biochem ▾ · Practice · [sound] [feedback] [settings]
    Each course opens a dropdown of its topics, with a one-line description of each.
    Keyboard: Tab to a course, Enter/Space/↓ opens it, ↑ ↓ Home End move through the
    topics, Escape closes and returns to the button, Tab moves on (and closes).
  Phones and tablets (under 900 px): logo · Menu. The Menu button opens a full-screen
    sheet with the same courses and descriptions, then Practice, Sound, Feedback, Settings.

  Menus are drawn on top of the page (they never push content around).
*/
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Icon, { LogoMark } from './Icon'
import SettingsPanel from './SettingsPanel'
import { FEEDBACK_URL } from './feedback'
import { COURSES, courseFor, isCurrent, rememberCourse, type Course } from '../nav/courses'
import { useSoundEnabled } from '../sound/sound'
import './TopBar.css'

type Open = Course['id'] | 'settings' | 'sheet' | null

export default function TopBar() {
  const [soundOn, setSoundOn] = useSoundEnabled()
  const { pathname, key } = useLocation()
  const [open, setOpen] = useState<Open>(null)
  const [sheetSettings, setSheetSettings] = useState(false)
  const barRef = useRef<HTMLElement>(null)
  const here = courseFor(pathname)
  // Topic and practice pages fill the window, so the bar spans it too; reading pages are centered.
  const wide = here !== null || pathname === '/practice'

  const close = useCallback(() => setOpen(null), [])

  // Going to another page closes whatever is open.
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setOpen(null)
    setSheetSettings(false)
  }

  // Close on a click/tap outside the bar, or Escape (returning focus to the opener).
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      barRef.current?.querySelector<HTMLElement>(`[data-opens="${open}"]`)?.focus()
      close()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  // The phone sheet covers the page: stop the page behind it from scrolling, and start at its first link.
  useEffect(() => {
    if (open !== 'sheet') return
    document.documentElement.classList.add('menu-open')
    barRef.current?.querySelector<HTMLElement>('.sheet a')?.focus()
    return () => document.documentElement.classList.remove('menu-open')
  }, [open])

  const toggle = (id: Open) => setOpen((o) => (o === id ? null : id))

  const soundLabel = `Sound effects: ${soundOn ? 'on' : 'off'}`

  return (
    <header className={`topbar ${wide ? 'is-wide' : ''}`} ref={barRef}>
      {/* "Skip to content" lets keyboard users jump past the navigation. */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="protein-site home">
          <LogoMark />
          <span className="brand-name">protein-site</span>
        </Link>

        <nav aria-label="Main" className="main-nav">
          {COURSES.map((c) => (
            <CourseMenu key={c.id} course={c} open={open === c.id} here={here === c.id} pathname={pathname} onToggle={() => toggle(c.id)} onClose={close} />
          ))}
          <NavLink to="/practice" className="nav-item">
            Practice
          </NavLink>
        </nav>

        <div className="bar-tools">
          {/* Sound is off until the student turns it on. */}
          <button className={`icon-btn ${soundOn ? 'is-on' : ''}`} role="switch" aria-checked={soundOn} aria-label="Sound effects" data-tip={soundLabel} onClick={() => setSoundOn(!soundOn)}>
            <Icon name={soundOn ? 'sound' : 'soundOff'} />
          </button>
          <a className="icon-btn" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" aria-label="Send feedback (opens a form in a new tab)" data-tip="Send feedback">
            <Icon name="feedback" />
          </a>
          <div className="menu-anchor">
            <button className={`icon-btn ${open === 'settings' ? 'is-open' : ''}`} aria-label="Settings" aria-expanded={open === 'settings'} aria-controls="settings-popover" data-opens="settings" data-tip={open === 'settings' ? undefined : 'Settings'} onClick={() => toggle('settings')}>
              <Icon name="settings" />
            </button>
            {open === 'settings' && (
              <div id="settings-popover" className="popover" role="dialog" aria-label="Settings">
                <SettingsPanel />
              </div>
            )}
          </div>
        </div>

        {/* Phones and tablets: one button that opens the full menu. */}
        <button className={`menu-btn ${open === 'sheet' ? 'is-open' : ''}`} aria-expanded={open === 'sheet'} aria-controls="site-menu" data-opens="sheet" onClick={() => toggle('sheet')}>
          <Icon name={open === 'sheet' ? 'close' : 'menu'} />
          {open === 'sheet' ? 'Close' : 'Menu'}
        </button>
      </div>

      {open === 'sheet' && (
        <div id="site-menu" className="sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <nav aria-label="Main (menu)" className="sheet-scroll">
            {COURSES.map((c) => (
              <section key={c.id} aria-labelledby={`sheet-${c.id}`}>
                <h2 id={`sheet-${c.id}`} className="sheet-head">
                  {c.name}
                </h2>
                {c.topics.map((t) => (
                  <TopicItem key={t.to} course={c} topic={t} pathname={pathname} className="sheet-item" onPick={close} />
                ))}
              </section>
            ))}
            <section aria-labelledby="sheet-practice">
              <h2 id="sheet-practice" className="sheet-head">
                Practice
              </h2>
              <NavLink to="/practice" className="sheet-item" onClick={close}>
                <span className="menu-ico">
                  <Icon name="practice" />
                </span>
                <span>
                  <span className="menu-title">Practice</span>
                  <span className="menu-desc">Calm flashcards for any topic.</span>
                </span>
              </NavLink>
            </section>
            {sheetSettings && (
              <section className="sheet-settings" aria-label="Settings">
                <SettingsPanel />
              </section>
            )}
          </nav>
          <div className="sheet-foot">
            <button className={`btn btn-sm btn-quiet ${soundOn ? 'is-on' : ''}`} role="switch" aria-checked={soundOn} onClick={() => setSoundOn(!soundOn)}>
              <Icon name={soundOn ? 'sound' : 'soundOff'} size={18} /> {soundOn ? 'Sound on' : 'Sound off'}
            </button>
            <a className="btn btn-sm btn-quiet" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
              <Icon name="feedback" size={18} /> Feedback
            </a>
            <button className="btn btn-sm btn-quiet" aria-expanded={sheetSettings} onClick={() => setSheetSettings((s) => !s)}>
              <Icon name="settings" size={18} /> Settings
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

/* ---------- one course: a button and its dropdown of topics ---------- */

function CourseMenu({ course, open, here, pathname, onToggle, onClose }: { course: Course; open: boolean; here: boolean; pathname: string; onToggle: () => void; onClose: () => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const focusItem = (index: number) => {
    const items = wrap.current?.querySelectorAll<HTMLElement>('.menu a')
    if (!items?.length) return
    items[(index + items.length) % items.length].focus()
  }
  // After opening with the ↓ key, focus lands on the first topic.
  const focusFirst = useRef(false)
  useEffect(() => {
    if (open && focusFirst.current) focusItem(0)
    focusFirst.current = false
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(wrap.current?.querySelectorAll<HTMLElement>('.menu a') ?? [])
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        focusFirst.current = true
        onToggle()
      } else focusItem(at + 1)
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault()
      focusItem(at <= 0 ? items.length - 1 : at - 1)
    } else if (e.key === 'Home' && open) {
      e.preventDefault()
      focusItem(0)
    } else if (e.key === 'End' && open) {
      e.preventDefault()
      focusItem(items.length - 1)
    }
  }

  return (
    <div
      className="menu-anchor"
      ref={wrap}
      onKeyDown={onKeyDown}
      // Tabbing out of the menu closes it.
      onBlur={(e) => open && e.relatedTarget !== null && !wrap.current?.contains(e.relatedTarget as Node) && onClose()}
    >
      <button className={`nav-item ${open ? 'is-open' : ''} ${here ? 'is-here' : ''}`} aria-expanded={open} aria-controls={`menu-${course.id}`} data-opens={course.id} onClick={onToggle}>
        {course.name}
        {here && <span className="sr-only"> (current section)</span>}
        <Icon name="chevron" size={14} />
      </button>
      {open && (
        <div id={`menu-${course.id}`} className="menu">
          {course.topics.map((t) => (
            <TopicItem key={t.to} course={course} topic={t} pathname={pathname} className="menu-item" onPick={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- one topic row (used in dropdowns and in the phone sheet) ---------- */

function TopicItem({ course, topic, pathname, className, onPick }: { course: Course; topic: Course['topics'][number]; pathname: string; className: string; onPick: () => void }) {
  const current = isCurrent(topic, course, pathname)
  return (
    <Link
      to={topic.to}
      className={`${className} ${current ? 'is-current' : ''}`}
      aria-current={current ? 'page' : undefined}
      onClick={() => {
        rememberCourse(course.id)
        onPick()
      }}
    >
      <span className="menu-ico">
        <Icon name={topic.icon} />
      </span>
      <span>
        <span className="menu-title">
          {topic.title}
          {current && <span className="here-chip">You’re here</span>}
        </span>
        <span className="menu-desc">{topic.desc}</span>
      </span>
    </Link>
  )
}
