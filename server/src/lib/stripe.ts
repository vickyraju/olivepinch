import Stripe from "stripe"

const key = process.env.STRIPE_SECRET_KEY

// ponytail: undefined key -> stripe client is null and payment routes fall back to
// a dev-mode auto-succeed path, so checkout is testable without real Stripe keys
export const stripe = key ? new Stripe(key) : null
