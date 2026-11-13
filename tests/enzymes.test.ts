/*
  enzymes.test.ts — the Enzymes module's facts, checked against the real PDB files and the
  standard equations: active-site residue numbers and names, the triad's hydrogen bonds,
  the transition-state mimic in the oxyanion hole, glucokinase closing around glucose,
  inhibitor effects on Vmax/Km, and the energy diagram (ΔG unchanged, Eₐ lower).
*/
import { describe, expect, it } from 'vitest'
import { activation, CATALYZED, catalyzedEnergy, deltaG, UNCATALYZED, uncatalyzedEnergy } from '../src/enzymes/energy'
import { apparent, DEMO, lineweaverBurk, rate, velocity, type Inhibition } from '../src/enzymes/kinetics'
import { CHYMO_ALIGN, CHYMO_SITE, GK_ALIGN, GK_GLUCOSE_SITE, GK_OPEN_MISSING, GK_POCKET_SIDES, STRUCTURES } from '../src/enzymes/structures'
import { dist, find, readAtoms } from './cif'

const chymoTS = readAtoms('6cha.cif')
const chymoFree = readAtoms('4cha.cif')
const gkClosed = readAtoms('1v4s.cif')
const gkOpen = readAtoms('1v4t.cif')
const residueName = (atoms: typeof chymoTS, chain: string, seq: number) => atoms.find((a) => a.chain === chain && a.seq === seq && a.record === 'ATOM')?.comp

describe('chymotrypsin active site (6CHA and 4CHA)', () => {
  it('every residue the lessons name is that amino acid in both files', () => {
    for (const r of CHYMO_SITE) {
      expect(residueName(chymoTS, r.chain, r.seq), `${r.chain}:${r.seq}`).toBe(r.comp)
      expect(residueName(chymoFree, r.chain, r.seq), `${r.chain}:${r.seq}`).toBe(r.comp)
    }
  })
  it('the catalytic triad is Ser195, His57, Asp102', () => {
    expect(CHYMO_SITE.filter((r) => r.group === 'triad').map((r) => `${r.comp}${r.seq}`).sort()).toEqual(['ASP102', 'HIS57', 'SER195'])
  })
  it('the triad is linked by hydrogen bonds (2.5–3.2 Å) in both structures', () => {
    for (const atoms of [chymoTS, chymoFree]) {
      expect(dist(find(atoms, 'B', 57, 'NE2'), find(atoms, 'C', 195, 'OG'))).toBeGreaterThan(2.5)
      expect(dist(find(atoms, 'B', 57, 'NE2'), find(atoms, 'C', 195, 'OG'))).toBeLessThan(3.2)
      const asp = Math.min(dist(find(atoms, 'B', 102, 'OD1'), find(atoms, 'B', 57, 'ND1')), dist(find(atoms, 'B', 102, 'OD2'), find(atoms, 'B', 57, 'ND1')))
      expect(asp).toBeGreaterThan(2.5)
      expect(asp).toBeLessThan(3.2)
    }
  })
  it('the transition-state mimic is attached to Ser195 and an oxygen sits in the oxyanion hole', () => {
    const pba = chymoTS.filter((a) => a.comp === 'PBA' && a.chain === 'C')
    const boron = pba.find((a) => a.element === 'B')!
    expect(dist(boron, find(chymoTS, 'C', 195, 'OG'))).toBeLessThan(2.0)
    const oxygens = pba.filter((a) => a.element === 'O')
    const toGly193 = Math.min(...oxygens.map((o) => dist(o, find(chymoTS, 'C', 193, 'N'))))
    const toSer195 = Math.min(...oxygens.map((o) => dist(o, find(chymoTS, 'C', 195, 'N'))))
    expect(toGly193).toBeLessThan(3.3)
    expect(toSer195).toBeLessThan(3.3)
  })
  it('the mimic’s ring sits in the S1 pocket next to the pocket residues', () => {
    const ring = chymoTS.filter((a) => a.comp === 'PBA' && a.chain === 'C' && a.element === 'C')
    for (const r of CHYMO_SITE.filter((x) => x.group === 'pocket')) {
      const near = Math.min(...chymoTS.filter((a) => a.chain === r.chain && a.seq === r.seq).flatMap((a) => ring.map((c) => dist(a, c))))
      expect(near, `${r.comp}${r.seq}`).toBeLessThan(5)
    }
  })
  it('the empty enzyme has nothing bound; the mimic is only in 6CHA', () => {
    expect(chymoFree.some((a) => a.record === 'HETATM' && a.comp !== 'HOH')).toBe(false)
    expect(Object.keys(STRUCTURES['chymo-ts'].ligands)).toEqual(['PBA'])
  })
})

