/*
  ProgressPage.tsx — everything a student has done, in one place:
  where they left off, lessons finished in each module, and practice results.
  It reads the same saved progress as every other page (synced if they sign in).
*/
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AccountPanel from '../account/AccountPanel'
import { accountsEnabled } from '../account/supabase'
import { MODULES, placeLink, type ModuleKey, type Place } from '../lessons/place'
import { setItem, snapshot, useStoredState } from '../lessons/progress'
import { PROTEIN_LESSONS } from '../lessons/proteinLessons'
import type { AnyStep, Lesson } from '../lessons/types'
import { ORBITAL_LESSONS } from '../orbitals/lessons'
import { TOPICS, type Topic } from '../practice/questions'
import { TREND_LESSONS } from '../trends/lessons'
import { VSEPR_LESSONS } from '../vsepr/lessons'
import './ProgressPage.css'

/* Each module's lessons and the key its finished-lessons list is saved under. */
const SECTIONS: { module: ModuleKey; storeKey: string; lessons: Lesson<AnyStep>[] }[] = [
  { module: 'protein', storeKey: 'ps.completedLessons', lessons: PROTEIN_LESSONS as unknown as Lesson<AnyStep>[] },
  { module: 'vsepr', storeKey: 'ps.vsepr.completed', lessons: VSEPR_LESSONS as unknown as Lesson<AnyStep>[] },
  { module: 'orbitals', storeKey: 'ps.orbitals.completed', lessons: ORBITAL_LESSONS as unknown as Lesson<AnyStep>[] },
  { module: 'trends', storeKey: 'ps.trends.completed', lessons: TREND_LESSONS as unknown as Lesson<AnyStep>[] },
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
          Saved on this device. <AccountHint />
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

      <section className="progress-section" aria-labelledby="account-title">
        <h2 id="account-title">Account</h2>
        <AccountPanel />
      </section>

      <ResetProgress />
    </div>
  )
}

function LessonCount({ total }: { total: number }) {
  const done = SECTIONS.reduce((n, s) => n + s.lessons.filter((l) => (snapshotList(s.storeKey) ?? []).includes(l.id)).length, 0)
  return (
    <span className="progress-count">
      {done} of {total} finished
    </span>
  )
}

const snapshotList = (key: string) => snapshot().data[key] as string[] | undefined

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

function AccountHint() {
  // Only mention signing in when accounts are actually switched on.
  return accountsEnabled ? <span>Sign in below to keep it in sync across devices.</span> : null
}

/** Clear this device's progress. Two clicks, so it can't happen by accident. */
function ResetProgress() {
  const [armed, setArmed] = useState(false)
  const reset = () => {
    for (const key of Object.keys(snapshot().data)) setItem(key, null)
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith('ps.') && key !== 'ps.sound') localStorage.removeItem(key)
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
      {armed && <p className="progress-sub">This can’t be undone. Progress saved to your account (if any) is not affected.</p>}
    </section>
  )
}
