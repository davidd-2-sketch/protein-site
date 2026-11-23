/*
  adapt.ts — tailoring practice to what each student needs.

  For every kind of card ("skill", e.g. formal charge or bond order) we keep one number in the
  student's own browser: how often they have recently missed it on the first try, smoothed so
  recent answers count most. Rounds then lean toward the skills with high numbers, while still
  mixing in everything else and trying skills the student hasn't seen yet.

  Nothing here is ever shown as a score: students only see a plain "this round leans toward…"
  line with skill names. All of it lives in localStorage (ps.practice.skills and
  ps.practice.recent) and is cleared by "Reset my saved data".
*/
import { fromId, SKILLS, skillOf, skillsFor, type Question, type Topic } from './questions'
import { shuffle } from './util'

export interface SkillStat {
  /** Recent miss rate, 0 (always right first try) to 1 (always missed). Smoothed. */
  miss: number
  /** How many cards of this kind have been answered. */
  seen: number
}
export type SkillStats = Record<string, SkillStat>

/** How quickly the estimate follows new answers (0.35 = the last few answers matter most). */
const LEARN = 0.35
/** Starting guess for a skill the student hasn't tried. */
const PRIOR = 0.3

export function recordAnswer(stats: SkillStats, questionId: string, firstTry: boolean): SkillStats {
  const skill = skillOf(questionId)
  const cur = stats[skill] ?? { miss: PRIOR, seen: 0 }
  return { ...stats, [skill]: { miss: cur.miss * (1 - LEARN) + (firstTry ? 0 : 1) * LEARN, seen: cur.seen + 1 } }
}

/** How strongly to lean toward a skill: weak skills ×~3, mastered ones ×~0.4, new ones a bit extra. */
export function skillWeight(stats: SkillStats, skill: string) {
  const s = stats[skill]
  if (!s || s.seen === 0) return 1.2
  return 0.35 + 3 * s.miss
}

/** Skill names worth mentioning in the focus line (struggled with more than once, recently). */
export function focusSkills(stats: SkillStats, topics: Topic[], max = 2): string[] {
  const names = Object.entries(stats)
    .filter(([k, s]) => SKILLS[k] && topics.includes(SKILLS[k].topic) && s.seen >= 2 && s.miss >= 0.45)
    .sort((a, b) => b[1].miss - a[1].miss)
    .map(([k]) => SKILLS[k].name)
  return [...new Set(names)].slice(0, max)
}

/** How many recent card IDs to remember, so they don't come straight back. */
export const RECENT_MAX = 80

/**
 * Build a round:
 *   1. up to 3 cards the student missed before (spaced review), unless seen in the last round;
 *   2. at least one card from each chosen topic (when there's room);
 *   3. the rest leaning toward weak topics and skills,
 * with no card repeated within the round, recently seen cards avoided, and no more than three
 * cards of one kind.
 */
export function buildAdaptiveRound(
  topics: Topic[],
  missed: Record<string, { topic: Topic; misses: number }>,
  stats: SkillStats,
  recent: string[],
  size = 10,
): Question[] {
  const lastRound = new Set(recent.slice(-size))
  const avoid = new Set(recent)
  const ids: string[] = Object.entries(missed)
    .filter(([id, m]) => topics.includes(m.topic) && !lastRound.has(id))
    .sort((a, b) => b[1].misses - a[1].misses)
    .slice(0, 3)
    .map(([id]) => id)
  const perSkill = new Map<string, number>()
  ids.forEach((id) => perSkill.set(skillOf(id), (perSkill.get(skillOf(id)) ?? 0) + 1))

  /** Kinds of card whose variants have all been seen recently: skipped for the rest of this round. */
  const exhausted = new Set<string>()
  const weight = (k: string) => ((perSkill.get(k) ?? 0) >= 3 || exhausted.has(k) ? 0 : skillWeight(stats, k))
  const topicWeight = (t: Topic) => {
    const ks = skillsFor(t)
    return ks.reduce((s, k) => s + SKILLS[k].share * skillWeight(stats, k), 0) / ks.reduce((s, k) => s + SKILLS[k].share, 0)
  }
  const pickTopic = () => {
    const w = topics.map(topicWeight)
    let r = Math.random() * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < topics.length; i++) if ((r -= w[i]) <= 0) return topics[i]
    return topics[topics.length - 1]
  }
  const pickSkill = (t: Topic) => {
    const ks = skillsFor(t)
    const w = ks.map((k) => SKILLS[k].share * weight(k))
    const total = w.reduce((a, b) => a + b, 0)
    if (total === 0) return ks[Math.floor(Math.random() * ks.length)]
    let r = Math.random() * total
    for (let i = 0; i < ks.length; i++) if ((r -= w[i]) <= 0) return ks[i]
    return ks[ks.length - 1]
  }

  const covered = new Set(ids.map((id) => SKILLS[skillOf(id)]?.topic))
  const queue: Topic[] = [...shuffle(topics.filter((t) => !covered.has(t)))]
  let guard = 0
  while (ids.length < size && guard++ < 400) {
    const t = queue.shift() ?? pickTopic()
    const skill = pickSkill(t)
    let id = ''
    let fallback = ''
    // Look for a card that wasn't seen recently. If this kind has none left, switch to another
    // kind; a recently seen card is used only when every kind in the topic has run out.
    for (let tries = 0; tries < 20; tries++) {
      const cand = SKILLS[skill].random()
      if (ids.includes(cand)) continue
      if (!avoid.has(cand)) {
        id = cand
        break
      }
      fallback ||= cand
    }
    if (!id) {
      exhausted.add(skill)
      const anyLeft = skillsFor(t).some((k) => weight(k) > 0)
      if (anyLeft) {
        queue.unshift(t) // try this topic again with another kind of card
        continue
      }
      id = fallback
    }
    if (!id) continue
    ids.push(id)
    perSkill.set(skill, (perSkill.get(skill) ?? 0) + 1)
  }
  return shuffle(ids)
    .map(fromId)
    .filter((q): q is Question => q !== null)
}
