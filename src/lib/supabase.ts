import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — auth will not work.")
}

// createClient() throws synchronously on an empty key, which would take down every page
// (this module is imported app-wide via auth.tsx) rather than just the auth-dependent
// parts — fall back to a placeholder so only actual auth calls fail, not the whole app.
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-anon-key")