describe('glucokinase induced fit (1V4S closed, 1V4T open)', () => {
  const glc = gkClosed.filter((a) => a.comp === 'GLC')
  it('the closed form holds glucose and the activator; the open form holds neither', () => {
    expect(glc.length).toBe(12)
    expect(gkClosed.some((a) => a.comp === 'MRK')).toBe(true)
    expect(gkOpen.some((a) => a.comp === 'GLC' || a.comp === 'MRK')).toBe(false)
  })
  it('the listed residues are exactly those hydrogen-bonding glucose (N/O within 3.3 Å of a glucose O)', () => {
    const glcO = glc.filter((a) => a.element === 'O')
    const bonded = new Set(
      gkClosed.filter((a) => a.record === 'ATOM' && (a.element === 'N' || a.element === 'O') && glcO.some((o) => dist(a, o) < 3.3)).map((a) => a.seq),
    )
    expect([...bonded].sort((a, b) => a - b)).toEqual(GK_GLUCOSE_SITE.map((r) => r.seq).sort((a, b) => a - b))
    for (const r of GK_GLUCOSE_SITE) expect(residueName(gkClosed, 'A', r.seq), `${r.seq}`).toBe(r.comp)
  })
  it('the loop with Thr168 and Lys169 is missing (disordered) in the open form', () => {
    for (let s = GK_OPEN_MISSING.from; s <= GK_OPEN_MISSING.to; s++) expect(residueName(gkOpen, 'A', s), `${s}`).toBeUndefined()
    expect(residueName(gkOpen, 'A', GK_OPEN_MISSING.from - 1)).toBeDefined()
    expect(residueName(gkOpen, 'A', GK_OPEN_MISSING.to + 1)).toBeDefined()
  })
  it('the pocket closes: its two sides are ~28 Å apart when open and ~6 Å when closed', () => {
    const center = (atoms: typeof gkClosed, ids: number[]) => {
      const p = ids.map((s) => find(atoms, 'A', s, 'CA').xyz)
      return [0, 1, 2].map((k) => p.reduce((t, q) => t + q[k], 0) / p.length)
    }
    const gap = (atoms: typeof gkClosed) => {
      const a = center(atoms, GK_POCKET_SIDES.lid)
      const b = center(atoms, GK_POCKET_SIDES.base)
      return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
    }
    expect(gap(gkOpen)).toBeGreaterThan(25)
    expect(gap(gkClosed)).toBeLessThan(8)
    // The glucose-binding side itself keeps its shape (what moves is the lid).
    expect(GK_POCKET_SIDES.base).toEqual(GK_GLUCOSE_SITE.map((r) => r.seq).filter((s) => s < GK_OPEN_MISSING.from || s > GK_OPEN_MISSING.to))
  })
})

describe('chymotrypsin barely changes shape when the mimic binds (lock-and-key-like)', () => {
  const m = CHYMO_ALIGN.freeToBound
  const apply = (p: [number, number, number]) => [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r])
  const ca = (atoms: typeof chymoTS) =>
    new Map(atoms.filter((a) => a.record === 'ATOM' && a.atom === 'CA' && ['A', 'B', 'C'].includes(a.chain)).map((a) => [`${a.chain}:${a.seq}`, a.xyz]))
  const bound = ca(chymoTS)
  const free = ca(chymoFree)
  const moved = (k: string) => {
    const p = apply(free.get(k)!)
    const q = bound.get(k)!
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
  }
  it('the whole enzyme matches to within 0.5 Å RMSD after lining up', () => {
    const keys = [...bound.keys()].filter((k) => free.has(k))
    expect(keys.length).toBeGreaterThan(220)
    expect(Math.sqrt(keys.reduce((t, k) => t + moved(k) ** 2, 0) / keys.length)).toBeLessThan(0.5)
  })
  it('no active-site or pocket residue moves more than 1 Å', () => {
    for (const r of CHYMO_SITE) expect(moved(`${r.chain}:${r.seq}`), `${r.comp}${r.seq}`).toBeLessThan(1)
  })
})

