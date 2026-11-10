/*
  LessonPanel.tsx — the optional lessons panel on the left of the viewer.

  Two states:
    • Lesson list: pick a lesson (finished ones get a check mark).
    • Inside a lesson: one step at a time, with a depth switch, an optional
      "try it" task or quiz, and Back / Next buttons.

  The "Lessons | Explore" switch sits at the top in both states.
*/
import { useEffect, useRef, useState } from 'react'
import ModeSwitch from '../components/ModeSwitch'
import { play } from '../sound/sound'
import RichText from './RichText'
import './lessons.css'
import { DEPTHS, type AnyStep, type Depth, type Lesson, type Quiz } from './types'

export type TaskStatus = 'waiting' | 'correct' | 'wrong'

interface Props {
  lessons: Lesson<AnyStep>[]
  lesson: Lesson<AnyStep> | null
  /** Heading and blurb for the lesson list. */
  listTitle?: string
  listBlurb?: string
  /** Called when the step's quiz is answered correctly or the answer is revealed. */
  onQuizDone?: () => void
  stepIndex: number
  depth: Depth
  taskStatus: TaskStatus
  completed: string[]
  onDepth: (d: Depth) => void
  onOpen: (lessonId: string) => void
  onStep: (index: number) => void
  onExit: () => void
  onClose: () => void
}

export default function LessonPanel(p: Props) {
  // Which step's quiz has been answered (so "Skip" can turn into "Next").
  const [answeredKey, setAnsweredKey] = useState('')
  if (!p.lesson) return <LessonList {...p} />

  const { lesson, stepIndex } = p
  const step = lesson.steps[stepIndex]
  const stepKey = `${lesson.id}-${stepIndex}`
  const isLast = stepIndex === lesson.steps.length - 1
  const lessonNumber = p.lessons.findIndex((l) => l.id === lesson.id) + 1
  const next = p.lessons[lessonNumber] // the lesson after this one, if any

  // "Question 2 of 4": count only the steps in this lesson that have a quiz.
  const quizSteps = lesson.steps.flatMap((s, i) => (s.quiz ? [i] : []))
  const quizNumber = quizSteps.indexOf(stepIndex) + 1
  // An unanswered quiz or unfinished task: Next still works, but is labeled honestly as "Skip".
  const pending = (step.quiz && answeredKey !== stepKey) || (step.task && p.taskStatus !== 'correct')

  return (
    <section className="lesson panel" aria-label={`Lesson: ${lesson.title}`}>
      <ModeSwitch mode="lessons" onChange={p.onClose} />
      <header className="lesson-head">
        <button className="lesson-back" onClick={p.onExit}>
          ← All lessons
        </button>
        <p className="lesson-kicker">
          Lesson {lessonNumber} · {lesson.title}
        </p>
        <ol className="lesson-dots" aria-label={`Step ${stepIndex + 1} of ${lesson.steps.length}`}>
          {lesson.steps.map((s, i) => (
            <li key={i}>
              <button
                className={`lesson-dot ${i === stepIndex ? 'is-current' : ''} ${i < stepIndex ? 'is-done' : ''}`}
                onClick={() => p.onStep(i)}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === stepIndex ? 'step' : undefined}
              />
            </li>
          ))}
        </ol>
      </header>

      {/* At the top, so it's always visible even when Back/Next are pinned over a long step. */}
      <DepthSwitch depth={p.depth} onDepth={p.onDepth} />

      <div className="lesson-body" key={stepKey}>
        <h2>{step.title}</h2>
        <p className="lesson-text">
          <RichText text={step.text[p.depth]} />
        </p>

        {step.quiz && (
          <QuizBox
            key={stepKey}
            quiz={step.quiz}
            number={quizNumber}
            total={quizSteps.length}
            reveals={step.revealView !== undefined}
            onDone={() => {
              setAnsweredKey(stepKey)
              p.onQuizDone?.()
            }}
          />
        )}

        {step.task && (
          <div className={`lesson-task is-${p.taskStatus}`} role="status" aria-live="polite">
            <p className="lesson-task-label">
              {p.taskStatus === 'correct' ? '✓ Done' : p.taskStatus === 'wrong' ? 'Not yet · try again' : 'Your turn'}
            </p>
            <p>
              {p.taskStatus === 'correct'
                ? step.task.success
                : p.taskStatus === 'wrong'
                  ? step.task.hint
                  : step.task.prompt}
            </p>
          </div>
        )}

        {step.note && <p className="lesson-note">{step.note}</p>}
      </div>

      <nav className="lesson-nav" aria-label="Lesson navigation">
        <button className="btn" onClick={() => p.onStep(stepIndex - 1)} disabled={stepIndex === 0}>
          Back
        </button>
        {!isLast ? (
          <button className={`btn ${pending ? '' : 'btn-primary'}`} onClick={() => p.onStep(stepIndex + 1)}>
            {pending ? 'Skip' : 'Next'} <span className="arrow">→</span>
          </button>
        ) : next ? (
          <button
            className="btn btn-primary"
            onClick={() => {
              play('complete')
              p.onOpen(next.id)
            }}
          >
            Next lesson: {next.title} <span className="arrow">→</span>
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => {
              play('complete')
              p.onExit()
            }}
          >
            Finish
          </button>
        )}
      </nav>
    </section>
  )
}

/* ---------- Lesson list ---------- */

