import { describe, expect, it } from 'vitest'
import { STEREO } from '../src/stereo/molecules'
import { descriptor, neighborsOf, priorities, stereocenters } from '../src/stereo/cip'
import { fromSmiles, vec } from '../src/stereo/smiles'

describe('stereochemistry data', () => {
  for (const m of STEREO) {
    it(`${m.name}: R/S from the 3D model matches PubChem's name (${m.iupac})`, () => {
      for (const c of m.centers) expect(descriptor(m.model, c.atom), c.label).toBe(c.expect)
    })
    it(`${m.name}: finds exactly the listed stereocenters`, () => {
      expect(stereocenters(m.model)).toEqual(m.centers.map((c) => c.atom).sort((a, b) => a - b))
    })
    it(`${m.name}: textbook geometry (bond angles near 109.5° or 120°, no clashes)`, () => {
      const { atoms } = m.model
      atoms.forEach((a, i) => {
        const nb = neighborsOf(m.model, i)
        for (let x = 0; x < nb.length; x++)
          for (let y = x + 1; y < nb.length; y++) {
            const u = vec.norm(vec.sub(atoms[nb[x]].pos, a.pos))
            const v = vec.norm(vec.sub(atoms[nb[y]].pos, a.pos))
            const ang = (Math.acos(vec.dot(u, v)) * 180) / Math.PI
            expect(ang).toBeGreaterThan(105)
            expect(ang).toBeLessThan(125)
          }
      })
      for (let i = 0; i < atoms.length; i++)
        for (let j = i + 1; j < atoms.length; j++) expect(Math.hypot(...vec.sub(atoms[i].pos, atoms[j].pos))).toBeGreaterThan(0.85)
    })
  }

  it('priorities follow the textbook order', () => {
    const els = (id: string, center: number) => {
      const m = STEREO.find((s) => s.id === id)!.model
      return priorities(m, center)!.map((i) => m.atoms[i].el)
    }
    expect(els('cbrclf', 0)).toEqual(['Br', 'Cl', 'F', 'H'])
    expect(els('l-alanine', 1)).toEqual(['N', 'C', 'C', 'H']) // NH₂ > COOH > CH₃ > H
    const ala = STEREO.find((s) => s.id === 'l-alanine')!.model
    const p = priorities(ala, 1)!
    expect(neighborsOf(ala, p[1]).filter((n) => ala.atoms[n].el === 'O').length).toBe(2) // COOH before CH₃
    expect(els('d-glyceraldehyde', 1)).toEqual(['O', 'C', 'C', 'H']) // OH > CHO > CH₂OH > H
  })

  it('mirror images have opposite labels', () => {
    const r = fromSmiles('CC[C@@H](C)O')
    const s = fromSmiles('CC[C@H](C)O')
    expect(descriptor(r, 2)).toBe('R')
    expect(descriptor(s, 2)).toBe('S')
  })
})

import { fischer, groupName } from '../src/stereo/fischer'

describe('Fischer projections', () => {
  const get = (id: string) => STEREO.find((s) => s.id === id)!
  const f = (id: string) => {
    const m = get(id)
    const centers = new Set(m.centers.map((c) => c.atom))
    return fischer(m.model, m.chain!, (a) => centers.has(a))
  }
  it('D-glyceraldehyde: CHO on top, OH on the right (that is what "D" means)', () => {
    const p = f('d-glyceraldehyde')
    expect(p.top).toBe('CHO')
    expect(p.bottom).toBe('CH₂OH')
    expect(p.rows[0]).toMatchObject({ left: 'H', right: 'OH' })
  })
  it('L-alanine: NH₂ on the left; D-alanine: on the right', () => {
    expect(f('l-alanine').rows[0]).toMatchObject({ left: 'NH₂', right: 'H' })
    expect(f('d-alanine').rows[0]).toMatchObject({ left: 'H', right: 'NH₂' })
    expect(f('l-alanine').top).toBe('COOH')
  })
  it('L-threonine: NH₂ left at C2, OH right at C3', () => {
    const p = f('l-threonine')
    expect(p.rows[0]).toMatchObject({ left: 'NH₂', right: 'H' })
    expect(p.rows[1]).toMatchObject({ left: 'H', right: 'OH' })
    expect(p.bottom).toBe('CH₃')
  })
  it('tartaric acid: meso has both OH on one side; the chiral forms have them on opposite sides', () => {
    const side = (id: string) => f(id).rows.map((r) => (r.right === 'OH' ? 'R' : 'L')).join('')
    expect(['RR', 'LL']).toContain(side('meso-tartaric'))
    expect(['RL', 'LR']).toContain(side('l-tartaric'))
    expect(side('d-tartaric')).not.toBe(side('l-tartaric'))
  })
  it('names groups the way textbooks write them', () => {
    const m = get('l-threonine').model
    expect(groupName(m, 2, 3)).toBe('COOH')
    expect(groupName(m, 1, 0)).toBe('CH₃')
    expect(groupName(get('butanol-r').model, 2, 1)).toBe('CH₂CH₃')
  })
})
