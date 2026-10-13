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

function isValidToken(token: string | null | undefined): boolean {
  if (!token) return false
  const t = token.trim()
  return t.length > 0 && t !== "undefined" && t !== "null"
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const rawToken = request.cookies.get("auth_token")?.value
  const hasToken = isValidToken(rawToken)
  const role = request.cookies.get("auth_role")?.value || "admin"

  // 1. توجيه الصفحة الرئيسية الجذرية (/)
  if (pathname === "/") {
    if (!hasToken) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    if (role === "kitchen") {
      return NextResponse.redirect(new URL("/dashboard/kitchen", request.url))
    }
    if (role === "cashier") {
      return NextResponse.redirect(new URL("/dashboard/pos", request.url))
    }
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // 2. حماية مسارات لوحة التحكم من الزوار غير المسجلين
  if (pathname.startsWith("/dashboard")) {
    if (!hasToken) {
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }

    // تطبيق صلاحيات رئيس المطبخ (Kitchen)
    if (role === "kitchen") {
      const isAllowed = KITCHEN_ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
      )
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/dashboard/kitchen", request.url))
      }
    }

    // تطبيق صلاحيات كاشير الصالة (Cashier)
    if (role === "cashier") {
      // منع الكاشير تماماً من رؤية لوحة التحكم الإدارية العامة
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

  // 3. توجيه المستخدم المسجل بالفعل إذا حاول فتح صفحة تسجيل الدخول
  if (pathname === "/login" && hasToken) {
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
  matcher: ["/dashboard/:path*", "/login", "/"],
}
