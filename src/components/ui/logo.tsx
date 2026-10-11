import { cn } from "@/lib/utils"

// Intrinsic 512x112 (2x+ of the largest rendered size); size it with a height class.
function Logo({ className }: { className?: string }) {
  return <img src="/logo.webp" alt="OlivePinch" width={512} height={112} className={cn("h-9 w-auto", className)} />
}

export { Logo }
