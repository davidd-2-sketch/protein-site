/*
  App.tsx — the "shell" of the site: the top bar that's always visible,
  plus a slot underneath where the current page appears.

  <Routes> looks at the URL and picks which page component to show.
*/
import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import TopBar from './components/TopBar'
import LoadingScreen from './components/LoadingScreen'
import HomePage from './pages/HomePage'
import { installClickSounds } from './sound/sound'
import { loadAboutPage, loadEnzymesPage, loadPolarityPage, loadPracticePage, loadTrendsPage } from './pages/loaders'
import { installLinkPrefetch, loadOrbitalsPage, loadProteinPage, loadReactionPage, loadVseprPage, prefetchWhenIdle } from './pages/loaders'

/*
  lazy() = "don't download this page's code until someone visits it".
  The protein page will include Mol* (a few megabytes), so we only want
  to download it when a student actually opens the protein viewer.
*/
const ProteinPage = lazy(loadProteinPage)
const ReactionPage = lazy(loadReactionPage)
const VseprPage = lazy(loadVseprPage)
const OrbitalsPage = lazy(loadOrbitalsPage)
const TrendsPage = lazy(loadTrendsPage)
const PolarityPage = lazy(loadPolarityPage)
const EnzymesPage = lazy(loadEnzymesPage)
const PracticePage = lazy(loadPracticePage)
const AboutPage = lazy(loadAboutPage)

export default function App() {
  const location = useLocation()
  // A link that names a lesson (e.g. Organic → Hybridization) reopens the page at that lesson,
  // even if the student is already on that page.
  const pageKey = location.pathname + (location.search.includes('lesson=') ? location.key : '')
  // A new page starts at its top (unless the link points at a section, like /about#sources).
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0)
  }, [location.pathname, location.hash])
  // Quietly download the viewers in the background once the first page has settled.
  useEffect(() => prefetchWhenIdle(), [])
  // ...and any page the moment a student points at a link to it.
  useEffect(() => installLinkPrefetch(), [])
  // One listener gives every button and link a soft tap (only when sound is switched on).
  useEffect(() => installClickSounds(), [])

  const [firstKey] = useState(pageKey) // the page this visit started on

  return (
    <>
      <TopBar />
      <main id="main">
        <Suspense fallback={<LoadingScreen label="Loading viewer" />}>
          {/* key: each new page fades in instead of popping in. The very first page shows
              at once: fading it in would only delay what the student came to see. */}
          <div className={pageKey === firstKey ? undefined : 'page-fade'} key={pageKey}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/protein" element={<ProteinPage />} />
            <Route path="/reaction" element={<ReactionPage />} />
            <Route path="/shapes" element={<VseprPage />} />
            <Route path="/orbitals" element={<OrbitalsPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/polarity" element={<PolarityPage />} />
            <Route path="/enzymes" element={<EnzymesPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/about" element={<AboutPage />} />
            {/* The old Progress page is gone; its address sends people home instead of to an error. */}
            <Route path="/progress" element={<Navigate to="/" replace />} />
            {/* Any unknown URL falls back to the home page. */}
            <Route path="*" element={<HomePage />} />
          </Routes>
          </div>
        </Suspense>
      </main>
      {/*
        Visitor counts (Vercel Web Analytics): anonymous page views only, no cookies.
        Only in the published build: `npm run dev` never loads it, so your own testing
        isn't counted. (See "Visitor analytics" in README.md.)
      */}
      {import.meta.env.PROD && <Analytics />}
    </>
  )
}
