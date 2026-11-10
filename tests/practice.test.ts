/* practice.test.ts — every generated practice question must be answerable and correct. */
import { describe, expect, it } from 'vitest'
import { buildRound, fromId, randomId, TOPICS, type Topic } from '../src/practice/questions'
import { byZ } from '../src/trends/elements'
import { configuration, sn2Atoms } from '../src/reactions/sn2Geometry'

const topics = TOPICS.map((t) => t.id)

describe('Generated questions', () => {
  it('are well-formed for thousands of random draws', () => {
    for (let i = 0; i < 3000; i++) {
      const topic = topics[i % topics.length] as Topic
      const q = fromId(randomId(topic))!
      expect(q, 'rebuilt from its ID').not.toBeNull()
      expect(q.topic).toBe(topic)
      expect(q.choices.length).toBeGreaterThanOrEqual(2)
      expect(new Set(q.choices).size, `${q.id} has duplicate choices`).toBe(q.choices.length)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThan(q.choices.length)
      // Rebuilding from the ID gives the same correct answer (needed for reviewing missed ones).
      const again = fromId(q.id)!
      expect(again.choices[again.answer]).toBe(q.choices[q.answer])
    }
  })

  it('element comparisons always match the data', () => {
    for (let i = 0; i < 500; i++) {
      const q = fromId(randomId('trends'))!
      const [, prop, a, b] = q.id.split(':')
      const A = byZ(Number(a))
      const B = byZ(Number(b))
      const key = prop as 'radius' | 'ie' | 'en'
      const winner = A.values[key]! > B.values[key]! ? A : B
      expect(q.choices[q.answer].startsWith(`${winner.symbol} `)).toBe(true)
      // Pairs are always in the same row or the same column.
      expect(A.period === B.period || A.group === B.group).toBe(true)
    }
  })

  it('R/S questions match the 3D geometry', () => {
    for (const s of ['0.02', '0.98']) {
      const q = fromId(`sn2config:${s}`)!
      expect(q.choices[q.answer]).toBe(`(${configuration(sn2Atoms(Number(s)))})`)
    }
  })

  // Choices are shuffled each time a question is built, so build once and read from that copy.
  const correct = (id: string) => {
    const q = fromId(id)!
    return q.choices[q.answer]
  }

  it('node-count answers equal n − 1', () => {
    expect(correct('nodes:1s')).toBe('0')
    expect(correct('nodes:3s')).toBe('2')
    expect(correct('nodes:3pz')).toBe('2')
  })

  it('shape names are correct for classic cases', () => {
    const name = correct
    expect(name('shape:3:1')).toBe('Trigonal pyramidal')
    expect(name('shape:4:1')).toBe('Seesaw')
    expect(name('shape:4:2')).toBe('Square planar')
    expect(name('lone:2:2')).toBe('2')
  })

  it('rejects malformed IDs instead of crashing', () => {
    expect(fromId('nonsense')).toBeNull()
    expect(fromId('orb:9zz')).toBeNull()
  })
})

describe('Rounds', () => {
  it('have 10 different questions from the chosen topics, with missed ones included', () => {
    const missed = { 'shape:3:1': { topic: 'shapes' as Topic, misses: 2 }, 'orb:2px': { topic: 'orbitals' as Topic, misses: 1 } }
    for (let i = 0; i < 50; i++) {
      const round = buildRound(['shapes', 'trends'], missed)
      expect(round).toHaveLength(10)
      expect(new Set(round.map((q) => q.id)).size).toBe(10)
      for (const q of round) expect(['shapes', 'trends']).toContain(q.topic)
      expect(round.map((q) => q.id)).toContain('shape:3:1') // reviewed
      expect(round.map((q) => q.id)).not.toContain('orb:2px') // topic not chosen
    }
  })
})
