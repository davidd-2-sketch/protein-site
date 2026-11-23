/*
  PracticePage.tsx — calm flashcards built around the site's visuals.

  Three screens:
    1. Setup: choose topics (grouped by course).
    2. Round: up to 10 cards, each with a 3D visual. Answering may reveal more of the visual.
    3. Finish: which ideas are worth another look, with links to the lessons that teach them.

  There are no scores, percentages, or streaks. The only thing remembered is which cards
  were missed, so they can come back in later rounds (up to 3 per round) until they're
  answered right on the first try. That list is saved through the progress store, so it
  stays in this browser on the student's own device.

  A link like /practice?topic=polarity opens with just that topic chosen.
*/
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { StepTransition } from '../components/motion'
import TopicLayout, { type ModelLabel } from '../components/TopicLayout'
import { STRUCTURES } from '../enzymes/structures'
import { QuizBox } from '../lessons/LessonPanel'
import { MODULES } from '../lessons/place'
import { useStoredState } from '../lessons/progress'
import PracticeStage from '../practice/PracticeStage'
import { buildAdaptiveRound, focusSkills, RECENT_MAX, recordAnswer, type SkillStats } from '../practice/adapt'
import RichText from '../lessons/RichText'
import { TOPICS, type Question, type Topic, type Visual } from '../practice/questions'
import { play } from '../sound/sound'
import { idealState } from '../vsepr/states'
import './PracticePage.css'

type Missed = Record<string, { topic: Topic; misses: number }>

/** The idle visual on the setup screen: a slowly turning tetrahedron. */
const IDLE = { kind: 'vsepr' as const, before: idealState(4, 0), after: idealState(4, 0), arcsAfter: true }

/** Topics in the same course groups as the top bar. */
const GROUPS: { name: string; topics: Topic[] }[] = [
  { name: 'General Chem', topics: ['lewis', 'shapes', 'orbitals', 'mo', 'polarity', 'trends'] },
  { name: 'Organic', topics: ['reactions'] },
  { name: 'Biochem', topics: ['enzymes'] },
]

/** The honesty label for a card's visual. It never gives the answer away. */
function labelFor(visual: Visual, revealed: boolean): ModelLabel | null {
  switch (visual.kind) {
    case 'vsepr':
      return { kind: 'illustrative', name: 'Molecular shape' }
    case 'orbital':
      return { kind: 'illustrative', name: 'Orbital' }
    case 'trends':
      return { kind: 'illustrative', name: 'Periodic table' }
    case 'sn2':
      return { kind: 'illustrative', name: 'A moment in a reaction' }
    case 'polarity':
      return { kind: 'illustrative', name: 'Bond dipoles' }
    case 'lewis':
      return { kind: 'illustrative', name: 'Lewis structure' }
    case 'enzyme3d':
      return { kind: 'experimental', name: 'Enzyme', source: <span className="mono">PDB {STRUCTURES[revealed && visual.after ? visual.after : visual.structure].pdb}</span> }
    default:
      return null // charts carry their own "Schematic" / "Example numbers" tag
  }
}

