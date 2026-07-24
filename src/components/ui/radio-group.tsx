import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { cn } from "@/lib/utils"

const RadioGroup = RadioGroupPrimitive.Root

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "h-5 w-5 shrink-0 rounded-full border-2 border-border bg-surface cursor-pointer",
        "data-[state=checked]:border-olive-600",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center w-full h-full relative after:content-[''] after:h-2.5 after:w-2.5 after:rounded-full after:bg-olive-600" />
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
