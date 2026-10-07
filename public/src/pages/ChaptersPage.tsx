import { useMemo, useState } from 'react'
import { ChapterCard } from '../components/ChapterCard'
import { DataMessage } from '../components/DataMessage'
import { Icon } from '../components/Icon'
import { PageBanner } from '../components/PageBanner'
import { usePublicData } from '../data/publicDataContext'
import { states } from '../data/types'

export function ChaptersPage() {
  const data = usePublicData()
  const chapters = data.chapters.records
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('All states')
  const [statusFilter, setStatusFilter] = useState('All statuses')

  const filtered = useMemo(() => chapters.filter((chapter) => {
    const query = search.trim().toLowerCase()
    const matchesQuery = !query || [
      chapter.name,
      chapter.institution,
      chapter.state,
      chapter.president,
    ].some((value) => value.toLowerCase().includes(query))
    const matchesState = stateFilter === 'All states' || chapter.state === stateFilter
    const matchesStatus = statusFilter === 'All statuses' || chapter.status === statusFilter
    return matchesQuery && matchesState && matchesStatus
  }), [chapters, search, stateFilter, statusFilter])

  return (
    <>
      <PageBanner
        title="Chapters directory"
        description="Discover NACOS chapters across Abia, Anambra, Ebonyi, Enugu and Imo. Search by institution, state or chapter name."
        parent="Chapters"
      />
      <section className="section">
        <div className="content-width">
          <div className="filter-bar">
            <label className="input-wrap">
              <Icon name="search" />
              <input
                className="control"
                type="search"
                placeholder="Search chapter or institution"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search chapters"
              />
            </label>
            <label>
              <span className="sr-only">Filter by state</span>
              <select className="filter-select" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
                <option>All states</option>
                {states.map((state) => <option key={state} value={state}>{state} State</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by recognition status</span>
              <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>All statuses</option>
                <option>Recognized</option>
              </select>
            </label>
          </div>
          <DataMessage resource={data.chapters} retry={() => { void data.reload() }} />
          {!data.chapters.loading && !data.chapters.error && <p className="result-count" aria-live="polite">
            Showing {filtered.length} of {chapters.length} chapters
          </p>}
          {filtered.length ? (
            <div className="card-grid">
              {filtered.map((chapter) => <ChapterCard key={chapter.id} chapter={chapter} />)}
            </div>
          ) : !data.chapters.loading && !data.chapters.error ? (
            <div className="empty-state">
              <h3>No chapters match those filters</h3>
              <p>Try a different search term or clear one of the filters.</p>
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}
