import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { authClient } from "./auth-client"
import { api, ApiError } from "./api"
import { GOAL_TO_ENUM, DIET_TO_ENUM } from "./enum-map"
import { SUBSCRIBE_STORAGE_KEY } from "./subscribe-storage"

export interface CustomerActor {
  id: string
  fullName: string
  email: string
}

interface AuthContextValue {
  isLoading: boolean
  isAuthenticated: boolean
  customer: CustomerActor | null
  /** Set when a sign-in succeeded but linking to an OlivePinch
   * account failed (e.g. no account exists yet for this email) — surface it, don't hang. */
  authError: string | null
  /** True specifically when a Google sign-in verified but no OlivePinch account exists for
   * that email yet — lets the login page offer "go subscribe" instead of a generic retry
   * error. Only reachable via the login page's Google button: the OTP path avoids this
   * case entirely via checkEmailHasAccount before ever sending a code. */
  accountNotFound: boolean
  /** Checks payment history for an email before sending an OTP, so an address that never
   * paid (never subscribed, or paid but abandoned signup) skips OTP entirely. */
  checkEmailHasAccount: (email: string) => Promise<boolean>
  sendOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, code: string) => Promise<void>
  signInWithGoogle: (redirectPath?: string) => Promise<void>
  logout: () => Promise<void>
  clearAuthError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Set right before an OAuth redirect fired from the subscribe funnel's account-setup step —
// signals to the SIGNED_IN handler below that a 404 from link-account means "brand new signup,
// finish it with the profile data already sitting in the funnel's local state" rather than
// "no account for this email, bounce them out" (the correct read for a login-page social click).
export const PENDING_SOCIAL_SIGNUP_KEY = "olivepinch.pendingSocialSignup"

interface PendingSubscribeState {
  postcode: string
  profile: { fullName: string; phone: string; gender: string; dateOfBirth: string; heightCm: string; weightKg: string; email: string }
  goal: string | null
  dietTypes: string[]
  allergens: string[]
  customerId: string | null
  signupToken: string | null
}

// Mirrors what account-setup.tsx's email path already does (POST /customers/provisional then
// PATCH /customers/:id/preferences) — this is that same sequence, just triggered from the
// global auth listener once an OAuth redirect hands us a verified email instead of a typed one.
async function completePendingSubscribeSignup(email: string): Promise<void> {
  const raw = sessionStorage.getItem(SUBSCRIBE_STORAGE_KEY)
  if (!raw) throw new Error("No in-progress plan found for this email — start your plan first.")
  const state = JSON.parse(raw) as PendingSubscribeState
  const p = state.profile
  if (!p?.fullName || !p.dateOfBirth || !p.heightCm || !p.weightKg || !state.goal || !state.dietTypes?.length) {
    throw new Error("Your plan details aren't ready yet — go back and finish the earlier steps.")
  }

  const { customerId, signupToken } = await api.post<{ customerId: string; signupToken: string }>("/customers/provisional", {
    fullName: p.fullName.trim(),
    email,
    phone: p.phone?.trim() || undefined,
    gender: p.gender || undefined,
    dateOfBirth: p.dateOfBirth,
    heightCm: Number(p.heightCm),
    weightKg: Number(p.weightKg),
    healthConsent: true,
    marketingOptIn: false,
  })
  await api.patch(
    `/customers/${customerId}/preferences`,
    {
      goal: GOAL_TO_ENUM[state.goal as keyof typeof GOAL_TO_ENUM],
      dietTypes: state.dietTypes.map((d) => DIET_TO_ENUM[d as keyof typeof DIET_TO_ENUM]),
      allergens: state.allergens ?? [],
      postcode: state.postcode,
    },
    { Authorization: `Bearer ${signupToken}` }
  )

  sessionStorage.setItem(SUBSCRIBE_STORAGE_KEY, JSON.stringify({ ...state, profile: { ...p, email }, customerId, signupToken }))
}

// One bootstrap at a time: React StrictMode mounts effects twice in dev, and a second concurrent run
// could finish a pending signup twice.
let bootstrapping: Promise<CustomerActor | null> | null = null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerActor | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [accountNotFound, setAccountNotFound] = useState(false)

  // Works out who is signed in. The login cookie (set by the API) is the only source of truth: no session -> signed out;
  // a session -> find the linked customer, linking it by email on the very first sign-in.
  const bootstrap = useCallback(async () => {
    if (bootstrapping) return bootstrapping
    bootstrapping = (async () => {
      const { data } = await authClient.getSession()
      if (!data?.session) {
        setCustomer(null)
        return null
      }
      setAuthError(null)
      setAccountNotFound(false)
      try {
        let me: CustomerActor
        try {
          me = await api.get<CustomerActor>("/customers/me")
        } catch (err) {
          // 401 = signed in but not linked to a customer yet (first sign-in): link by email, then load.
          if (!(err instanceof ApiError && err.status === 401)) throw err
          try {
            await api.post("/customers/link-account")
          } catch (linkErr) {
            // A Google sign-in from the subscribe funnel that finds no customer is a brand-new signup: finish it
            // with the details already held in the funnel. From the login page it just means "no account yet".
            const isPendingSubscribeSignup = sessionStorage.getItem(PENDING_SOCIAL_SIGNUP_KEY) === "1"
            if (linkErr instanceof ApiError && linkErr.status === 404 && isPendingSubscribeSignup && data.user.email) {
              await completePendingSubscribeSignup(data.user.email)
              await api.post("/customers/link-account")
            } else {
              throw linkErr
            }
          }
          me = await api.get<CustomerActor>("/customers/me")
        }
        setCustomer(me)
        // Cleared only now that the customer is set: account-setup keeps showing "Signing you in…" until then.
        sessionStorage.removeItem(PENDING_SOCIAL_SIGNUP_KEY)
        return me
      } catch (err) {
        sessionStorage.removeItem(PENDING_SOCIAL_SIGNUP_KEY)
        setCustomer(null)
        if (err instanceof ApiError && err.status === 404) {
          setAccountNotFound(true)
          setAuthError(err.message)
        } else {
          setAuthError(err instanceof Error ? err.message : "Couldn't sign you in — try again.")
        }
        await authClient.signOut()
        return null
      }
    })().finally(() => {
      bootstrapping = null
    })
    return bootstrapping
  }, [])

  useEffect(() => {
    bootstrap().finally(() => setIsLoading(false))
  }, [bootstrap])

  const checkEmailHasAccount = useCallback(async (email: string) => {
    const { hasAccount } = await api.post<{ hasAccount: boolean }>("/customers/check-email", { email })
    return hasAccount
  }, [])

  const sendOtp = useCallback(async (email: string) => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })
    if (error) throw error
  }, [])

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const { error } = await authClient.signIn.emailOtp({ email, otp: code })
    if (error) throw error
    await bootstrap()
  }, [bootstrap])

  const signInWithGoogle = useCallback(async (redirectPath = "/dashboard") => {
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${redirectPath}`,
      errorCallbackURL: `${window.location.origin}/login`,
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await authClient.signOut()
    setCustomer(null)
  }, [])

  const clearAuthError = useCallback(() => {
    setAuthError(null)
    setAccountNotFound(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated: !!customer, customer, authError, accountNotFound, checkEmailHasAccount, sendOtp, verifyOtp, signInWithGoogle, logout, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
