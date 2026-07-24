import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-md border border-border bg-surface px-4 text-base text-ink placeholder:text-ink-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:border-olive-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
