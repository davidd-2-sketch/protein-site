/*
  TopBar.tsx — the navigation bar pinned to the top of every page.
  NavLink automatically knows which page is active, so we can highlight it.
*/
import { Link, NavLink } from 'react-router-dom'
import { loadPracticePage, loadTrendsPage } from '../pages/loaders'
import { canPrefetch, loadOrbitalsPage, loadProteinPage, loadReactionPage, loadVseprPage } from '../pages/loaders'
import { useSoundEnabled } from '../sound/sound'
import { useAccount } from '../account/account'
import { loadProgressPage } from '../pages/loaders'
import './TopBar.css'

/* Plain topic names (no numbers): each says what you'll learn there. */
const LINKS = [
  { to: '/protein', label: 'Proteins', load: loadProteinPage },
  { to: '/reaction', label: 'Reactions', load: loadReactionPage },
  { to: '/shapes', label: 'Shapes', load: loadVseprPage },
  { to: '/orbitals', label: 'Orbitals', load: loadOrbitalsPage },
  { to: '/trends', label: 'Trends', load: loadTrendsPage },
  { to: '/practice', label: 'Practice', load: loadPracticePage },
]

export default function TopBar() {
  const [soundOn, setSoundOn] = useSoundEnabled()
  const { user, status } = useAccount()
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

        <nav aria-label="Main">
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
          {/* Progress (and the account, which lives on that page). A dot shows sync status when signed in. */}
          <NavLink
            to="/progress"
            className="nav-link"
            onMouseEnter={() => canPrefetch() && void loadProgressPage()}
            title={user ? `Signed in as ${user.email}` : 'Your progress (sign in to sync)'}
          >
            {user && <span className={`sync-dot is-${status}`} aria-hidden="true" />}
            {user ? 'Account' : 'Progress'}
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
      </div>
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
