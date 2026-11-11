/*
  ModeSwitch.tsx — the "Lessons | Explore" switch at the top of every viewer's left panel.
  Same control, same place, on every page, so students always know how to change modes.
*/
import { SlidingPill } from './motion'
import './ModeSwitch.css'

export type Mode = 'lessons' | 'explore'

export default function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const options: { id: Mode; label: string; hint: string }[] = [
    { id: 'lessons', label: 'Lessons', hint: 'Guided, step by step' },
    { id: 'explore', label: 'Explore', hint: 'Look around freely' },
  ]
  return (
    <div className="mode-switch has-pill" role="radiogroup" aria-label="Mode">
      <SlidingPill active={mode} />
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={mode === o.id}
          className={`mode-btn ${mode === o.id ? 'is-active' : ''}`}
          onClick={() => mode !== o.id && onChange(o.id)}
          title={o.hint}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
