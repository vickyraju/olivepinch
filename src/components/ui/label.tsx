import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("text-sm font-medium text-ink block mb-1.5", className)}
      {...props}
    />
  )
}

// Marks a field the form won't submit without. Screen readers get the word, sighted
// users get the asterisk.
function Required() {
  return <span aria-hidden="true" className="text-coral-600 ml-0.5">*</span>
}

export { Label, Required }
