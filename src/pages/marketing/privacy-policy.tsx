const SECTIONS = [
  {
    heading: "What we collect",
    body: (
      <>
        <p>When you sign up and use OlivePinch, we collect:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Contact and account details — name, email, phone, delivery address, postcode.</li>
          <li>
            Health data you choose to give us — height, weight, and body measurements, used to
            calculate your BMI and recommend meals for your goal. This is <strong>special category
            data</strong> under UK GDPR, so we only collect it with your explicit, separate consent
            during signup, and you can withdraw it at any time from your dashboard.
          </li>
          <li>Order, subscription, and delivery history — plans chosen, menu selections, delivery dates.</li>
          <li>Payment confirmation — processed by Worldpay; we never see or store your card details.</li>
          <li>Marketing preferences, if you opt in — this is always optional and separate from account creation.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "How we use it",
    body: (
      <p>
        To run your subscription: matching meals to your goals, processing payment, scheduling and
        confirming deliveries, and providing customer support. Where you've opted in, we may also
        email you about new menus or offers. We do not use your health data for anything beyond
        meal recommendation, and we do not sell your data.
      </p>
    ),
  },
  {
    heading: "Who we share it with",
    body: (
      <>
        <p>We share only what's needed to run the service, with these processors:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Supabase</strong> — hosts our database and handles account sign-in.</li>
          <li><strong>Worldpay</strong> — processes card payments securely; card details go directly to Worldpay.</li>
          <li><strong>Resend</strong> — sends transactional emails (order confirmations, account recovery).</li>
        </ul>
        <p className="mt-2">We don't sell or rent your data to third parties for marketing.</p>
      </>
    ),
  },
  {
    heading: "How long we keep it",
    body: (
      <p>
        We keep active account data for as long as your subscription is open. If you close your
        account, records we're legally required to retain (such as payment and order history for
        tax purposes) are anonymised rather than deleted outright — your name and contact details
        are removed, but the underlying transaction record is kept for the period the law requires.
      </p>
    ),
  },
  {
    heading: "Your rights",
    body: (
      <>
        <p>Under UK GDPR, you can at any time:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Export your data</strong> — download everything we hold on you, including your
            profile, health data, order history, and consent record, from your dashboard's Privacy
            settings.
          </li>
          <li>
            <strong>Delete your account</strong> — also from your dashboard's Privacy settings. This
            erases your personal data immediately, other than what we're legally required to retain
            in anonymised form as described above.
          </li>
          <li>Withdraw marketing or health-data consent at any time from your account settings.</li>
          <li>Contact us to correct inaccurate data or ask any question about how we handle it.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "Cookies",
    body: (
      <p id="cookies">
        We use only strictly necessary cookies — to keep you signed in and remember your session.
        We don't use advertising, tracking, or analytics cookies, so there are no optional cookie
        preferences to configure. Because these cookies are essential to the site working, they
        can't be switched off; you can still clear them any time via your browser settings.
      </p>
    ),
  },
  {
    heading: "Contact us",
    body: (
      <p>
        Questions about this policy or your data? Email{" "}
        <a href="mailto:hello@olivepinch.co.uk" className="text-olive-600 underline">
          hello@olivepinch.co.uk
        </a>{" "}
        or reach us via our{" "}
        <a href="/contact" className="text-olive-600 underline">Contact page</a>.
      </p>
    ),
  },
]

function PrivacyPolicy() {
  return (
    <section className="pt-14 pb-20 sm:pt-20 sm:pb-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <h1 className="text-4xl sm:text-5xl text-ink mb-3">Privacy Policy</h1>
        <p className="text-ink-muted mb-12">Last updated 24 August 2026</p>

        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-xl font-semibold text-ink mb-3">{section.heading}</h2>
              <div className="text-ink-muted leading-relaxed">{section.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PrivacyPolicy
