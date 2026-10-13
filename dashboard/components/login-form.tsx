"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth.store"
import { AlertCircleIcon, EyeIcon, EyeOffIcon, Loader2Icon, LockIcon, MailIcon } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      const res = await login(email, password)

      if (res.success) {
        const currentUser = useAuthStore.getState().user
        const role = currentUser?.role || "admin"
        const targetUrl =
          role === "kitchen"
            ? "/dashboard/kitchen"
            : role === "cashier"
            ? "/dashboard/pos"
            : "/dashboard"

        window.location.replace(targetUrl)
      } else {
        setErrorMessage(res.message)
      }
    } catch {
      setErrorMessage("تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الباك إند.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
          <CardDescription>
            لوحة تحكم إدارة المطعم والطلبات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
                <AlertCircleIcon className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel>
                <div className="relative flex items-center">
                  <Input
                    id="email"
                    type="email"
                    placeholder="ادخل الايميل"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 pr-10 pl-3 text-right"
                    required
                    disabled={loading}
                  />
                  <MailIcon className="absolute right-3 size-4 text-muted-foreground pointer-events-none" />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">كلمة المرور</FieldLabel>
                <div className="relative flex items-center">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pr-10 pl-10 text-right font-mono"
                    required
                    disabled={loading}
                  />
                  <LockIcon className="absolute right-3 size-4 text-muted-foreground pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    className="absolute left-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
              </Field>

              <Field>
                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2Icon className="size-4 animate-spin" />
                      <span>جاري تسجيل الدخول...</span>
                    </span>
                  ) : (
                    "تسجيل الدخول"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* <FieldDescription className="px-4 text-center text-xs text-muted-foreground">
        بيانات المدير الافتراضية للاختبار: admin@restro.com / Admin@2026!
      </FieldDescription> */}
    </div>
  )
}
