import { cn } from "@/lib/utils"

const PALETTES = [
  "bg-olive-100 text-olive-700",
  "bg-coral-100 text-coral-600",
  "bg-cream-100 text-ink-muted",
]

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function AvatarPlaceholder({ name, seed = 0, className }: { name: string; seed?: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold",
        PALETTES[seed % PALETTES.length],
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

export { AvatarPlaceholder }
