const STEPS = [
  {
    number: "01",
    title: "Check your postcode",
    description: "We're piloting in one UK city right now. Enter your postcode to confirm we deliver to you.",
  },
  {
    number: "02",
    title: "Set your goal & menu",
    description: "Share your goal, diet type, and allergies. We build your daily menu — or you customize every meal.",
  },
  {
    number: "03",
    title: "Fresh, delivered daily",
    description: "Your meals are prepared fresh each morning and delivered within your chosen window.",
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-cream-100 border-y border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="eyebrow mb-3">How it works</p>
        <h2 className="text-3xl sm:text-4xl text-ink max-w-lg mb-14">Restaurant-quality, on your terms.</h2>

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
