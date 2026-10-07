import type { Resource } from '../data/publicDataContext'

export function DataMessage({ resource, retry }: {
  resource: Pick<Resource<unknown>, 'loading' | 'error'>
  retry: () => void
}) {
  if (resource.loading) {
    return <div className="data-message" role="status">Loading approved NACOS records…</div>
  }
  if (resource.error) {
    return (
      <div className="data-message data-error" role="alert">
        <span>Could not load published records: {resource.error}</span>
        <button className="button button-outline" type="button" onClick={retry}>Try again</button>
      </div>
    )
  }
  return null
}
