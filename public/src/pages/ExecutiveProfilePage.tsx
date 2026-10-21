import { Link, useParams } from 'react-router-dom'
import { DataMessage } from '../components/DataMessage'
import { Icon } from '../components/Icon'
import { PageBanner } from '../components/PageBanner'
import { usePublicData } from '../data/publicDataContext'

export function ExecutiveProfilePage() {
  const data = usePublicData()
  const { executiveId } = useParams()
  const executive = data.executives.records.find((item) => item.id === executiveId)
  const term = data.leadershipTerms.records.find((item) => item.id === executive?.term)

  if (data.executives.loading || data.executives.error || data.leadershipTerms.loading || data.leadershipTerms.error) {
    const resource = data.executives.error ? data.executives : data.leadershipTerms
    return <section className="section"><div className="content-width"><DataMessage resource={resource} retry={() => { void data.reload() }} /></div></section>
  }

  if (!executive) {
    return (
      <>
        <PageBanner title="Profile not found" description="That executive profile is not available in the published archive." parent="Zonal Executives" />
        <section className="section"><div className="content-width"><Link className="button" to="/leadership">Back to leadership archive</Link></div></section>
      </>
    )
  }

  return (
    <>
      <PageBanner title="Executive profile" description="A record of service to NACOS South East." parent="Zonal Executives" />
      <section className="section">
        <div className="content-width">
          <Link className="back-link" to="/leadership"><Icon name="back" /> Back to leadership archive</Link>
          <div className="profile-layout">
            <div className={`profile-photo${executive.photo ? '' : ' profile-photo-placeholder'}`}>
              {executive.photo
                ? <img src={executive.photo} alt={executive.name} />
                : <span aria-hidden="true">{executive.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</span>}
            </div>
            <div className="profile-copy">
              <span className="eyebrow">{term?.label ?? executive.term}</span>
              <h2>{executive.name}</h2>
              <div className="executive-position">{executive.position}</div>
              <div className="profile-facts">
                <div className="profile-fact"><span>Institution</span><strong>{executive.institution}</strong></div>
                <div className="profile-fact"><span>State</span><strong>{executive.state} State</strong></div>
                <div className="profile-fact"><span>Position</span><strong>{executive.position}</strong></div>
                <div className="profile-fact"><span>Leadership term</span><strong>{term?.label ?? executive.term}</strong></div>
              </div>
              <h3 className="aside-title">About {executive.name.split(' ')[0]}</h3>
              <p>{executive.bio}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
