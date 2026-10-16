import { LegalPage, type LegalSection } from "@/components/legal/legal-page"

const MAIL = (
  <a href="mailto:hello@olivepinch.com" className="text-olive-600 underline">
    hello@olivepinch.com
  </a>
)

const SECTIONS: LegalSection[] = [
  {
    heading: "1. When you can get a refund",
    body: (
      <>
        <p>We will offer a replacement, credit or refund if:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>an item is missing from your order;</li>
          <li>you receive the wrong item;</li>
          <li>your food arrives spoiled, damaged, spilt or not of satisfactory quality;</li>
          <li>your order is significantly late or does not arrive, and the delay is our fault;</li>
          <li>we cancel your order, for example because an item is unavailable.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "2. When we cannot offer a refund",
    body: (
      <>
        <p>Our food is freshly made and perishable, so we usually cannot refund:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>orders you cancel after the cut-off time of 12pm the day before delivery because we will already have started preparing them;</li>
          <li>orders we could not deliver because no one was available to receive, the address was wrong or incomplete, or we could not safely reach it;</li>
          <li>food you simply did not enjoy, or a change of mind, unless there is a quality problem;</li>
          <li>problems caused by storing or reheating the food incorrectly after delivery;</li>
          <li>requests made after 12 hours from delivery, as we cannot check the condition of the food by then.</li>
        </ul>
        <p className="mt-3">
          Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, the usual
          14-day cancellation right does not apply to food that is made to order or that quickly goes off.
        </p>
      </>
    ),
  },
  {
    heading: "3. How to ask for a refund",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Contact us within 12 hours of delivery at {MAIL}.</li>
        <li>Give us your name, order number and delivery date.</li>
        <li>Tell us what went wrong, and send a clear photo of the problem (including the label) if you can.</li>
        <li className="list-none pl-0 pt-1">We aim to reply within one working day.</li>
      </ul>
    ),
  },
  {
    heading: "4. What happens next",
    body: (
      <p>
        We will look into your request and, if it is confirmed, offer a solution that fits the problem: a free
        replacement meal, credit towards a future order, or a refund of the affected items or the whole order. We may
        ask you to keep the item until we have replied.
      </p>
    ),
  },
  {
    heading: "5. How and when you are refunded",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Refunds go back to the original payment method.</li>
        <li>Please allow 7 working days for the money to reach your account, because this depends on your bank or card provider.</li>
        <li>If you choose to store credit, it is valid for 90 days.</li>
      </ul>
    ),
  },
  {
    heading: "6. Food Allergy & Bone Warning",
    body: (
      <>
        <p>
          If you have a severe food allergy, please be advised that, despite our best efforts, the risk of
          cross-contamination cannot be completely eliminated. We strongly recommend contacting us before consumption to
          discuss any potential allergen risks and obtain further information.
        </p>
        <p>
          Although every care is taken to remove all bones, some small bones may remain. Please exercise caution
        </p>
      </>
    ),
  },
  {
    heading: "7. Your legal rights",
    body: (
      <p>
        This policy does not affect your statutory rights under the Consumer Rights Act 2015, including your right to
        goods that are as described, of satisfactory quality and fit for purpose.
      </p>
    ),
  },
  {
    heading: "8. Contact us",
    body: <p>Email: {MAIL}</p>,
  },
]

function ShippingRefundPolicy() {
  return (
    <LegalPage
      title="Shipping and Refund Policy"
      lastUpdated="5 October 2026"
      intro={
        <p>
          We cook every OlivePinch meal fresh, and we want you to enjoy it. If something is not right, this policy
          explains when you can get a refund, replacement or credit, and how to ask for one. It sits alongside our Terms
          and Conditions and does not affect your legal rights.
        </p>
      }
      sections={SECTIONS}
    />
  )
}

export default ShippingRefundPolicy
