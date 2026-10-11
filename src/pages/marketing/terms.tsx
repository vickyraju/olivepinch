import { LegalPage, type LegalSection } from "@/components/legal/legal-page"

const MAIL = (
  <a href="mailto:hello@olivepinch.com" className="text-olive-600 underline">
    hello@olivepinch.com
  </a>
)

const SECTIONS: LegalSection[] = [
  {
    heading: "1. About us",
    body: (
      <>
        <p>
          This website is operated by OlivePinch Ltd trading as OlivePinch (“we”, “us”, “our”), a business registered in
          United Kingdom with its address at 260 Windsor street, B7 4DX.
        </p>
        <p className="mt-2">You can contact us at {MAIL}.</p>
      </>
    ),
  },
  {
    heading: "2. Our service area",
    body: (
      <p>
        We currently deliver only within Birmingham. We cannot accept orders for addresses outside our delivery area. We
        may change our delivery area from time to time.
      </p>
    ),
  },
  {
    heading: "3. Prices and payment",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>All prices are shown in pounds sterling (£).</li>
        <li>Delivery charges, if any, are shown before you pay.</li>
        <li>
          Payment is taken when you place your order. We use a secure third-party payment provider and do not store your
          full card details.
        </li>
        <li>Prices and menu items may change at any time, but changes will not affect orders we have already accepted.</li>
      </ul>
    ),
  },
  {
    heading: "4. Delivery",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          We will deliver your order to the address you give us during the delivery window you choose. Delivery times are
          estimates, and we will do our best to deliver on time.
        </li>
        <li>
          You must give us an accurate and complete address and make sure someone can receive the order, or give clear
          safe-place instructions.
        </li>
        <li>
          If we cannot deliver because no one is available, the address is wrong, or we cannot safely reach it, we may not
          be able to give you a refund, because the food is freshly made and perishable.
        </li>
        <li>Risk in the food passes to you when it is delivered to you or left in your chosen safe place.</li>
        <li>
          If we are delayed by something outside our control, such as severe weather, traffic disruption or an incident
          affecting the kitchen, we will contact you and offer a new delivery time or a refund.
        </li>
      </ul>
    ),
  },
  {
    heading: "5. Changing or cancelling your order",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>You may change or cancel your order until 12pm of the day before your delivery. Contact us as soon as possible.</li>
        <li>
          Our meals are made to order and are perishable. Under the Consumer Contracts (Information, Cancellation and
          Additional Charges) Regulations 2013, the usual 14-day right to cancel does not apply to goods that are made to
          your specification or that are liable to deteriorate quickly. Once we have started preparing your order, we
          cannot cancel it.
        </li>
        <li>This does not affect your legal rights if the food is faulty, not as described, or not of satisfactory quality.</li>
      </ul>
    ),
  },
  {
    heading: "6. Food safety, storage and allergens",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Our food is prepared in a kitchen that handles common allergens, including gluten, milk, eggs, nuts, peanuts,
          fish, crustaceans, molluscs, sesame, celery, mustard, soya, lupin and sulphites. We cannot guarantee that any
          dish is free from traces of allergens.
        </li>
        <li>
          Allergen information is available for each dish on our website. If you have a food allergy or intolerance, it is
          your responsibility to check this information before ordering and to contact us if you are unsure.
        </li>
        <li>
          Keep your food refrigerated on arrival, eat it by the date shown on the label, and reheat it until it is piping
          hot throughout. We are not responsible for illness caused by food that has been stored or reheated incorrectly
          after delivery.
        </li>
      </ul>
    ),
  },
  {
    heading: "7. Halal",
    body: (
      <p>
        All our food is halal. We source our meat from an HMC-certified supplier and prepare it in line with halal
        standards.
      </p>
    ),
  },
  {
    heading: "8. Dietary and health information",
    body: (
      <p>
        Our descriptions such as “low carb” and “high protein” are provided for general information. Nutritional values
        are estimated. Our food and information are not medical or dietary advice. If you have a medical condition or
        special dietary needs, speak to a doctor or registered dietitian before changing your diet.
      </p>
    ),
  },
  {
    heading: "9. Our responsibility to you",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          We are responsible for loss or damage you suffer that is a foreseeable result of our breaking these terms or
          failing to use reasonable care and skill.
        </li>
        <li>
          We are not responsible for loss that was not foreseeable, or for business losses, because we sell only to
          consumers for private use.
        </li>
        <li>
          Nothing in these terms limits or excludes our liability for death or personal injury caused by our negligence,
          for fraud or fraudulent misrepresentation, or for anything else that cannot legally be limited.
        </li>
      </ul>
    ),
  },
  {
    heading: "10. Using our website",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          All logos, photos, text and designs on this website belong to us or our licensors. You may not copy or use them
          commercially without our written permission.
        </li>
        <li>You must not misuse the website, for example by trying to gain unauthorised access or introducing harmful code.</li>
        <li>
          We try to keep the website accurate and available, but we do not promise that it will always be free of errors or
          interruptions.
        </li>
      </ul>
    ),
  },
  {
    heading: "11. Your personal information",
    body: (
      <p>
        We use your personal information as set out in our{" "}
        <a href="/privacy-policy" className="text-olive-600 underline">Privacy Policy</a>. We will only use your details to
        process your order, deliver it, contact you about it, and, where you have agreed, send you marketing messages.
      </p>
    ),
  },
  {
    heading: "12. Changes to these terms",
    body: (
      <p>
        We may update these terms from time to time. The terms that apply to your order are the ones shown on our website
        when you place it.
      </p>
    ),
  },
  {
    heading: "13. Complaints",
    body: (
      <p>If you are unhappy with our service, please contact us first and we will try to resolve it quickly.</p>
    ),
  },
  {
    heading: "14. Governing law",
    body: (
      <p>
        These terms and any contract between us are governed by the law of England and Wales. Any dispute will be dealt
        with by the courts of England and Wales.
      </p>
    ),
  },
  {
    heading: "15. Contact us",
    body: <p>Email: {MAIL}</p>,
  },
]

function Terms() {
  return (
    <LegalPage
      title="Terms and Conditions"
      lastUpdated="5 October 2026"
      intro={
        <p>
          Please read these terms carefully before placing an order. By placing an order on our website, you agree to
          these terms.
        </p>
      }
      sections={SECTIONS}
    />
  )
}

export default Terms
