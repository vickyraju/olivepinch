import { Navigate, useSearchParams } from "react-router-dom"

// FR-C26 recovery links used to carry a signed verification token and land here to create
// a password. Now that customer auth is Supabase OTP (no password), Supabase's own code is
// what actually proves identity — this page's only job left is forwarding the prefilled
// email on to /login. Old links with a ?token= still work: token is just ignored.
function CompleteAccount() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get("email")

  return <Navigate to={email ? `/login?email=${encodeURIComponent(email)}` : "/login"} replace />
}

export default CompleteAccount