describe('glucokinase alignment used by the viewer', () => {
  const m = GK_ALIGN.openToClosed
  const apply = (p: [number, number, number]) => [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r])
  const ca = (atoms: typeof gkClosed) => new Map(atoms.filter((a) => a.record === 'ATOM' && a.atom === 'CA').map((a) => [a.seq, a.xyz]))
  const closed = ca(gkClosed)
  const open = ca(gkOpen)
  const moved = (s: number) => {
    const p = apply(open.get(s)!)
    const q = closed.get(s)!
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
  }
  it('lines up the rigid core to within 1 Å (RMSD)', () => {
    const core = [...open.keys()].filter((s) => GK_ALIGN.core.some(([a, b]) => s >= a && s <= b))
    expect(core.length).toBeGreaterThan(250)
    const rmsd = Math.sqrt(core.reduce((t, s) => t + moved(s) ** 2, 0) / core.length)
    expect(rmsd).toBeLessThan(1)
  })
  it('the glucose-pocket lid really moves (more than 10 Å) once the core is lined up', () => {
    for (const s of GK_POCKET_SIDES.lid) expect(moved(s), `${s}`).toBeGreaterThan(10)
    for (const s of GK_POCKET_SIDES.base) expect(moved(s), `${s}`).toBeLessThan(2.5)
  })
})

describe('Michaelis–Menten kinetics and inhibition', () => {
  const S = [0.1, 0.5, 1, 2, 5, 10, 50]
  it('v = Vmax/2 when [S] = Km, and v approaches Vmax at high [S]', () => {
    expect(rate(DEMO.km, DEMO.vmax, DEMO.km)).toBeCloseTo(DEMO.vmax / 2)
    expect(rate(1e6, DEMO.vmax, DEMO.km)).toBeGreaterThan(0.999 * DEMO.vmax)
  })
  it('with no inhibitor, every type gives the plain rate', () => {
    for (const t of ['competitive', 'noncompetitive', 'uncompetitive'] as Inhibition[]) for (const s of S) expect(velocity(t, DEMO, s, 0)).toBeCloseTo(rate(s, DEMO.vmax, DEMO.km))
  })
  it('the apparent Vmax/Km reproduce the full rate equations', () => {
    for (const t of ['competitive', 'noncompetitive', 'uncompetitive'] as Inhibition[])
      for (const i of [0.5, 2, 5]) {
        const a = apparent(t, DEMO, i)
        for (const s of S) expect(velocity(t, DEMO, s, i)).toBeCloseTo(rate(s, a.vmax, a.km), 9)
      }
  })
  it('competitive: Km goes up, Vmax unchanged', () => {
    const a = apparent('competitive', DEMO, 2)
    expect(a.vmax).toBe(DEMO.vmax)
    expect(a.km).toBeGreaterThan(DEMO.km)
  })
  it('noncompetitive: Vmax goes down, Km unchanged', () => {
    const a = apparent('noncompetitive', DEMO, 2)
    expect(a.km).toBe(DEMO.km)
    expect(a.vmax).toBeLessThan(DEMO.vmax)
  })
  it('uncompetitive: Vmax and Km both go down by the same factor', () => {
    const a = apparent('uncompetitive', DEMO, 2)
    expect(a.vmax).toBeLessThan(DEMO.vmax)
    expect(a.km).toBeLessThan(DEMO.km)
    expect(a.km / a.vmax).toBeCloseTo(DEMO.km / DEMO.vmax)
  })
  it('Lineweaver–Burk: competitive shares the y-intercept, noncompetitive the x-intercept, uncompetitive the slope', () => {
    const base = lineweaverBurk(DEMO.vmax, DEMO.km)
    const lb = (t: Inhibition) => {
      const a = apparent(t, DEMO, 3)
      return lineweaverBurk(a.vmax, a.km)
    }
    expect(lb('competitive').yIntercept).toBeCloseTo(base.yIntercept)
    expect(lb('competitive').slope).toBeGreaterThan(base.slope)
    expect(lb('noncompetitive').xIntercept).toBeCloseTo(base.xIntercept)
    expect(lb('noncompetitive').yIntercept).toBeGreaterThan(base.yIntercept)
    expect(lb('uncompetitive').slope).toBeCloseTo(base.slope)
    expect(lb('uncompetitive').yIntercept).toBeGreaterThan(base.yIntercept)
  })
  it('more inhibitor always means a slower (or equal) rate', () => {
    for (const t of ['competitive', 'noncompetitive', 'uncompetitive'] as Inhibition[])
      for (const s of S) expect(velocity(t, DEMO, s, 4)).toBeLessThan(velocity(t, DEMO, s, 1))
  })
})

