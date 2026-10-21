"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { PageContainer } from "@/components/page-container"
import { useAuthStore } from "@/store/auth.store"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  Loader2Icon,
  MailIcon,
  SaveIcon,
  UserCheckIcon,
} from "lucide-react"

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const initializeAuth = useAuthStore((state) => state.initialize)

  const [loadingUser, setLoadingUser] = React.useState(true)

  // Basic Info Form State
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [infoLoading, setInfoLoading] = React.useState(false)
  const [infoSuccess, setInfoSuccess] = React.useState<string | null>(null)
  const [infoError, setInfoError] = React.useState<string | null>(null)

  // Password Form State
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [passwordLoading, setPasswordLoading] = React.useState(false)
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  React.useEffect(() => {
    initializeAuth().finally(() => setLoadingUser(false))
  }, [initializeAuth])

  React.useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  // تحديث البيانات الأساسية
  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setInfoSuccess(null)
    setInfoError(null)

    if (!name.trim()) {
      setInfoError("يرجى كتابة الاسم.")
      return
    }

    if (!email.trim()) {
      setInfoError("يرجى كتابة البريد الإلكتروني.")
      return
    }

    setInfoLoading(true)
    try {
      const res = await updateProfile({ name, email })
      if (res.success) {
        setInfoSuccess(res.message || "تم حفظ البيانات بنجاح.")
        setTimeout(() => setInfoSuccess(null), 3500)
      } else {
        setInfoError(res.message || "حدث خطأ أثناء حفظ التعديلات.")
      }
    } catch {
      setInfoError("تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.")
    } finally {
      setInfoLoading(false)
    }
  }

  // تحديث كلمة المرور
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSuccess(null)
    setPasswordError(null)

    if (!currentPassword) {
      setPasswordError("يرجى إدخال كلمة المرور الحالية.")
      return
    }

    if (!newPassword) {
      setPasswordError("يرجى إدخال كلمة المرور الجديدة.")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("كلمة المرور يجب أن لا تقل عن 6 أحرف.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("كلمة المرور الجديدة وتأكيدها غير متطابقين.")
      return
    }

    setPasswordLoading(true)
    try {
      const res = await updateProfile({
        current_password: currentPassword,
        password: newPassword,
      })

      if (res.success) {
        setPasswordSuccess("تم تغيير كلمة المرور بنجاح.")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setTimeout(() => setPasswordSuccess(null), 3500)
      } else {
        setPasswordError(res.message || "كلمة المرور الحالية غير صحيحة.")
      }
    } catch {
      setPasswordError("تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.")
    } finally {
      setPasswordLoading(false)
    }
  }

  const getInitials = (nameStr: string) => {
    if (!nameStr) return "مد"
    const parts = nameStr.trim().split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`
    }
    return nameStr.substring(0, 2)
  }

  return (
    <PageContainer
      title="الملف الشخصي"
      description="إدارة معلومات الحساب وكلمة المرور"
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* البطاقة العلوية: كرت ملخص الحساب */}
        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl bg-card border border-border/60 shadow-xs">
          <Avatar className="size-12 rounded-xl border border-border/40">
            <AvatarImage src="/avatars/admin.jpg" alt={user?.name || "المدير"} />
            <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary rounded-xl">
              {getInitials(user?.name || name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-0.5">
            <h2 className="text-base font-bold text-foreground">
              {loadingUser ? "جاري التحميل..." : user?.name || name}
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5" dir="ltr">
              <MailIcon className="size-3 text-muted-foreground" />
              <span>{user?.email || email}</span>
            </p>
          </div>
        </div>

        {/* قسم النماذج: بطاقتان مدمجتان */}
        <div className="grid gap-3 sm:gap-3.5 md:grid-cols-2">
          {/* نموذج البيانات الأساسية */}
          <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/60 shadow-xs space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">البيانات الشخصية</h3>
              <p className="text-xs text-muted-foreground">
                تعديل الاسم والبريد الإلكتروني المرتبط بالحساب
              </p>
            </div>

            <form onSubmit={handleUpdateInfo} className="space-y-3.5">
              {infoSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-4 shrink-0" />
                  <span>{infoSuccess}</span>
                </div>
              )}

              {infoError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/25 p-2.5 text-xs font-medium text-destructive">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>{infoError}</span>
                </div>
              )}

              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel htmlFor="profile-name" className="text-xs">الاسم الكامل</FieldLabel>
                  <div className="relative flex items-center">
                    <Input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اسم المدير"
                      className="h-8.5 pr-9 pl-3 text-xs text-right bg-muted/40 rounded-lg border-border/60"
                      required
                      disabled={infoLoading || loadingUser}
                    />
                    <UserCheckIcon className="absolute right-3 size-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="profile-email" className="text-xs">البريد الإلكتروني</FieldLabel>
                  <div className="relative flex items-center">
                    <Input
                      id="profile-email"
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@restro.com"
                      className="h-8.5 pr-9 pl-3 text-xs text-right bg-muted/40 rounded-lg border-border/60"
                      required
                      disabled={infoLoading || loadingUser}
                    />
                    <MailIcon className="absolute right-3 size-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </Field>
              </FieldGroup>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={infoLoading || loadingUser}
                  className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {infoLoading ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="size-3.5" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* نموذج كلمة المرور */}
          <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/60 shadow-xs space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">تغيير كلمة المرور</h3>
              <p className="text-xs text-muted-foreground">
                تحديث كلمة المرور لحماية الحساب
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3.5">
              {passwordSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/25 p-2.5 text-xs font-medium text-destructive">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <FieldGroup className="gap-3">
                <Field>
                  <FieldLabel htmlFor="current-password" className="text-xs">كلمة المرور الحالية</FieldLabel>
                  <div className="relative flex items-center">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      dir="ltr"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-8.5 pr-9 pl-9 text-xs text-right font-mono bg-muted/40 rounded-lg border-border/60"
                      required
                      disabled={passwordLoading}
                    />
                    <KeyRoundIcon className="absolute right-3 size-3.5 text-muted-foreground pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      tabIndex={-1}
                      aria-label={showCurrentPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      className="absolute left-2.5 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showCurrentPassword ? (
                        <EyeOffIcon className="size-3.5" />
                      ) : (
                        <EyeIcon className="size-3.5" />
                      )}
                    </button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="new-password" className="text-xs">كلمة المرور الجديدة</FieldLabel>
                  <div className="relative flex items-center">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      dir="ltr"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-8.5 pr-9 pl-9 text-xs text-right font-mono bg-muted/40 rounded-lg border-border/60"
                      required
                      disabled={passwordLoading}
                    />
                    <KeyRoundIcon className="absolute right-3 size-3.5 text-muted-foreground pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      aria-label={showNewPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      className="absolute left-2.5 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showNewPassword ? (
                        <EyeOffIcon className="size-3.5" />
                      ) : (
                        <EyeIcon className="size-3.5" />
                      )}
                    </button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirm-password" className="text-xs">تأكيد كلمة المرور الجديدة</FieldLabel>
                  <div className="relative flex items-center">
                    <Input
                      id="confirm-password"
                      type={showNewPassword ? "text" : "password"}
                      dir="ltr"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-8.5 pr-9 pl-3 text-xs text-right font-mono bg-muted/40 rounded-lg border-border/60"
                      required
                      disabled={passwordLoading}
                    />
                    <KeyRoundIcon className="absolute right-3 size-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </Field>
              </FieldGroup>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={passwordLoading}
                  className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      <span>جاري التحديث...</span>
                    </>
                  ) : (
                    <>
                      <KeyRoundIcon className="size-3.5" />
                      <span>تحديث كلمة المرور</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
