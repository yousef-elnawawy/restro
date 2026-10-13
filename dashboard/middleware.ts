import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// المسارات المسموحة لكل دور وظيفي
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("auth_token")?.value
  const role = request.cookies.get("auth_role")?.value || "admin"

  // 1. حماية مسارات لوحة التحكم من الزوار غير المسجلين
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }

    // 2. تطبيق صلاحيات رئيس المطبخ (Kitchen)
    if (role === "kitchen") {
      const isAllowed = KITCHEN_ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      )
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/dashboard/kitchen", request.url))
      }
    }

    // 3. تطبيق صلاحيات كاشير الصالة (Cashier)
    if (role === "cashier") {
      // منع الكاشير تماماً من رؤية لوحة التحكم الإدارية وتقارير الأرباح
      if (pathname === "/dashboard" || pathname === "/dashboard/") {
        return NextResponse.redirect(new URL("/dashboard/pos", request.url))
      }

      const isAllowed = CASHIER_ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      )
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/dashboard/pos", request.url))
      }
    }
  }

  // 4. توجيه المستخدم المسجل بالفعل إذا حاول فتح صفحة تسجيل الدخول
  if (pathname === "/login" && token) {
    if (role === "kitchen") {
      return NextResponse.redirect(new URL("/dashboard/kitchen", request.url))
    }
    if (role === "cashier") {
      return NextResponse.redirect(new URL("/dashboard/pos", request.url))
    }
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}
