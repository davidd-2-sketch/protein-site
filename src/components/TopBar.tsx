/*
  TopBar.tsx — the navigation bar pinned to the top of every page.
  NavLink automatically knows which page is active, so we can highlight it.

  Wide screens show every link in the bar. Narrower than 1040 px (phones and most tablets),
  the links don't fit, so a "Menu" button opens the same list in a panel instead.
*/
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { SlidingPill } from './motion'
import { loadEnzymesPage, loadPolarityPage, loadPracticePage, loadTrendsPage } from '../pages/loaders'
import { canPrefetch, loadOrbitalsPage, loadProteinPage, loadReactionPage, loadVseprPage } from '../pages/loaders'
import { useSoundEnabled } from '../sound/sound'
import { loadProgressPage } from '../pages/loaders'
import './TopBar.css'

/* Plain topic names (no numbers): each says what you'll learn there. */
const LINKS = [
  { to: '/protein', label: 'Proteins', load: loadProteinPage },
  { to: '/enzymes', label: 'Enzymes', load: loadEnzymesPage },
  { to: '/reaction', label: 'Reactions', load: loadReactionPage },
  { to: '/shapes', label: 'Shapes', load: loadVseprPage },
  { to: '/orbitals', label: 'Orbitals', load: loadOrbitalsPage },
  { to: '/trends', label: 'Trends', load: loadTrendsPage },
  { to: '/polarity', label: 'Polarity', load: loadPolarityPage },
  { to: '/practice', label: 'Practice', load: loadPracticePage },
]

export default function TopBar() {
  const [soundOn, setSoundOn] = useSoundEnabled()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close the menu on Escape or a tap outside it.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      buttonRef.current?.focus()
    }
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [menuOpen])

  return (
    <header className="topbar">
      {/* "Skip to content" lets keyboard users jump past the navigation. */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="protein-site home">
          <LogoMark />
          <span className="brand-name">protein-site</span>
          <span className="brand-version mono">v0.1</span>
        </Link>

        <nav aria-label="Main" className="main-nav has-pill">
          {/* The "you are here" highlight glides between links as you change pages. */}
          <SlidingPill active={pathname} selector=".active" />
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className="nav-link"
              // Start downloading the page the moment someone points at (or tabs to) the link.
              onMouseEnter={() => canPrefetch() && void l.load()}
              onFocus={() => canPrefetch() && void l.load()}
            >
              {l.label}
            </NavLink>
          ))}
          <span className="nav-divider" aria-hidden="true" />
          {/* Progress: lessons finished, practice results, and this device's settings. */}
          <NavLink
            to="/progress"
            className="nav-link"
            onMouseEnter={() => canPrefetch() && void loadProgressPage()}
            title="Your progress (saved on this device)"
          >
            Progress
          </NavLink>
          {/* Sound is off until the student turns it on. The label names the action. */}
          <button
            className={`sound-btn ${soundOn ? 'is-on' : ''}`}
            role="switch"
            aria-checked={soundOn}
            aria-label="Sound effects"
            title={soundOn ? 'Sound effects are on' : 'Sound effects are off'}
            onClick={() => setSoundOn(!soundOn)}
          >
            <SpeakerIcon on={soundOn} />
            <span className="sound-btn-text">{soundOn ? 'Sound on' : 'Sound off'}</span>
          </button>
        </nav>

        {/* Narrow screens: one button that opens the full list. */}
        <button
          ref={buttonRef}
          className={`menu-btn ${menuOpen ? 'is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MenuIcon open={menuOpen} />
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {menuOpen && (
        <div id="site-menu" ref={menuRef} className="site-menu panel">
          <nav aria-label="Main (menu)">
            <ul className="site-menu-links">
              {[...LINKS, { to: '/progress', label: 'Progress', load: loadProgressPage }].map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} className="site-menu-link" onClick={() => setMenuOpen(false)} onTouchStart={() => canPrefetch() && void l.load()}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="site-menu-footer">
            <button className={`sound-btn ${soundOn ? 'is-on' : ''}`} role="switch" aria-checked={soundOn} onClick={() => setSoundOn(!soundOn)}>
              <SpeakerIcon on={soundOn} />
              {soundOn ? 'Sound on' : 'Sound off'}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

/* Logo: a nucleus with three crisp orbital rings, drawn as SVG (scales perfectly). */
function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="logo">
      <circle cx="11" cy="11" r="2.4" fill="var(--accent)" />
      {[0, 60, 120].map((deg) => (
        <ellipse
          key={deg}
          cx="11"
          cy="11"
          rx="9.5"
          ry="3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          transform={`rotate(${deg} 11 11)`}
        />
      ))}
    </svg>
  )
}

/* Speaker icon: sound waves when on, a slash when off (shape changes, not just color). */
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.2h2.2L8 3.5v9L4.7 9.8H2.5z" fill="currentColor" stroke="none" />
      {on ? (
        <>
          <path d="M10.2 6.1a2.7 2.7 0 0 1 0 3.8" />
          <path d="M12 4.4a5 5 0 0 1 0 7.2" />
        </>
      ) : (
        <path d="M10.5 6l3.5 4M14 6l-3.5 4" />
      )}
    </svg>
  )
}

/* Three lines (menu) that turn into an ×  (close). */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      {open ? <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /> : <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />}
    </svg>
  )
}
