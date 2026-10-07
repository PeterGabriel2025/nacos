import { Link } from 'react-router-dom'

type PageBannerProps = {
  title: string
  description: string
  eyebrow?: string
  parent?: string
}

export function PageBanner({
  title,
  description,
  eyebrow = 'NACOS South East',
  parent,
}: PageBannerProps) {
  return (
    <section className="page-banner">
      <div className="page-banner-inner">
        {parent && (
          <div className="breadcrumb">
            <Link to="/">Overview</Link>
            <span aria-hidden="true">/</span>
            <span>{parent}</span>
          </div>
        )}
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  )
}
