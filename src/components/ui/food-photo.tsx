import { UtensilsCrossed, Salad, Soup, Wheat } from "lucide-react"
import { cn } from "@/lib/utils"

const STYLES = [
  { radial: "circle at 30% 20%, var(--color-olive-300), var(--color-olive-100) 55%, var(--color-coral-100)", icon: UtensilsCrossed },
  { radial: "circle at 70% 25%, var(--color-coral-100), var(--color-cream-100) 55%, var(--color-olive-100)", icon: Salad },
  { radial: "circle at 25% 75%, var(--color-olive-100), var(--color-cream) 55%, var(--color-coral-50)", icon: Soup },
  { radial: "circle at 75% 70%, var(--color-coral-50), var(--color-olive-50) 55%, var(--color-olive-100)", icon: Wheat },
]

function FoodPhoto({ seed = 0, src, alt, className }: { seed?: number; src?: string; alt?: string; className?: string }) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl", className)}>
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }

  const { radial, icon: Icon } = STYLES[seed % STYLES.length]
  return (
    <div
      className={cn("relative flex items-center justify-center overflow-hidden rounded-xl", className)}
      style={{ background: `radial-gradient(${radial})` }}
      role="img"
      aria-label="Meal photo placeholder"
    >
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />
      <Icon className="h-8 w-8 text-olive-700/35 relative" strokeWidth={1.5} />
    </div>
  )
}

export { FoodPhoto }
