import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { WHATSAPP_CHAT_URL } from "@/components/layout/whatsapp-button"

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

function StillNeedHelp() {
  return (
    <div className="rounded-2xl border border-olive-100 bg-olive-50 p-6">
      <p className="font-display text-xl text-ink">Still have a question?</p>
      <p className="mt-1.5 text-sm text-ink-muted">Send us a message and we'll reply within one business day.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild variant="primary" size="md">
          <Link to="/contact">Contact us</Link>
        </Button>
        <Button asChild variant="outline" size="md">
          <a href={WHATSAPP_CHAT_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </Button>
      </div>
    </div>
  )
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-32 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-3xl sm:text-4xl text-ink">Frequently asked questions</h2>
            <p className="mt-3 text-ink-muted">Quick answers about our meals, delivery and ordering.</p>
            <div className="mt-8 hidden lg:block">
              <StillNeedHelp />
            </div>
          </div>

          <div>
            {/* One answer open at a time; the first is open so the section never looks empty. */}
            <Accordion type="single" collapsible defaultValue={FAQ_GROUPS[0]!.items[0]!.q} className="space-y-8">
              {FAQ_GROUPS.map((group) => (
                <div key={group.title || "general"}>
                  {group.title && <p className="eyebrow mb-3">{group.title}</p>}
                  <div className="rounded-2xl border border-border bg-surface px-5 sm:px-6">
                    {group.items.map((faq) => (
                      <AccordionItem key={faq.q} value={faq.q}>
                        <AccordionTrigger className="gap-4">{faq.q}</AccordionTrigger>
                        <AccordionContent>{faq.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </div>
                </div>
              ))}
            </Accordion>

            <div className="mt-10 lg:hidden">
              <StillNeedHelp />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Faq }
