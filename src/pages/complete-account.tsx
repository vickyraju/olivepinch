import { Navigate, useSearchParams } from "react-router-dom"

// FR-C26 recovery links used to carry a signed verification token and land here to create
// a password. Now that customer auth is Firebase phone OTP (no password), Firebase's own
// code is what actually proves identity — this page's only job left is forwarding the
// prefilled phone number on to /login. Old links with a ?token= still work: token is ignored.
function CompleteAccount() {
  const [searchParams] = useSearchParams()
  const phone = searchParams.get("phone")

  return <Navigate to={phone ? `/login?phone=${encodeURIComponent(phone)}` : "/login"} replace />
}

export default CompleteAccount
