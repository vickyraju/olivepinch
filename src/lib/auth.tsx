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
  sendOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, code: string) => Promise<void>
  signInWithGoogle: (redirectPath?: string) => Promise<void>
  signInWithApple: (redirectPath?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Set right before an OAuth redirect fired from the subscribe funnel's account-setup step —
// signals to the SIGNED_IN handler below that a 404 from link-account means "brand new signup,
// finish it with the profile data already sitting in the funnel's local state" rather than
// "no account for this email, bounce them out" (the correct read for a login-page social click).
export const PENDING_SOCIAL_SIGNUP_KEY = "olivepinch.pendingSocialSignup"

interface PendingSubscribeState {
  postcode: string
  profile: { fullName: string; gender: string; age: string; heightCm: string; weightKg: string; email: string }
  goal: string | null
  dietType: string | null
  allergens: string[]
  customerId: string | null
}

// Mirrors what account-setup.tsx's email path already does (POST /customers/provisional then
// PATCH /customers/:id/preferences) — this is that same sequence, just triggered from the
// global auth listener once an OAuth redirect hands us a verified email instead of a typed one.
async function completePendingSubscribeSignup(email: string): Promise<void> {
  const raw = sessionStorage.getItem(SUBSCRIBE_STORAGE_KEY)
  if (!raw) throw new Error("No in-progress plan found for this email — start your plan first.")
  const state = JSON.parse(raw) as PendingSubscribeState
  const p = state.profile
  if (!p?.fullName || !p.age || !p.heightCm || !p.weightKg || !state.goal || !state.dietType) {
    throw new Error("Your plan details aren't ready yet — go back and finish the earlier steps.")
  }

  const { customerId } = await api.post<{ customerId: string }>("/customers/provisional", {
    fullName: p.fullName.trim(),
    email,
    gender: p.gender || undefined,
    age: Number(p.age),
    heightCm: Number(p.heightCm),
    weightKg: Number(p.weightKg),
    healthConsent: true,
    marketingOptIn: false,
  })
  await api.patch(`/customers/${customerId}/preferences`, {
    goal: GOAL_TO_ENUM[state.goal as keyof typeof GOAL_TO_ENUM],
    dietType: DIET_TO_ENUM[state.dietType as keyof typeof DIET_TO_ENUM],
    allergens: state.allergens ?? [],
    postcode: state.postcode,
  })

  sessionStorage.setItem(SUBSCRIBE_STORAGE_KEY, JSON.stringify({ ...state, profile: { ...p, email }, customerId }))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerActor | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setCustomer(null)
        setIsLoading(false)
        return
      }
      setAuthError(null)
      const isPendingSubscribeSignup = sessionStorage.getItem(PENDING_SOCIAL_SIGNUP_KEY) === "1"
      sessionStorage.removeItem(PENDING_SOCIAL_SIGNUP_KEY)
      try {
        if (event === "SIGNED_IN") {
          try {
            await api.post("/customers/link-account")
          } catch (err) {
            if (err instanceof ApiError && err.status === 404 && isPendingSubscribeSignup && session.user.email) {
              await completePendingSubscribeSignup(session.user.email)
              await api.post("/customers/link-account")
            } else {
              throw err
            }
          }
        }
        setCustomer(await api.get<CustomerActor>("/customers/me"))
      } catch (err) {
        setCustomer(null)
        setAuthError(err instanceof Error ? err.message : "Couldn't sign you in — try again.")
        await supabase.auth.signOut()
      }
      setIsLoading(false)
    })
    return () => subscription.unsubscribe()
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

  const signInWithApple = useCallback(async (redirectPath = "/dashboard") => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: `${window.location.origin}${redirectPath}` } })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setCustomer(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated: !!customer, customer, authError, sendOtp, verifyOtp, signInWithGoogle, signInWithApple, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
