import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataMessage } from '../components/DataMessage'
import { PageBanner } from '../components/PageBanner'
import { usePublicData } from '../data/publicDataContext'

export function LeadershipPage() {
  const data = usePublicData()
  const executives = data.executives.records
  const leadershipTerms = data.leadershipTerms.records
  const [selectedTerm, setSelectedTerm] = useState('all')
  const visibleTerms = selectedTerm === 'all'
    ? leadershipTerms
    : leadershipTerms.filter((term) => term.id === selectedTerm)

  return (
    <>
      <PageBanner
        title="Zonal executives"
        description="Meet the people who have served NACOS South East and explore leadership across the years."
        parent="Zonal Executives"
      />
      <section className="section">
        <div className="content-width">
          <div className="term-tabs" aria-label="Filter leadership by tenure">
            <button type="button" className={`term-tab${selectedTerm === 'all' ? ' active' : ''}`} onClick={() => setSelectedTerm('all')}>All terms</button>
            {leadershipTerms.map((term) => (
              <button
                type="button"
                key={term.id}
                className={`term-tab${selectedTerm === term.id ? ' active' : ''}`}
                onClick={() => setSelectedTerm(term.id)}
              >
                {term.label}
              </button>
            ))}
          </div>

          <DataMessage
            resource={data.leadershipTerms.error ? data.leadershipTerms : data.executives}
            retry={() => { void data.reload() }}
          />
          {!data.leadershipTerms.loading && !data.leadershipTerms.error && !data.executives.loading && !data.executives.error && (visibleTerms.length
            ? visibleTerms.map((term) => {
            const termExecutives = executives.filter((executive) => executive.term === term.id)
            return (
              <section className="term-block" key={term.id} aria-labelledby={`term-${term.id}`}>
                <div className="term-heading">
                  <h2 id={`term-${term.id}`}>{term.label}</h2>
                  <span>{termExecutives.length} executive profiles</span>
                </div>
                <div className="card-grid">
                  {termExecutives.map((executive) => (
                    <Link className="executive-card" to={`/leadership/${executive.id}`} key={executive.id}>
                      <div className="executive-photo">
                        {executive.photo
                          ? <img src={executive.photo} alt={executive.name} />
                          : <span className="executive-photo-placeholder" aria-hidden="true">{executive.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</span>}
                      </div>
                      <div className="executive-card-body">
                        <h3>{executive.name}</h3>
                        <div className="executive-position">{executive.position}</div>
                        <div className="executive-institution">{executive.institution}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )
          }) : <div className="empty-state"><h3>No leadership terms published yet</h3><p>Published leadership terms and executive profiles will appear here.</p></div>)}
        </div>
      </section>
    </>
  )
}
