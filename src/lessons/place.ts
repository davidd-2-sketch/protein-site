/*
  place.ts — remembers the last lesson step a student opened, so the home page and the
  progress page can offer "Continue where you left off". Also reads lesson links like
  /shapes?lesson=lone-pairs&step=2 so that button can open the exact step.
*/
import { getItem, setItem } from './progress'

/** Each module: its page address and its name as shown to students. */
export const MODULES = {
  protein: { path: '/protein', name: 'Proteins' },
  vsepr: { path: '/shapes', name: 'Shapes' },
  orbitals: { path: '/orbitals', name: 'Orbitals' },
  trends: { path: '/trends', name: 'Trends' },
  enzymes: { path: '/enzymes', name: 'Enzymes' },
} as const
export type ModuleKey = keyof typeof MODULES

export interface Place {
  module: ModuleKey
  lessonId: string
  lessonTitle: string
  step: number
  steps: number
}

export function rememberPlace(p: Place) {
  const prev = getItem<Place | null>('ps.last', null)
  if (prev && prev.module === p.module && prev.lessonId === p.lessonId && prev.step === p.step) return
  setItem('ps.last', p)
}

export const lastPlace = () => getItem<Place | null>('ps.last', null)

/** The link that reopens a place. */
export const placeLink = (p: Place) => `${MODULES[p.module].path}?lesson=${encodeURIComponent(p.lessonId)}&step=${p.step}`

/**
 * If the page was opened from a lesson link, return that lesson and step (once), and
 * tidy the address bar so a reload doesn't keep jumping back to it.
 */
export function readLessonLink(lessonIds: string[]): { lessonId: string; step: number } | null {
  const q = new URLSearchParams(window.location.search)
  const lessonId = q.get('lesson')
  if (!lessonId || !lessonIds.includes(lessonId)) return null
  window.history.replaceState(null, '', window.location.pathname)
  return { lessonId, step: Math.max(0, Number(q.get('step')) || 0) }
}
