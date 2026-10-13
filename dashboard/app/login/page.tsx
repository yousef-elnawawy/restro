import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { UtensilsIcon } from "lucide-react"

export default async function LoginPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  const role = cookieStore.get("auth_role")?.value || "admin"

  if (token) {
    if (role === "kitchen") redirect("/dashboard/kitchen")
    if (role === "cashier") redirect("/dashboard/pos")
    redirect("/dashboard")
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
