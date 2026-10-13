"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth.store"
import { ShieldAlertIcon, Loader2Icon } from "lucide-react"

const KITCHEN_ALLOWED_PREFIXES = [
  "/dashboard/kitchen",
  "/dashboard/orders",
  "/dashboard/profile",
  "/dashboard/notifications",
  "/dashboard/help",
]

const CASHIER_ALLOWED_PREFIXES = [
  "/dashboard/pos",
  "/dashboard/tables",
  "/dashboard/orders",
  "/dashboard/customers",
  "/dashboard/registers",
  "/dashboard/profile",
  "/dashboard/notifications",
  "/dashboard/help",
]

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isInitialized, initialize } = useAuthStore()
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    initialize()
  }, [initialize])

  React.useEffect(() => {
    if (!isInitialized) return

    const role = user?.role || "admin"

    // Check kitchen permissions
    if (role === "kitchen") {
      const allowed = KITCHEN_ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      )
      if (!allowed) {
        setIsAuthorized(false)
        router.replace("/dashboard/kitchen")
        return
      }
    }

    // Check cashier permissions
    if (role === "cashier") {
      if (pathname === "/dashboard" || pathname === "/dashboard/") {
        setIsAuthorized(false)
        router.replace("/dashboard/pos")
        return
      }

      const allowed = CASHIER_ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      )
      if (!allowed) {
        setIsAuthorized(false)
        router.replace("/dashboard/pos")
        return
      }
    }

    // Admin or allowed route
    setIsAuthorized(true)
  }, [pathname, user, isInitialized, router])

  if (!isInitialized || isAuthorized === null) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2Icon className="size-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">جاري التحقق من الصلاحيات...</span>
        </div>
      </div>
    )
  }

  if (isAuthorized === false) {
    return (
      <div className="flex h-96 w-full flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <ShieldAlertIcon className="size-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">غير مصرح بالدخول</h3>
          <p className="text-xs text-muted-foreground">
            ليس لديك صلاحية لعرض هذه الصفحة. يتم توجيهك إلى قسمك المخصص...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
