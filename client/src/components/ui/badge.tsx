import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate hover:scale-[1.02]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm font-medium",
        secondary: "border-transparent bg-secondary text-secondary-foreground font-medium",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm font-medium",
        success: "border-transparent bg-green-600 text-white shadow-sm font-medium",
        warning: "border-transparent bg-orange-600 text-white shadow-sm font-medium",
        outline: " border-2 [border-color:var(--badge-outline)] shadow-xs font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
