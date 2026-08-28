import { useState } from "react"
import BareInput from "react-phone-number-input/input"
import { getCountries, getCountryCallingCode, parsePhoneNumber, type Country } from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import countryLabels from "react-phone-number-input/locale/en"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const ALL_COUNTRIES = getCountries()

interface CountrySearchDialogProps {
  value: Country
  onChange: (country: Country) => void
}

// Native <select> can't be searched by full country name, so this is a Dialog + text
// filter over the same country/flag/calling-code data react-phone-number-input ships.
function CountrySearchDialog({ value, onChange }: CountrySearchDialogProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const SelectedFlag = flags[value]
  const filtered = ALL_COUNTRIES.filter((c) => countryLabels[c].toLowerCase().includes(query.toLowerCase()))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Select country"
        className="PhoneInputCountry cursor-pointer bg-transparent"
      >
        <span className="PhoneInputCountryIcon">{SelectedFlag && <SelectedFlag title={countryLabels[value]} />}</span>
        <span className="text-base text-ink">+{getCountryCallingCode(value)}</span>
        <div className="PhoneInputCountrySelectArrow" />
      </button>
      <DialogContent className="max-h-[80vh] flex flex-col p-4 gap-3">
        <DialogTitle>Select a country</DialogTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country…"
            className="pl-10"
          />
        </div>
        <div className="overflow-y-auto -mx-2">
          {filtered.map((c) => {
            const Flag = flags[c]
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                  setQuery("")
                }}
                className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-cream-100 cursor-pointer"
              >
                <span className="h-[1.125em] w-[1.5em] overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(33,29,22,0.15)] shrink-0 [&_svg]:h-full [&_svg]:w-full">
                  {Flag && <Flag title={countryLabels[c]} />}
                </span>
                <span className="flex-1 text-ink">{countryLabels[c]}</span>
                <span className="text-ink-muted">+{getCountryCallingCode(c)}</span>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="text-center text-sm text-ink-muted py-6">No countries found.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface PhoneInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

// Deliveries are Birmingham-only, but the number is what the customer logs in with over OTP,
// so it has to accept whatever number actually reaches them — not just +44.
function PhoneInput({ id, value, onChange, className }: PhoneInputProps) {
  // Seeded from the saved value so editing an existing non-UK number doesn't show a GB flag.
  const [country, setCountry] = useState<Country>(() => parsePhoneNumber(value)?.country ?? "GB")
  const [focused, setFocused] = useState(false)

  return (
    <div
      className={cn(
        "flex h-12 w-full items-stretch rounded-md border border-border bg-surface",
        "focus-within:ring-2 focus-within:ring-olive-500 focus-within:border-olive-500",
        "has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-destructive",
        className
      )}
    >
      <CountrySearchDialog
        value={country}
        onChange={(c) => {
          setCountry(c)
          onChange("")
        }}
      />
      <BareInput
        id={id}
        country={country}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? "" : "7911 123456"}
        inputMode="tel"
        className="h-full flex-1 min-w-0 border-0 bg-transparent px-4 text-base text-ink placeholder:text-ink-muted focus:outline-none"
      />
    </div>
  )
}

export { PhoneInput }
