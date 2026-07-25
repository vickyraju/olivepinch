import { useState } from "react"
import type { FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import { ApiError } from "@/lib/api"

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(undefined)
    setLoading(true)
    try {
      await login(email, password)
      navigate("/")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-page-bg">
      <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-lg p-[48px] border border-gray-200">
        <div className="flex flex-col items-center">
          <span className="font-bold text-brand-green text-[28px] leading-none">OlivePinch</span>
          <span className="mt-2 text-[11px] font-semibold text-gray-500 uppercase tracking-[1px]">Admin Panel</span>
        </div>
        <div className="h-px w-full bg-gray-200 my-6" />
        <div className="mb-6">
          <h1 className="text-[22px] font-bold text-gray-900 leading-tight">Welcome back</h1>
          <p className="text-[14px] text-gray-500 mt-1">Sign in to your admin account</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-700 mb-1">Email Address</label>
            <input
              className="w-full h-[40px] px-3 border border-gray-300 rounded text-[14px] outline-none focus:ring-2 focus:ring-[#418A56]/20 transition-all"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                className="w-full h-[40px] px-3 border border-gray-300 rounded text-[14px] outline-none focus:ring-2 focus:ring-[#418A56]/20 transition-all pr-10"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>
          {error ? <p role="alert" className="text-[13px] text-status-red">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[44px] bg-[#2E6B3E] text-white rounded-lg text-[14px] font-semibold hover:bg-primary transition-colors mt-4 disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
