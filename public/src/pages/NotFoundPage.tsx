import { Link } from 'react-router-dom'
import { PageBanner } from '../components/PageBanner'

export function NotFoundPage() {
  return (
    <>
      <PageBanner title="Page not found" description="The page you are looking for does not exist or may have moved." parent="404 · Not found" />
      <section className="section">
        <div className="content-width empty-state">
          <h2>Let's get you back on track</h2>
          <p>Browse published NACOS South East chapters, leadership and archive records.</p>
          <Link className="button" to="/">Return to the homepage</Link>
        </div>
      </section>
    </>
  )
}