function LessonList(p: Props) {
  return (
    <section className="lesson panel" aria-label="Lessons">
      <ModeSwitch mode="lessons" onChange={p.onClose} />
      <header className="lesson-list-head">
        <div>
          <h2>{p.listTitle ?? 'Lessons'}</h2>
          {p.listBlurb && <p>{p.listBlurb}</p>}
        </div>
      </header>

      <ol className="lesson-list">
        {p.lessons.map((l, i) => {
          const done = p.completed.includes(l.id)
          return (
            <li key={l.id}>
              <button className="lesson-item" onClick={() => p.onOpen(l.id)}>
                <span className={`lesson-num ${done ? 'is-done' : ''}`} aria-hidden="true">
                  {done ? '✓' : i + 1}
                </span>
                <span className="lesson-item-text">
                  <span className="lesson-item-title">
                    {l.title}
                    {done && <span className="sr-only"> (completed)</span>}
                  </span>
                  <span className="lesson-item-summary">{l.summary}</span>
                </span>
                <span className="lesson-item-time">{l.minutes} min</span>
              </button>
            </li>
          )
        })}
      </ol>

      <DepthSwitch depth={p.depth} onDepth={p.onDepth} />
    </section>
  )
}

/* ---------- Depth switch: how much detail the explanations give ---------- */

export function DepthSwitch({ depth, onDepth }: { depth: Depth; onDepth: (d: Depth) => void }) {
  return (
    <div className="depth">
      <span className="depth-label" id="depth-label">
        Explanations
      </span>
      <div className="depth-options" role="radiogroup" aria-labelledby="depth-label">
        {DEPTHS.map((d) => (
          <button
            key={d.id}
            role="radio"
            aria-checked={depth === d.id}
            className={`depth-btn ${depth === d.id ? 'is-active' : ''}`}
            onClick={() => onDepth(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Quiz: predict / check yourself ---------- */

export function QuizBox(props: {
  quiz: Quiz
  /** "Question {number} of {total}" within this lesson. */
  number: number
  total: number
  /** True when answering makes the 3D model appear (predict, then reveal). */
  reveals: boolean
  /** Optional wording overrides for the small label and the "pick an answer" line. */
  label?: string
  prompt?: string
  onDone: () => void
}) {
  const { quiz } = props
  // Wrong answers tried so far, and how the question ended (if it has).
  const [tried, setTried] = useState<number[]>([])
  const [result, setResult] = useState<'open' | 'right' | 'shown'>('open')
  const solved = result !== 'open'
  // After each answer, scroll the feedback into view so it's never hidden below the fold.
  const feedbackRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (tried.length || solved) feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [tried.length, solved])
  const lastWrong = !solved && tried.length ? tried[tried.length - 1] : -1

  const pick = (i: number) => {
    if (solved || tried.includes(i)) return
    if (i === quiz.answer) {
      setResult('right')
      play('correct')
      props.onDone()
    } else {
      setTried([...tried, i])
      play('wrong')
    }
  }
  const reveal = () => {
    setResult('shown')
    props.onDone()
  }

  return (
    <div className={`quiz is-${result}`}>
      <div className="quiz-top">
        <span className="quiz-label">{props.label ?? (props.reveals ? 'Predict first' : 'Check yourself')}</span>
        <span className="quiz-count">
          Question {props.number} of {props.total}
        </span>
      </div>
      <p className="quiz-question">
        <RichText text={quiz.question} />
      </p>

      <div className="quiz-choices" role="group" aria-label="Answer choices">
        {quiz.choices.map((c, i) => {
          const isAnswer = solved && i === quiz.answer
          const isTried = tried.includes(i)
          const state = isAnswer ? 'is-correct' : isTried ? 'is-wrong' : ''
          return (
            <button
              key={i}
              className={`quiz-choice ${state} ${i === lastWrong ? 'is-latest' : ''}`}
              onClick={() => pick(i)}
              // Answers already tried, and everything once solved, can't be picked again.
              disabled={(solved && !isAnswer) || isTried}
              aria-label={isAnswer ? undefined : isTried ? `${c} (not correct)` : undefined}
            >
              {/* The bubble shows A/B/C, then ✓ or ✕: a symbol, not just a color. */}
              <span className="quiz-letter" aria-hidden="true">
                {isAnswer ? '✓' : isTried ? '✕' : String.fromCharCode(65 + i)}
              </span>
              <span className="quiz-choice-text">
                <RichText text={c} />
              </span>
            </button>
          )
        })}
      </div>

      <div role="status" aria-live="polite" ref={feedbackRef} className="quiz-status">
        {!solved && tried.length === 0 && (
          <p className="quiz-prompt">{props.prompt ?? (props.reveals ? 'Pick an answer to reveal the 3D model.' : 'Pick an answer.')}</p>
        )}

        {!solved && tried.length > 0 && (
          <div className="quiz-feedback is-wrong" key={tried.length}>
            <p className="quiz-feedback-title">Not quite. Try another answer.</p>
            <p>
              <RichText text={quiz.hint ?? 'Look at the question again, then pick a different choice.'} />
            </p>
            <button className="btn quiz-reveal" onClick={reveal}>
              Show me the answer
            </button>
          </div>
        )}

        {solved && (
          <div className="quiz-feedback is-right">
            <p className="quiz-feedback-title">
              {result === 'shown' ? 'Here’s the answer' : tried.length === 0 ? '✓ Correct, first try!' : '✓ Correct!'}
            </p>
            <p>
              <RichText text={quiz.explain} />
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
