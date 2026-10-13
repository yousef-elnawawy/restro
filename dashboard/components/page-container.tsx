"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { cn } from "cn"
import { InfoIcon } from "lucide-react"
import { getGuideForRoute, type PageGuide } from "@/lib/page-guides"
import { PageGuideDialog } from "@/components/page-guide-dialog"

export interface PageContainerProps extends React.ComponentProps<"div"> {
  title?: string
  description?: string
  action?: React.ReactNode
  guide?: PageGuide
  hideGuideButton?: boolean
}

export function PageContainer({
  title,
  description,
  action,
  children,
  className,
  guide: customGuide,
  hideGuideButton = false,
  ...props
}: PageContainerProps) {
  const pathname = usePathname()
  const [guideOpen, setGuideOpen] = React.useState(false)

  // العثور على دليل الصفحة المناسب تلقائياً من المسار أو التمرير المباشر
  const resolvedGuide = React.useMemo(() => {
    if (customGuide) return customGuide
    if (!pathname) return null
    return getGuideForRoute(pathname, title)
  }, [customGuide, pathname, title])

  return (
    <div className={cn("flex flex-1 flex-col gap-3.5 sm:gap-4 min-w-0 max-w-full", className)} {...props}>
      {(title || description || action) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                  {title}
                </h1>
                {resolvedGuide && !hideGuideButton && (
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="inline-flex items-center justify-center size-6 rounded-full bg-primary/10 hover:bg-primary/25 text-primary border border-primary/25 hover:border-primary/50 transition-all shadow-xs hover:scale-110 active:scale-95 shrink-0 group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/40 ring-offset-background"
                    title={`دليل وشرح صفحة: ${resolvedGuide.title} (اضغط لمعرفة كيفية الاستخدام)`}
                    aria-label={`دليل وشرح صفحة ${resolvedGuide.title}`}
                  >
                    <InfoIcon className="size-3.5 transition-transform group-hover:rotate-12" />
                  </button>
                )}
              </div>
            )}
            {description && (
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto shrink-0">{action}</div>}
        </div>
      )}
      {children}

      {/* نافذة دليل واستخدام الصفحة التفاعلي */}
      <PageGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        guide={resolvedGuide}
      />
    </div>
  )
}
