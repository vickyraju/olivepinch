import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

// ponytail: unset -> requireAuth fails closed (every request 401s) rather than silently
// running with no auth. Customer auth has no dev-mode fallback like payments/email do —
// there's no safe "pretend it worked" for identity.
export const supabase = url && anonKey ? createClient(url, anonKey) : null
