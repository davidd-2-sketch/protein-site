/*
  ProgressPage.tsx — everything a student has done, in one place:
  where they left off, lessons finished in each module, and practice results.
  It reads the same saved progress as every other page. Everything stays on this device.
*/
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SlidingPill } from '../components/motion'
import { currentSetting, looksWeak, profile, setQualitySetting, useQuality, type QualitySetting } from '../perf/quality'
import { MODULES, placeLink, type ModuleKey, type Place } from '../lessons/place'
import { getItem, useStoredState } from '../lessons/progress'
import { PROTEIN_LESSONS } from '../lessons/proteinLessons'
import type { AnyStep, Lesson } from '../lessons/types'
import { ORBITAL_LESSONS } from '../orbitals/lessons'
import { TOPICS, type Topic } from '../practice/questions'
import { TREND_LESSONS } from '../trends/lessons'
import { ENZYME_LESSONS } from '../enzymes/lessons'
import { VSEPR_LESSONS } from '../vsepr/lessons'
import '../components/ModeSwitch.css'
import './ProgressPage.css'

/* Each module's lessons and the key its finished-lessons list is saved under. */
const SECTIONS: { module: ModuleKey; storeKey: string; lessons: Lesson<AnyStep>[] }[] = [
  { module: 'protein', storeKey: 'ps.completedLessons', lessons: PROTEIN_LESSONS as unknown as Lesson<AnyStep>[] },
  { module: 'vsepr', storeKey: 'ps.vsepr.completed', lessons: VSEPR_LESSONS as unknown as Lesson<AnyStep>[] },
  { module: 'orbitals', storeKey: 'ps.orbitals.completed', lessons: ORBITAL_LESSONS as unknown as Lesson<AnyStep>[] },
  { module: 'trends', storeKey: 'ps.trends.completed', lessons: TREND_LESSONS as unknown as Lesson<AnyStep>[] },
  { module: 'enzymes', storeKey: 'ps.enzymes.completed', lessons: ENZYME_LESSONS as unknown as Lesson<AnyStep>[] },
]

type Stats = Partial<Record<Topic, { answered: number; firstTry: number }>>

