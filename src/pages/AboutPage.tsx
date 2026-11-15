/*
  AboutPage.tsx — who made the site, where its data comes from, what the honesty labels
  mean, how accuracy is checked, and how to report a problem.

  Facts stated here match reference/README.md and the automated tests in tests/.
*/
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'
import { FEEDBACK_URL } from '../components/feedback'
import './HomePage.css'
import './AboutPage.css'

/** Every Protein Data Bank structure the site shows. */
const STRUCTURES: { pdb: string; what: string; method: string }[] = [
  { pdb: '4HHB', what: 'Human hemoglobin (deoxy form)', method: 'X-ray, 1.74 Å' },
  { pdb: '6CHA', what: 'Chymotrypsin with a transition-state mimic', method: 'X-ray, 1.8 Å' },
  { pdb: '4CHA', what: 'Chymotrypsin, nothing bound', method: 'X-ray, 1.68 Å' },
  { pdb: '1V4S', what: 'Human glucokinase, closed around glucose', method: 'X-ray, 2.3 Å' },
  { pdb: '1V4T', what: 'Human glucokinase, open', method: 'X-ray, 3.4 Å' },
]

export default function AboutPage() {
  // Links like /about#sources scroll to that section.
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  return (
    <div className="about">
      <article className="container about-body">
        <header className="about-head">
          <p className="eyebrow">About</p>
          <h1>Made by a student, for students.</h1>
          <p className="about-lead">
            protein-site is a free place to see chemistry in 3D: molecules you can turn, reactions you can replay, and
            real protein structures you can explore.
          </p>
        </header>

        <section aria-labelledby="who">
          <h2 id="who">Who made it</h2>
          <p>
            I’m a pre-med student. While studying organic chemistry and biochemistry, I found that many of the free
            online tools for picturing molecules were dated and hard to use, especially when you are new to a topic.
            I wanted to build something clearer and more approachable: a resource that fellow students can pick up
            in a few seconds, and that researchers can use for a quick look at a structure.
          </p>
          <p>It is free, has no accounts and no ads, and always will be.</p>
        </section>

        <section aria-labelledby="labels">
          <h2 id="labels">What’s real and what’s a model</h2>
          <p>Every 3D model carries one of two labels, so you always know what you’re looking at.</p>
          <dl className="about-labels">
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
                <span className="tag tag-illustrative">Illustrative</span>
              </dt>
              <dd>
                A computed shape, a simplified model, or a teaching animation. Starting and ending shapes use real
                bond lengths and angles; motion in between is a smooth model, not a physics simulation. Energy
                diagrams are marked <strong>Schematic</strong>: the shape is right, the heights are not measured
                values.
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="sources">
          <h2 id="sources">Where the data comes from</h2>
          <p>
            Protein and enzyme structures come from the{' '}
            <a href="https://www.rcsb.org/" target="_blank" rel="noreferrer">
              RCSB Protein Data Bank
            </a>
            :
          </p>
          <div className="about-table-wrap">
            <table className="about-table">
              <thead>
                <tr>
                  <th scope="col">PDB entry</th>
                  <th scope="col">What it is</th>
                  <th scope="col">How it was measured</th>
                </tr>
              </thead>
              <tbody>
                {STRUCTURES.map((s) => (
                  <tr key={s.pdb}>
                    <th scope="row">
                      <a href={`https://www.rcsb.org/structure/${s.pdb}`} target="_blank" rel="noreferrer" className="mono">
                        {s.pdb}
                      </a>
                    </th>
                    <td>{s.what}</td>
                    <td>{s.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="about-list">
            <li>
              The ATP model on the home page and the periodic-table data (electronegativity, ionization energy,
              electron affinity) come from{' '}
              <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">
                PubChem
              </a>{' '}
              (U.S. National Institutes of Health).
            </li>
            <li>Atomic radii are calculated values from Clementi, Raimondi &amp; Reinhardt (1967).</li>
            <li>Orbital shapes are calculated from the hydrogen atom’s wavefunctions.</li>
            <li>
              Proteins are drawn with{' '}
              <a href="https://molstar.org/" target="_blank" rel="noreferrer">
                Mol*
              </a>
              ; other 3D views with{' '}
              <a href="https://threejs.org/" target="_blank" rel="noreferrer">
                Three.js
              </a>
              . The typeface is Inter.
            </li>
          </ul>
        </section>

        <section aria-labelledby="accuracy">
          <h2 id="accuracy">How accuracy is checked</h2>
          <ul className="about-list">
            <li>
              Residue names and numbers in the lessons are checked against the actual structure files, not typed from
              memory.
            </li>
            <li>
              More than 150 automated checks run before every update. They test things like bond angles, R/S
              configurations, orbital nodes, how each kind of inhibitor changes V<sub>max</sub> and K<sub>m</sub>, and
              that every practice answer agrees with the underlying data.
            </li>
            <li>Simplified explanations are labeled, and where real chemistry is messier, the lesson says so.</li>
          </ul>
        </section>

        <section aria-labelledby="wrong">
          <h2 id="wrong">Found a mistake?</h2>
          <p>
            Please tell me. Corrections and ideas from students and teachers make this better for everyone.
          </p>
          <p>
            <a className="btn btn-primary" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
              Send feedback<span className="sr-only"> (opens a form in a new tab)</span>
            </a>
          </p>
        </section>

        <section aria-labelledby="privacy">
          <h2 id="privacy">Privacy</h2>
          <p>
            There are no accounts. Your place in each lesson is saved only in your own browser. The site counts
            anonymous page views (which pages are opened) and nothing else: no cookies, no names, no tracking across
            sites.
          </p>
          <p>
            <Link to="/">Back to the home page</Link>
          </p>
        </section>
      </article>
      <SiteFooter />
    </div>
  )
}
