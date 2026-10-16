import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { UtensilsIcon } from "lucide-react"

export default async function LoginPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  const role = cookieStore.get("auth_role")?.value || "admin"

  const hasValidToken = Boolean(
    token && token !== "undefined" && token !== "null" && token.trim().length > 0
  )

  if (hasValidToken) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      })

      if (res.ok) {
        const body = await res.json()
        const userRole = body?.data?.role || role
        if (userRole === "kitchen") redirect("/dashboard/kitchen")
        if (userRole === "cashier") redirect("/dashboard/pos")
        redirect("/dashboard")
      }
    } catch {
      // إذا كان التوكن تالفاً أو تم حذف قاعدة البيانات (401)، نبقى في صفحة تسجيل الدخول بأمان
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <UtensilsIcon className="size-5" />
          </div>
          <span className="font-extrabold text-xl text-foreground">ريسترو</span>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
