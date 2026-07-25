import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { api, clearToken, getToken, setToken } from "./api"

export interface CustomerActor {
  id: string
  fullName: string
  email: string
}

interface AuthContextValue {
  isLoading: boolean
  isAuthenticated: boolean
  customer: CustomerActor | null
  login: (email: string, password: string) => Promise<void>
  /** Store a token already issued elsewhere (e.g. just after password creation) and load the profile. */
  setSession: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerActor | null>(null)

  const refreshMe = useCallback(async () => {
    try {
      setCustomer(await api.get<CustomerActor>("/customers/me"))
    } catch {
      setCustomer(null)
      clearToken()
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      if (getToken()) await refreshMe()
      setIsLoading(false)
    })()
  }, [refreshMe])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string }>("/auth/login", { email, password })
    setToken(res.token)
    await refreshMe()
  }, [refreshMe])

  const setSession = useCallback(async (token: string) => {
    setToken(token)
    await refreshMe()
  }, [refreshMe])

  const logout = useCallback(() => {
    clearToken()
    setCustomer(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated: !!customer, customer, login, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
