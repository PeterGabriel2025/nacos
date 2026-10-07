import { Link, useParams } from 'react-router-dom'
import { DataMessage } from '../components/DataMessage'
import { Icon } from '../components/Icon'
import { PageBanner } from '../components/PageBanner'
import { usePublicData } from '../data/publicDataContext'

export function ChapterDetailPage() {
  const { chapterId } = useParams()
  const data = usePublicData()
  const chapter = data.chapters.records.find((item) => item.id === chapterId)

  if (data.chapters.loading || data.chapters.error) {
    return <section className="section"><div className="content-width"><DataMessage resource={data.chapters} retry={() => { void data.reload() }} /></div></section>
  }

  if (!chapter) {
    return (
      <>
        <PageBanner title="Chapter not found" description="That chapter is not available in the published directory." parent="Chapters" />
        <section className="section"><div className="content-width"><Link className="button" to="/chapters">Back to chapters</Link></div></section>
      </>
    )
  }

  return (
    <>
      <PageBanner title={chapter.name} description={chapter.institution} parent="Chapters" />
      <section className="section">
        <div className="content-width">
          <Link className="back-link" to="/chapters"><Icon name="back" /> Back to directory</Link>
          <div className="detail-layout">
            <div>
              <article className="info-card">
                <div className="detail-heading">
                  <span className="chapter-mark" aria-hidden="true">{chapter.initials}</span>
                  <div>
                    <h2>{chapter.name}</h2>
                    <span className="status-pill">{chapter.status}</span>
                  </div>
                </div>
                <h3>About this chapter</h3>
                <p>{chapter.description}</p>
              </article>
              <article className="info-card">
                <h3>Chapter leadership</h3>
                <dl className="detail-list">
                  <div><dt>Chapter President</dt><dd>{chapter.president}</dd></div>
                  <div><dt>Institution</dt><dd>{chapter.institution}</dd></div>
                  <div><dt>State</dt><dd>{chapter.state} State</dd></div>
                </dl>
              </article>
            </div>
            <aside className="info-card">
              <h3>Chapter details</h3>
              <dl className="detail-list">
                <div><dt>Institution type</dt><dd>{chapter.type}</dd></div>
                <div><dt>Established</dt><dd>{chapter.established}</dd></div>
                <div><dt>Active members</dt><dd>{chapter.members}</dd></div>
                <div><dt>Location</dt><dd>{chapter.address}</dd></div>
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
