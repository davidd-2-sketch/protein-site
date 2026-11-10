/*
  HomePage.tsx — the landing page.

  Sections (top to bottom):
    Hero        headline + live 3D ATP specimen
    Start here  the two finished viewers, with real data specs
    Why         a short note on why this site exists
    Roadmap     what's live and what's coming
    Accuracy    what the honesty labels mean
    Footer      data sources and credits

  Content lives in plain arrays near the top so it's easy to edit without
  touching layout code.
*/
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Atmosphere from '../components/Atmosphere'
import HeroMolecule from '../components/HeroMolecule'
import { MODULES, placeLink, type Place } from '../lessons/place'
import { useStoredState } from '../lessons/progress'
import './HomePage.css'

type Status = 'live' | 'next' | 'planned'

const ROADMAP: { title: string; detail: string; status: Status }[] = [
  { title: 'Protein structure', detail: 'Primary to quaternary structure, helices and sheets, and why shape decides function.', status: 'live' },
  { title: 'Reaction mechanisms', detail: 'SN2 and SN1, side by side. E1, E2, and nucleophilic addition to carbonyls next.', status: 'live' },
  { title: 'Molecular shapes (VSEPR)', detail: 'Build any shape from bonds and lone pairs, then compare real molecules’ measured angles.', status: 'live' },
  { title: 'Enzymes', detail: 'Binding, active sites, induced fit, and how enzymes stabilize the transition state.', status: 'planned' },
  { title: 'Orbitals', detail: 's, p, and d orbitals, hybridization, and how σ and π bonds come from overlap.', status: 'live' },
  { title: 'Polarity', detail: 'Bond dipoles as arrows that add up, or cancel, in look-alike pairs like CO₂ and H₂O.', status: 'live' },
  { title: 'Periodic trends', detail: 'Radius, ionization energy, and electronegativity as a 3D skyline, with the exceptions explained.', status: 'live' },
  { title: 'Practice', detail: 'Rounds of 10 visual questions. Ones you miss come back later.', status: 'live' },
  { title: 'Open your own file', detail: 'Load a PDB or mmCIF structure into the same viewer.', status: 'planned' },
]

const STATUS_LABEL: Record<Status, string> = { live: 'Available', next: 'In progress', planned: 'Planned' }

