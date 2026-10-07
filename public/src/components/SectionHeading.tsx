type SectionHeadingProps = {
  eyebrow: string
  title: string
  children: string
  centered?: boolean
}

export function SectionHeading({ eyebrow, title, children, centered = false }: SectionHeadingProps) {
  return (
    <div className={`section-heading${centered ? ' centered' : ''}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  )
}
