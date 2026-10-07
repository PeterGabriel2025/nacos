import { Link } from 'react-router-dom'
import type { Chapter } from '../data/types'
import { Icon } from './Icon'

export function ChapterCard({ chapter }: { chapter: Chapter }) {
  return (
    <article className="chapter-card">
      <div className="chapter-card-top">
        <span className="chapter-mark" aria-hidden="true">{chapter.initials}</span>
        <span className="status-pill">
          {chapter.status}
        </span>
      </div>
      <h3>{chapter.name}</h3>
      <p className="chapter-institution">{chapter.institution}</p>
      <div className="card-meta">
        <span className="meta-item"><Icon name="pin" />{chapter.state} State</span>
        <span className="meta-item"><Icon name="users" />{chapter.members} members</span>
      </div>
      <Link className="text-link" to={`/chapters/${chapter.id}`}>
        View chapter <Icon name="arrow" />
      </Link>
    </article>
  )
}
