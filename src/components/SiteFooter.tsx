/*
  SiteFooter.tsx — the footer on reading pages (Home, About).
  Topic pages fill the whole window, so they don't have one; their Feedback and
  Settings live in the top bar instead.
*/
import { Link } from 'react-router-dom'
import { LogoMark } from './Icon'
import { FEEDBACK_URL } from './feedback'
import './SiteFooter.css'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div>
          <Link to="/" className="brand" aria-label="protein-site home">
            <LogoMark />
            <span className="brand-name">protein-site</span>
          </Link>
          <p className="site-footer-note">
            Free for every student. No account, nothing to install. Your place in each lesson is saved only in this
            browser.
          </p>
        </div>
        <nav aria-label="Footer" className="site-footer-links">
          <Link to="/about">About</Link>
          <Link to="/about#sources">Data sources</Link>
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
            Send feedback<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
      </div>
    </footer>
  )
}
