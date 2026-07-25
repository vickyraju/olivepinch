import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-olive-600 text-white hover:bg-olive-700 shadow-soft",
        accent: "bg-coral-500 text-white hover:bg-coral-600 shadow-soft",
        outline: "border-2 border-olive-600 text-olive-600 hover:bg-olive-50 bg-transparent",
        surface: "bg-surface text-olive-600 hover:bg-olive-50",
        ghost: "text-ink hover:bg-cream-100 bg-transparent",
        link: "text-olive-600 underline-offset-4 hover:underline p-0 h-auto rounded-none",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-12 px-6 text-base",
        lg: "h-14 px-8 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
}

export { Button, buttonVariants }
