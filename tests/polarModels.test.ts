import { describe, expect, it } from 'vitest'
import { bondDipoles, electronegativity, length, netDipole, partialCharges } from '../src/polarity/molecules'
import { polarModel, SHAPE_POLARITY } from '../src/practice/polarModels'
import { SKILLS, fromId } from '../src/practice/questions'

describe('dipole models for polarity cards', () => {
  it('every polarity card shows the bond-dipole model', () => {
    for (const k of Object.keys(SKILLS).filter((k) => SKILLS[k].topic === 'polarity'))
      for (let i = 0; i < 40; i++) {
        const q = fromId(SKILLS[k].random())!
        expect(q.visual.kind, q.id).toBe('polarity')
        if (q.visual.kind === 'polarity') expect(() => polarModel(q.visual.id)).not.toThrow()
      }
  })

  it('one bond: the arrow points at the more electronegative atom, which is δ−', () => {
    for (const b of ['S-O', 'C-Cl', 'B-F', 'C-H', 'N-H']) {
      const m = polarModel(`bond:${b}`)
      const [d] = bondDipoles(m)
      const neg = electronegativity(m.atoms[0].el) > electronegativity(m.atoms[1].el) ? 0 : 1
      expect(d.to).toBe(neg)
      expect(partialCharges(m)[neg]).toBe('−')
    }
  })

  it('two bonds: the more polar bond gets the longer arrow', () => {
    const m = polarModel('bonds:C-Cl:B-F')
    const [a, b] = bondDipoles(m)
    expect(length(b.vector)).toBeGreaterThan(length(a.vector))
  })

  it('shapes: the arrows add to zero exactly when the molecule is nonpolar (ozone excepted)', () => {
    for (const [id, p] of Object.entries(SHAPE_POLARITY)) {
      if (id === 'o3') continue
      const net = length(netDipole(polarModel(`shape:${id}`)))
      if (p.polar) expect(net, id).toBeGreaterThan(0.05)
      else expect(net, id).toBeLessThan(0.02)
    }
  })
})
