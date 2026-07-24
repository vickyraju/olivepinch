import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-medium text-ink-muted block mb-1.5", className)} {...props} />
}

export { Label }
