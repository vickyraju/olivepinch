const STEPS = [
  {
    number: "01",
    title: "Check your postcode",
    description: "We currently deliver across Birmingham. Enter your postcode to confirm we cover your address.",
  },
  {
    number: "02",
    title: "Set your goal & menu",
    description: "Tell us your goal, diet type, and allergies. We build your daily menu — or you customize every meal yourself.",
  },
  {
    number: "03",
    title: "Fresh, delivered daily",
    description: "Each meal is cooked the morning it's delivered, and arrives within the window you choose.",
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-cream-100 border-y border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="eyebrow mb-3">How it works</p>
        <h2 className="text-3xl sm:text-4xl text-ink max-w-lg mb-14">Three steps, no cooking required.</h2>

        <div className="grid gap-10 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number}>
              <p className="eyebrow mb-3">{step.number}</p>
              <h3 className="text-2xl text-ink mb-2">{step.title}</h3>
              <p className="text-ink-muted leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { HowItWorks }
