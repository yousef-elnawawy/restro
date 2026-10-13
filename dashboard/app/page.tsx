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
    if (role === "kitchen") redirect("/dashboard/kitchen")
    if (role === "cashier") redirect("/dashboard/pos")
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