export default function PracticePage() {
  const [params] = useSearchParams()
  const linkedTopic = TOPICS.find((t) => t.id === params.get('topic'))?.id
  const [savedTopics, setSavedTopics] = useStoredState<Topic[]>('ps.practice.topics', ['lewis', 'shapes', 'orbitals', 'mo', 'trends', 'reactions', 'polarity', 'enzymes'])
  /** Arriving from a "Practice this topic" link: just that topic, until the student changes it. */
  const [linked, setLinked] = useState<Topic[] | null>(linkedTopic ? [linkedTopic] : null)
  const topics = linked ?? savedTopics
  const [missed, setMissed] = useStoredState<Missed>('ps.practice.missed', {})
  /** How each kind of card has been going (see practice/adapt.ts). Never shown as numbers. */
  const [stats, setStats] = useStoredState<SkillStats>('ps.practice.skills', {})
  /** Cards seen recently, so they don't come straight back. */
  const [recent, setRecent] = useStoredState<string[]>('ps.practice.recent', [])

  const [round, setRound] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)
  /** First-try result for each card so far (only used to pick what to review). */
  const [results, setResults] = useState<boolean[]>([])
  const [answered, setAnswered] = useState(false)
  const [finished, setFinished] = useState(false)
  /** Counts rounds started in this visit: keeps setup → round → finish sliding forward. */
  const [roundNo, setRoundNo] = useState(0)

  const question = round?.[index] ?? null
  /** Click and build cards: how many tries so far, and what to tell the student. */
  const [attempt, setAttempt] = useState<{ tries: number; status: 'waiting' | 'wrong' | 'right' | 'shown'; message?: string }>({ tries: 0, status: 'waiting' })

  const start = () => {
    const next = buildAdaptiveRound(topics, missed, stats, recent)
    setRound(next)
    setRecent([...recent, ...next.map((q) => q.id)].slice(-RECENT_MAX))
    setAttempt({ tries: 0, status: 'waiting' })
    setRoundNo((n) => n + 1)
    setIndex(0)
    setResults([])
    setAnswered(false)
    setFinished(false)
  }

  /** Record one answer: update the "missed" list for spaced review. */
  const record = (q: Question, firstTry: boolean) => {
    setResults((r) => [...r, firstTry])
    const next = { ...missed }
    if (firstTry) {
      // Got it right first time: one step closer to dropping out of review.
      if (next[q.id]) {
        next[q.id] = { ...next[q.id], misses: next[q.id].misses - 1 }
        if (next[q.id].misses <= 0) delete next[q.id]
      }
    } else next[q.id] = { topic: q.topic, misses: (next[q.id]?.misses ?? 0) + 1 }
    setMissed(next)
    setStats(recordAnswer(stats, q.id, firstTry))
  }

  /** A click or build card reported an attempt. */
  const onAttempt = (ok: boolean, message?: string) => {
    if (!question || answered) return
    if (ok) {
      play('correct')
      setAttempt({ tries: attempt.tries + 1, status: 'right', message })
      setAnswered(true)
      record(question, attempt.tries === 0)
    } else {
      play('wrong')
      setAttempt({ tries: attempt.tries + 1, status: 'wrong', message })
    }
  }
  const showAnswer = () => {
    if (!question || answered) return
    setAttempt({ ...attempt, status: 'shown' })
    setAnswered(true)
    record(question, false)
  }

  const nextQuestion = () => {
    if (!round) return
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setAnswered(false)
      setAttempt({ tries: 0, status: 'waiting' })
    } else {
      setFinished(true)
      play('complete')
    }
  }

  const toggleTopic = (t: Topic) => {
    const next = topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t]
    if (!next.length) return
    setSavedTopics(next)
    setLinked(null)
  }

  const inRound = Boolean(question && !finished)
  const visual: Visual = inRound ? question!.visual : IDLE
  const topicName = question ? TOPICS.find((t) => t.id === question.topic)!.name : ''

  const panel = (
    <section className="lesson practice-panel" aria-label="Practice">
      <StepTransition id={!round ? `setup-${roundNo}` : finished ? `results-${roundNo}` : `round-${roundNo}`} order={roundNo * 3 + (!round ? 0 : finished ? 2 : 1)}>
        <div className="panel-stack">
          {!round ? (
            <Setup topics={topics} onToggle={toggleTopic} onStart={start} reviewCount={Object.values(missed).filter((m) => topics.includes(m.topic)).length} focus={focusSkills(stats, topics)} />
          ) : finished ? (
            <Finish round={round} results={results} onAgain={start} onDone={() => setRound(null)} focus={focusSkills(stats, topics)} />
          ) : (
            question && (
              <>
                <header className="practice-head">
                  <button className="lesson-back" onClick={() => setRound(null)}>
                    ← End round
                  </button>
                  <div className="practice-progress">
                    <span className="practice-count">
                      Card {index + 1} of {round.length}
                    </span>
                    <ol className="practice-dots" aria-hidden="true">
                      {round.map((q, i) => (
                        <li key={q.id} className={i < index ? 'is-done' : i === index ? 'is-current' : ''} />
                      ))}
                    </ol>
                  </div>
                </header>

                <StepTransition id={question.id + index} order={index}>
                  <div className="lesson-body">
                    <p className="lesson-kicker">{topicName}</p>
                    {question.interaction ? (
                      <ActionCard question={question} number={index + 1} total={round.length} attempt={attempt} onShow={showAnswer} />
                    ) : (
                    <QuizBox
                      quiz={question}
                      number={index + 1}
                      total={round.length}
                      countWord="Card"
                      reveals={false}
                      label="Look, then answer"
                      prompt={
                        question.visual.kind === 'kinetics' || question.visual.kind === 'energy' || question.visual.kind === 'mo'
                          ? 'Read the diagram, then pick an answer.'
                          : question.visual.kind === 'lewis'
                            ? 'Look at the drawing, then pick an answer.'
                            : 'Drag the model to look around, then pick an answer.'
                      }
                      onDone={() => setAnswered(true)}
                      onResult={(firstTry) => record(question, firstTry)}
                    />
                    )}
                  </div>
                </StepTransition>

                <nav className="lesson-nav">
                  <button className={`btn ${answered ? 'btn-primary' : ''}`} onClick={nextQuestion} disabled={!answered}>
                    {index + 1 < round.length ? 'Next card' : 'Finish'} <Icon name="arrow" size={16} />
                  </button>
                </nav>
              </>
            )
          )}
        </div>
      </StepTransition>
    </section>
  )

  return (
    <TopicLayout
      className="practice-page"
      panel={panel}
      label={inRound ? labelFor(visual, answered) : null}
      peek={
        inRound && round
          ? { kicker: `Card ${index + 1} of ${round.length}`, title: topicName, action: answered ? { label: index + 1 < round.length ? 'Next' : 'Finish', onClick: nextQuestion } : undefined }
          : { title: 'Practice' }
      }
    >
      <div className="topic-canvas practice-holder">
        {/* key: a fresh stage when the visual kind changes; same scene otherwise. */}
        {inRound ? (
          <PracticeStage key={visual.kind} visual={visual} revealed={answered} interaction={question!.interaction} onAttempt={onAttempt} cardId={`${roundNo}:${index}`} />
        ) : (
          <PracticeStage key="idle" visual={IDLE} revealed />
        )}
      </div>
    </TopicLayout>
  )
}

