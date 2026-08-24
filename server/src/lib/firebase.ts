import { initializeApp, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

// ponytail: unset -> requireAuth fails closed (every request 401s) rather than silently
// running with no auth. Customer auth has no dev-mode fallback like payments/email do —
// there's no safe "pretend it worked" for identity.
export const firebaseAuth = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? getAuth(initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) }))
  : null
