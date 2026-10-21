"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useCategoryStore } from "@/store/category.store"
import { type Category, type CategoryPayload } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  LayersIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  SparklesIcon,
  FolderPlusIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  ImageIcon,
  UploadIcon,
} from "lucide-react"

export default function CategoriesPage() {
  const {
    categories,
    isLoading,
    isSaving,
    error,
    searchQuery,
    statusFilter,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
    setSearchQuery,
    setStatusFilter,
  } = useCategoryStore()

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // حالة النوافذ المنبثقة
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [categoryToDelete, setCategoryToDelete] = React.useState<Category | null>(null)

  // حالة النموذج
  const [formData, setFormData] = React.useState<{
    name: string
    description: string
    image: string
    is_active: boolean
  }>({
    name: "",
    description: "",
    image: "",
    is_active: true,
  })
  const [formError, setFormError] = React.useState<string | null>(null)

  // إشعار العملية (Alert Banner)
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
        fetchCategories()
      },
      searchQuery ? 300 : 0
    )

    return () => clearTimeout(timer)
  }, [searchQuery, statusFilter, fetchCategories])


  // فتح نافذة الإضافة
  const handleOpenCreate = () => {
    setEditingCategory(null)
    setFormData({
      name: "",
      description: "",
      image: "",
      is_active: true,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // فتح نافذة التعديل
  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
      image: category.image || "",
      is_active: category.is_active,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // ضغط الصورة قبل حفظها لتقليل الحجم وتسريع التحميل
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const maxDim = 1200
          let width = img.width
          let height = img.height
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL("image/jpeg", 0.85))
          } else {
            resolve(e.target?.result as string)
          }
        }
        img.onerror = () => resolve(e.target?.result as string)
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  // حفظ القسم (إضافة أو تعديل)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError("يرجى إدخال اسم القسم.")
      return
    }

    const payload: CategoryPayload = {
      name: formData.name.trim(),
      slug: editingCategory?.slug || undefined,
      description: formData.description.trim() || undefined,
      image: formData.image || undefined,
      is_active: formData.is_active,
      sort_order: editingCategory?.sort_order ?? 0,
    }

    if (editingCategory) {
      const res = await updateCategory(editingCategory.id, payload)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    } else {
      const res = await createCategory(payload)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    }
  }

  // تأكيد الحذف
  const handleOpenDelete = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return
    const res = await deleteCategory(categoryToDelete.id)
    setDeleteConfirmOpen(false)
    setCategoryToDelete(null)
    if (res.success) {
      showBanner(res.message, "success")
    } else {
      showBanner(res.message, "error")
    }
  }

  // تبديل حالة التفعيل بنقرة واحدة
  const handleToggle = async (category: Category) => {
    const res = await toggleCategoryStatus(category.id)
    if (!res.success) {
      showBanner(res.message, "error")
    }
  }

  // الإحصائيات السريعة
  const totalCount = mounted ? categories.length : 0
  const activeCount = mounted ? categories.filter((c) => c.is_active).length : 0
  const inactiveCount = mounted ? totalCount - activeCount : 0

  return (
    <PageContainer
      title="أقسام المنيو"
      description="إدارة وتصنيف أقسام قائمة الطعام والمشروبات"
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchCategories()}
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
            <span>إضافة قسم جديد</span>
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
              <LayersIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي الأقسام</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">{totalCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">الأقسام النشطة</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">{activeCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <XCircleIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">الأقسام غير المفعلة</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">{inactiveCount}</p>
            </div>
          </div>
        </div>

        {/* شريط البحث والفلترة الموحد */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          {/* حقل البحث */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث عن اسم قسم أو وصف..."
              className="ps-9 bg-muted/40 rounded-lg text-xs h-8.5 border-border/60"
            />
          </div>

          {/* أزرار فلتر الحالة */}
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

      {/* رسالة الخطأ العامة إن وجدت */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
          <AlertCircleIcon className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* جدول بيانات الأقسام بدلاً من الكروت */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[80px] text-center font-bold">المعرف</TableHead>
              <TableHead className="font-bold">القسم</TableHead>
              <TableHead className="font-bold">الوصف</TableHead>
              <TableHead className="w-[150px] text-center font-bold">الحالة</TableHead>
              <TableHead className="w-[140px] text-center font-bold">تاريخ الإضافة</TableHead>
              <TableHead className="w-[120px] text-center font-bold">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && categories.length === 0 ? (
              // هيكل التحميل
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-lg" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded-sm" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-8 w-16 mx-auto rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                      <FolderPlusIcon className="size-6" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">لا توجد أقسام مطابقة</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {searchQuery
                        ? `لم يتم العثور على أية أقسام تطابق البحث "${searchQuery}".`
                        : "لم تقم بإضافة أقسام في المنيو بعد. أضف أول قسم لبدء بناء قائمة طعام المطعم."}
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
                        <span>إضافة قسم جديد</span>
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-center font-mono text-xs font-semibold text-muted-foreground">
                    #{category.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {category.image && (category.image.startsWith("http") || category.image.startsWith("data:")) ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="size-10 rounded-lg object-cover border border-border/40 shrink-0"
                        />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-border/40">
                          <LayersIcon className="size-5" />
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground text-sm block">
                          {category.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono block">
                          {category.slug}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <p className="text-xs text-muted-foreground truncate" title={category.description || ""}>
                      {category.description || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => handleToggle(category)}
                        title={category.is_active ? "القسم نشط" : "القسم معطل"}
                      />
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-sm ${
                          category.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {category.is_active ? "نشط" : "معطل"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground font-medium">
                    {category.created_at
                      ? new Date(category.created_at).toLocaleDateString("ar-EG", {
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
                        onClick={() => handleOpenEdit(category)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="تعديل بيانات القسم"
                      >
                        <Edit2Icon className="size-3.5" />
                        <span className="sr-only">تعديل</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenDelete(category)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        title="حذف القسم"
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

      {/* =========================================================
          نافذة إضافة / تعديل قسم (Modal Dialog مع زوايا ديفولت)
          ========================================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg rounded-xl p-5 sm:p-6 shadow-xl bg-card border border-border/60">
          <DialogHeader className="space-y-1 text-right">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <SparklesIcon className="size-5 text-primary" />
              <span>{editingCategory ? "تعديل بيانات القسم" : "إضافة قسم جديد للمنيو"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingCategory
                ? "قم بتحديث معلومات القسم وتفاصيله كما ستظهر في المنيو والشاشات."
                : "أدخل بيانات القسم الجديد لتنظيم أطباق ومشروبات المطعم."}
            </DialogDescription>
          </DialogHeader>

          {/* تنبيه الخطأ داخل النافذة */}
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 mt-2">
            {/* اسم القسم */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-medium text-foreground">
                اسم القسم <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="مثال: البرجر، البيتزا، المقبلات، المشروبات..."
                className="bg-muted/40 hover:bg-muted/60 focus:bg-background rounded-lg text-sm"
                required
                autoFocus
              />
            </div>

            {/* صورة القسم */}
            <div className="space-y-2 text-right">
              <label className="text-xs font-medium text-foreground block">
                صورة القسم (من جهازك)
              </label>
              
              {formData.image ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <img
                      src={formData.image}
                      alt="معاينة"
                      className="size-14 rounded-lg object-cover border"
                    />
                    <div className="text-right">
                      <span className="text-xs font-semibold text-foreground block">تم اختيار صورة للقسم</span>
                      <span className="text-[11px] text-muted-foreground">صورة مرفوعة من جهازك</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                    className="text-destructive hover:bg-destructive/10 text-xs rounded-lg"
                  >
                    <Trash2Icon className="size-3.5" />
                    <span>حذف الصورة</span>
                  </Button>
                </div>
              ) : (
                <label className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border/70 hover:border-primary bg-muted/20 hover:bg-muted/40 rounded-xl cursor-pointer transition-colors text-center">
                  <UploadIcon className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    اضغط لاختيار صورة للقسم من جهازك
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const result = await compressImage(file)
                        setFormData((prev) => ({ ...prev, image: result }))
                      }
                      e.target.value = ""
                    }}
                  />
                </label>
              )}
            </div>

            {/* الوصف */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-medium text-foreground">
                الوصف (اختياري)
              </label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="اكتب نبذة مختصرة عن أطباق هذا القسم..."
                rows={3}
                className="bg-muted/40 hover:bg-muted/60 focus:bg-background rounded-lg text-sm resize-none"
              />
            </div>

            {/* حالة القسم */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="text-right">
                <p className="text-xs font-medium text-foreground">حالة القسم</p>
                <p className="text-[11px] text-muted-foreground">
                  {formData.is_active ? "مفعل وظاهر في المنيو للزبائن" : "معطل ومخفي مؤقتاً"}
                </p>
              </div>
              <Switch
                checked={formData.is_active ?? true}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>

            {/* أزرار الحفظ والإلغاء */}
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
                disabled={isSaving || !formData.name.trim()}
                className="gap-1.5 rounded-lg shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>{editingCategory ? "حفظ التعديلات" : "إضافة القسم"}</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          نافذة تأكيد الحذف (Alert Dialog مع زوايا ديفولت)
          ========================================================= */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-xl p-5 sm:p-6 shadow-xl bg-card text-right border border-border/60">
          <AlertDialogHeader className="space-y-2 text-right">
            <div className="flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-1">
              <Trash2Icon className="size-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold">
              هل أنت متأكد من حذف هذا القسم؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              سيتم حذف القسم{" "}
              <span className="font-semibold text-foreground">
                &quot;{categoryToDelete?.name}&quot;
              </span>{" "}
              بشكل نهائي من قائمة الأقسام. لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
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
              نعم، حذف القسم
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}

