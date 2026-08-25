import flags from "react-phone-number-input/flags"
import { cn } from "@/lib/utils"

const GbFlag = flags.GB

interface PhoneInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

// UK-only pilot — a fixed +44 prefix beats react-phone-number-input's
// 200-country picker and lets us guarantee a real space before the caret.
function PhoneInput({ id, value, onChange, className }: PhoneInputProps) {
  const national = value.startsWith("+44") ? value.slice(3) : value.replace(/^\+/, "")

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").replace(/^0/, "")
    onChange(digits ? `+44${digits}` : "")
  }

  return (
    <div
      className={cn(
        "flex h-12 w-full items-center rounded-md border border-border bg-surface",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-olive-500 focus-within:border-olive-500",
        "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-destructive",
        className
      )}
    >
      <span className="flex items-center gap-1.5 border-r border-border pl-3 pr-2">
        <span className="h-[1.125em] w-[1.5em] overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(33,29,22,0.15)] [&_svg]:h-full [&_svg]:w-full">
          <GbFlag title="United Kingdom" />
        </span>
        <span className="text-base text-ink">+44</span>
      </span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        maxLength={11}
        value={national}
        onChange={handleChange}
        placeholder="7911 123456"
        className="h-full flex-1 min-w-0 border-0 bg-transparent pl-3 pr-4 text-base text-ink placeholder:text-ink-muted focus:outline-none"
      />
    </div>
  )
}

export { PhoneInput }
