import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { supabase } from "./supabase"
import { api, ApiError } from "./api"

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
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

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
      try {
        // Idempotent — finds-or-links the Customer row for this verified email, whether
        // this is finishing signup or a returning login (OTP or OAuth, same call either way).
        if (event === "SIGNED_IN") await api.post("/customers/link-account")
        setCustomer(await api.get<CustomerActor>("/customers/me"))
      } catch (err) {
        setCustomer(null)
        setAuthError(err instanceof ApiError ? err.message : "Couldn't sign you in — try again.")
        await supabase.auth.signOut() // don't leave a Supabase session with no linked OlivePinch account
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

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } })
    if (error) throw error
  }, [])

  const signInWithApple = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: `${window.location.origin}/dashboard` } })
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
