import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { supabase } from "./supabase"
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
  /** Set when a sign-in succeeded at the Supabase level but linking to an OlivePinch
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerActor | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [accountNotFound, setAccountNotFound] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setCustomer(null)
        setIsLoading(false)
        return
      }
      setAuthError(null)
      setAccountNotFound(false)
      if (event !== "SIGNED_IN" && sessionStorage.getItem(PENDING_SOCIAL_SIGNUP_KEY) === "1") {
        // A Google sign-in mid-subscribe-funnel is in flight — onAuthStateChange can fire a
        // non-SIGNED_IN event (e.g. INITIAL_SESSION) for this same session before the real
        // SIGNED_IN event arrives. Calling /customers/me here would 401 (not linked yet) and
        // trigger a destructive sign-out that races the SIGNED_IN handler doing the real work
        // below — just wait for that one instead.
        setIsLoading(false)
        return
      }
      try {
        if (event === "SIGNED_IN") {
          try {
            await api.post("/customers/link-account")
          } catch (err) {
            // Read fresh (don't clear until used) — onAuthStateChange can fire more than once
            // for the same sign-in, and clearing this eagerly on the first firing meant a
            // second firing would see it already gone and treat a genuine new signup as a
            // plain "no account" error instead of completing it.
            const isPendingSubscribeSignup = sessionStorage.getItem(PENDING_SOCIAL_SIGNUP_KEY) === "1"
            if (err instanceof ApiError && err.status === 404 && isPendingSubscribeSignup && session.user.email) {
              await completePendingSubscribeSignup(session.user.email)
              await api.post("/customers/link-account")
            } else {
              throw err
            }
          }
          // Only clear once the SIGNED_IN branch itself has actually used it — onAuthStateChange
          // also fires with other event types (e.g. INITIAL_SESSION) for the same sign-in, and
          // clearing this unconditionally meant that firing wiped the flag before the real
          // SIGNED_IN firing ever got to read it.
          sessionStorage.removeItem(PENDING_SOCIAL_SIGNUP_KEY)
        }
        setCustomer(await api.get<CustomerActor>("/customers/me"))
      } catch (err) {
        setCustomer(null)
        if (err instanceof ApiError && err.status === 404) {
          setAccountNotFound(true)
          setAuthError(err.message)
        } else {
          setAuthError(err instanceof Error ? err.message : "Couldn't sign you in — try again.")
        }
        await supabase.auth.signOut()
      }
      setIsLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const checkEmailHasAccount = useCallback(async (email: string) => {
    const { hasAccount } = await api.post<{ hasAccount: boolean }>("/customers/check-email", { email })
    return hasAccount
  }, [])

  const sendOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    if (error) throw error
  }, [])

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" })
    if (error) throw error
    // onAuthStateChange's SIGNED_IN handler above does the link-account + profile load.
  }, [])

  const signInWithGoogle = useCallback(async (redirectPath = "/dashboard") => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}${redirectPath}` } })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
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
