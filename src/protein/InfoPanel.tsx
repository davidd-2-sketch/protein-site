/*
  InfoPanel.tsx — the panel that explains whatever the student clicked:
  a residue, a single atom, a heme, the iron, or a bond.
*/
import { BACKBONE_ATOMS, BY_THREE, PLAIN_SIDE_CHAIN, SIDE_CHAIN_LABEL } from './aminoAcids'
import { CHAINS, KEY_RESIDUES, type ChainId as HbChain } from './hemoglobin'
import type { AtomInfo, PickInfo, ResidueRef } from './ProteinViewer'
import { isPeptideBond } from './bonds'

const ELEMENT_NAMES: Record<string, string> = { C: 'Carbon', N: 'Nitrogen', O: 'Oxygen', S: 'Sulfur', FE: 'Iron', Fe: 'Iron' }
const SECONDARY_LABEL = { helix: 'α-helix', sheet: 'β-strand', turn: 'Turn', coil: 'Loop / coil' }

interface Props {
  pick: PickInfo
  onClose: () => void
  onFocus: (r: ResidueRef) => void
}

export default function InfoPanel({ pick, onClose, onFocus }: Props) {
  return (
    <aside className="info-panel panel" aria-live="polite" aria-label="Selection details">
      <button className="info-close" onClick={onClose} aria-label="Close details">
        ×
      </button>
      {pick.kind === 'bond' ? <BondInfo pick={pick} /> : <AtomOrResidueInfo atom={pick.atom} showAtom={pick.granularity === 'atom'} onFocus={onFocus} />}
    </aside>
  )
}

/* ---------- Residue / atom / heme ---------- */

function AtomOrResidueInfo({ atom, showAtom, onFocus }: { atom: AtomInfo; showAtom: boolean; onFocus: (r: ResidueRef) => void }) {
  const chain = CHAINS[atom.chain as HbChain]

  if (atom.comp === 'HEM') {
    const isIron = atom.element.toUpperCase() === 'FE'
    return (
      <>
        <p className="info-kicker">Heme group · {chain.label} chain</p>
        <h2 className="info-title">{isIron ? 'Iron (Fe²⁺)' : 'Heme'}</h2>
        <p className="info-text">
          {isIron
            ? 'The iron at the center of the heme is where O₂ binds. It is held from below by the proximal histidine. In this deoxy structure no O₂ is bound, and the iron sits slightly out of the plane of the ring.'
            : 'A flat ring (protoporphyrin IX) holding a single iron ion at its center. Each heme can carry one O₂ molecule, so hemoglobin, with four hemes, carries up to four.'}
        </p>
        {showAtom && !isIron && <AtomRow atom={atom} />}
        <FocusButton onClick={() => onFocus({ chain: atom.chain, seq: atom.seq })} />
      </>
    )
  }

  const aa = BY_THREE.get(atom.comp)
  const key = KEY_RESIDUES[`${chain.type}:${atom.seq}`]
  const name = aa ? `${aa.name}` : atom.comp

  return (
    <>
      <p className="info-kicker">
        {chain.label} chain · residue {atom.seq} of {chain.length}
      </p>
      <h2 className="info-title">
        {name} <span className="info-code mono">{aa ? `${aa.three[0]}${aa.three.slice(1).toLowerCase()} · ${aa.one}` : ''}</span>
      </h2>

      {aa && <p className="info-plain">{PLAIN_SIDE_CHAIN[aa.sideChain]}</p>}

      <dl className="info-facts">
        {aa && (
          <div>
            <dt>Side chain</dt>
            <dd>{SIDE_CHAIN_LABEL[aa.sideChain]}</dd>
          </div>
        )}
        {atom.secondary && (
          <div>
            <dt>Structure here</dt>
            <dd>{SECONDARY_LABEL[atom.secondary]}</dd>
          </div>
        )}
      </dl>

      {key && (
        <div className="info-callout">
          <p className="info-callout-title">{key.title}</p>
          <p>{key.text}</p>
        </div>
      )}

      {aa?.note && <p className="info-text">{aa.note}</p>}
      {showAtom && <AtomRow atom={atom} />}
      <FocusButton onClick={() => onFocus({ chain: atom.chain, seq: atom.seq })} />
    </>
  )
}

function AtomRow({ atom }: { atom: AtomInfo }) {
  const elementName = ELEMENT_NAMES[atom.element] ?? atom.element
  const backbone = BACKBONE_ATOMS[atom.atomName]
  return (
    <div className="info-atom">
      <span className="info-atom-symbol mono" aria-hidden="true">
        {atom.element.length > 1 ? atom.element[0] + atom.element.slice(1).toLowerCase() : atom.element}
      </span>
      <div>
        <p>
          {elementName} · atom <span className="mono">{atom.atomName}</span>
        </p>
        <p className="info-dim">{backbone ?? (atom.comp === 'HEM' ? 'Part of the heme ring' : 'Part of the side chain')}</p>
      </div>
    </div>
  )
}

/* ---------- Bond ---------- */

function BondInfo({ pick }: { pick: Extract<PickInfo, { kind: 'bond' }> }) {
  const { a, b, length, order } = pick
  const isPeptide = isPeptideBond(a, b)
  const isIronBond = a.element.toUpperCase() === 'FE' || b.element.toUpperCase() === 'FE'
  const sym = (x: AtomInfo) => (x.element.length > 1 ? x.element[0] + x.element.slice(1).toLowerCase() : x.element)
  const orderLabel = order === 2 ? 'Double' : order === 3 ? 'Triple' : 'Single'

  let title = `${sym(a)}–${sym(b)} bond`
  let text = 'A covalent bond: two atoms sharing a pair of electrons.'
  if (isPeptide) {
    title = 'Peptide bond'
    text =
      'The amide bond that links one amino acid to the next. It has partial double-bond character, so it is flat and does not rotate freely. That rigidity limits the shapes a protein backbone can take.'
  } else if (isIronBond) {
    title = 'Iron coordination bond'
    text = 'A bond from a nitrogen lone pair to the heme iron.'
  } else if (order === 2) {
    text = 'A double bond: two shared electron pairs (one σ and one π). It is shorter and stiffer than a single bond.'
  }

  return (
    <>
      <p className="info-kicker">Bond</p>
      <h2 className="info-title">{title}</h2>
      <dl className="info-facts">
        <div>
          <dt>Length</dt>
          <dd className="mono">{length.toFixed(2)} Å</dd>
        </div>
        {!isPeptide && !isIronBond && (
          <div>
            <dt>Type</dt>
            <dd>{orderLabel}</dd>
          </div>
        )}
        <div>
          <dt>Between</dt>
          <dd className="mono">
            {a.atomName} ({a.comp} {a.seq}) – {b.atomName} ({b.comp} {b.seq})
          </dd>
        </div>
      </dl>
      <p className="info-text">{text}</p>
      <p className="info-footnote">Length measured from the X-ray coordinates, which carry small experimental uncertainty.</p>
    </>
  )
}

function FocusButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn info-focus" onClick={onClick}>
      Zoom to this
    </button>
  )
}
