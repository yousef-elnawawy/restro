"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth.store"
import {
  SunIcon,
  MoonIcon,
  BellIcon,
  ShieldCheckIcon,
  ReceiptIcon,
  ChefHatIcon,
} from "lucide-react"

// قاموس لأسماء المسارات بالعربية لتوليد مسار التنقل (Breadcrumbs) تلقائياً
const routeNames: Record<string, string> = {
  dashboard: "لوحة التحكم",
  pos: "نقطة البيع (الكاشير)",
  orders: "الطلبات",
  new: "الطلبات الجديدة",
  completed: "الطلبات المكتملة",
  menu: "المنيو",
  categories: "الأقسام",
  products: "المنتجات والأطباق",
  options: "الإضافات والخيارات",
  tables: "إدارة الطاولات",
  customers: "العملاء",
  delivery: "التوصيل والديليفري",
  registers: "الخزائن المالية",
  kitchen: "شاشة المطبخ (KDS)",
  reports: "تقارير المبيعات",
  settings: "الإعدادات",
  restaurant: "بيانات المطعم",
  appearance: "المظهر",
  account: "الحساب",
  profile: "الملف الشخصي",
  notifications: "الإشعارات",
  help: "المساعدة",
}

export function DashboardHeader() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  const { user } = useAuthStore()
  const currentRole = user?.role || "admin"

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

  const userHome = currentRole === "kitchen" ? "/dashboard/kitchen" : currentRole === "cashier" ? "/dashboard/pos" : "/dashboard"

  // تفكيك المسار لإنشاء فتات الخبز ديناميكياً
  const segments = (pathname || "").split("/").filter(Boolean)

  const breadcrumbs = React.useMemo(() => {
    // إذا كان الكاشير في صفحة نقطة البيع أو الشيف في المطبخ، نعرض عنصر فتات واحد فقط نظيف ومباشر
    if (currentRole !== "admin" && (pathname === userHome || pathname === `${userHome}/`)) {
      const homeLabel = currentRole === "kitchen" ? "شاشة المطبخ (KDS)" : "نقطة البيع (الكاشير)"
      return [
        {
          label: homeLabel,
          href: userHome,
          isLast: true,
        },
      ]
    }

    let currentPath = ""
    const list: Array<{ label: string; href: string; isLast: boolean }> = []

    segments.forEach((seg, index) => {
      currentPath += `/${seg}`
      const isLast = index === segments.length - 1
      let label = routeNames[seg] || decodeURIComponent(seg)
      let href = currentPath

      // إذا كان المستخدم غير مدير والرابط يشير لـ /dashboard، نوجهه لقسمه المصرح به
      if (href === "/dashboard" && currentRole !== "admin") {
        href = userHome
        label = currentRole === "kitchen" ? "شاشة المطبخ" : "نقطة البيع"
      }

      list.push({
        label,
        href,
        isLast,
      })
    })

    // إزالة أي عناصر متكررة في الـ href حتى لا تظهر نفس الصفحة مرتين
    const unique = list.filter((item, idx, arr) => {
      const nextItem = arr[idx + 1]
      return !nextItem || item.href !== nextItem.href
    })

    // التأكد من أن العنصر الأخير فقط يحمل isLast: true
    return unique.map((item, idx) => ({
      ...item,
      isLast: idx === unique.length - 1,
    }))
  }, [segments, pathname, currentRole, userHome])

  // تحديث عنوان نافذة المتصفح ديناميكياً ليعبر عن الصفحة الحالية
  React.useEffect(() => {
    if (breadcrumbs.length > 0) {
      const activeTitle = breadcrumbs[breadcrumbs.length - 1].label
      document.title = `ريسترو | ${activeTitle}`
    } else {
      document.title = "ريسترو | لوحة التحكم"
    }
  }, [breadcrumbs])

  const roleConfig = {
    admin: {
      label: "مدير النظام",
      subLabel: "صلاحيات كاملة",
      icon: ShieldCheckIcon,
      color: "text-primary bg-primary/10 border-primary/20",
    },
    cashier: {
      label: "كاشير الصالة",
      subLabel: "نقطة البيع والطاولات",
      icon: ReceiptIcon,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25",
    },
    kitchen: {
      label: "رئيس المطبخ",
      subLabel: "شاشة تحضير KDS",
      icon: ChefHatIcon,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    },
  }[currentRole as "admin" | "cashier" | "kitchen"] || {
    label: "مدير النظام",
    subLabel: "صلاحيات كاملة",
    icon: ShieldCheckIcon,
    color: "text-primary bg-primary/10 border-primary/20",
  }

  const RoleIcon = roleConfig.icon

  return (
    <header className="flex h-11 sm:h-12 shrink-0 items-center justify-between gap-2 px-3 sm:px-4 border-b border-border/40 transition-[width,height] ease-linear">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ms-1" />
        <Separator
          orientation="vertical"
          className="ms-2 data-vertical:h-4 data-vertical:self-auto"
        />

        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            {breadcrumbs.length === 0 || (breadcrumbs.length === 1 && segments[0] === "dashboard") ? (
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate max-w-[150px] sm:max-w-none">
                  {currentRole === "kitchen" ? "شاشة المطبخ (KDS)" : currentRole === "cashier" ? "نقطة البيع (الكاشير)" : "لوحة التحكم"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={`${crumb.href}-${idx}`}>
                  {idx > 0 && <BreadcrumbSeparator className="hidden lg:block" />}
                  <BreadcrumbItem className={!crumb.isLast ? "hidden lg:block" : "min-w-0"}>
                    {crumb.isLast ? (
                      <BreadcrumbPage className="truncate max-w-[140px] sm:max-w-xs">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={crumb.href} />}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Compact Reverb dot for medium/compact screens */}
        <div
          className="hidden sm:inline-flex xl:hidden items-center p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          title="بث التنبيهات الفوري متصل"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* User Role Badge (Read-only) */}
        {mounted && (
          <div
            className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-xs font-medium border ${roleConfig.color}`}
            title={`دور الحساب الحالي: ${roleConfig.label}`}
          >
            <RoleIcon className="size-3.5 shrink-0" />
            <span className="font-semibold text-xs whitespace-nowrap">{roleConfig.label}</span>
          </div>
        )}

        <Link
          href="/dashboard/notifications"
          className="inline-flex size-7 items-center justify-center rounded-[min(var(--radius-md),12px)] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="الإشعارات"
        >
          <BellIcon className="size-4" />
          <span className="sr-only">الإشعارات</span>
        </Link>

        {mounted && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {theme === "dark" ? (
              <SunIcon className="size-4" />
            ) : (
              <MoonIcon className="size-4" />
            )}
            <span className="sr-only">تبديل المظهر</span>
          </Button>
        )}
      </div>
    </header>
  )
}
