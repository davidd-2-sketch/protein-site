/*
  PracticePage.tsx — practice rounds built around the site's visuals.

  Three screens:
    1. Setup: choose topics, see your stats so far.
    2. Round: 10 questions, each with a 3D visual. Answering may reveal more of the visual.
    3. Results: score, what you missed, and links to the lessons that teach it.

  Missed questions are remembered and come back in later rounds (up to 3 per round)
  until they're answered right on the first try. Everything is saved through the progress
  store, so it syncs to the student's account if they sign in.
*/
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QuizBox } from '../lessons/LessonPanel'
import { MODULES } from '../lessons/place'
import { useStoredState } from '../lessons/progress'
import PracticeStage from '../practice/PracticeStage'
import { buildRound, TOPICS, type Question, type Topic } from '../practice/questions'
import { play } from '../sound/sound'
import { idealState } from '../vsepr/states'
import './PracticePage.css'

type Stats = Partial<Record<Topic, { answered: number; firstTry: number }>>
type Missed = Record<string, { topic: Topic; misses: number }>

/** The idle visual on the setup screen: a slowly turning tetrahedron. */
const IDLE = { kind: 'vsepr' as const, before: idealState(4, 0), after: idealState(4, 0), arcsAfter: true }

export default function PracticePage() {
  const [topics, setTopics] = useStoredState<Topic[]>('ps.practice.topics', ['shapes', 'orbitals', 'trends', 'reactions'])
  const [stats, setStats] = useStoredState<Stats>('ps.practice.stats', {})
  const [missed, setMissed] = useStoredState<Missed>('ps.practice.missed', {})
  const [rounds, setRounds] = useStoredState<number>('ps.practice.rounds', 0)
  const [best, setBest] = useStoredState<number>('ps.practice.best', 0)

  const [round, setRound] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)
  /** First-try result for each question answered so far. */
  const [results, setResults] = useState<boolean[]>([])
  const [answered, setAnswered] = useState(false)
  const [finished, setFinished] = useState(false)

  const question = round?.[index] ?? null
  const score = results.filter(Boolean).length

  const start = () => {
    setRound(buildRound(topics, missed))
    setIndex(0)
    setResults([])
    setAnswered(false)
    setFinished(false)
  }

  /** Record one answer: update stats and the "missed" list for spaced review. */
  const record = (q: Question, firstTry: boolean) => {
    setResults((r) => [...r, firstTry])
    const s = stats[q.topic] ?? { answered: 0, firstTry: 0 }
    setStats({ ...stats, [q.topic]: { answered: s.answered + 1, firstTry: s.firstTry + (firstTry ? 1 : 0) } })
    const next = { ...missed }
    if (firstTry) {
      // Got it right first time: one step closer to dropping out of review.
      if (next[q.id]) {
        next[q.id] = { ...next[q.id], misses: next[q.id].misses - 1 }
        if (next[q.id].misses <= 0) delete next[q.id]
      }
    } else next[q.id] = { topic: q.topic, misses: (next[q.id]?.misses ?? 0) + 1 }
    setMissed(next)
  }

  const nextQuestion = () => {
    if (!round) return
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setAnswered(false)
    } else {
      setFinished(true)
      setRounds(rounds + 1)
      if (score > best) setBest(score)
      play('complete')
    }
  }

  const toggleTopic = (t: Topic) => {
    const next = topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t]
    if (next.length) setTopics(next)
  }

  return (
    <div className="practice-page">
      <div className="practice-backdrop" aria-hidden="true" />
      <div className="practice-stage">
        {question && !finished ? (
          // key: a fresh stage when the visual kind changes; same scene otherwise.
          <PracticeStage key={question.visual.kind} visual={question.visual} revealed={answered} />
        ) : (
          <PracticeStage key="idle" visual={IDLE} revealed />
        )}
      </div>

      <section className="lesson practice-panel panel" aria-label="Practice">
        {!round ? (
          <Setup topics={topics} onToggle={toggleTopic} onStart={start} stats={stats} rounds={rounds} best={best} reviewCount={Object.values(missed).filter((m) => topics.includes(m.topic)).length} />
        ) : finished ? (
          <Results round={round} results={results} onAgain={start} onDone={() => setRound(null)} />
        ) : (
          question && (
            <>
              <header className="practice-head">
                <button className="lesson-back" onClick={() => setRound(null)}>
                  ← End round
                </button>
                <div className="practice-progress" aria-label={`Question ${index + 1} of ${round.length}, ${score} right on the first try`}>
                  <ol className="practice-dots" aria-hidden="true">
                    {round.map((q, i) => (
                      <li key={q.id} className={i < results.length ? (results[i] ? 'is-right' : 'is-wrong') : i === index ? 'is-current' : ''} />
                    ))}
                  </ol>
                  <span className="practice-score">
                    {score} of {results.length} right
                  </span>
                </div>
              </header>

              <div className="lesson-body" key={question.id + index}>
                <p className="lesson-kicker">{TOPICS.find((t) => t.id === question.topic)!.name}</p>
                <QuizBox
                  quiz={question}
                  number={index + 1}
                  total={round.length}
                  reveals={false}
                  label="Look, then answer"
                  prompt="Drag the model to look around, then pick an answer."
                  onDone={() => setAnswered(true)}
                  onResult={(firstTry) => record(question, firstTry)}
                />
              </div>

              <nav className="lesson-nav">
                <button className={`btn ${answered ? 'btn-primary' : ''}`} onClick={nextQuestion} disabled={!answered}>
                  {index + 1 < round.length ? 'Next question' : 'See results'} <span className="arrow">→</span>
                </button>
              </nav>
            </>
          )
        )}
      </section>
    </div>
  )
}

