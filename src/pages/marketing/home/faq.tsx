const FAQ_GROUPS = [
  {
    title: "",
    items: [
      {
        q: "What is OlivePinch?",
        a: "OlivePinch is a Birmingham-based kitchen making fresh, low-carb, high-protein meals for people who want to eat well without giving up flavour. We cook every meal fresh, match it to your tastes and dietary needs, and deliver it to your door.",
      },
      {
        q: "Is your food halal?",
        a: "Yes. All of our food is 100% halal.",
      },
      {
        q: "Do you have a restaurant I can visit?",
        a: "OlivePinch is a delivery-only kitchen, so we do not have a dining area. You can order through our website and have your meals brought to your door.",
      },
    ],
  },
  {
    title: "Ordering and delivery",
    items: [
      {
        q: "Where do you deliver?",
        a: "Right now we deliver only within Birmingham. Enter your postcode to check that we cover your area. We plan to add more areas in future, so follow us on social media for updates.",
      },
      {
        q: "When will my order arrive?",
        a: "We deliver Monday-Sunday, every morning between 6am and 9am. You will see your delivery slot at checkout.",
      },
      {
        q: "How do I place an order?",
        a: "Choose your meals on our website, enter your delivery address and pick your delivery slot, then pay securely at checkout.",
      },
      {
        q: "What if I am not home when my order arrives?",
        a: "Please make sure someone can receive your order or leave clear instructions for a safe place at checkout.",
      },
      {
        q: "Can I change or cancel my order?",
        a: "You can change or cancel your order until 12pm the day before delivery. After that we will already have started preparing your food, so we cannot change or cancel it. Email us as early as you can.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept debit and credit cards. Payments are processed securely, and we never store your full card details.",
      },
    ],
  },
  {
    title: "Food, diet and allergies",
    items: [
      {
        q: "Can you cater for my diet?",
        a: "Our menu focuses on low-carb, high-protein and many dishes suit people following a structured eating plan. If you have specific goals or preferences, contact us and we will do our best to match your meals to them.",
      },
      {
        q: "I have a food allergy or intolerance. Is it safe to order?",
        a: "Please read the allergen information shown for each dish before ordering. If you have a severe allergy, contact us before you order.",
      },
      {
        q: "Do you show calories information?",
        a: "Where available, calorie information is shown on each dish. Values are estimates and may vary slightly between batches.",
      },
      {
        q: "Are your meals really fresh?",
        a: "Yes. We cook every meal fresh and deliver on a daily basis.",
      },
      {
        q: "How should I store and reheat my meal?",
        a: "Keep your meal refrigerated as soon as it arrives and eat it by the date shown on the label. Use within 2 days of delivery. Reheat for required meals before eating.",
      },
    ],
  },
  {
    title: "Contact",
    items: [
      {
        q: "How can I contact you?",
        a: "Email: hello@olivepinch.com",
      },
    ],
  },
]

function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="max-w-xl mb-12">
          <h2 className="text-3xl sm:text-4xl text-ink">Frequently asked questions</h2>
        </div>
        <div className="space-y-14">
          {FAQ_GROUPS.map((group) => (
            <div key={group.title}>
              {group.title && <h3 className="font-display text-2xl text-ink mb-6">{group.title}</h3>}
              <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
                {group.items.map((faq) => (
                  <div key={faq.q}>
                    <h4 className="text-lg font-semibold text-ink mb-1.5">{faq.q}</h4>
                    <p className="text-sm text-ink-muted leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Faq }
