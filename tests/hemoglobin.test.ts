/* hemoglobin.test.ts — every residue the lessons mention really is that amino acid in 4HHB. */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BY_ONE } from '../src/protein/aminoAcids'
import { CHAINS, KEY_RESIDUES, SEQUENCES } from '../src/protein/hemoglobin'
import { PROTEIN_LESSONS } from '../src/lessons/proteinLessons'

// Read residue identities straight from the PDB file (kept in reference/ for exactly this).
const cif = readFileSync(new URL('../reference/4hhb.cif', import.meta.url), 'utf8')
const residues = new Map<string, string>() // "A:87" -> "HIS"
for (const line of cif.split('\n')) {
  if (!line.startsWith('ATOM')) continue
  const f = line.split(/\s+/)
  if (f[3] === 'CA') residues.set(`${f[18]}:${f[16]}`, f[5])
}

describe('4HHB structure file', () => {
  it('has the expected chain lengths', () => {
    for (const c of Object.values(CHAINS)) {
      const n = [...residues.keys()].filter((k) => k.startsWith(`${c.id}:`)).length
      expect(n).toBe(c.length)
    }
  })
  it('matches the sequences the site displays', () => {
    for (const [type, chain] of [['alpha', 'A'], ['beta', 'B']] as const)
      [...SEQUENCES[type]].forEach((letter, i) => expect(BY_ONE.get(letter)!.three).toBe(residues.get(`${chain}:${i + 1}`)))
  })
  it('has the residue named in every key-residue note', () => {
    const expected: Record<string, string> = {
      'alpha:87': 'HIS', 'beta:92': 'HIS', 'alpha:58': 'HIS', 'beta:63': 'HIS', 'beta:6': 'GLU',
      'beta:1': 'VAL', 'beta:2': 'HIS', 'beta:82': 'LYS', 'beta:143': 'HIS', 'beta:146': 'HIS',
    }
    expect(Object.keys(KEY_RESIDUES).sort()).toEqual(Object.keys(expected).sort())
    for (const [key, comp] of Object.entries(expected)) {
      const [type, seq] = key.split(':')
      expect(residues.get(`${type === 'alpha' ? 'A' : 'B'}:${seq}`)).toBe(comp)
    }
  })
})

describe('Protein lessons', () => {
  it('every labeled atom exists in the structure', () => {
    const atoms = new Set<string>()
    for (const line of cif.split('\n')) {
      if (!line.startsWith('ATOM') && !line.startsWith('HETATM')) continue
      const f = line.split(/\s+/)
      atoms.add(`${f[18]}:${f[16]}:${f[3]}`)
    }
    for (const lesson of PROTEIN_LESSONS)
      for (const step of lesson.steps)
        for (const label of step.labels ?? []) {
          const at = label.at
          const refs = 'between' in at ? at.between : 'chainCenter' in at ? [] : [at]
          for (const r of refs) expect(atoms.has(`${r.chain}:${r.seq}:${r.atom}`), `${label.text}: ${r.chain}${r.seq} ${r.atom}`).toBe(true)
        }
  })
})
