import { cn } from "@/lib/utils"

// Mirrors src/components/ui/logo.tsx in the customer app's wordmark (same italic Georgia
// serif) — the one fixed brand asset shared across both apps — but supports a light-on-dark
// variant for the admin panel's graphite sidebar, which runs its own distinct visual system.
function Logo({ className, variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  return (
    <span
      className={cn("italic font-bold", className)}
      style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: variant === "light" ? "#f4f5f4" : "#1b2a0c" }}
    >
      OlivePinch
    </span>
  )
}

export { Logo }
