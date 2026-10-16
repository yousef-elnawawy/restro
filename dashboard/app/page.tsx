import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function Home() {
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
      // إذا كان التوكن غير صالح أو أُعيد تهيئة السيرفر
    }
  }

  redirect("/login")
}
