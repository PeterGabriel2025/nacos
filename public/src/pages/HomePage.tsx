import { Link } from 'react-router-dom'
import { ChapterCard } from '../components/ChapterCard'
import { DataMessage } from '../components/DataMessage'
import { Icon } from '../components/Icon'
import { SectionHeading } from '../components/SectionHeading'
import { usePublicData } from '../data/publicDataContext'

const registrationPortalUrl = import.meta.env.VITE_REGISTRATION_PORTAL_URL
  || (import.meta.env.DEV ? 'http://localhost:5174/' : 'https://nacos-reg.netlify.app/')

export function HomePage() {
  const data = usePublicData()
  const chapters = data.chapters.records
  const leadershipTerms = data.leadershipTerms.records
  const featuredChapters = chapters.slice(0, 3)
  const currentTerm = leadershipTerms[0]
  const featuredExecutives = currentTerm
    ? data.executives.records.filter((executive) => executive.term === currentTerm.id).slice(0, 3)
    : []

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">Nigerian Association of Computing Students</span>
          <h1>Stronger chapters.<br />A connected South East.</h1>
          <p>
            Discover NACOS chapters across the South East, meet the leaders serving our
            community, and explore the people and moments shaping our story.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/chapters">Explore chapters <Icon name="arrow" /></Link>
            <a className="button button-light" href={registrationPortalUrl}>Register a chapter</a>
          </div>
        </div>
      </section>

      <div className="stats-strip" aria-label="NACOS South East at a glance">
        <div className="stat"><strong>5</strong><span>South East states</span></div>
        <div className="stat"><strong>{data.chapters.loading || data.chapters.error ? '—' : chapters.length}</strong><span>Published campus chapters</span></div>
        <div className="stat"><strong>{data.leadershipTerms.loading || data.leadershipTerms.error ? '—' : leadershipTerms.length}</strong><span>Published leadership terms</span></div>
      </div>

      <section className="section">
        <div className="content-width">
          <div className="section-topline">
            <SectionHeading eyebrow="Across the zone" title="Find your NACOS chapter">
              Explore the student communities bringing computing, collaboration and
              opportunity to campuses across South East Nigeria.
            </SectionHeading>
            <Link className="text-link" to="/chapters">View all chapters <Icon name="arrow" /></Link>
          </div>
          <DataMessage resource={data.chapters} retry={() => { void data.reload() }} />
          {!data.chapters.loading && !data.chapters.error && (featuredChapters.length
            ? <div className="card-grid">{featuredChapters.map((chapter) => <ChapterCard key={chapter.id} chapter={chapter} />)}</div>
            : <div className="empty-state"><h3>No chapters published yet</h3><p>Approved chapter profiles will appear here when NACOS South East publishes them.</p></div>)}
        </div>
      </section>

      <section className="section section-white">
        <div className="content-width split-feature">
          <div className="feature-photo" role="img" aria-label="Students learning and collaborating on campus" />
          <div className="feature-copy">
            <span className="eyebrow">Our community</span>
            <h2>One zone, many chapters, a shared future.</h2>
            <p>
              NACOS South East brings together student chapters from five states. This
              platform makes it easier to find recognized chapters and keep the stories
              of our community accessible year after year.
            </p>
            <ul className="feature-points">
              <li><span className="check-dot"><Icon name="check" /></span>Browse chapter information across the zone</li>
              <li><span className="check-dot"><Icon name="check" /></span>Explore leadership terms and executive profiles</li>
              <li><span className="check-dot"><Icon name="check" /></span>Preserve events and memories in one archive</li>
            </ul>
            <Link className="button button-outline" to="/history">Explore our history <Icon name="arrow" /></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="content-width">
          <div className="section-topline">
            <SectionHeading eyebrow="Leadership archive" title={currentTerm ? `Serving for ${currentTerm.label}` : 'Leadership archive'}>
              Meet members of the current zonal executive team and discover leaders from
              previous terms.
            </SectionHeading>
            <Link className="text-link" to="/leadership">View leadership <Icon name="arrow" /></Link>
          </div>
          <DataMessage resource={data.executives} retry={() => { void data.reload() }} />
          {!data.executives.loading && !data.executives.error && (
            featuredExecutives.length ? (
              <div className="card-grid">
                {featuredExecutives.map((executive) => (
                  <Link className="executive-card" key={executive.id} to={`/leadership/${executive.id}`}>
                    <div className="executive-photo executive-photo-placeholder" aria-hidden="true">{executive.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</div>
                    <div className="executive-card-body">
                      <h3>{executive.name}</h3>
                      <div className="executive-position">{executive.position}</div>
                      <div className="executive-institution">{executive.institution}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <div className="empty-state"><h3>No published executive profiles yet</h3><p>Leadership profiles will appear here when they are published.</p></div>
          )}
        </div>
      </section>

      <section className="section section-compact section-white">
        <div className="content-width">
          <div className="callout">
            <div>
              <h2>Is your chapter part of the directory?</h2>
              <p>Chapter representatives can submit verified details through the private invitation portal. Every application is reviewed before publication.</p>
            </div>
            <a className="button button-light" href={registrationPortalUrl}>Register a chapter <Icon name="arrow" /></a>
          </div>
        </div>
      </section>
    </>
  )
}
