import { cn } from "@/lib/utils"

function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn("italic font-bold", className)}
      style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#1b2a0c" }}
    >
      Olive Pinch
    </span>
  )
}

export { Logo }