/* ---------- Setup screen ---------- */

function Setup(props: {
  topics: Topic[]
  onToggle: (t: Topic) => void
  onStart: () => void
  stats: Stats
  rounds: number
  best: number
  reviewCount: number
}) {
  return (
    <>
      <header>
        <h1 className="practice-title">Practice</h1>
        <p className="practice-sub">
          Rounds of 10 questions. Each one shows you something to look at: a shape, an orbital, the periodic table,
          or a moment in a reaction. Questions you miss come back in later rounds.
        </p>
      </header>

      <div className="prop-list" role="group" aria-label="Topics">
        {TOPICS.map((t) => {
          const on = props.topics.includes(t.id)
          const s = props.stats[t.id]
          return (
            <button key={t.id} className={`prop ${on ? 'is-on' : ''}`} role="checkbox" aria-checked={on} onClick={() => props.onToggle(t.id)}>
              <span className="prop-check" aria-hidden="true">
                {on ? '✓' : ''}
              </span>
              <span className="prop-text">
                <span className="prop-name">{t.name}</span>
                <span className="prop-blurb">{t.blurb}</span>
                {s && s.answered > 0 && (
                  <span className="prop-stat mono">
                    {Math.round((s.firstTry / s.answered) * 100)}% first try · {s.answered} answered
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <button className="btn btn-primary practice-start" onClick={props.onStart}>
        Start a round of 10 <span className="arrow">→</span>
      </button>
      {props.reviewCount > 0 && (
        <p className="practice-note">
          {Math.min(3, props.reviewCount)} question{Math.min(3, props.reviewCount) === 1 ? '' : 's'} you missed before will come back for review.
        </p>
      )}
      {props.rounds > 0 && (
        <p className="practice-note">
          {props.rounds} round{props.rounds === 1 ? '' : 's'} finished · best score {props.best} / 10
        </p>
      )}
    </>
  )
}

/* ---------- Results screen ---------- */

function Results({ round, results, onAgain, onDone }: { round: Question[]; results: boolean[]; onAgain: () => void; onDone: () => void }) {
  const score = results.filter(Boolean).length
  const misses = useMemo(() => round.filter((_, i) => !results[i]), [round, results])
  // One review link per lesson (several missed questions often share a lesson).
  const reviews = useMemo(() => {
    const seen = new Map<string, { label: string; to: string }>()
    for (const q of misses) {
      const r = q.review
      const to = r.module === 'reaction' ? '/reaction' : `${MODULES[r.module].path}${r.lessonId ? `?lesson=${r.lessonId}&step=0` : ''}`
      seen.set(to, { label: r.label, to })
    }
    return [...seen.values()]
  }, [misses])

  return (
    <>
      <header>
        <p className="lesson-kicker">Round complete</p>
        <h1 className="practice-title">
          {score} / {round.length}
        </h1>
        <p className="practice-sub">
          {score === round.length
            ? 'Every one right on the first try. Excellent.'
            : score >= 7
              ? 'Solid round. The ones you missed will come back for review.'
              : 'Good practice. Missed questions will come back, and the lessons below cover them.'}
        </p>
      </header>

      <ol className="practice-review">
        {round.map((q, i) => (
          <li key={q.id} className={results[i] ? 'is-right' : 'is-wrong'}>
            <span className="practice-mark" aria-label={results[i] ? 'Right on the first try' : 'Missed'}>
              {results[i] ? '✓' : '✕'}
            </span>
            <span>{q.question.split('?')[0]}?</span>
          </li>
        ))}
      </ol>

      {reviews.length > 0 && (
        <div className="practice-links">
          <p className="lesson-kicker">Review</p>
          {reviews.map((r) => (
            <Link key={r.to} to={r.to} className="btn">
              {r.label} <span className="arrow">→</span>
            </Link>
          ))}
        </div>
      )}

      <nav className="practice-actions">
        <button className="btn btn-primary" onClick={onAgain}>
          Another round <span className="arrow">→</span>
        </button>
        <button className="btn" onClick={onDone}>
          Change topics
        </button>
      </nav>
    </>
  )
}
