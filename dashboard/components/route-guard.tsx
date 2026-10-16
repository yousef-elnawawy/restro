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
  "/dashboard/delivery",
  "/dashboard/customers",
  "/dashboard/registers",
  "/dashboard/profile",
  "/dashboard/notifications",
  "/dashboard/help",
]

const DELIVERY_ALLOWED_PREFIXES = [
  "/dashboard/delivery",
  "/dashboard/profile",
  "/dashboard/notifications",
  "/dashboard/help",
]

function checkPermission(role: string | undefined, pathname: string): boolean {
  if (role === "kitchen") {
    return KITCHEN_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    )
  }
  if (role === "cashier") {
    if (pathname === "/dashboard" || pathname === "/dashboard/") return false
    return CASHIER_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    )
  }
  if (role === "delivery") {
    if (pathname === "/dashboard" || pathname === "/dashboard/") return false
    return DELIVERY_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    )
  }
  return true
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, token, isInitialized, initialize } = useAuthStore()

  React.useEffect(() => {
    initialize()
  }, [initialize])

  // التحقق الفوري والمتزامن لتجنب وميض التحميل المزعج
  const hasAuth = Boolean(user && token)
  const isAllowed = hasAuth ? checkPermission(user?.role, pathname) : null

  React.useEffect(() => {
    if (!isInitialized) return

    if (!user || !token) {
      if (typeof window !== "undefined") {
        window.location.replace("/login")
      } else {
        router.replace("/login")
      }
      return
    }

    if (!isAllowed) {
      if (user.role === "kitchen") {
        router.replace("/dashboard/kitchen")
      } else if (user.role === "cashier") {
        router.replace("/dashboard/pos")
      } else if (user.role === "delivery") {
        router.replace("/dashboard/delivery")
      }
    }
  }, [pathname, user, token, isInitialized, isAllowed, router])

  if (!isInitialized && !hasAuth) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <Loader2Icon className="size-5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">
            جاري التحميل...
          </span>
        </div>
      </div>
    )
  }

  if (hasAuth && !isAllowed) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <ShieldAlertIcon className="size-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">غير مصرح بالدخول</h3>
          <p className="text-xs text-muted-foreground">
            جاري نقلك إلى قسمك المخصص...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

