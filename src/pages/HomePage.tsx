/*
  HomePage.tsx — the landing page.

  Sections (top to bottom):
    Hero              a short pitch + the live 3D ATP molecule
    Pick your course  General Chem / Organic / Biochem, each topic one click away
    Practice          a strip linking to flashcards
    Trust line        "Built on real Protein Data Bank structures" → About
    Why               a short note on why this site exists
    Footer            About, data sources, feedback

  The course list comes from nav/courses.ts, the same list the top bar uses.
*/
import { Link } from 'react-router-dom'
import Atmosphere from '../components/Atmosphere'
import HeroMolecule from '../components/HeroMolecule'
import Icon from '../components/Icon'
import SiteFooter from '../components/SiteFooter'
import { MODULES, placeLink, type Place } from '../lessons/place'
import { useStoredState } from '../lessons/progress'
import { COURSES, rememberCourse } from '../nav/courses'
import './HomePage.css'

export default function HomePage() {
  return (
    <div className="home">
      <Atmosphere />

      {/* ===== Hero ===== */}
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">Free 3D chemistry lessons</p>
          <h1>
            Chemistry <br />
            you can see.
          </h1>
          <p className="hero-sub">
            Turn molecules around, watch reactions happen, and see why it works. Short, visual lessons for Gen Chem,
            Organic, and Biochem.
          </p>
          <div className="hero-actions">
            <a href="#courses" className="btn btn-primary btn-lg">
              Pick your course <Icon name="arrow" size={18} />
            </a>
            <Link to="/shapes?lesson=why-shapes&step=0" className="btn btn-lg">
              Try a 4-minute lesson
            </Link>
          </div>
          <ContinueCard />
        </div>

        <div className="hero-visual">
          <HeroMolecule />
        </div>
      </section>

      {/* ===== Pick your course ===== */}
      <section className="container section" id="courses" aria-labelledby="courses-title">
        <div className="section-head">
          <h2 id="courses-title" className="section-title">
            Pick your course
          </h2>
          <p>Go straight to what your class is covering. Every topic opens with a short guided lesson.</p>
        </div>
        <div className="courses">
          {COURSES.map((c) => (
            <section key={c.id} className="course" aria-labelledby={`course-${c.id}`}>
              <div className="course-head">
                <h3 id={`course-${c.id}`}>{c.name}</h3>
                <p>{c.blurb}</p>
              </div>
              <ul>
                {c.topics.map((t) => (
                  <li key={t.to}>
                    <Link to={t.to} className="home-topic" onClick={() => rememberCourse(c.id)}>
                      <span className="menu-ico">
                        <Icon name={t.icon} />
                      </span>
                      <span>
                        <span className="menu-title">{t.title}</span>
                        <span className="menu-desc">{t.desc}</span>
                      </span>
                      <span className="home-topic-go">
                        <Icon name="arrow" size={16} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="practice-strip">
          <div>
            <h3>Practice</h3>
            <p>Calm flashcards with a 3D picture for every question. Ones you miss come back later.</p>
          </div>
          <Link to="/practice" className="btn">
            Start practicing <Icon name="arrow" size={18} />
          </Link>
        </div>

        <p className="trust">
          <span className="tag tag-experimental">Experimental structure</span>
          <span>
            Built on real Protein Data Bank structures. <Link to="/about">How we keep it accurate</Link>
          </span>
        </p>
      </section>

      {/* ===== Why ===== */}
      <section className="container section" aria-label="Why this site exists">
        <blockquote className="why-quote">
          <p>
            In organic chemistry, and again in biochemistry, I had a hard time picturing molecules, proteins, and
            mechanisms from flat textbook drawings. This is the tool I wish I’d had: free, quick to open, and built so
            you can look first and read second.
          </p>
          <footer>
            A pre-med student, and the person who made this site · <Link to="/about">About</Link>
          </footer>
        </blockquote>
      </section>

      <SiteFooter />
    </div>
  )
}

/* "Continue where you left off": only shown once the student has opened a lesson. */
function ContinueCard() {
  const [last] = useStoredState<Place | null>('ps.last', null)
  if (!last || !MODULES[last.module]) return null
  return (
    <Link to={placeLink(last)} className="home-continue">
      <span className="home-continue-dot" aria-hidden="true">
        <Icon name="arrow" size={16} />
      </span>
      <span>
        Continue: <strong>{MODULES[last.module].name}</strong> · {last.lessonTitle} · step {last.step + 1} of {last.steps}
      </span>
    </Link>
  )
}
