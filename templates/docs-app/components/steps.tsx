import * as React from "react"

import { cn } from "@/lib/utils"

// Numbered installation/walkthrough steps used in component docs.
export function Steps({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mb-12 ml-4 border-l pl-8 [counter-reset:step]", className)}
      {...props}
    />
  )
}

export function Step({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="step"
      className={cn(
        "relative mt-8 mb-3 scroll-m-32 text-base font-semibold [counter-increment:step] before:absolute before:-left-[41px] before:flex before:size-7 before:items-center before:justify-center before:rounded-full before:border before:bg-background before:text-sm before:content-[counter(step)]",
        className
      )}
      {...props}
    />
  )
}
