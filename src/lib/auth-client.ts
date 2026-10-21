import { createAuthClient } from "better-auth/react"
import { emailOTPClient } from "better-auth/client/plugins"

// The API (which also hosts login at /api/auth) — same address the rest of the app talks to, minus "/api".
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"

export const authClient = createAuthClient({
  baseURL: API_URL.replace(/\/api\/?$/, ""),
  plugins: [emailOTPClient()],
})
