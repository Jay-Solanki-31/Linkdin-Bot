import * as React from "react"
import { cn } from "@/lib/utils"

const GlassCard = React.forwardRef(({ className, children, hover = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur-md shadow-lg transition-all duration-300",
      hover && "hover:shadow-xl hover:bg-white/10 dark:hover:bg-black/30",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
GlassCard.displayName = "GlassCard"

const GlassCardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
GlassCardHeader.displayName = "GlassCardHeader"

const GlassCardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
GlassCardTitle.displayName = "GlassCardTitle"

const GlassCardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
GlassCardContent.displayName = "GlassCardContent"

export { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent }