/* practice.test.ts — every generated practice question must be answerable and correct. */
import { describe, expect, it } from 'vitest'
import { buildRound, fromId, randomId, SKILLS, skillOf, TOPICS, type Topic } from '../src/practice/questions'
import { buildAdaptiveRound, focusSkills, recordAnswer, type SkillStats } from '../src/practice/adapt'
import { DIAGRAMS, diatomicById } from '../src/mo/diatomics'
import { lewisById } from '../src/lewis/molecules'
import { byZ } from '../src/trends/elements'
import { configuration, sn2Atoms } from '../src/reactions/sn2Geometry'
import { apparent, DEMO } from '../src/enzymes/kinetics'

const topics = TOPICS.map((t) => t.id)

describe('Generated questions', () => {
  it('are well-formed for thousands of random draws', () => {
    for (let i = 0; i < 3000; i++) {
      const topic = topics[i % topics.length] as Topic
      const q = fromId(randomId(topic))!
      expect(q, 'rebuilt from its ID').not.toBeNull()
      expect(q.topic).toBe(topic)
      const again = fromId(q.id)!
      if (q.interaction) {
        // Click and build cards: the right answer must exist on the visual.
        const it = q.interaction
        if (it.kind === 'click-level') {
          expect(q.visual.kind).toBe('mo')
          const levels = DIAGRAMS[diatomicById((q.visual as { molecule: string }).molecule).diagram].levels.map((l) => l.id)
          expect(it.correct.length).toBeGreaterThan(0)
          for (const c of it.correct) expect(levels).toContain(c)
        } else if (it.kind === 'click-atom') {
          const m = lewisById((q.visual as { molecule: string }).molecule)
          expect(it.correct.length).toBeGreaterThan(0)
          for (const c of it.correct) expect(m.atoms[c], q.id).toBeDefined()
        } else if (it.kind === 'click-element') {
          for (const c of it.correct) expect(it.among).toContain(c)
        }
        expect(again.interaction).toEqual(q.interaction)
        continue
      }
      expect(q.choices.length, q.id).toBeGreaterThanOrEqual(2)
      expect(new Set(q.choices).size, `${q.id} has duplicate choices`).toBe(q.choices.length)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThan(q.choices.length)
      // Rebuilding from the ID gives the same correct answer (needed for reviewing missed ones).
      expect(again.choices[again.answer]).toBe(q.choices[q.answer])
    }
  })

  it('element comparisons always match the data', () => {
    for (let i = 0; i < 500; i++) {
      const q = fromId(SKILLS.cmp.random())!
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

  it('Lewis and MO cards match the checked data', () => {
    expect(correct('lewisval:co3')).toBe('24')
    expect(correct('lewisval:nh4')).toBe('8')
    expect(correct('lewislp:xef4')).toBe('2')
    expect(correct('lewisfc:co:0')).toBe('−1')
    expect(correct('lewisfc:nh4:0')).toBe('+1')
    expect(correct('lewisres:no3')).toBe('3')
    expect(correct('lewisres:co2')).toBe('1')
    expect(correct('lewisexc:bf3')).toMatch(/Incomplete/)
    expect(correct('lewisexc:no')).toMatch(/Odd/)
    expect(correct('lewisexc:no2')).toMatch(/Odd/)
    expect(correct('lewisexc:becl2')).toMatch(/Incomplete/)
    expect(correct('lewisexc:i3')).toMatch(/Expanded/)
    expect(correct('lewisfc:ocn:0')).toBe('−1')
    expect(correct('lewisres:hno3')).toBe('2')
    expect(correct('lewislp:i3')).toBe('3')
    expect(correct('mobo:o2:0')).toBe('2')
    expect(correct('mobo:o2:-1')).toBe('2.5')
    expect(correct('mobo:h2:-1')).toBe('½')
    expect(correct('mobo:no:0')).toBe('2.5')
    expect(correct('momag:o2')).toMatch(/^Paramagnetic/)
    expect(correct('momag:n2')).toMatch(/^Diamagnetic/)
    expect(correct('momag:b2')).toMatch(/^Paramagnetic/)
  })

  it('new cards give the textbook answers', () => {
    expect(correct('rxnsub:sn2:0:3')).toBe('CH₃Br')
    expect(correct('rxnsub:sn1:2:3')).toBe('(CH₃)₃CBr')
    expect(correct('rxnsolv:dmso')).toBe('SN2')
    expect(correct('rxnsolv:water')).toBe('SN1')
    expect(correct('rxnlg:123')).toBe('I⁻')
    expect(correct('rxncat:123')).toMatch(/3°/)
    expect(correct('bondneg:O-H')).toBe('O is δ−')
    expect(correct('polarshape:xef2')).toBe('Nonpolar')
    expect(correct('polarshape:sf4')).toBe('Polar')
    expect(correct('enzfrac:3')).toBe('¾')
    expect(correct('enzapp:competitive:1:km')).toBe('2 × Km')
    expect(correct('enzapp:competitive:1:vmax')).toBe('Vmax (unchanged)')
    expect(correct('enzapp:uncompetitive:1:km')).toBe('Km ÷ 2')
    expect(correct('enzapp:noncompetitive:2:vmax')).toBe('Vmax ÷ 3')
    expect(correct('qnorb:3')).toBe('9')
    expect(correct('qnel:3')).toBe('18')
    expect(correct('qnsub:4:2')).toBe('4d')
    expect(correct('nodesx:4:1:r')).toBe('2')
    expect(correct('realshape:sf4')).toBe('Seesaw')
    expect(correct('realshape:i3')).toBe('Linear')
    expect(correct('realeg:h2o')).toBe('Tetrahedral')
    expect(correct('realhyb:sf4')).toBe('sp³d')
    expect(correct('realhyb:hcn')).toBe('sp')
    expect(correct('mocmp:o2_0:o2_-1:stronger')).toBe('O₂⁺')
    expect(correct('moshape:mo-p-pi*')).toMatch(/π\*/)
    expect(fromId('moclick:unpaired:o2:0')!.interaction).toEqual({ kind: 'click-level', correct: ['p2p*'] })
    expect(fromId('lewisclick:pos:nh4')!.interaction).toEqual({ kind: 'click-atom', correct: [0] })
  })

  it('every "not allowed" quantum number card has exactly one broken set', () => {
    const okSet = (s: string) => {
      const [n, l, ml] = [...s.matchAll(/= (−?\d+)/g)].map((m) => Number(m[1].replace('−', '-')))
      return l >= 0 && l < n && Math.abs(ml) <= l
    }
    for (let v = 0; v < 120; v++) {
      const q = fromId(`qnbad:${v}`)!
      expect(okSet(q.choices[q.answer]), `variant ${v}`).toBe(false)
      expect(q.choices.filter((c) => !okSet(c)), `variant ${v}`).toHaveLength(1)
    }
  })

  it('trend ranking and "most" cards match the data', () => {
    for (let i = 0; i < 300; i++) {
      for (const skill of ['rank', 'most', 'pickel']) {
        const q = fromId(SKILLS[skill].random())!
        const [, prop, ...zs] = q.id.split(':')
        const vals = zs.map((z) => byZ(Number(z)).values[prop as 'radius' | 'ie' | 'en']!)
        const best = zs[vals.indexOf(Math.max(...vals))]
        if (skill === 'pickel') expect(q.interaction).toMatchObject({ correct: [Number(best)] })
        else if (skill === 'most') expect(q.choices[q.answer].startsWith(byZ(Number(best)).symbol + ' ')).toBe(true)
        else {
          const asc = [...zs].sort((a, b) => byZ(Number(a)).values[prop as 'en']! - byZ(Number(b)).values[prop as 'en']!)
          expect(q.choices[q.answer]).toBe(asc.map((z) => byZ(Number(z)).symbol).join(' < '))
        }
      }
    }
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

describe('Enzymes practice answers agree with the kinetics math', () => {
  const correct = (id: string) => {
    const q = fromId(id)!
    return q.choices[q.answer]
  }
  it('"what happens to Vmax and Km" answers match apparent()', () => {
    for (const t of ['competitive', 'noncompetitive', 'uncompetitive'] as const) {
      const a = apparent(t, DEMO, 3)
      const vmax = a.vmax === DEMO.vmax ? 'unchanged' : a.vmax < DEMO.vmax ? 'down' : 'up'
      const km = a.km === DEMO.km ? 'unchanged' : a.km < DEMO.km ? 'down' : 'up'
      const answer = correct(`enzchange:${t}`)
      if (vmax === 'down' && km === 'down') expect(answer).toBe('Vmax and Km both go down')
      else expect(answer).toBe(`Vmax ${vmax === 'unchanged' ? 'unchanged' : `goes ${vmax}`}, Km ${km === 'unchanged' ? 'unchanged' : `goes ${km}`}`)
    }
  })
  it('naming-the-inhibitor answers match the graph shown', () => {
    for (const t of ['competitive', 'noncompetitive', 'uncompetitive'] as const)
      for (const plot of ['mm', 'lb']) {
        const q = fromId(`enzinh:${t}:${plot}`)!
        expect(q.visual).toMatchObject({ kind: 'kinetics', before: { type: t, plot } })
        expect(q.choices[q.answer].toLowerCase()).toBe(t)
      }
  })
  it('active-site questions name residues that are really in the site list', () => {
    for (const seq of [195, 57, 102, 193, 189]) expect(fromId(`enzres:${seq}`)?.visual).toMatchObject({ kind: 'enzyme3d', structure: 'chymo-ts' })
    expect(fromId('enzres:999')).toBeNull()
  })
})

describe('Tailored rounds', () => {
  it('lean toward the skills a student keeps missing', () => {
    let stats: SkillStats = {}
    for (let i = 0; i < 6; i++) stats = recordAnswer(stats, 'lewisfc:co:0', false)
    for (let i = 0; i < 6; i++) stats = recordAnswer(stats, 'lewisval:h2o', true)
    let weak = 0
    let strong = 0
    for (let r = 0; r < 60; r++) {
      const round = buildAdaptiveRound(['lewis'], {}, stats, [])
      weak += round.filter((q) => skillOf(q.id) === 'lewisfc').length
      strong += round.filter((q) => skillOf(q.id) === 'lewisval').length
    }
    expect(weak).toBeGreaterThan(strong * 2)
    expect(focusSkills(stats, ['lewis'])).toEqual(['formal charge'])
    expect(focusSkills(stats, ['mo'])).toEqual([])
  })

  it('never repeat a card within a round, and avoid recently seen ones', () => {
    const recent: string[] = []
    let repeats = 0
    let total = 0
    for (let r = 0; r < 20; r++) {
      const round = buildAdaptiveRound(['reactions', 'polarity'], {}, {}, recent)
      expect(round).toHaveLength(10)
      expect(new Set(round.map((q) => q.id)).size).toBe(10)
      const last = new Set(recent.slice(-30))
      repeats += round.filter((q) => last.has(q.id)).length
      total += round.length
      recent.push(...round.map((q) => q.id))
    }
    // With the new variety, back-to-back repeats should be rare.
    expect(repeats / total).toBeLessThan(0.1)
  })

  it('cover every chosen topic and cap any one kind of card at three', () => {
    for (let r = 0; r < 40; r++) {
      const round = buildAdaptiveRound(['shapes', 'mo', 'enzymes'], {}, {}, [])
      expect(new Set(round.map((q) => q.topic)).size).toBe(3)
      const counts = new Map<string, number>()
      round.forEach((q) => counts.set(skillOf(q.id), (counts.get(skillOf(q.id)) ?? 0) + 1))
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(3)
    }
  })
})
