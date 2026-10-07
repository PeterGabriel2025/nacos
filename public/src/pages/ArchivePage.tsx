import { useState } from 'react'
import { DataMessage } from '../components/DataMessage'
import { Icon } from '../components/Icon'
import { PageBanner } from '../components/PageBanner'
import { usePublicData } from '../data/publicDataContext'

const filters = ['All', 'Leadership', 'Events', 'Community', 'Documents'] as const
type MediaFilter = (typeof filters)[number]

export function ArchivePage() {
  const data = usePublicData()
  const mediaItems = data.mediaItems.records
  const [category, setCategory] = useState<MediaFilter>('All')
  const [year, setYear] = useState('All years')
  const years = [...new Set(mediaItems.map((item) => item.year))].sort((a, b) => b - a)

  const visibleItems = mediaItems.filter((item) => (
    (category === 'All' || item.category === category)
    && (year === 'All years' || item.year === Number(year))
  ))

  return (
    <>
      <PageBanner
        title="History & media archive"
        description="A growing collection of leadership memories, NACOS events and community moments from across South East Nigeria."
        parent="History & Media"
      />
      <section className="section">
        <div className="content-width">
          <div className="archive-filters" role="group" aria-label="Filter archive by category">
            {filters.map((filter) => (
              <button
                className={`archive-filter${category === filter ? ' active' : ''}`}
                type="button"
                key={filter}
                onClick={() => setCategory(filter)}
              >
                {filter}
              </button>
            ))}
            <label style={{ marginLeft: 'auto' }}>
              <span className="sr-only">Filter archive by year</span>
              <select className="filter-select" value={year} onChange={(event) => setYear(event.target.value)}>
                <option>All years</option>
                {years.map((itemYear) => <option value={itemYear} key={itemYear}>{itemYear}</option>)}
              </select>
            </label>
          </div>
          <DataMessage resource={data.mediaItems} retry={() => { void data.reload() }} />
          {!data.mediaItems.loading && !data.mediaItems.error && <p className="result-count" aria-live="polite">{visibleItems.length} published archive items</p>}
          {!data.mediaItems.loading && !data.mediaItems.error && visibleItems.length ? (
            <div className="archive-grid">
              {visibleItems.map((item) => (
                <article className="archive-card" key={item.id}>
                  <div className="archive-photo">
                    {item.image
                      ? <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      : <span className="media-photo-placeholder" aria-hidden="true">NACOS</span>}
                  </div>
                  <div className="archive-card-body">
                    <div className="archive-meta">
                      <span className="archive-type">{item.category}</span>
                      <span><Icon name="calendar" /> {item.year}</span>
                    </div>
                    <h3>{item.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          ) : !data.mediaItems.loading && !data.mediaItems.error ? (
            <div className="empty-state"><h3>No archive items found</h3><p>Choose another category or year.</p></div>
          ) : null}
        </div>
      </section>
    </>
  )
}
