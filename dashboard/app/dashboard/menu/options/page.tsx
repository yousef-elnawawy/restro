"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useModifierStore } from "@/store/modifier.store"
import { useSettingStore } from "@/store/setting.store"
import { type Modifier, type ModifierPayload } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  PlusIcon,
  SearchIcon,
  Edit2Icon,
  Trash2Icon,
  SlidersHorizontalIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  SparklesIcon,
  FolderPlusIcon,
  RefreshCwIcon,
  AlertCircleIcon,
} from "lucide-react"

export default function OptionsPage() {
  const {
    modifiers,
    isLoading,
    isSaving,
    error,
    searchQuery,
    statusFilter,
    fetchModifiers,
    createModifier,
    updateModifier,
    deleteModifier,
    toggleModifierStatus,
    setSearchQuery,
    setStatusFilter,
  } = useModifierStore()

  const { settings, fetchSettings } = useSettingStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    fetchSettings()
  }, [fetchSettings])

  const currency = settings?.currency || "ج.م"

  // حالة النوافذ المنبثقة
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingModifier, setEditingModifier] = React.useState<Modifier | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [modifierToDelete, setModifierToDelete] = React.useState<Modifier | null>(null)

  // حالة النموذج (بدون ترتيب وبدون اسم لطيف)
  const [formData, setFormData] = React.useState<{
    name: string
    price: string
    is_active: boolean
  }>({
    name: "",
    price: "0",
    is_active: true,
  })
  const [formError, setFormError] = React.useState<string | null>(null)

  // إشعار العملية
  const [bannerMessage, setBannerMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMessage({ type, text })
    setTimeout(() => setBannerMessage(null), 4000)
  }

  // تحميل البيانات وجلبها مع الفلترة والبحث (مع تأخير Debounce 300ms للبحث لمنع الضغط على السيرفر)
  React.useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchModifiers()
      },
      searchQuery ? 300 : 0
    )

    return () => clearTimeout(timer)
  }, [searchQuery, statusFilter, fetchModifiers])

  // فتح نافذة الإضافة
  const handleOpenCreate = () => {
    setEditingModifier(null)
    setFormData({
      name: "",
      price: "0",
      is_active: true,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // فتح نافذة التعديل
  const handleOpenEdit = (mod: Modifier) => {
    setEditingModifier(mod)
    setFormData({
      name: mod.name,
      price: String(mod.price),
      is_active: mod.is_active,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // حفظ الإضافة
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError("يرجى إدخال اسم الإضافة أو الخيار.")
      return
    }

    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError("يرجى إدخال سعر صحيح (0 إذا كانت مجانية).")
      return
    }

    const payload: ModifierPayload = {
      name: formData.name.trim(),
      price: priceNum,
      is_active: formData.is_active,
    }

    if (editingModifier) {
      const res = await updateModifier(editingModifier.id, payload)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    } else {
      const res = await createModifier(payload)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    }
  }

  // تأكيد الحذف
  const handleOpenDelete = (mod: Modifier) => {
    setModifierToDelete(mod)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!modifierToDelete) return
    const res = await deleteModifier(modifierToDelete.id)
    setDeleteConfirmOpen(false)
    setModifierToDelete(null)
    if (res.success) {
      showBanner(res.message, "success")
    } else {
      showBanner(res.message, "error")
    }
  }

  // تبديل حالة التفعيل
  const handleToggle = async (mod: Modifier) => {
    const res = await toggleModifierStatus(mod.id)
    if (!res.success) {
      showBanner(res.message, "error")
    }
  }

  // الإحصائيات السريعة
  const totalCount = mounted ? modifiers.length : 0
  const activeCount = mounted ? modifiers.filter((m) => m.is_active).length : 0
  const inactiveCount = mounted ? totalCount - activeCount : 0

  return (
    <PageContainer
      title="إضافات وخيارات الأطباق"
      description="إدارة الخيارات الإضافية للأطباق (مثل: الجبن الإضافي، الصلصات، الأحجام) وتحديد أسعارها"
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchModifiers()}
            disabled={isLoading}
            className="h-8.5 rounded-lg text-xs gap-1.5"
            title="تحديث القائمة"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PlusIcon className="size-3.5" />
            <span>إضافة خيار جديد</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* إشعار العملية المنبثق الموحد */}
        {bannerMessage && (
          <div
            className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-lg border text-xs font-medium animate-in fade-in duration-150 ${
              bannerMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/25 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 p-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* بطاقات الإحصائيات العلوية الموحدة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontalIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي الخيارات</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">{totalCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">الخيارات المفعلة</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">{activeCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <XCircleIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">الخيارات المعطلة</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">{inactiveCount}</p>
            </div>
          </div>
        </div>

        {/* شريط البحث والفلترة الموحد */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="relative flex-1 w-full sm:max-w-md">
            <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث عن إضافة أو خيار..."
              className="ps-9 bg-muted/40 rounded-lg text-xs h-8.5 border-border/60"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/40 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={`h-7.5 px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                statusFilter === "all"
                  ? "bg-card shadow-xs text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({totalCount})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter("active")}
              className={`h-7.5 px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                statusFilter === "active"
                  ? "bg-card shadow-xs text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              نشط ({activeCount})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter("inactive")}
              className={`h-7.5 px-2.5 rounded-md text-xs font-medium cursor-pointer ${
                statusFilter === "inactive"
                  ? "bg-card shadow-xs text-amber-600 dark:text-amber-400 font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              معطل ({inactiveCount})
            </Button>
          </div>
        </div>

      {/* تنبيه حالة الربط */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => useModifierStore.setState({ error: null })}
            className="text-xs opacity-70 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* جدول بيانات الخيارات والإضافات بدلاً من الكروت */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[80px] text-center font-bold">المعرف</TableHead>
              <TableHead className="font-bold">اسم الإضافة / الخيار</TableHead>
              <TableHead className="w-[160px] text-center font-bold">السعر الإضافي</TableHead>
              <TableHead className="w-[150px] text-center font-bold">الحالة</TableHead>
              <TableHead className="w-[140px] text-center font-bold">تاريخ الإضافة</TableHead>
              <TableHead className="w-[120px] text-center font-bold">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && modifiers.length === 0 ? (
              // هيكل التحميل
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded-sm" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded-sm" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-8 w-16 mx-auto rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : modifiers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                      <FolderPlusIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">لا توجد إضافات أو خيارات مطابقة</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {searchQuery
                        ? `لم يتم العثور على أية إضافات تطابق "${searchQuery}".`
                        : "أضف الخيارات المتاحة للزبائن (مثل: جبن إضافي، صوص خاص، حجم كبير...)."}
                    </p>
                    <div className="mt-4 flex gap-2">
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="text-muted-foreground rounded-lg text-xs"
                        >
                          مسح البحث
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleOpenCreate}
                        className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs"
                      >
                        <PlusIcon className="size-3.5" />
                        <span>إضافة خيار جديد</span>
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              modifiers.map((mod) => (
                <TableRow key={mod.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-center font-mono text-xs font-semibold text-muted-foreground">
                    #{mod.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-border/40">
                        <SlidersHorizontalIcon className="size-4" />
                      </div>
                      <span className="font-bold text-foreground text-sm">
                        {mod.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {mod.price > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        +{mod.price} {currency}
                      </span>
                    ) : (
                      <span className="inline-flex items-center font-semibold text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        مجاني
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2">
                      <Switch
                        checked={mod.is_active}
                        onCheckedChange={() => handleToggle(mod)}
                        title={mod.is_active ? "الخيار نشط" : "الخيار معطل"}
                      />
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-sm ${
                          mod.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {mod.is_active ? "نشط" : "معطل"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground font-medium">
                    {mod.created_at
                      ? new Date(mod.created_at).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenEdit(mod)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="تعديل الخيار"
                      >
                        <Edit2Icon className="size-3.5" />
                        <span className="sr-only">تعديل</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenDelete(mod)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        title="حذف الخيار"
                      >
                        <Trash2Icon className="size-3.5" />
                        <span className="sr-only">حذف</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </div>

      {/* نافذة إضافة / تعديل خيار */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-xl p-5 sm:p-6 shadow-xl bg-card border border-border/60">
          <DialogHeader className="space-y-1 text-right">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <SparklesIcon className="size-5 text-primary" />
              <span>{editingModifier ? "تعديل الخيار الإضافي" : "إضافة خيار أو إضافة جديدة"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingModifier
                ? "تعديل تفاصيل الخيار وسعره الإضافي عند الطلب."
                : "أدخل اسم الإضافة وسعرها الإضافي (مثال: جبن، صلصة حارة، حجم كبير)."}
            </DialogDescription>
          </DialogHeader>

          {/* تنبيه الخطأ */}
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-medium text-foreground">
                اسم الإضافة أو الخيار <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="مثال: جبن شيدر إضافي، صلصة ثوم، بطاطس..."
                className="bg-muted/40 hover:bg-muted/60 focus:bg-background rounded-lg text-sm"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-medium text-foreground">
                السعر الإضافي ({currency}) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="0 إذا كانت مجانية أو بدون تكلفة"
                className="bg-muted/40 hover:bg-muted/60 focus:bg-background rounded-lg text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                أدخل 0 إذا كان الخيار مجانياً ضمن الوجبة.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="text-right">
                <p className="text-xs font-medium text-foreground">حالة التفعيل</p>
                <p className="text-[11px] text-muted-foreground">
                  {formData.is_active ? "متاح للاختيار من قبل الزبائن" : "معطل حالياً"}
                </p>
              </div>
              <Switch
                checked={formData.is_active ?? true}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>

            <DialogFooter className="gap-2 pt-3 sm:space-x-reverse">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg text-muted-foreground"
                disabled={isSaving}
              >
                إلغاء
              </Button>

              <Button
                type="submit"
                disabled={isSaving || !formData.name.trim() || formData.price === ""}
                className="gap-1.5 rounded-lg shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>{editingModifier ? "حفظ التعديلات" : "إضافة الخيار"}</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-xl p-5 sm:p-6 shadow-xl bg-card text-right border border-border/60">
          <AlertDialogHeader className="space-y-2 text-right">
            <div className="flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-1">
              <Trash2Icon className="size-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold">
              هل أنت متأكد من حذف هذا الخيار؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              سيتم حذف الخيار{" "}
              <span className="font-semibold text-foreground">
                &quot;{modifierToDelete?.name}&quot;
              </span>{" "}
              نهائياً من قائمة الإضافات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4 sm:space-x-reverse">
            <AlertDialogCancel className="rounded-lg text-muted-foreground shadow-none">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
            >
              نعم، حذف الخيار
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
