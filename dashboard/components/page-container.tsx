"use client"

import * as React from "react"
import { cn } from "cn"

export interface PageContainerProps extends React.ComponentProps<"div"> {
  title?: string
  description?: string
  action?: React.ReactNode
  guide?: any
  hideGuideButton?: boolean
}

export function PageContainer({
  title,
  description,
  action,
  children,
  className,
  guide: _guide,
  hideGuideButton: _hideGuideButton,
  ...props
}: PageContainerProps) {
  return (
    <div className={cn("flex flex-1 flex-col gap-3 sm:gap-3.5 min-w-0 max-w-full", className)} {...props}>
      {(title || action) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
          {title && (
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
          )}
          {action && <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
