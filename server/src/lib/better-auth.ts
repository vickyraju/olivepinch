import { betterAuth } from "better-auth"
import { emailOTP } from "better-auth/plugins/email-otp"
import { prismaAdapter } from "@better-auth/prisma-adapter"
import { prisma } from "./prisma.js"
import { sendEmail } from "./email.js"
import { loginCodeEmail, LOGIN_CODE_EXPIRY_MINUTES } from "./login-code-email.js"

const isProd = process.env.NODE_ENV === "production"

const secret = process.env.BETTER_AUTH_SECRET ?? (isProd ? undefined : "dev-only-secret-not-for-production-use-1234567890")
if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET (32+ characters) must be set in production")

// Origins allowed to start sign-ins and receive the session cookie: the customer site and the admin site.
export function allowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter((o) => o && o !== "*")
  if (configured?.length) return configured
  return isProd ? [] : ["http://localhost:5173", "http://localhost:5199", "http://localhost:5198"]
}

// Only people who already have a customer record get a code. Without this anyone could make us email any
// address. The answer is the same either way so the endpoint can't be used to find out who is a customer.
// ponytail: in-memory per-email cap, resets on restart; move to the database if the backend ever runs as >1 process.
const sentRecently = new Map<string, number[]>()
function underEmailLimit(email: string): boolean {
  const now = Date.now()
  const recent = (sentRecently.get(email) ?? []).filter((t) => now - t < 60 * 60 * 1000)
  if (recent.length >= 5) return false
  sentRecently.set(email, [...recent, now])
  return true
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: allowedOrigins(),
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
      : {},
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: LOGIN_CODE_EXPIRY_MINUTES * 60,
      allowedAttempts: 5,
      // Encrypted (not hashed) so that asking again within the validity window re-sends the SAME code: two quick
      // requests (double click, the page loading twice) then give two identical emails instead of the first
      // email's code silently stopping working.
      storeOTP: "encrypted",
      resendStrategy: "reuse",
      async sendVerificationOTP({ email, otp }) {
        const address = email.trim().toLowerCase()
        if (!underEmailLimit(address)) return
        const customer = await prisma.customer.findFirst({ where: { email: { equals: address, mode: "insensitive" } }, select: { id: true } })
        if (!customer) return
        const { subject, text, html } = loginCodeEmail(otp)
        // Not awaited by Better Auth's recommendation (response time must not reveal whether we sent anything).
        void sendEmail(address, subject, text, html).catch((err) => console.error("login code email failed", err))
      },
    }),
  ],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/email-otp/send-verification-otp": { window: 60, max: 3 },
      "/sign-in/email-otp": { window: 60, max: 10 },
    },
  },
  advanced: {
    useSecureCookies: isProd,
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    // The sites and the API live on sibling subdomains of one domain, so the cookie is shared across them.
    ...(process.env.AUTH_COOKIE_DOMAIN ? { crossSubDomainCookies: { enabled: true, domain: process.env.AUTH_COOKIE_DOMAIN } } : {}),
  },
})
