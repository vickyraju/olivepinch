import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { api, clearToken, getToken, setToken } from "./api"

interface AdminActor {
  id: string
  name: string
  email: string
}

interface AuthContextValue {
  isLoading: boolean
  isAuthenticated: boolean
  admin: AdminActor | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [admin, setAdmin] = useState<AdminActor | null>(null)

  const refreshMe = useCallback(async () => {
    try {
      setAdmin(await api.get<AdminActor>("/auth/me"))
    } catch {
      setAdmin(null)
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
    const res = await api.post<{ token: string; actor: AdminActor }>("/auth/login", { email, password })
    setToken(res.token)
    setAdmin(res.actor)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAdmin(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated: !!admin, admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
