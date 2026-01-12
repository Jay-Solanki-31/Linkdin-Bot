import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        secondary: "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        destructive: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        outline: "border border-border/40 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
