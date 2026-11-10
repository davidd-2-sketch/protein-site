/*
  SequenceStrip.tsx — the amino-acid sequence as a row of letters.
  Each letter is colored with the same N→C rainbow as the 3D ribbon, so
  students can match a letter to its place in the chain.
  Hover a letter to highlight it in 3D; click to fly there.
*/
import { RAINBOW, type ResidueRef } from './ProteinViewer'
import { BY_ONE } from './aminoAcids'
import type { ChainId } from './hemoglobin'

/** Linear interpolation through the RAINBOW color stops: t = 0 (start) → 1 (end). */
function rainbowAt(t: number) {
  const scaled = t * (RAINBOW.length - 1)
  const i = Math.min(Math.floor(scaled), RAINBOW.length - 2)
  const f = scaled - i
  const parse = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16))
  const [a, b] = [parse(RAINBOW[i]), parse(RAINBOW[i + 1])]
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`
}

interface Props {
  chain: ChainId
  sequence: string
  onHover: (r: ResidueRef | null) => void
  onSelect: (r: ResidueRef) => void
}

export default function SequenceStrip({ chain, sequence, onHover, onSelect }: Props) {
  const n = sequence.length
  return (
    <div className="sequence panel" aria-label="Amino acid sequence">
      <div className="sequence-ends mono" aria-hidden="true">
        <span>N-terminus</span>
        <span>C-terminus</span>
      </div>
      <ol className="sequence-letters" onMouseLeave={() => onHover(null)}>
        {[...sequence].map((letter, i) => {
          const seq = i + 1 // residue numbers start at 1 in this structure
          const aa = BY_ONE.get(letter)
          return (
            <li key={i}>
              <button
                className="sequence-letter mono"
                style={{ color: rainbowAt(i / (n - 1)) }}
                onMouseEnter={() => onHover({ chain, seq })}
                onFocus={() => onHover({ chain, seq })}
                onClick={() => onSelect({ chain, seq })}
                aria-label={`${aa?.name ?? letter} ${seq}`}
                title={`${aa?.name ?? letter} ${seq}`}
              >
                {letter}
              </button>
              {seq % 10 === 0 && (
                <span className="sequence-tick mono" aria-hidden="true">
                  {seq}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
