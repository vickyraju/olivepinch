import { cn } from "@/lib/utils"

// Mirrors src/components/ui/logo.tsx in the customer app exactly, so the admin panel's
// wordmark matches the real site instead of the separate two-tone treatment that had drifted
// in here (sidebar.tsx has the same divergence, left as-is — only the login page was asked for).
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
