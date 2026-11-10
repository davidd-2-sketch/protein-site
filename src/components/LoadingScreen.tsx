/*
  LoadingScreen.tsx — shown while a heavy page (like the protein viewer) downloads.
  Three orbiting dots, styled to match the site.
*/
import './LoadingScreen.css'

export default function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    // role="status" makes screen readers announce the label politely.
    <div className="loading-screen" role="status">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="loading-label">{label}…</p>
    </div>
  )
}
