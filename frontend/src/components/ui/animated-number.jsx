import { cn } from "@/lib/utils"

export function AnimatedNumber({ value, className, format = true }) {
  const displayValue = Number(value) || 0
  const formatted = format && displayValue >= 1000 
    ? displayValue.toLocaleString() 
    : String(displayValue)

  return (
    <span className={cn("inline-block", className)}>
      {formatted}
    </span>
  )
}