import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Lock } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/field-error"
import { Logo } from "@/components/ui/logo"
import { FoodPhoto } from "@/components/ui/food-photo"

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <div className="flex min-h-dvh lg:min-h-0 items-center justify-center bg-cream px-5 py-16 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-block">
            <Logo className="text-2xl" />
          </Link>

          <h1 className="text-3xl sm:text-4xl text-ink mb-2">Welcome back</h1>
          <p className="text-ink-muted mb-8">Log in to manage your deliveries, pause a week, or renew your plan.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <FieldError>{error}</FieldError>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              <Lock className="h-4 w-4" />
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            New to OlivePinch? <Link to="/subscribe" className="text-olive-600 font-medium underline">Check your postcode</Link>
          </p>
        </div>
      </div>

      {/* Reference: swap FoodPhoto's placeholder for a real lifestyle/kitchen photo (src prop) when one's ready. Desktop only, per design brief. */}
      <div className="hidden lg:block relative">
        <FoodPhoto seed={0} alt="" className="absolute inset-0 h-full w-full rounded-none" />
      </div>
    </div>
  )
}

export default Login
