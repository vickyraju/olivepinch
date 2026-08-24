import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { onAuthStateChanged, signOut, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth"
import { auth } from "./firebase"
import { api, ApiError } from "./api"

export interface CustomerActor {
  id: string
  fullName: string
  email: string | null
  phone: string
}

interface AuthContextValue {
  isLoading: boolean
  isAuthenticated: boolean
  customer: CustomerActor | null
  /** Set when a sign-in succeeded at the Firebase level but linking to an OlivePinch
   * account failed (e.g. no account exists yet for this phone number) — surface it, don't hang. */
  authError: string | null
  /** True specifically when the phone verified but no OlivePinch account exists for it yet —
   * lets the login page offer "go subscribe" instead of a generic retry-the-code error. */
  accountNotFound: boolean
  sendOtp: (phone: string) => Promise<void>
  verifyOtp: (code: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerActor | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [accountNotFound, setAccountNotFound] = useState(false)
  const confirmationResult = useRef<ConfirmationResult | null>(null)
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCustomer(null)
        setIsLoading(false)
        return
      }
      setAuthError(null)
      setAccountNotFound(false)
      try {
        await api.post("/customers/link-account")
        setCustomer(await api.get<CustomerActor>("/customers/me"))
      } catch (err) {
        setCustomer(null)
        if (err instanceof ApiError && err.status === 404) {
          setAccountNotFound(true)
          setAuthError(err.message)
        } else {
          setAuthError(err instanceof ApiError ? err.message : "Couldn't sign you in — try again.")
        }
        await signOut(auth)
      }
      setIsLoading(false)
    })
    return unsubscribe
  }, [])

  const sendOtp = useCallback(async (phone: string) => {
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" })
    }
    try {
      confirmationResult.current = await signInWithPhoneNumber(auth, phone, recaptchaVerifier.current)
    } catch (err) {
      // A failed attempt leaves the invisible reCAPTCHA widget already "solved" — reused as-is,
      // the next sendOtp (retry or resend) fails with "reCAPTCHA has already been rendered".
      recaptchaVerifier.current.clear()
      recaptchaVerifier.current = null
      throw err
    }
  }, [])

  const verifyOtp = useCallback(async (code: string) => {
    if (!confirmationResult.current) throw new Error("Request a code first")
    await confirmationResult.current.confirm(code)
    // onAuthStateChanged's handler above does the link-account + profile load.
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
    setCustomer(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated: !!customer, customer, authError, accountNotFound, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
