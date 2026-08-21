import RPNInput, { type Country } from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import { cn } from "@/lib/utils"

interface PhoneInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  defaultCountry?: Country
  "aria-invalid"?: boolean
  className?: string
}

function PhoneInput({
  id,
  value,
  onChange,
  placeholder,
  defaultCountry = "GB",
  "aria-invalid": invalid,
  className,
}: PhoneInputProps) {
  return (
    <RPNInput
      id={id}
      international
      limitMaxLength
      defaultCountry={defaultCountry}
      flags={flags}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      placeholder={placeholder}
      addInternationalOption={false}
      countryCallingCodeEditable={false}
      countrySelectProps={{ "aria-label": "Country code" }}
      numberInputProps={{
        className: "h-full flex-1 min-w-0 border-0 bg-transparent px-4 text-base text-ink placeholder:text-ink-muted focus:outline-none",
      }}
      className={cn(
        "flex h-12 w-full items-stretch rounded-md border border-border bg-surface",
        "focus-within:ring-2 focus-within:ring-olive-500 focus-within:border-olive-500",
        invalid && "border-destructive ring-destructive",
        className
      )}
    />
  )
}

export { PhoneInput }
