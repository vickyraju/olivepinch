import type { ReactNode } from "react"

type LegalSection = { heading: string; body: ReactNode; id?: string }

function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string
  lastUpdated: string
  intro?: ReactNode
  sections: LegalSection[]
}) {
  return (
    <section className="pt-14 pb-20 sm:pt-20 sm:pb-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <h1 className="text-4xl sm:text-5xl text-ink mb-3">{title}</h1>
        <p className="text-ink-muted mb-12">Last updated: {lastUpdated}</p>

        {intro && <div className="text-ink-muted leading-relaxed mb-10">{intro}</div>}

        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.heading} id={section.id} className="scroll-mt-32">
              <h2 className="text-xl font-semibold text-ink mb-3">{section.heading}</h2>
              <div className="text-ink-muted leading-relaxed">{section.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { LegalPage, type LegalSection }
