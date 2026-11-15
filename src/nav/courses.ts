/*
  courses.ts — the site's topics, grouped by the course a student is taking.
  One list feeds the top bar, the phone menu, the home page, and Practice, so they
  always agree. Page addresses (`to`) are the same as they have always been.
*/
import type { IconName } from '../components/Icon'

export interface TopicLink {
  /** Where it goes. May include a lesson, e.g. '/orbitals?lesson=hybridization&step=0'. */
  to: string
  icon: IconName
  /** Friendly name shown to students. */
  title: string
  /** One plain-English line: what you'll get out of it. */
  desc: string
  /** The Practice topic with questions on this (see practice/questions.ts), if any. */
  practice?: string
}

export interface Course {
  id: 'gen' | 'org' | 'bio'
  name: string
  /** One line under the course name on the home page. */
  blurb: string
  topics: TopicLink[]
}

export const COURSES: Course[] = [
  {
    id: 'gen',
    name: 'General Chem',
    blurb: 'Shapes, electrons, and the periodic table.',
    topics: [
      { to: '/shapes', icon: 'shapes', title: 'Molecular shapes', desc: 'Why molecules bend, and how to predict their 3D shape.', practice: 'shapes' },
      { to: '/orbitals', icon: 'orbitals', title: 'Orbitals', desc: 'Where electrons live, shown as 3D clouds.', practice: 'orbitals' },
      { to: '/polarity', icon: 'polarity', title: 'Polarity', desc: 'Which molecules have a + end and a − end, and why.', practice: 'polarity' },
      { to: '/trends', icon: 'trends', title: 'Periodic trends', desc: 'How atoms change in size and pull across the table.', practice: 'trends' },
    ],
  },
  {
    id: 'org',
    name: 'Organic',
    blurb: 'How reactions actually happen.',
    topics: [
      { to: '/reaction', icon: 'reaction', title: 'Reactions', desc: 'Watch bonds break and form, step by step (SN1 and SN2).', practice: 'reactions' },
      // Same Orbitals page, opened at the lesson organic chemistry leans on.
      { to: '/orbitals?lesson=hybridization&step=0', icon: 'orbitals', title: 'Hybridization and bonds', desc: 'sp, sp², sp³, and how single and double bonds form.', practice: 'orbitals' },
    ],
  },
  {
    id: 'bio',
    name: 'Biochem',
    blurb: 'The molecules of life, from real lab data.',
    topics: [
      { to: '/protein', icon: 'protein', title: 'Proteins', desc: 'Build hemoglobin, from one amino acid to four chains.' },
      { to: '/enzymes', icon: 'enzymes', title: 'Enzymes', desc: 'How enzymes grab a molecule and speed up a reaction.', practice: 'enzymes' },
    ],
  },
]

/** The page address without any "?lesson=…" part. */
export const pathOf = (to: string) => to.split('?')[0]

/* Orbitals sits in two courses. Remember which menu the student used (this tab only),
   so "you are here" points at the right one. */
const KEY = 'nav.course'
export function rememberCourse(id: Course['id']) {
  try {
    sessionStorage.setItem(KEY, id)
  } catch {
    /* storage unavailable: fine */
  }
}

/** Which course the current page belongs to (null on Home, Practice, About). */
export function courseFor(pathname: string): Course['id'] | null {
  const matches = COURSES.filter((c) => c.topics.some((t) => pathOf(t.to) === pathname))
  if (!matches.length) return null
  let last: string | null = null
  try {
    last = sessionStorage.getItem(KEY)
  } catch {
    /* ignore */
  }
  return (matches.find((c) => c.id === last) ?? matches[0]).id
}

/** Is this link the page (and course) we're on? */
export function isCurrent(topic: TopicLink, course: Course, pathname: string) {
  return pathOf(topic.to) === pathname && courseFor(pathname) === course.id
}