/* ---------- Setup screen ---------- */

function Setup(props: { topics: Topic[]; onToggle: (t: Topic) => void; onStart: () => void; reviewCount: number; focus: string[] }) {
  const review = Math.min(3, props.reviewCount)
  return (
    <>
      <header>
        <h1 className="practice-title">Practice</h1>
        <p className="practice-sub">
          Up to ten cards at a time. Each one shows you something to look at: a shape, an orbital, the periodic table, or
          a moment in a reaction. No scores. Cards you miss come back later.
        </p>
      </header>

      <FocusLine focus={props.focus} />

      {GROUPS.map((g) => (
        <div key={g.name} className="practice-group" role="group" aria-label={`${g.name} topics`}>
          <p className="practice-group-name">{g.name}</p>
          <div className="prop-list">
            {g.topics.map((id) => {
              const t = TOPICS.find((x) => x.id === id)!
              const on = props.topics.includes(id)
              return (
                <button key={id} className={`prop ${on ? 'is-on' : ''}`} role="checkbox" aria-checked={on} onClick={() => props.onToggle(id)}>
                  <span className="prop-check" aria-hidden="true">
                    {on ? '✓' : ''}
                  </span>
                  <span className="prop-text">
                    <span className="prop-name">{t.name}</span>
                    <span className="prop-blurb">{t.blurb}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {review > 0 && (
        <p className="practice-note">
          {review} card{review === 1 ? '' : 's'} you missed before will come back for review.
        </p>
      )}
      {/* Stays at the bottom of the panel, so Start is always in reach. */}
      <nav className="lesson-nav">
        <button className="btn btn-primary practice-start" onClick={props.onStart}>
          Start a round <Icon name="arrow" size={16} />
        </button>
      </nav>
    </>
  )
}

/* ---------- Finish screen ---------- */

function Finish({ round, results, onAgain, onDone, focus }: { round: Question[]; results: boolean[]; onAgain: () => void; onDone: () => void; focus: string[] }) {
  const misses = useMemo(() => round.filter((_, i) => !results[i]), [round, results])
  // One review link per lesson (several missed cards often share a lesson).
  const reviews = useMemo(() => {
    const seen = new Map<string, { label: string; to: string }>()
    for (const q of misses) {
      const r = q.review
      const to =
        r.module === 'reaction' ? '/reaction' : r.module === 'polarity' ? '/polarity' : `${MODULES[r.module].path}${r.lessonId ? `?lesson=${r.lessonId}&step=0` : ''}`
      seen.set(to, { label: r.label, to })
    }
    return [...seen.values()]
  }, [misses])

  return (
    <>
      <header>
        <p className="lesson-kicker">Round finished</p>
        <h1 className="practice-title">Nice work.</h1>
        <p className="practice-sub">
          {misses.length === 0
            ? 'You went through every card. Nothing to review from this round.'
            : 'You went through every card. The ones below are worth another look, and they will come back in a later round.'}
        </p>
      </header>

      {misses.length > 0 && (
        <ol className="practice-review" aria-label="Worth another look">
          {misses.map((q) => (
            <li key={q.id}>{q.question.split('?')[0]}?</li>
          ))}
        </ol>
      )}

      {reviews.length > 0 && (
        <div className="practice-links">
          <p className="lesson-kicker">Lessons that cover these</p>
          {reviews.map((r) => (
            <Link key={r.to} to={r.to} className="btn btn-sm">
              {r.label} <Icon name="arrow" size={16} />
            </Link>
          ))}
        </div>
      )}

      <FocusLine focus={focus} next />

      <nav className="practice-actions">
        <button className="btn btn-primary" onClick={onAgain}>
          Another round <Icon name="arrow" size={16} />
        </button>
        <button className="btn" onClick={onDone}>
          Change topics
        </button>
      </nav>
    </>
  )
}

/* ---------- What the next round leans toward (names only, never numbers) ---------- */

function FocusLine({ focus, next }: { focus: string[]; next?: boolean }) {
  if (!focus.length) return null
  return (
    <div className="practice-focus">
      <p className="practice-focus-label">{next ? 'Your next round will lean toward' : 'This round leans toward'}</p>
      <p className="practice-focus-skills">{focus.join(' · ')}</p>
    </div>
  )
}

/* ---------- A click or build card ---------- */

function ActionCard(p: {
  question: Question
  number: number
  total: number
  attempt: { tries: number; status: 'waiting' | 'wrong' | 'right' | 'shown'; message?: string }
  onShow: () => void
}) {
  const { question: q, attempt: a } = p
  const kind = q.interaction!.kind
  const label = kind === 'build-lewis' || kind === 'fill-mo' ? 'Build it' : 'Click the answer'
  const state = a.status === 'right' ? 'right' : a.status === 'shown' ? 'shown' : a.status === 'wrong' ? 'wrong' : 'waiting'
  return (
    <div className={`quiz is-${state}`}>
      <div className="quiz-top">
        <span className="quiz-label">{label}</span>
        <span className="quiz-count">
          Card {p.number} of {p.total}
        </span>
      </div>
      <p className="quiz-question">
        <RichText text={q.question} />
      </p>
      <div role="status" aria-live="polite" className="quiz-status">
        {a.status === 'waiting' && (
          <p className="quiz-prompt">{kind === 'build-lewis' || kind === 'fill-mo' ? 'Work on the drawing, then press Check.' : 'Click your answer on the drawing.'}</p>
        )}
        {a.status === 'wrong' && (
          <div className="quiz-feedback is-wrong" key={a.tries}>
            <p className="quiz-feedback-title">Not quite. Try again.</p>
            {a.message && <p>{a.message}</p>}
            <p>
              <RichText text={q.hint ?? ''} />
            </p>
            <button className="btn quiz-reveal" onClick={p.onShow}>
              Show me the answer
            </button>
          </div>
        )}
        {(a.status === 'right' || a.status === 'shown') && (
          <div className="quiz-feedback is-right">
            <p className="quiz-feedback-title">{a.status === 'shown' ? 'Here’s the answer' : a.tries <= 1 ? '✓ Correct, first try!' : '✓ Correct!'}</p>
            <p>
              <RichText text={q.explain} auto />
            </p>
          </div>
        )}
        {a.status === 'waiting' && (
          <button className="btn btn-sm btn-quiet quiz-reveal" onClick={p.onShow}>
            Show me the answer
          </button>
        )}
      </div>
    </div>
  )
}
