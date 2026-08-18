import { cn } from "@/lib/utils"

// A small categorical palette purely for telling rows of people apart at a glance — distinct
// from the semantic moss/coral action-accent system (see DESIGN.md's "One Accent" rule, which
// governs meaning-bearing color, not identity color-coding). Picked deterministically per name
// so the same person always lands on the same chip color across the app.
const PALETTE = [
  { bg: "#e6effa", text: "#2f5f9e" }, // blue
  { bg: "#f3e8fb", text: "#7c3fa8" }, // violet
  { bg: "#fbe8ef", text: "#b83d6b" }, // pink
  { bg: "#e6f7f1", text: "#1f8a6b" }, // teal
  { bg: "#fdf1de", text: "#a86a1a" }, // amber
  { bg: "#eef2ec", text: "#3c6238" }, // moss
]

function colorFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
}

function Avatar({ name, className }: { name: string; className?: string }) {
  const { bg, text } = colorFor(name)
  return (
    <span
      className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", className)}
      style={{ backgroundColor: bg, color: text }}
    >
      {initials(name)}
    </span>
  )
}

export { Avatar }