describe('energy diagram (schematic): enzymes lower Eₐ but do not change ΔG', () => {
  it('ΔG is identical with and without the enzyme, and the reaction is downhill', () => {
    expect(deltaG(CATALYZED)).toBeCloseTo(deltaG(UNCATALYZED))
    expect(deltaG(UNCATALYZED)).toBeLessThan(0)
    expect(catalyzedEnergy(1)).toBeCloseTo(uncatalyzedEnergy(1))
  })
  it('the highest barrier is much lower with the enzyme', () => {
    expect(activation(CATALYZED)).toBeLessThan(activation(UNCATALYZED) * 0.6)
    let maxCat = -Infinity
    let maxUn = -Infinity
    for (let k = 0; k <= 200; k++) {
      maxCat = Math.max(maxCat, catalyzedEnergy(k / 200))
      maxUn = Math.max(maxUn, uncatalyzedEnergy(k / 200))
    }
    expect(maxCat).toBeLessThan(maxUn)
  })
  it('the ES complex is a valley (an intermediate) below the starting energy', () => {
    expect(catalyzedEnergy(0.24)).toBeLessThan(0)
    expect(catalyzedEnergy(0.24)).toBeLessThan(catalyzedEnergy(0.1))
  })
})

/* ---------- the lessons and views only point at atoms that exist ---------- */
import { ENZYME_LESSONS, type EnzymeLessonView } from '../src/enzymes/lessons'
import { VIEWS } from '../src/enzymes/views'
import { GLOSSARY } from '../src/lessons/glossary'

describe('enzyme lessons and 3D views', () => {
  const files: Record<string, typeof chymoTS> = { 'chymo-ts': chymoTS, 'chymo-free': chymoFree, 'gk-closed': gkClosed, 'gk-open': gkOpen }
  const hasAtom = (s: string, a: { chain: string; seq: number; atom: string }) => files[s].some((x) => x.chain === a.chain && x.seq === a.seq && x.atom === a.atom)
  const hasResidue = (s: string, r: { chain: string; seq: number }) => files[s].some((x) => x.chain === r.chain && x.seq === r.seq)
  const atomsOf = (labels: { at: unknown }[]) => labels.map((l) => l.at as { chain: string; seq: number; atom: string })

  it('every default label sits on a real atom of its structure', () => {
    for (const [id, v] of Object.entries(VIEWS)) for (const a of atomsOf(v.labels)) expect(hasAtom(id, a), `${id} ${a.chain}:${a.seq}:${a.atom}`).toBe(true)
  })
  it('every highlighted and framed residue exists in its structure', () => {
    for (const [id, v] of Object.entries(VIEWS)) {
      for (const g of v.groups) for (const r of g.residues) expect(hasResidue(id, r), `${id} ${r.chain}:${r.seq}`).toBe(true)
      for (const r of v.focus) expect(hasResidue(id, r), `${id} focus ${r.chain}:${r.seq}`).toBe(true)
    }
  })
  it('every lesson label, measured line, and camera target exists in the structure that step shows', () => {
    const views: EnzymeLessonView[] = ENZYME_LESSONS.flatMap((l) => l.steps.flatMap((s) => [s.view, ...(s.revealView ? [s.revealView] : [])]))
    for (const v of views) {
      if (v.kind !== 'structure') continue
      for (const a of atomsOf(v.labels ?? [])) expect(hasAtom(v.structure, a), `${v.structure} ${a.chain}:${a.seq}:${a.atom}`).toBe(true)
      for (const ln of v.lines ?? []) for (const a of [ln.from, ln.to]) expect(hasAtom(v.structure, a), `${v.structure} line ${a.chain}:${a.seq}:${a.atom}`).toBe(true)
      if (Array.isArray(v.focus)) for (const r of v.focus) expect(hasResidue(v.structure, r), `${v.structure} focus ${r.chain}:${r.seq}`).toBe(true)
    }
  })
  it('every glossary link in the lessons has a definition, and every quiz answer is a real choice', () => {
    for (const lesson of ENZYME_LESSONS)
      for (const step of lesson.steps) {
        const texts = [...Object.values(step.text), step.quiz?.question ?? '', step.quiz?.explain ?? '']
        for (const t of texts)
          for (const m of t.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
            const key = m[2] ?? m[1]
            expect(GLOSSARY[key], `"${key}" in ${lesson.id}`).toBeDefined()
          }
        if (step.quiz) expect(step.quiz.answer).toBeLessThan(step.quiz.choices.length)
      }
  })
})
