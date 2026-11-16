/*
  Atmosphere.tsx — the decorative home page background.

  Two layers:
    1. Soft indigo / blue / violet color haze (pure CSS gradients).
    2. Faint contour lines of a made-up "electron density" field: like the contour plots
       chemists use to show where electrons are likely to be.

  The contour lines are a saved picture (public/contours.svg), drawn ahead of time by
  scripts/make-contours.mjs, so nobody's device has to calculate them when the page opens.
  Decorative (not real data), so it's hidden from screen readers.
*/
import './Atmosphere.css'

export default function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="atmosphere-haze" />
      <div className="atmosphere-contours" />
    </div>
  )
}