export default function HomePage() {
  return (
    <div className="home">
      <Atmosphere />

      {/* ===== Hero ===== */}
      <section className="hero container">
        <div className="hero-copy">
          <h1>Chemistry you can see.</h1>
          <p className="hero-sub">
            Rotate a protein, pull apart a reaction, and watch where the electrons go. Real 3D models for general
            chemistry, organic chemistry, and biochemistry.
          </p>
          <div className="hero-actions">
            <Link to="/protein" className="btn btn-primary">
              <span>Explore hemoglobin</span> <span className="arrow">→</span>
            </Link>
            <Link to="/reaction" className="btn">
              <span>
                Watch an S<sub>N</sub>2 reaction
              </span>
            </Link>
          </div>
          <ContinueCard />
          <p className="hero-note">Free. No account needed. Runs entirely in your browser.</p>
        </div>

        <div className="hero-visual">
          <HeroMolecule />
        </div>
      </section>

      {/* ===== Start here ===== */}
      <section className="container section" aria-labelledby="start-title">
        <h2 id="start-title" className="section-title">
          Start here
        </h2>
        <div className="viewer-grid">
          <ViewerCard
            to="/protein"
            art={<TetramerArt />}
            tag={<span className="tag tag-experimental">Experimental structure</span>}
            title="Hemoglobin"
            text="The protein that carries oxygen in your blood. Go from a single chain of amino acids to four chains working together, and find the heme groups where oxygen binds."
            specs={[
              ['PDB entry', '4HHB'],
              ['Method', 'X-ray, 1.74 Å'],
              ['Chains', '4 (α₂β₂)'],
              ['Residues', '574'],
            ]}
            cta="Open the protein viewer"
          />
          <ViewerCard
            to="/reaction"
            art={<Sn2Art />}
            tag={<span className="tag tag-illustrative">Illustrative motion</span>}
            title={
              <>
                S<sub>N</sub>2 substitution
              </>
            }
            text="Hydroxide attacks carbon from the side opposite bromine. One bond forms as the other breaks, and the carbon turns inside out like an umbrella in the wind."
            specs={[
              ['Substrate', '(S)-2-bromobutane'],
              ['Nucleophile', 'HO⁻'],
              ['Product', '(R)-butan-2-ol'],
              ['Rate law', 'k[RBr][HO⁻]'],
            ]}
            cta="Open the reaction viewer"
          />
        </div>
      </section>

      {/* ===== Why ===== */}
      <section className="container section why" aria-labelledby="why-title">
        <h2 id="why-title" className="section-title">
          Why this exists
        </h2>
        <blockquote className="why-quote">
          <p>
            In organic chemistry, and again in biochemistry, I had a hard time picturing molecules, proteins, and
            mechanisms from flat textbook drawings. The tools I found were clunky or dated. This is the tool I wish
            I'd had: free, quick to open, and built so you can look first and read second.
          </p>
          <footer>A pre-med student, and the person who made this site</footer>
        </blockquote>
      </section>

      {/* ===== Roadmap ===== */}
      <section className="container section" aria-labelledby="roadmap-title">
        <h2 id="roadmap-title" className="section-title">
          What's here, and what's next
        </h2>
        <ul className="roadmap">
          {ROADMAP.map((t) => (
            <li key={t.title} className="roadmap-row">
              <h3>{t.title}</h3>
              <p>{t.detail}</p>
              <span className={`status status-${t.status}`}>{STATUS_LABEL[t.status]}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ===== Accuracy ===== */}
      <section className="container section" aria-labelledby="accuracy-title">
        <h2 id="accuracy-title" className="section-title">
          A note on accuracy
        </h2>
        <div className="accuracy">
          <p className="accuracy-intro">
            Every model on this site carries one of two labels, so you always know whether you're looking at
            measured data or a teaching model.
          </p>
          <dl className="accuracy-list">
            <div>
              <dt>
                <span className="tag tag-experimental">Experimental structure</span>
              </dt>
              <dd>
                Atom positions measured in a lab, for example by X-ray crystallography, taken from the Protein Data
                Bank.
              </dd>
            </div>
            <div>
              <dt>
                <span className="tag tag-illustrative">Computed / illustrative</span>
              </dt>
              <dd>
                A computer-generated shape or a teaching animation. Starting and ending structures are accurate. The
                motion between them is a smooth model, not a physics simulation.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="footer">
        <div className="container footer-inner">
          <p>protein-site · free for every student</p>
          <p>
            Structures from the{' '}
            <a href="https://www.rcsb.org/" target="_blank" rel="noreferrer">
              RCSB Protein Data Bank
            </a>{' '}
            and{' '}
            <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">
              PubChem
            </a>
            . Rendered with{' '}
            <a href="https://molstar.org/" target="_blank" rel="noreferrer">
              Mol*
            </a>{' '}
            and{' '}
            <a href="https://threejs.org/" target="_blank" rel="noreferrer">
              Three.js
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ---------- Viewer card ---------- */

function ViewerCard(props: {
  to: string
  art: ReactNode
  tag: ReactNode
  title: ReactNode
  text: string
  specs: [string, string][]
  cta: string
}) {
  return (
    <Link to={props.to} className="viewer-card">
      <div className="viewer-art">{props.art}</div>
      <div className="viewer-body">
        {props.tag}
        <h3>{props.title}</h3>
        <p className="viewer-text">{props.text}</p>
        <dl className="viewer-specs">
          {props.specs.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <span className="viewer-cta">
          {props.cta} <span className="arrow">→</span>
        </span>
      </div>
    </Link>
  )
}

/* ---------- Line-art illustrations (crisp SVG, no image files) ---------- */

/*
  Schematic of hemoglobin's quaternary structure: two α and two β subunits,
  each holding one heme (diamond with an iron dot). Layout is schematic;
  the real 3D arrangement is in the viewer.
*/
function TetramerArt() {
  const subunits = [
    { x: 118, y: 72, label: 'α₁', alpha: true },
    { x: 202, y: 72, label: 'β₁', alpha: false },
    { x: 118, y: 150, label: 'β₂', alpha: false },
    { x: 202, y: 150, label: 'α₂', alpha: true },
  ]
  return (
    <svg viewBox="0 0 320 220" aria-hidden="true">
      {subunits.map((s) => (
        <g key={s.label}>
          <circle
            cx={s.x}
            cy={s.y}
            r="48"
            fill={s.alpha ? 'rgba(94,228,255,0.07)' : 'rgba(167,139,250,0.08)'}
            stroke={s.alpha ? 'rgba(94,228,255,0.6)' : 'rgba(167,139,250,0.65)'}
            strokeWidth="1"
          />
          <path
            d={`M${s.x - 30},${s.y + 8} q7,-16 14,0 t14,0 t14,0 t14,0`}
            fill="none"
            stroke="rgba(238,240,251,0.4)"
            strokeWidth="1.2"
          />
          <rect x={s.x + 10} y={s.y - 26} width="14" height="14" fill="none" stroke="#ff9a52" strokeWidth="1" transform={`rotate(45 ${s.x + 17} ${s.y - 19})`} />
          <circle cx={s.x + 17} cy={s.y - 19} r="2.2" fill="#ff9a52" />
          <text x={s.x - 28} y={s.y - 16} fill="var(--text-dim)" fontFamily="var(--font-mono)" fontSize="13">
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

/*
  Schematic SN2 transition state: HO···C···Br with partial bonds (dashed) and partial charges.
  No curved arrows here on purpose: by convention, arrows are drawn on the reactants,
  not on the transition state. The reaction viewer shows them at the right moment.
*/
function Sn2Art() {
  return (
    <svg viewBox="0 0 320 220" aria-hidden="true">
      <path d="M58,44 h-10 v132 h10" fill="none" stroke="var(--text-faint)" strokeWidth="1" />
      <path d="M262,44 h10 v132 h-10" fill="none" stroke="var(--text-faint)" strokeWidth="1" />
      <text x="276" y="48" fill="var(--text-dim)" fontFamily="var(--font-mono)" fontSize="14">
        ‡
      </text>
      <line x1="96" y1="110" x2="146" y2="110" stroke="var(--text-dim)" strokeWidth="1.2" strokeDasharray="4 4" />
      <line x1="174" y1="110" x2="222" y2="110" stroke="var(--text-dim)" strokeWidth="1.2" strokeDasharray="4 4" />
      <line x1="160" y1="110" x2="160" y2="64" stroke="var(--text-dim)" strokeWidth="1.2" />
      <line x1="160" y1="110" x2="128" y2="152" stroke="var(--text-dim)" strokeWidth="1.2" />
      <line x1="160" y1="110" x2="192" y2="152" stroke="var(--text-dim)" strokeWidth="1.2" />
      <circle cx="82" cy="110" r="14" fill="var(--bg-0)" stroke="#ff4d5e" strokeWidth="1.2" />
      <text x="82" y="114" textAnchor="middle" fill="#ff7c88" fontFamily="var(--font-mono)" fontSize="11">HO</text>
      <circle cx="160" cy="110" r="12" fill="var(--bg-0)" stroke="var(--text)" strokeWidth="1.2" />
      <text x="160" y="114" textAnchor="middle" fill="var(--text)" fontFamily="var(--font-mono)" fontSize="11">C</text>
      <circle cx="238" cy="110" r="16" fill="var(--bg-0)" stroke="#d2554f" strokeWidth="1.2" />
      <text x="238" y="114" textAnchor="middle" fill="#e98a84" fontFamily="var(--font-mono)" fontSize="11">Br</text>
      <text x="160" y="58" textAnchor="middle" fill="var(--text-faint)" fontFamily="var(--font-mono)" fontSize="10">H</text>
      <text x="120" y="166" textAnchor="middle" fill="var(--text-faint)" fontFamily="var(--font-mono)" fontSize="10">CH₃</text>
      <text x="202" y="166" textAnchor="middle" fill="var(--text-faint)" fontFamily="var(--font-mono)" fontSize="10">C₂H₅</text>
      <text x="72" y="90" fill="var(--text-dim)" fontFamily="var(--font-mono)" fontSize="11">δ−</text>
      <text x="230" y="86" fill="var(--text-dim)" fontFamily="var(--font-mono)" fontSize="11">δ−</text>
    </svg>
  )
}

/* "Continue where you left off": only shown once the student has opened a lesson. */
function ContinueCard() {
  const [last] = useStoredState<Place | null>('ps.last', null)
  if (!last) return null
  return (
    <Link to={placeLink(last)} className="home-continue">
      <span className="home-continue-label">Continue where you left off</span>
      <span>
        {MODULES[last.module].name} · {last.lessonTitle} · step {last.step + 1} of {last.steps} <span className="arrow">→</span>
      </span>
    </Link>
  )
}
