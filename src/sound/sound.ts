/*
  sound.ts — tiny, quiet sound effects, made in the browser (no audio files).

  How it works:
    • The Web Audio API lets us build a sound from an "oscillator" (a pure tone)
      and a "gain" (a volume knob). Each sound here is one or two very short tones
      that fade out in a fraction of a second.
    • Sound is OFF until the student turns it on with the speaker button in the top bar.
      The choice is remembered on their device.
    • Every click on a button, link, or switch gets the same barely-there "tap", added in
      one place (installClickSounds) so individual buttons don't need any sound code.
    • Quiz and task feedback call play('correct') / play('wrong') / play('complete').

  Volumes are deliberately tiny (the loudest sound is about 6% of full volume).
*/
import { useSyncExternalStore } from 'react'

export type SoundName = 'tap' | 'pick' | 'correct' | 'wrong' | 'complete' | 'on'

const KEY = 'ps.sound'
let enabled = false
try {
  enabled = localStorage.getItem(KEY) === 'on'
} catch {
  /* storage blocked: sound simply stays off */
}

let ctx: AudioContext | null = null
/** When a specific sound last played, so the generic click "tap" doesn't double up with it. */
let lastSpecific = 0
const listeners = new Set<() => void>()

/** One short tone: frequency glides from `from` to `to` (Hz) while the volume fades out. */
function tone(from: number, to: number, seconds: number, volume: number, delay = 0) {
  if (!ctx) return
  const start = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine' // the softest, purest waveform
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(to, start + seconds)
  // Fade in over 8 ms (prevents a click) and then fade smoothly to silence.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + seconds + 0.02)
}

const RECIPES: Record<SoundName, () => void> = {
  // Any button or link: a tiny, soft "boop".
  tap: () => tone(620, 500, 0.05, 0.022),
  // Clicking an atom or bond in a 3D model: slightly higher, like tapping glass.
  pick: () => tone(980, 860, 0.06, 0.024),
  // Correct answer or finished task: two notes rising (a musical fifth).
  correct: () => {
    tone(660, 660, 0.11, 0.045)
    tone(990, 990, 0.16, 0.04, 0.085)
  },
  // Wrong try: one low, gentle note that dips. Not a buzzer.
  wrong: () => tone(250, 205, 0.16, 0.04),
  // Lesson finished: three quick rising notes.
  complete: () => {
    tone(523, 523, 0.1, 0.04)
    tone(659, 659, 0.1, 0.04, 0.08)
    tone(784, 784, 0.22, 0.045, 0.16)
  },
  // Confirmation when sound is switched on.
  on: () => {
    tone(520, 520, 0.08, 0.035)
    tone(780, 780, 0.12, 0.035, 0.06)
  },
}

/** Play a sound, if the student has sound switched on. Safe to call anywhere. */
export function play(name: SoundName) {
  if (!enabled || document.hidden) return
  try {
    // Browsers only allow audio to start after a click or key press, so we create it lazily.
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    if (name !== 'tap') lastSpecific = performance.now()
    RECIPES[name]()
  } catch {
    /* audio unavailable: stay silent */
  }
}

export function setSoundEnabled(on: boolean) {
  enabled = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* not remembered, but still works for this visit */
  }
  listeners.forEach((fn) => fn())
  if (on) play('on')
}

/** React hook: [is sound on?, switch it]. Every component using it stays in sync. */
export function useSoundEnabled() {
  const on = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => enabled,
  )
  return [on, setSoundEnabled] as const
}

/**
 * Give every button, link, switch, and slider a soft tap when clicked.
 * Called once when the app starts. Returns a function that removes the listener.
 */
export function installClickSounds() {
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.('button, a, [role="button"], [role="switch"], [role="radio"], input, select')
    if (!el || (el as HTMLButtonElement).disabled || el.closest('[data-silent]')) return
    // If this same click already played something specific (a quiz chime, say), skip the tap.
    if (performance.now() - lastSpecific < 60) return
    play('tap')
  }
  document.addEventListener('click', onClick)
  return () => document.removeEventListener('click', onClick)
}
