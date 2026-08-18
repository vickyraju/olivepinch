import { cn } from "@/lib/utils"

interface SegmentedFilterProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}

function SegmentedFilter<T extends string>({ value, onChange, options }: SegmentedFilterProps<T>) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors",
            value === opt.value
              ? "bg-olive-600 text-white border-olive-600"
              : "bg-surface text-ink-muted border-border hover:bg-canvas"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export { SegmentedFilter }