export default function ProgressPage() {
  const [last] = useStoredState<Place | null>('ps.last', null)
  const [stats] = useStoredState<Stats>('ps.practice.stats', {})
  const [rounds] = useStoredState<number>('ps.practice.rounds', 0)
  const [best] = useStoredState<number>('ps.practice.best', 0)

  const total = SECTIONS.reduce((n, s) => n + s.lessons.length, 0)

  return (
    <div className="progress-page container">
      <header className="progress-head">
        <h1>Your progress</h1>
        <p>
          Saved in this browser, on this device. No account needed.
        </p>
      </header>

      {last && (
        <Link to={placeLink(last)} className="continue-card">
          <span className="continue-label">Continue where you left off</span>
          <span className="continue-title">
            {MODULES[last.module].name} · {last.lessonTitle}
          </span>
          <span className="continue-meta">
            Step {last.step + 1} of {last.steps} <span className="arrow">→</span>
          </span>
        </Link>
      )}

      <section className="progress-section" aria-labelledby="lessons-title">
        <h2 id="lessons-title">
          Lessons <LessonCount total={total} />
        </h2>
        <div className="module-grid">
          {SECTIONS.map((s) => (
            <ModuleCard key={s.module} {...s} />
          ))}
        </div>
      </section>

      <section className="progress-section" aria-labelledby="practice-title">
        <h2 id="practice-title">Practice</h2>
        {rounds === 0 ? (
          <p className="progress-empty">
            No practice rounds yet. <Link to="/practice">Try a round of 10 →</Link>
          </p>
        ) : (
          <>
            <p className="progress-sub">
              {rounds} round{rounds === 1 ? '' : 's'} finished · best score {best} / 10
            </p>
            <ul className="practice-stats">
              {TOPICS.map((t) => {
                const s = stats[t.id]
                const pct = s && s.answered ? Math.round((s.firstTry / s.answered) * 100) : null
                return (
                  <li key={t.id}>
                    <span className="stat-name">{t.name}</span>
                    <span className="stat-bar" aria-hidden="true">
                      <span style={{ width: `${pct ?? 0}%` }} />
                    </span>
                    <span className="stat-value mono">{pct === null ? 'not tried' : `${pct}% first try · ${s!.answered}`}</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className="progress-section" aria-labelledby="device-title">
        <h2 id="device-title">This device</h2>
        <GraphicsSetting />
      </section>

      <ResetProgress />
    </div>
  )
}

function LessonCount({ total }: { total: number }) {
  const done = SECTIONS.reduce((n, s) => n + s.lessons.filter((l) => getItem<string[]>(s.storeKey, []).includes(l.id)).length, 0)
  return (
    <span className="progress-count">
      {done} of {total} finished
    </span>
  )
}

function ModuleCard({ module, storeKey, lessons }: { module: ModuleKey; storeKey: string; lessons: Lesson<AnyStep>[] }) {
  const [completed] = useStoredState<string[]>(storeKey, [])
  const done = lessons.filter((l) => completed.includes(l.id)).length
  return (
    <article className="module-card">
      <header>
        <h3>{MODULES[module].name}</h3>
        <span className="mono">
          {done}/{lessons.length}
        </span>
      </header>
      <span className="module-bar" aria-hidden="true">
        <span style={{ width: `${(done / lessons.length) * 100}%` }} />
      </span>
      <ol>
        {lessons.map((l) => {
          const isDone = completed.includes(l.id)
          return (
            <li key={l.id}>
              <Link to={`${MODULES[module].path}?lesson=${l.id}&step=0`} className={isDone ? 'is-done' : ''}>
                <span className="lesson-mark" aria-hidden="true">
                  {isDone ? '✓' : ''}
                </span>
                {l.title}
                {isDone && <span className="sr-only"> (finished)</span>}
              </Link>
            </li>
          )
        })}
      </ol>
    </article>
  )
}

/** Clear this device's progress. Two clicks, so it can't happen by accident. */
function ResetProgress() {
  const [armed, setArmed] = useState(false)
  const reset = () => {
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith('ps.') && key !== 'ps.sound' && !key.startsWith('ps.quality')) localStorage.removeItem(key) // keep device settings
    } catch {
      /* storage unavailable */
    }
    window.location.reload()
  }
  return (
    <section className="progress-section progress-reset">
      <button className={`btn ${armed ? 'is-danger' : ''}`} onClick={armed ? reset : () => setArmed(true)} onBlur={() => setArmed(false)}>
        {armed ? 'Click again to erase progress on this device' : 'Reset progress on this device'}
      </button>
      {armed && <p className="progress-sub">This can’t be undone. Your sound and graphics settings are kept.</p>}
    </section>
  )
}

/** Auto / Faster / Detailed graphics. Saved on this device only. */
function GraphicsSetting() {
  useQuality() // re-render when it changes
  const setting = currentSetting()
  const options: { id: QualitySetting; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'fast', label: 'Faster' },
    { id: 'detailed', label: 'Detailed' },
  ]
  const using = profile() === 'fast' ? 'faster' : 'detailed'
  return (
    <div className="graphics-setting">
      <div className="graphics-row">
        <span id="graphics-label">3D graphics</span>
        <div className="mode-switch is-three has-pill" role="radiogroup" aria-labelledby="graphics-label">
          <SlidingPill active={setting} />
          {options.map((o) => (
            <button key={o.id} role="radio" aria-checked={setting === o.id} className={`mode-btn ${setting === o.id ? 'is-active' : ''}`} onClick={() => setQualitySetting(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <p className="progress-sub">
        {setting === 'auto'
          ? `Auto is using ${using} graphics${using === 'faster' ? (looksWeak() ? ', because this computer’s graphics are limited' : ', because 3D views ran slowly here') : ''}.`
          : setting === 'fast'
            ? 'Faster: simpler lighting and fewer details, so 3D views stay smooth on older computers and Chromebooks.'
            : 'Detailed: reflections, soft shadows, and extra sharpness. Best on newer computers.'}{' '}
        Applies to 3D views you open from now on.
      </p>
    </div>
  )
}
