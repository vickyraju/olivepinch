import { LegalPage, type LegalSection } from "@/components/legal/legal-page"

const MAIL = (
  <a href="mailto:hello@olivepinch.com" className="text-olive-600 underline">
    hello@olivepinch.com
  </a>
)

const SECTIONS: LegalSection[] = [
  {
    heading: "1. Who we are",
    body: (
      <p>
        The controller of your personal information is Olive Pinch LTD trading as Olive Pinch, at 260
        Windsor street, Birmingham, B7 4DX. You can contact us about privacy at {MAIL}.
      </p>
    ),
  },
  {
    heading: "2. What information we collect",
    body: (
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Identity and contact details:</strong> your name, email address, phone number and delivery address.</li>
        <li><strong>Order details:</strong> what you ordered, delivery date and time, delivery instructions, and your order history.</li>
        <li>
          <strong>Payment information:</strong> your payment is handled by our payment provider, so we do not see or
          store your full card number. We receive confirmation that you have paid, and the last four digits of your card.
        </li>
        <li>
          <strong>Dietary and allergy information:</strong> if you tell us about allergies, intolerances or health-related
          dietary needs, we collect that so we can prepare and describe your food safely. This can count as health
          information, which receives extra protection (see section 4).
        </li>
        <li>
          <strong>Messages and feedback:</strong> emails, phone calls, and messages you send us through our website or
          social media, and any reviews or complaints.
        </li>
        <li>
          <strong>Technical information:</strong> your IP address, browser type, device and pages you visit, collected
          through cookies and similar technologies (see section 9).
        </li>
        <li><strong>Marketing preferences:</strong> whether you have chosen to receive updates and offers from us.</li>
      </ul>
    ),
  },
  {
    heading: "3. How and why we use your information",
    body: (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border border-collapse">
            <thead className="bg-olive-50 text-ink text-left">
              <tr>
                <th className="p-3 font-semibold border border-border">What we do</th>
                <th className="p-3 font-semibold border border-border">Information used</th>
                <th className="p-3 font-semibold border border-border">Legal basis</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Take, prepare and deliver your food", "Identity and contact details, order details, delivery address", "Contract: we need it to fulfil your order"],
                ["Take payment and give refunds", "Order details, payment confirmation", "Contract"],
                ["Keep you safe with allergens and dietary needs", "Allergy and dietary information", "Your explicit consent, and our legal duty to provide allergen information"],
                ["Answer your questions and handle complaints", "Contact details, messages, order details", "Legitimate interests: running our business and helping customers"],
                ["Keep business and tax records", "Order and payment records", "Legal obligation"],
                ["Send you updates, offers and news", "Name, email, phone, marketing preferences", "Your consent. You can withdraw it at any time"],
                ["Improve our website and menu, and prevent fraud", "Technical information, order history", "Legitimate interests"],
              ].map(([what, info, basis]) => (
                <tr key={what}>
                  <td className="p-3 border border-border align-top">{what}</td>
                  <td className="p-3 border border-border align-top">{info}</td>
                  <td className="p-3 border border-border align-top">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4">We do not sell your personal information.</p>
      </>
    ),
  },
  {
    heading: "4. Allergy and health-related information",
    body: (
      <p>
        If you give us information about allergies or health-related dietary needs, we will only use it to prepare,
        describe and deliver your food safely and to answer your questions about it. We ask for your explicit consent
        to do this, and you can withdraw consent at any time by contacting us, although we may then be unable to
        confirm that a dish is suitable for you.
      </p>
    ),
  },
  {
    heading: "5. Who we share your information with",
    body: (
      <>
        <p>We only share your information where we need to, with:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>our <strong>payment provider</strong> “TakePayment” for secure payments;</li>
          <li>our <strong>delivery drivers</strong>, who receive your name, address, phone number and delivery instructions;</li>
          <li>our <strong>website host, order system and email provider</strong>, who store and process data on our behalf;</li>
          <li>
            <strong>professional advisers</strong>, such as accountants, and <strong>authorities</strong> such as HMRC or
            the police, where the law requires it.
          </li>
        </ul>
        <p className="mt-3">
          We make sure any company that handles your information on our behalf keeps it secure and uses it only on our
          instructions.
        </p>
      </>
    ),
  },
  {
    heading: "6. Transfers outside the UK",
    body: (
      <p>
        Some of our providers may store or process information outside the UK. Where this happens, we make sure
        appropriate protection is in place, such as approved standard contractual clauses or an adequacy decision.
      </p>
    ),
  },
  {
    heading: "7. How long we keep your information",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Order and payment records:</strong> for 6 years after the order, to meet tax and accounting rules.</li>
        <li><strong>Account and contact details:</strong> while you remain a customer, and for 3 years after your last order.</li>
        <li><strong>Allergy and dietary information:</strong> until you ask us to delete it, or for 3 years after your last order.</li>
        <li><strong>Marketing details:</strong> until you unsubscribe or withdraw consent.</li>
        <li><strong>Messages and complaints:</strong> for 2 years.</li>
        <li className="list-none pl-0 pt-1">When we no longer need your information, we delete it or anonymize it.</li>
      </ul>
    ),
  },
  {
    heading: "8. Keeping your information secure",
    body: (
      <p>
        We use sensible technical and organizational measures to protect your information, including secure payment
        processing, restricted access, and encrypted connections on our website. No online service is completely
        secure, so please keep any passwords private. If a data breach puts your rights at risk, we will tell you and
        the Information Commissioner’s Office (ICO) as the law requires.
      </p>
    ),
  },
  {
    id: "cookies",
    heading: "9. Cookies",
    body: (
      <p>
        Our website uses cookies, which are small files stored on your device. Essential cookies make the site and
        checkout work. We also use analytics and marketing cookies, but only if you accept them in our cookie banner.
        You can change your choice at any time through our cookie settings or your browser settings.
      </p>
    ),
  },
  {
    heading: "10. Your rights",
    body: (
      <>
        <p>Under UK data protection law, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>ask for a copy of the personal information we hold about you;</li>
          <li>ask us to correct information that is wrong or incomplete;</li>
          <li>ask us to delete your information, in some circumstances;</li>
          <li>ask us to restrict how we use your information, in some circumstances;</li>
          <li>object to us using your information based on our legitimate interests, and to direct marketing at any time;</li>
          <li>ask for your information in a portable format, where we use it based on consent or contract;</li>
          <li>withdraw consent at any time, where we rely on it.</li>
        </ul>
        <p className="mt-3">
          To use any of these rights, contact us using the details below. We will normally reply within one month and
          will not charge a fee, unless a request is clearly unfounded or excessive. We may need to confirm your identity
          first.
        </p>
        <p className="mt-3">
          You also have the right to complain to the Information Commissioner’s Office (ICO), the UK data protection
          regulator, at ico.org.uk or on 0303 123 1113. We would appreciate the chance to resolve your concern first, so
          please contact us.
        </p>
      </>
    ),
  },
  {
    heading: "11. Marketing",
    body: (
      <p>
        We will only send you marketing emails or messages if you have agreed to receive them. Every message includes a
        way to unsubscribe, or you can contact us at any time.
      </p>
    ),
  },
  {
    heading: "12. Children",
    body: (
      <p>
        Our website and ordering service are for people aged 18 and over. We do not knowingly collect information about
        children.
      </p>
    ),
  },
  {
    heading: "13. Links to other websites",
    body: (
      <p>
        Our website may link to other websites, such as our social media pages. We are not responsible for their privacy
        practices, so please read their policies.
      </p>
    ),
  },
  {
    heading: "14. Changes to this policy",
    body: (
      <p>
        We may update this policy from time to time. The latest version will always be on our website, with the date it
        was last updated at the top.
      </p>
    ),
  },
  {
    heading: "15. Contact us",
    body: <p>Email: {MAIL}</p>,
  },
]

function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="5 October 2026"
      intro={
        <p>
          At OlivePinch we respect your privacy. This policy explains what personal information we collect when you use
          our website or order from us, how we use it, who we share it with, and what rights you have. We follow the UK
          General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
        </p>
      }
      sections={SECTIONS}
    />
  )
}

export default PrivacyPolicy
