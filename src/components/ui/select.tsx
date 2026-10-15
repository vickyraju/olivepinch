import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-12 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-4 text-base text-ink cursor-pointer",
        // The selected value is one line: long names (e.g. a meal name beside its thumbnail) get an
        // ellipsis instead of wrapping out of the fixed-height box.
        "[&>span:first-child]:min-w-0 [&>span:first-child]:flex-1 [&>span:first-child]:overflow-hidden [&>span:first-child]:text-left [&>span:first-child]:whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:border-olive-500",
        "data-[placeholder]:text-ink-muted disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-coral-50 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "z-50 overflow-hidden rounded-md border border-border bg-surface shadow-lifted",
          className
        )}
        position="popper"
        sideOffset={4}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1 min-w-[var(--radix-select-trigger-width)] max-h-[min(300px,var(--radix-select-content-available-height))] overflow-y-auto">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex items-center rounded-sm py-2.5 pl-8 pr-3 text-base text-ink cursor-pointer select-none",
        "focus:bg-olive-50 focus:outline-none data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-olive-600" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem }
