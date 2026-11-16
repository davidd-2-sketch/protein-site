/*
  peek.ts — what the collapsed bottom sheet shows on phones (see TopicLayout):
  the current lesson step and a Next button, or just the page's name.
*/
import type { Peek } from '../components/TopicLayout'

interface LessonState {
  lesson: { steps: { title: string }[] } | null
  step: { title: string } | null
  stepIndex: number
}

export function lessonPeek(L: LessonState, pageName: string, goTo: (i: number) => void): Peek {
  if (!L.lesson || !L.step) return { title: pageName }
  const n = L.lesson.steps.length
  const i = L.stepIndex
  return {
    kicker: `Step ${i + 1} of ${n}`,
    title: L.step.title,
    action: i < n - 1 ? { label: 'Next', onClick: () => goTo(i + 1) } : undefined,
  }
}
