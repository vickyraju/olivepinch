const FAQS = [
  {
    q: "Do you deliver outside Birmingham?",
    a: "Not yet — we're running a single-zone pilot right now. Enter your postcode at checkout and we'll email you the moment we launch in your area.",
  },
  {
    q: "When does my plan start?",
    a: "The earliest start date is always 2 days from today, so our kitchen has time to schedule your first delivery. You'll only be able to pick valid dates on the calendar.",
  },
  {
    q: "Can I pause my subscription?",
    a: "Yes — up to 4 times a month, in whole delivery days. Paused days are added back onto your subscription's end date, so you never lose meals you've paid for.",
  },
  {
    q: "What if my payment fails?",
    a: "Your profile, goal, menu, and address selections are all saved. You'll be taken straight back to the payment step to retry — no need to start over.",
  },
  {
    q: "How do you handle allergies?",
    a: "You'll exclude specific allergens during signup, and every default menu is filtered to respect them. You can still swap individual meals if you want more control.",
  },
  {
    q: "What happens to my data?",
    a: "Health data like height, weight, and body measurements is only ever used for BMI and meal recommendations, and you control it — export or delete it any time from your dashboard.",
  },
]

function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="max-w-xl mb-12">
          <p className="eyebrow mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl text-ink">Frequently asked questions</h2>
        </div>
        <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-base font-semibold text-ink mb-1.5">{faq.q}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Faq }
