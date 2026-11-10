/*
  useLessons.ts — everything a page needs to run a set of lessons:
  which lesson and step is open, task status, whether a quiz has been answered
  (for "predict, then reveal" steps), and saved progress.

  Usage:
    const L = useLessons(MY_LESSONS, 'vsepr')
    L.step            // the current step (or null when no lesson is open)
    L.open('lesson-id'), L.goTo(2), L.exit()
    L.report(input)   // tell it what the student did; it checks the step's task
*/
import { useCallback, useEffect, useState } from 'react'
import { readLessonLink, rememberPlace, type ModuleKey } from './place'
import { play } from '../sound/sound'
import { useStoredState } from './progress'
import type { TaskStatus } from './LessonPanel'
import type { BaseStep, Lesson } from './types'

export function useLessons<V, P>(lessons: Lesson<BaseStep<V, P>>[], key: ModuleKey) {
  const [completed, setCompleted] = useStoredState<string[]>(`ps.${key}.completed`, [])
  // Opened from a "continue" link? Start at that lesson and step.
  const [link] = useState(() => readLessonLink(lessons.map((l) => l.id)))
  const [lessonId, setLessonId] = useState<string | null>(link?.lessonId ?? null)
  const [stepIndex, setStepIndex] = useState(link?.step ?? 0)
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('waiting')
  const [revealed, setRevealed] = useState(false)

  const lesson = lessons.find((l) => l.id === lessonId) ?? null
  const step = lesson ? (lesson.steps[stepIndex] ?? null) : null

  // Remember this step so the home page can offer "Continue where you left off".
  useEffect(() => {
    if (lesson && step) rememberPlace({ module: key, lessonId: lesson.id, lessonTitle: lesson.title, step: stepIndex, steps: lesson.steps.length })
  }, [key, lesson, step, stepIndex])

  const markDone = useCallback(
    (id: string) => {
      if (!completed.includes(id)) setCompleted([...completed, id])
    },
    [completed, setCompleted],
  )

  const resetStep = () => {
    setTaskStatus('waiting')
    setRevealed(false)
  }

  const open = useCallback(
    (id: string) => {
      if (lesson) markDone(lesson.id)
      setLessonId(id)
      setStepIndex(0)
      resetStep()
    },
    [lesson, markDone],
  )

  const goTo = useCallback((i: number) => {
    setStepIndex(i)
    resetStep()
  }, [])

  const exit = useCallback(() => {
    if (lesson && stepIndex === lesson.steps.length - 1) markDone(lesson.id)
    setLessonId(null)
  }, [lesson, stepIndex, markDone])

  /** Check what the student just did against the step's task (if any). */
  const report = useCallback(
    (input: P) => {
      const task = step?.task
      if (!task || taskStatus === 'correct') return
      const ok = task.check(input)
      play(ok ? 'correct' : 'wrong')
      setTaskStatus(ok ? 'correct' : 'wrong')
    },
    [step, taskStatus],
  )

  return {
    /** True if this page was opened from a lesson link (so the page should show Lessons mode). */
    fromLink: link !== null,
    lessons,
    lesson,
    step,
    stepIndex,
    completed,
    taskStatus,
    /** True once this step's quiz has been answered (so a revealView can be shown). */
    revealed,
    onQuizDone: () => setRevealed(true),
    open,
    goTo,
    exit,
    report,
  }
}
