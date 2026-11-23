/*
  LewisEditor.tsx — the controls for building a Lewis structure: change the lone pairs (and,
  for odd-electron molecules, an unpaired electron) on the selected atom, or the order of the
  selected bond. Used on the Lewis page and on "build it" practice cards.
*/
import { electronsAround, fmtCharge, formalCharges, type LewisMolecule, type LForm } from './molecules'
import type { Selection } from './LewisDrawing'
import './LewisEditor.css'

export function SelectionEditor(p: { molecule: LewisMolecule; work: LForm; selected: Selection; odd: boolean; onChange: (f: LForm) => void }) {
  const { molecule, work, selected: sel } = p
  if (sel?.kind === 'atom') return <AtomEditor molecule={molecule} work={work} i={sel.i} odd={p.odd} onChange={p.onChange} />
  if (sel?.kind === 'bond') {
    const [a, b] = molecule.links[sel.i]
    return (
      <div className="lewis-edit" role="group" aria-label={`Bond between ${molecule.atoms[a].el} and ${molecule.atoms[b].el}`}>
        <span className="lewis-edit-name">
          {molecule.atoms[a].el}–{molecule.atoms[b].el}
        </span>
        <div className="segmented" role="radiogroup" aria-label="Bond order">
          {['Single', 'Double', 'Triple'].map((name, k) => (
            <button
              key={name}
              role="radio"
              aria-checked={work.bonds[sel.i] === k + 1}
              className={`segmented-btn ${work.bonds[sel.i] === k + 1 ? 'is-active' : ''}`}
              onClick={() => p.onChange({ ...work, bonds: work.bonds.map((x, j) => (j === sel.i ? k + 1 : x)) })}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    )
  }
  return <p className="lewis-edit-hint">Select an atom or a bond in the drawing.</p>
}

/** Lone pairs (and, for odd-electron molecules, an unpaired electron) on one atom. */
function AtomEditor({ molecule: m, work, i, odd, onChange }: { molecule: LewisMolecule; work: LForm; i: number; odd: boolean; onChange: (f: LForm) => void }) {
  const el = m.atoms[i].el
  const lone = work.lone[i]
  const single = work.single?.[i] ?? 0
  const setLone = (n: number) => onChange({ ...work, lone: work.lone.map((x, j) => (j === i ? n : x)) })
  const around = electronsAround(m, work)[i]
  const fc = formalCharges(m, work)[i]
  return (
    <div className="lewis-edit" role="group" aria-label={`${el} atom`}>
      <span className="lewis-edit-name">{el}</span>
      <div className="stepper" role="group" aria-label="Lone pairs">
        <button className="stepper-btn" onClick={() => setLone(lone - 1)} disabled={lone <= 0} aria-label={`Fewer lone pairs on ${el}`}>
          −
        </button>
        <span className="stepper-value mono" aria-live="polite">
          {lone}
        </span>
        <button className="stepper-btn" onClick={() => setLone(lone + 1)} disabled={lone >= 4} aria-label={`More lone pairs on ${el}`}>
          +
        </button>
        <span className="lewis-edit-unit">lone pair{lone === 1 ? '' : 's'}</span>
      </div>
      {odd && (
        <button
          className={`tool-btn ${single ? 'is-on' : ''}`}
          aria-pressed={!!single}
          onClick={() => onChange({ ...work, single: m.atoms.map((_, j) => (j === i ? (single ? 0 : 1) : (work.single?.[j] ?? 0))) })}
        >
          Unpaired e⁻
        </button>
      )}
      <span className="lewis-edit-info">
        {around} around · FC {fmtCharge(fc)}
      </span>
    </div>
  )
}
