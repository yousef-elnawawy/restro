"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function startPageLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("page-loading:start"))
  }
}

export function stopPageLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("page-loading:stop"))
  }
}

function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)
  const isFirstRender = React.useRef(true)

  const finish = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setProgress(100)
    timerRef.current = setTimeout(() => {
      setIsLoading(false)
      setProgress(0)
    }, 200)
  }, [])

  const start = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsLoading(true)
    setProgress(30)
    timerRef.current = setTimeout(() => {
      setProgress(75)
    }, 150)
  }, [])

  // عند تغيّر المسار تنتهي حركة شريط التقدم بسلاسة وفورية
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    finish()
  }, [pathname, searchParams, finish])

  // الاستماع للأحداث المخصصة ونقرات الروابط
  React.useEffect(() => {
    const handleStart = () => start()
    const handleStop = () => finish()

    window.addEventListener("page-loading:start", handleStart)
    window.addEventListener("page-loading:stop", handleStop)

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest("a") as HTMLAnchorElement | null
      if (!anchor) return

      const href = anchor.getAttribute("href")
      if (!href) return

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0 ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return
      }

      try {
        const targetUrl = new URL(anchor.href, window.location.href)
        const currentUrl = new URL(window.location.href)
        if (
          targetUrl.origin === currentUrl.origin &&
          (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search)
        ) {
          start()
        }
      } catch {
        // ignore invalid URL
      }
    }

    document.addEventListener("click", handleAnchorClick, { capture: true })

    return () => {
      window.removeEventListener("page-loading:start", handleStart)
      window.removeEventListener("page-loading:stop", handleStop)
      document.removeEventListener("click", handleAnchorClick, { capture: true })
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [start, finish])

  if (!isLoading && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[999999] h-[2.5px] pointer-events-none bg-transparent"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div
        className="h-full bg-gradient-to-r from-primary/80 via-primary to-emerald-400 shadow-[0_0_8px_var(--color-primary)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: isLoading ? 1 : 0,
        }}
      />
    </div>
  )
}

export function TopProgressBar() {
  return (
    <React.Suspense fallback={null}>
      <NavigationProgressInner />
    </React.Suspense>
  )
}

