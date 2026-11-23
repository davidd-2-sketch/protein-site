/* util.ts — small helpers shared by the practice question generators. */

export const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

export const shuffle = <T>(list: readonly T[]) => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Shuffle choices; return them with the new index of the correct one. */
export function withChoices(correct: string, wrong: string[]) {
  const choices = shuffle([correct, ...[...new Set(wrong)].filter((w) => w !== correct)])
  return { choices, answer: choices.indexOf(correct) }
}

/** Up to `n` wrong answers, picked at random from a pool (never the correct one). */
export const someWrong = (correct: string, pool: string[], n = 3) => shuffle([...new Set(pool)].filter((x) => x !== correct)).slice(0, n)

/** All k-element subsets of a list (small lists only). */
export function subsets<T>(list: readonly T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (list.length < k) return []
  const [first, ...rest] = list
  return [...subsets(rest, k - 1).map((s) => [first, ...s]), ...subsets(rest, k)]
}
