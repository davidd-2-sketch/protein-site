/*
  Timeline.tsx — play/pause, a scrubber, step markers, and playback speed.
  The scrubber is a real <input type="range">, so it works with the keyboard
  and screen readers out of the box.
*/
import { SlidingPill } from '../components/motion'
import { SPEEDS, type Speed } from './playback'
import type { ReactionStep } from './sn2'

interface Props {
  s: number
  playing: boolean
  speed: Speed
  steps: ReactionStep[]
  /** Positions (0–1) where playback pauses for a question; shown as small "?" marks. */
  marks?: number[]
  /** The key moment marked on the track (null = none). Default: SN2's transition state at the middle. */
  middle?: { at: number; label: string } | null
  onSeek: (s: number) => void
  onTogglePlay: () => void
  onSpeed: (s: Speed) => void
}

export default function Timeline({ s, playing, speed, steps, marks = [], middle = { at: 0.5, label: 'Transition state' }, onSeek, onTogglePlay, onSpeed }: Props) {
  return (
    <div className="timeline panel">
      <button className="play-btn" onClick={onTogglePlay} aria-label={playing ? 'Pause' : s >= 1 ? 'Replay' : 'Play'}>
        {playing ? <PauseIcon /> : s >= 1 ? <ReplayIcon /> : <PlayIcon />}
      </button>

      <div className="scrub">
        <div className="scrub-track" aria-hidden="true">
          <div className="scrub-fill" style={{ width: `${s * 100}%` }} />
          {steps.slice(1).map((st) => (
            <span key={st.title} className="scrub-tick" style={{ left: `${st.from * 100}%` }} />
          ))}
          {middle && <span className="scrub-ts" style={{ left: `${middle.at * 100}%` }} />}
          {marks.map((m) => (
            <span key={m} className={`scrub-q ${s > m ? 'is-passed' : ''}`} style={{ left: `${m * 100}%` }}>
              ?
            </span>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(s * 1000)}
          onChange={(e) => onSeek(+e.target.value / 1000)}
          aria-label="Reaction progress"
          aria-valuetext={`${Math.round(s * 100)}%`}
        />
        <div className="scrub-labels" aria-hidden="true">
          <span>Reactants</span>
          {middle && <span>{middle.label}</span>}
          <span>Products</span>
        </div>
      </div>

      <div className="speed has-pill" role="radiogroup" aria-label="Playback speed">
        <SlidingPill active={speed} />
        {SPEEDS.map((sp) => (
          <button key={sp} role="radio" aria-checked={speed === sp} className={`speed-btn ${speed === sp ? 'is-active' : ''}`} onClick={() => onSpeed(sp)}>
            {sp === 0.25 ? '¼×' : sp === 0.5 ? '½×' : '1×'}
          </button>
        ))}
      </div>
    </div>
  )
}

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path d="M5 3.5v11l9-5.5z" fill="currentColor" />
  </svg>
)
const PauseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <rect x="4" y="3.5" width="3.5" height="11" rx="1" fill="currentColor" />
    <rect x="10.5" y="3.5" width="3.5" height="11" rx="1" fill="currentColor" />
  </svg>
)
const ReplayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path d="M9 3a6 6 0 1 1-5.6 3.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M2.6 2.8l.9 4.3 4.2-1.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
