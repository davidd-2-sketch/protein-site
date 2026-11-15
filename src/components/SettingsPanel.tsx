/*
  SettingsPanel.tsx — the two settings that used to live on the Progress page:
    • 3D graphics: Auto / Faster / Detailed (saved on this device).
    • Reset my saved data: clears finished lessons and "continue where you left off".
  Shown in a small popover from the top bar, and inside the phone menu.
*/
import { useState } from 'react'
import { currentSetting, looksWeak, profile, setQualitySetting, useQuality, type QualitySetting } from '../perf/quality'

const OPTIONS: { id: QualitySetting; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'fast', label: 'Faster' },
  { id: 'detailed', label: 'Detailed' },
]

export default function SettingsPanel() {
  useQuality() // re-render when the setting changes
  const setting = currentSetting()
  const [armed, setArmed] = useState(false)
  const using = profile() === 'fast' ? 'faster' : 'detailed'

  const reset = () => {
    try {
      // Everything the site saved, except this device's sound and graphics choices.
      for (const key of Object.keys(localStorage)) if (key.startsWith('ps.') && key !== 'ps.sound' && !key.startsWith('ps.quality')) localStorage.removeItem(key)
    } catch {
      /* storage unavailable */
    }
    window.location.reload()
  }

  return (
    <div className="settings">
      <h2 id="settings-graphics">3D graphics</h2>
      <div className="seg" role="radiogroup" aria-labelledby="settings-graphics">
        {OPTIONS.map((o) => (
          <button key={o.id} role="radio" aria-checked={setting === o.id} className={setting === o.id ? 'is-on' : ''} onClick={() => setQualitySetting(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <p>
        {setting === 'auto'
          ? `Auto is using ${using} graphics${using === 'faster' ? (looksWeak() ? ', because this device’s graphics are limited' : ', because 3D ran slowly here') : ''}.`
          : setting === 'fast'
            ? 'Simpler lighting and fewer details, so 3D stays smooth on older computers.'
            : 'Reflections, soft shadows, and extra sharpness. Best on newer computers.'}{' '}
        Applies to 3D views you open from now on.
      </p>
      <hr />
      <h2>Saved on this device</h2>
      <p>Your finished lessons and your place are kept in this browser only. Nothing is uploaded.</p>
      <button className={`btn btn-sm ${armed ? 'is-danger' : ''}`} onClick={armed ? reset : () => setArmed(true)} onBlur={() => setArmed(false)}>
        {armed ? 'Click again to erase' : 'Reset my saved data'}
      </button>
      {armed && (
        <p role="status" className="settings-warn">
          This can’t be undone.
        </p>
      )}
    </div>
  )
}
