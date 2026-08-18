import * as React from "react"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl text-ink">{title}</h1>
        {description && <p className="text-sm text-ink-muted mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-end gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export { PageHeader }
