/*
  App.tsx — the "shell" of the site: the top bar that's always visible,
  plus a slot underneath where the current page appears.

  <Routes> looks at the URL and picks which page component to show.
*/
import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import TopBar from './components/TopBar'
import LoadingScreen from './components/LoadingScreen'
import HomePage from './pages/HomePage'
import { installClickSounds } from './sound/sound'
import { loadTrendsPage } from './pages/loaders'
import { loadOrbitalsPage, loadProteinPage, loadReactionPage, loadVseprPage, prefetchWhenIdle } from './pages/loaders'

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

export default function App() {
  // Quietly download the viewers in the background once the first page has settled.
  useEffect(() => prefetchWhenIdle(), [])
  // One listener gives every button and link a soft tap (only when sound is switched on).
  useEffect(() => installClickSounds(), [])

  return (
    <>
      <TopBar />
      <main id="main">
        <Suspense fallback={<LoadingScreen label="Loading viewer" />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/protein" element={<ProteinPage />} />
            <Route path="/reaction" element={<ReactionPage />} />
            <Route path="/shapes" element={<VseprPage />} />
            <Route path="/orbitals" element={<OrbitalsPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            {/* Any unknown URL falls back to the home page. */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}
