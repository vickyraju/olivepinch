import { cn } from "@/lib/utils"

// Mirrors src/components/ui/logo.tsx in the customer app's wordmark (same italic Georgia
// serif) — the one fixed brand asset shared across both apps.
function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn("italic font-bold", className)}
      style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#1b2a0c" }}
    >
      OlivePinch
    </span>
  )
}

export { Logo }
