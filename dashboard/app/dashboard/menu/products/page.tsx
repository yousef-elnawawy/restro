"use client"

import * as React from "react"
import Link from "next/link"
import { PageContainer } from "@/components/page-container"
import { useProductStore } from "@/store/product.store"
import { useCategoryStore } from "@/store/category.store"
import { useModifierStore } from "@/store/modifier.store"
import { useSettingStore } from "@/store/setting.store"
import { type Product, type ProductPayload, type ProductSize } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/combobox-select"
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
  UtensilsCrossedIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  SparklesIcon,
  FolderPlusIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  LayersIcon,
  ImageIcon,
  StarIcon,
  SlidersHorizontalIcon,
  ReceiptIcon,
  CheckIcon,
  UploadIcon,
  LayoutGridIcon,
  ListIcon,
  XIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronsRightIcon,
  ChevronsLeftIcon,
} from "lucide-react"

export default function ProductsPage() {
  const {
    products,
    isLoading,
    isSaving,
    error,
    searchQuery,
    statusFilter,
    selectedCategory,
    page,
    perPage,
    pagination,
    counts,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    setSearchQuery,
    setStatusFilter,
    setSelectedCategory,
    setPage,
    setPerPage,
  } = useProductStore()

  const { categories, fetchCategories } = useCategoryStore()
  const { modifiers, fetchModifiers, createModifier } = useModifierStore()
  const { settings, fetchSettings } = useSettingStore()

  const [mounted, setMounted] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid")

  const activeCurrency = settings?.currency || "ج.م"

  React.useEffect(() => {
    setMounted(true)
    fetchCategories()
    fetchModifiers()
    fetchSettings()
  }, [fetchCategories, fetchModifiers, fetchSettings])

  const categoryFilterOptions: ComboboxOption[] = React.useMemo(() => [
    { value: "all", label: "كل الأقسام" },
    ...categories.map((c) => ({
      value: String(c.id),
      label: c.name,
    })),
  ], [categories])

  const categoryModalOptions: ComboboxOption[] = React.useMemo(() => [
    ...categories.map((c) => ({
      value: String(c.id),
      label: c.name,
    })),
  ], [categories])

  // حالة النوافذ المنبثقة
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null)

  // حالة النموذج المتقدم للطبق (صور متعددة، أحجام، ملحقات محددة)
  const [formData, setFormData] = React.useState<{
    category_id: number | ""
    name: string
    description: string
    price: string
    image: string // الصورة الرئيسية
    images: string[] // كافة الصور
    has_sizes: boolean
    sizes: ProductSize[]
    modifier_ids: number[]
    is_active: boolean
  }>({
    category_id: "",
    name: "",
    description: "",
    price: "",
    image: "",
    images: [],
    has_sizes: false,
    sizes: [],
    modifier_ids: [],
    is_active: true,
  })

  // حقول مساعدة لإضافة ملحق سريع
  const [newExtraName, setNewExtraName] = React.useState("")
  const [newExtraPrice, setNewExtraPrice] = React.useState("")
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

  // تحميل المنتجات وجلبها مع الفلترة والبحث
  React.useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchProducts({ page: 1 })
      },
      searchQuery ? 300 : 0
    )

    return () => clearTimeout(timer)
  }, [searchQuery, statusFilter, selectedCategory, fetchProducts])

  // فتح نافذة الإضافة
  const handleOpenCreate = () => {
    setEditingProduct(null)
    const defaultCatId = categories.length > 0 ? categories[0].id : ""
    setFormData({
      category_id: defaultCatId,
      name: "",
      description: "",
      price: "",
      image: "",
      images: [],
      has_sizes: false,
      sizes: [],
      modifier_ids: [],
      is_active: true,
    })
    setNewExtraName("")
    setNewExtraPrice("")
    setFormError(null)
    setDialogOpen(true)
  }

  // فتح نافذة التعديل
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product)
    const isImgUrl = (str?: string | null) =>
      Boolean(str && (str.startsWith("http") || str.startsWith("data:") || str.startsWith("/")))
    const imagesList =
      product.images && product.images.length > 0
        ? product.images.filter(isImgUrl)
        : isImgUrl(product.image)
        ? [product.image!]
        : []

    const mainImg = isImgUrl(product.image) ? product.image! : imagesList[0] || ""

    setFormData({
      category_id: product.category_id,
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      image: mainImg,
      images: imagesList,
      has_sizes: product.has_sizes ?? false,
      sizes: product.sizes || [],
      modifier_ids: product.modifier_ids || [],
      is_active: product.is_active,
    })
    setNewExtraName("")
    setNewExtraPrice("")
    setFormError(null)
    setDialogOpen(true)
  }

  // ضغط الصورة وتحسين أبعادها قبل الإرسال لسرعة التخزين وخفة حجم البيانات
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const maxDim = 800
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
            resolve(canvas.toDataURL("image/jpeg", 0.78))
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

  // رفع ملفات صور من جهاز المستخدم (واحدة أو أكثر دفعة واحدة)
  const handleFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    for (const file of fileList) {
      const resultUrl = await compressImage(file)
      setFormData((prev) => {
        if (prev.images.includes(resultUrl)) return prev
        const nextImages = [...prev.images, resultUrl]
        return {
          ...prev,
          images: nextImages,
          image: prev.image ? prev.image : resultUrl,
        }
      })
    }
  }

  // تعيين صورة كصورة رئيسية
  const handleSetPrimaryImage = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      image: url,
    }))
  }

  // حذف صورة من القائمة
  const handleRemoveImage = (url: string) => {
    const nextImages = formData.images.filter((img) => img !== url)
    let nextPrimary = formData.image
    if (nextPrimary === url) {
      nextPrimary = nextImages[0] || ""
    }
    setFormData((prev) => ({
      ...prev,
      images: nextImages,
      image: nextPrimary,
    }))
  }

  // إضافة حجم جديد
  const handleAddSize = () => {
    setFormData((prev) => ({
      ...prev,
      sizes: [...prev.sizes, { name: "", price: 0 }],
    }))
  }

  // تطبيق أحجام شائعة بنقرة واحدة
  const handleApplyCommonSizes = () => {
    const baseP = parseFloat(formData.price) || 100
    setFormData((prev) => ({
      ...prev,
      has_sizes: true,
      sizes: [
        { name: "صغير", price: Math.round(baseP * 0.8) },
        { name: "وسط", price: baseP },
        { name: "كبير", price: Math.round(baseP * 1.3) },
      ],
    }))
  }

  // تعديل بيانات حجم
  const handleUpdateSize = (index: number, field: "name" | "price", val: string) => {
    setFormData((prev) => {
      const updated = [...prev.sizes]
      if (field === "name") {
        updated[index] = { ...updated[index], name: val }
      } else {
        const num = parseFloat(val) || 0
        updated[index] = { ...updated[index], price: num }
      }
      return { ...prev, sizes: updated }
    })
  }

  // حذف حجم
  const handleRemoveSize = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index),
    }))
  }

  // تبديل اختيار ملحق/إضافة تابعة للمنتج
  const handleToggleModifier = (modifierId: number) => {
    setFormData((prev) => {
      const exists = prev.modifier_ids.includes(modifierId)
      const nextIds = exists
        ? prev.modifier_ids.filter((id) => id !== modifierId)
        : [...prev.modifier_ids, modifierId]
      return { ...prev, modifier_ids: nextIds }
    })
  }

  // إضافة ملحق مخصص سريع وحفظه وربطه بالمنتج مباشرة
  const handleQuickAddModifier = async () => {
    if (!newExtraName.trim()) return
    const priceNum = parseFloat(newExtraPrice) || 0
    const res = await createModifier({
      name: newExtraName.trim(),
      price: priceNum,
      is_active: true,
    })

    if (res.success && res.data) {
      setFormData((prev) => ({
        ...prev,
        modifier_ids: [...prev.modifier_ids, res.data!.id],
      }))
      setNewExtraName("")
      setNewExtraPrice("")
    }
  }

  // حفظ المنتج (إضافة أو تعديل)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError("يرجى إدخال اسم المنتج أو الطبق.")
      return
    }

    if (!formData.category_id) {
      setFormError("يرجى اختيار القسم التابع له المنتج.")
      return
    }

    // التحقق من الأسعار
    let calculatedPrice = parseFloat(formData.price)
    if (formData.has_sizes && formData.sizes.length > 0) {
      const invalidSize = formData.sizes.find((s) => !s.name.trim() || s.price <= 0)
      if (invalidSize) {
        setFormError("يرجى كتابة اسم صحيح وسعر مناسب لكل حجم مدخل.")
        return
      }
      calculatedPrice = Math.min(...formData.sizes.map((s) => s.price))
    } else {
      if (isNaN(calculatedPrice) || calculatedPrice < 0) {
        setFormError("يرجى إدخال سعر صحيح للمنتج.")
        return
      }
    }

    const attachedModifiers = modifiers
      .filter((m) => formData.modifier_ids.includes(m.id))
      .map((m) => ({ id: m.id, name: m.name, price: m.price }))

    const primaryImage = formData.image || formData.images[0] || undefined

    const payload: ProductPayload = {
      name: formData.name.trim(),
      category_id: Number(formData.category_id),
      price: calculatedPrice,
      description: formData.description.trim() || undefined,
      image: primaryImage,
      images: formData.images.length > 0 ? formData.images : primaryImage ? [primaryImage] : [],
      has_sizes: formData.has_sizes,
      sizes: formData.has_sizes ? formData.sizes : [],
      modifier_ids: formData.modifier_ids,
      modifiers: attachedModifiers,
      is_active: formData.is_active,
    }

    if (editingProduct) {
      const res = await updateProduct(editingProduct.id, payload)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    } else {
      const res = await createProduct(payload)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    }
  }

  // تأكيد الحذف
  const handleOpenDelete = (product: Product) => {
    setProductToDelete(product)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    const res = await deleteProduct(productToDelete.id)
    setDeleteConfirmOpen(false)
    setProductToDelete(null)
    if (res.success) {
      showBanner(res.message, "success")
    } else {
      showBanner(res.message, "error")
    }
  }

  // تبديل حالة التفعيل
  const handleToggle = async (product: Product) => {
    const res = await toggleProductStatus(product.id)
    if (!res.success) {
      showBanner(res.message, "error")
    }
  }

  // الإحصائيات السريعة من الباك إند
  const totalCount = counts?.total ?? (pagination?.total ?? (mounted ? products.length : 0))
  const activeCount = counts?.active ?? (mounted ? products.filter((p) => p.is_active).length : 0)
  const inactiveCount = counts?.inactive ?? (mounted ? Math.max(0, totalCount - activeCount) : 0)

  return (
    <PageContainer
      title="المنتجات والأطباق"
      description="إدارة كافة وجبات وأطباق المطعم وتحديد الصور، الأحجام، والملحقات التابعة لكل طبق"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/pos">
            <Button
              variant="outline"
              size="sm"
              className="h-8.5 rounded-lg text-xs gap-1.5"
            >
              <ReceiptIcon className="size-3.5" />
              <span className="hidden sm:inline">نقطة البيع (الكاشير)</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProducts({ page })}
            disabled={isLoading}
            className="h-8.5 rounded-lg text-xs gap-1.5"
            title="تحديث القائمة"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PlusIcon className="size-3.5" />
            <span>إضافة طبق جديد</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* إشعار العملية (Alert Banner) */}
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
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )}

        {/* كروت الإحصائيات العلوية */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UtensilsCrossedIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي الأطباق</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">{totalCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">الأطباق المتوفرة</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">{activeCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <XCircleIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">غير المتوفرة حالياً</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">{inactiveCount}</p>
            </div>
          </div>
        </div>

        {/* شريط البحث والفلترة وتبديل طريقة العرض */}
        <div className="flex flex-col gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex flex-col lg:flex-row gap-2.5 lg:items-center lg:justify-between">
            {/* حقل البحث */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث عن اسم منتج أو وصف..."
                className="ps-9 pe-8 bg-muted/40 rounded-lg text-xs h-8.5 border-border/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
              {/* فلتر الأقسام */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-muted-foreground whitespace-nowrap">القسم:</span>
                <ComboboxSelect
                  value={selectedCategory === "all" ? "all" : String(selectedCategory)}
                  onValueChange={(val) => {
                    setSelectedCategory(val === "all" || !val ? "all" : Number(val))
                  }}
                  options={categoryFilterOptions}
                  placeholder="كل الأقسام"
                  className="w-full sm:w-48 text-xs h-8.5 bg-muted/40 text-foreground rounded-lg border border-border/60"
                />
              </div>

            {/* أزرار فلتر الحالة */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg text-xs font-medium h-8 px-2.5 transition-all ${
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
                className={`rounded-lg text-xs font-medium h-8 px-2.5 transition-all ${
                  statusFilter === "active"
                    ? "bg-card shadow-xs text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                متوفر ({activeCount})
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("inactive")}
                className={`rounded-lg text-xs font-medium h-8 px-2.5 transition-all ${
                  statusFilter === "inactive"
                    ? "bg-card shadow-xs text-amber-600 dark:text-amber-400 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                غير متوفر ({inactiveCount})
              </Button>
            </div>

            {/* تبديل وضع العرض (شبكة / جدول) */}
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg size-8 transition-all ${
                  viewMode === "grid"
                    ? "bg-card shadow-xs text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="عرض شبكي (كروت)"
              >
                <LayoutGridIcon className="size-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setViewMode("table")}
                className={`rounded-lg size-8 transition-all ${
                  viewMode === "table"
                    ? "bg-card shadow-xs text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="عرض جدول تفصيلي"
              >
                <ListIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* تنبيه الخطأ */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-500/20">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => useProductStore.setState({ error: null })}
            className="text-xs opacity-70 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* التحميل */}
      {isLoading && products.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-card border border-border/50 shadow-xs overflow-hidden space-y-3 p-4 animate-in fade-in duration-300"
            >
              <Skeleton className="w-full aspect-[16/10] rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-full rounded-lg" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-5 w-20" />
                <div className="flex gap-1.5">
                  <Skeleton className="size-8 rounded-lg" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        /* الحالة الفارغة */
        <div className="flex flex-col items-center justify-center p-10 text-center rounded-xl bg-card border border-border/60 shadow-xs min-h-[320px] animate-in fade-in duration-200">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3.5 shadow-xs">
            <FolderPlusIcon className="size-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">لا توجد منتجات مطابقة</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm leading-relaxed">
            {searchQuery
              ? `لم يتم العثور على أية منتجات تطابق البحث "${searchQuery}".`
              : "لم تقم بإضافة أطباق في المنيو بعد. أضف أول وجبة أو طبق لبدء القائمة ومبيعات الكاشير."}
          </p>
          <div className="mt-5 flex items-center gap-2">
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground rounded-xl"
              >
                مسح البحث
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
            >
              <PlusIcon className="size-4" />
              <span>إضافة طبق جديد</span>
            </Button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* شبكة كروت المنتجات الاحترافية (Card Grid View) */
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-opacity duration-200 ${
            isLoading ? "opacity-60 pointer-events-none" : "opacity-100"
          }`}
        >
          {products.map((product) => {
            const cat = categories.find((c) => c.id === product.category_id)
            const mainImg =
              product.image &&
              (product.image.startsWith("http") ||
                product.image.startsWith("data:") ||
                product.image.startsWith("/"))
                ? product.image
                : product.images?.[0] || null

            const totalImages = product.images?.length || (mainImg ? 1 : 0)
            const hasSizes = product.has_sizes && product.sizes && product.sizes.length > 0
            const hasExtras =
              (product.modifier_ids && product.modifier_ids.length > 0) ||
              (product.modifiers && product.modifiers.length > 0)

            return (
              <div
                key={product.id}
                className="group flex flex-col justify-between rounded-xl bg-card border border-border/60 shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/50 overflow-hidden"
              >
                <div>
                  {/* رأس الكرت مع صورة الطبق الفاخرة */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/40 border-b border-border/40">
                    {mainImg ? (
                      <img
                        src={mainImg}
                        alt={product.name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center text-muted-foreground/60 bg-gradient-to-br from-primary/5 via-muted/20 to-primary/10">
                        <UtensilsCrossedIcon className="size-10 text-primary/40 mb-1" />
                        <span className="text-[11px] font-medium text-muted-foreground/70">بدون صورة</span>
                      </div>
                    )}

                    {/* شارة القسم العائمة */}
                    {cat && (
                      <div className="absolute top-2.5 start-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-background/90 text-foreground backdrop-blur-md shadow-xs border border-border/50">
                        <LayersIcon className="size-3 text-primary" />
                        <span>{cat.name}</span>
                      </div>
                    )}

                    {/* شارة حالة التوفر وسويتش التبديل */}
                    <div className="absolute top-2.5 end-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/90 backdrop-blur-md shadow-xs border border-border/50">
                      <span
                        className={`size-2 rounded-full ${
                          product.is_active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold ${
                          product.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        }`}
                      >
                        {product.is_active ? "متوفر" : "معطل"}
                      </span>
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={() => handleToggle(product)}
                        className="scale-75 origin-end"
                        title={product.is_active ? "تعطيل الطبق" : "تفعيل الطبق"}
                      />
                    </div>

                    {/* عدد الصور إن وجدت أكثر من صورة */}
                    {totalImages > 1 && (
                      <span className="absolute bottom-2 start-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-black/70 text-white backdrop-blur-xs flex items-center gap-1">
                        <ImageIcon className="size-2.5" />
                        <span>{totalImages} صور</span>
                      </span>
                    )}
                  </div>

                  {/* تفاصيل الطبق */}
                  <div className="p-4 space-y-2.5 text-right">
                    <h3 className="text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>

                    {/* الشارات (الأحجام والإضافات) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {hasSizes && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          <LayersIcon className="size-2.5" />
                          <span>{product.sizes?.length} أحجام</span>
                        </span>
                      )}

                      {hasExtras && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          <SlidersHorizontalIcon className="size-2.5" />
                          <span>إضافات خاصة</span>
                        </span>
                      )}

                      {!hasSizes && !hasExtras && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">
                          صنف قياسي
                        </span>
                      )}
                    </div>

                    {/* وصف الطبق */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[32px]">
                      {product.description || "لا يوجد وصف مدخل لهذا الطبق."}
                    </p>
                  </div>
                </div>

                {/* ذيل الكرت (السعر وأزرار التحكم) */}
                <div className="flex items-center justify-between p-3.5 bg-muted/20 border-t border-border/40 mt-1">
                  <div className="flex items-baseline gap-1 text-right">
                    {hasSizes && (
                      <span className="text-[10px] text-muted-foreground">يبدأ من</span>
                    )}
                    <span className="text-base font-extrabold text-foreground">{product.price}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{activeCurrency}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link href={`/dashboard/pos?productId=${product.id}`}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="طلب عبر الكاشير (POS)"
                      >
                        <ReceiptIcon className="size-4" />
                        <span className="sr-only">طلب عبر الكاشير</span>
                      </Button>
                    </Link>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenEdit(product)}
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="تعديل بيانات المنتج"
                    >
                      <Edit2Icon className="size-4" />
                      <span className="sr-only">تعديل</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenDelete(product)}
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="حذف المنتج"
                    >
                      <Trash2Icon className="size-4" />
                      <span className="sr-only">حذف</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* جدول بيانات المنتجات (Table View) */
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[70px] text-center font-bold">الصورة</TableHead>
                <TableHead className="font-bold">اسم الطبق والوصف</TableHead>
                <TableHead className="font-bold">القسم</TableHead>
                <TableHead className="font-bold text-center">السعر</TableHead>
                <TableHead className="font-bold text-center">الميزات</TableHead>
                <TableHead className="w-[120px] text-center font-bold">حالة التوفر</TableHead>
                <TableHead className="w-[130px] text-center font-bold">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const cat = categories.find((c) => c.id === product.category_id)
                const mainImg =
                  product.image &&
                  (product.image.startsWith("http") ||
                    product.image.startsWith("data:") ||
                    product.image.startsWith("/"))
                    ? product.image
                    : product.images?.[0] || null

                const hasSizes = product.has_sizes && product.sizes && product.sizes.length > 0
                const hasExtras =
                  (product.modifier_ids && product.modifier_ids.length > 0) ||
                  (product.modifiers && product.modifiers.length > 0)

                return (
                  <TableRow key={product.id} className="hover:bg-muted/30">
                    <TableCell className="text-center py-2.5">
                      <div className="size-11 rounded-xl overflow-hidden bg-muted/50 border border-border/50 mx-auto flex items-center justify-center">
                        {mainImg ? (
                          <img
                            src={mainImg}
                            alt={product.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <UtensilsCrossedIcon className="size-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right py-2.5">
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground text-sm block">
                          {product.name}
                        </span>
                        {product.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-sm">
                            {product.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right py-2.5">
                      {cat ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          <LayersIcon className="size-3" />
                          <span>{cat.name}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center font-bold text-sm py-2.5">
                      <span className="text-foreground">{product.price}</span>{" "}
                      <span className="text-xs text-muted-foreground font-normal">{activeCurrency}</span>
                      {hasSizes && (
                        <span className="block text-[10px] text-muted-foreground font-normal">
                          (يبدأ من)
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-center py-2.5">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {hasSizes && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-primary/10 text-primary border border-primary/20">
                            {product.sizes?.length} أحجام
                          </span>
                        )}
                        {hasExtras && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            إضافات خاصة
                          </span>
                        )}
                        {!hasSizes && !hasExtras && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md text-muted-foreground bg-muted">
                            قياسي
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={product.is_active}
                          onCheckedChange={() => handleToggle(product)}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            product.is_active
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {product.is_active ? "متوفر" : "معطل"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/dashboard/pos?productId=${product.id}`}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="طلب عبر الكاشير"
                          >
                            <ReceiptIcon className="size-4" />
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenEdit(product)}
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="تعديل"
                        >
                          <Edit2Icon className="size-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenDelete(product)}
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="حذف"
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* شريط ترقيم الصفحات المتكامل والذكي (Pagination Controls) */}
      {products.length > 0 && pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-xl bg-card border border-border/60 shadow-xs mt-2 transition-all">
          {/* معلومات السجلات وعدد العناصر في الصفحة */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs text-muted-foreground font-medium">
              عرض{" "}
              <span className="font-bold text-foreground font-mono">
                {pagination.from ?? 1}
              </span>{" "}
              -{" "}
              <span className="font-bold text-foreground font-mono">
                {pagination.to ?? products.length}
              </span>{" "}
              من أصل{" "}
              <span className="font-bold text-primary font-mono">
                {pagination.total}
              </span>{" "}
              صنف
            </span>

            {/* محدد عدد العناصر بالصفحة */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">لكل صفحة:</span>
              <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/50 border border-border/50">
                {[8, 12, 24, 48].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setPerPage(count)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className={`px-2 py-0.5 text-xs font-bold font-mono rounded-md transition-all ${
                      perPage === count
                        ? "bg-card text-foreground shadow-xs border border-border/70"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* أزرار التنقل بين الصفحات */}
          {pagination.last_page > 1 && (
            <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
              {/* زر الصفحة الأولى */}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  setPage(1)
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                disabled={page <= 1 || isLoading}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
                title="الصفحة الأولى"
              >
                <ChevronsRightIcon className="size-4" />
                <span className="sr-only">الصفحة الأولى</span>
              </Button>

              {/* زر الصفحة السابقة */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(Math.max(1, page - 1))
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                disabled={page <= 1 || isLoading}
                className="h-8 px-2.5 rounded-lg text-xs font-medium gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <ChevronRightIcon className="size-3.5" />
                <span>السابق</span>
              </Button>

              {/* أرقام الصفحات الذكية */}
              <div className="flex items-center gap-1 mx-1">
                {(() => {
                  const pages: (number | string)[] = []
                  const total = pagination.last_page
                  const cur = page

                  if (total <= 5) {
                    for (let i = 1; i <= total; i++) pages.push(i)
                  } else {
                    pages.push(1)
                    if (cur > 3) pages.push("...")

                    const start = Math.max(2, cur - 1)
                    const end = Math.min(total - 1, cur + 1)
                    for (let i = start; i <= end; i++) {
                      if (!pages.includes(i)) pages.push(i)
                    }

                    if (cur < total - 2) pages.push("...")
                    if (!pages.includes(total)) pages.push(total)
                  }

                  return pages.map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span
                          key={`dots-${idx}`}
                          className="px-1 text-xs text-muted-foreground/60 select-none"
                        >
                          …
                        </span>
                      )
                    }

                    const pageNum = Number(p)
                    const isCurrent = pageNum === cur

                    return (
                      <Button
                        key={`page-${pageNum}`}
                        variant={isCurrent ? "default" : "outline"}
                        size="icon-sm"
                        onClick={() => {
                          setPage(pageNum)
                          window.scrollTo({ top: 0, behavior: "smooth" })
                        }}
                        disabled={isLoading}
                        className={`size-8 rounded-lg text-xs font-bold font-mono transition-all ${
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-xs pointer-events-none"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })
                })()}
              </div>

              {/* زر الصفحة التالية */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(Math.min(pagination.last_page, page + 1))
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                disabled={page >= pagination.last_page || isLoading}
                className="h-8 px-2.5 rounded-lg text-xs font-medium gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <span>التالي</span>
                <ChevronLeftIcon className="size-3.5" />
              </Button>

              {/* زر الصفحة الأخيرة */}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  setPage(pagination.last_page)
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                disabled={page >= pagination.last_page || isLoading}
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
                title="الصفحة الأخيرة"
              >
                <ChevronsLeftIcon className="size-4" />
                <span className="sr-only">الصفحة الأخيرة</span>
              </Button>
            </div>
          )}
        </div>
      )}
      </div>

      {/* نافذة إضافة / تعديل منتج الشاملة (Modal) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl p-5 sm:p-6 shadow-xl bg-card border border-border/60">
          <DialogHeader className="space-y-1 text-right pb-3 border-b border-border/40">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <SparklesIcon className="size-5 text-primary" />
              <span>{editingProduct ? "تعديل بيانات الطبق / المنتج" : "إضافة منتج جديد للمنيو"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              أدخل بيانات الطبق، وحدد الصور المتعددة والصورة الرئيسية، بالإضافة لتعيين الأحجام والملحقات التابعة له.
            </DialogDescription>
          </DialogHeader>

          {/* تنبيه الخطأ */}
          {formError && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 text-destructive text-xs sm:text-sm font-medium my-2 border border-destructive/20">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* العمود الأيمن (7 أعمدة): تفاصيل الطبق، الأسعار، الأحجام، والملحقات */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. البيانات الأساسية */}
                <div className="p-4 sm:p-5 rounded-xl bg-muted/20 border border-border/50 space-y-4 text-right">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                    <UtensilsCrossedIcon className="size-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">البيانات الأساسية للطبق</h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">
                      اسم المنتج / الطبق <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="مثال: برجر لحم كلاسيك، بيتزا مارجريتا، بطاطس مقلية..."
                      className="bg-background/80 hover:bg-background focus:bg-background rounded-xl text-sm h-11 border-border/70"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground block">
                        القسم التابع له <span className="text-destructive">*</span>
                      </label>
                      <ComboboxSelect
                        value={formData.category_id ? String(formData.category_id) : ""}
                        onValueChange={(val) => setFormData((prev) => ({ ...prev, category_id: Number(val) || 0 }))}
                        options={categoryModalOptions}
                        placeholder="اختر القسم التابع له..."
                        emptyText="لا توجد أقسام مطابقة"
                        className="w-full text-sm bg-background/80 hover:bg-background text-foreground rounded-xl border border-border/70 h-11"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground block">
                        {formData.has_sizes ? `السعر يبدأ من (${activeCurrency})` : `سعر الطبق (${activeCurrency}) *`}
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={formData.price}
                          onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                          placeholder="مثال: 150.00"
                          className="bg-background/80 hover:bg-background focus:bg-background rounded-xl text-sm h-11 border-border/70 pe-12"
                          required={!formData.has_sizes}
                          disabled={formData.has_sizes && formData.sizes.length > 0}
                        />
                        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">
                          {activeCurrency}
                        </span>
                      </div>
                      {formData.has_sizes && (
                        <span className="text-[11px] text-muted-foreground block mt-1">
                          يتم احتساب السعر تلقائياً من أقل سعر حجم محدد أدناه.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">
                      الوصف والمكونات (اختياري)
                    </label>
                    <Textarea
                      value={formData.description || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="اكتب مكونات الوجبة وتفاصيلها اللذيذة لجذب الزبائن..."
                      rows={2}
                      className="bg-background/80 hover:bg-background focus:bg-background rounded-xl text-sm resize-none border-border/70"
                    />
                  </div>
                </div>

                {/* 2. الأحجام والأسعار المختلفة */}
                <div className="p-4 sm:p-5 rounded-xl bg-muted/20 border border-border/50 space-y-4 text-right">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <LayersIcon className="size-4 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">
                          الأحجام والأسعار المتعددة (اختياري)
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        تفعيل هذا الخيار إذا كان الطبق يقدم بأحجام مختلفة (صغير، وسط، عائلي) بأسعار محددة.
                      </p>
                    </div>
                    <Switch
                      checked={formData.has_sizes}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => ({
                          ...prev,
                          has_sizes: checked,
                          sizes:
                            checked && prev.sizes.length === 0
                              ? [{ name: "وسط", price: parseFloat(prev.price) || 100 }]
                              : prev.sizes,
                        }))
                      }}
                    />
                  </div>

                  {formData.has_sizes && (
                    <div className="space-y-3 pt-3 border-t border-border/40">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">قائمة أحجام الطبق:</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleApplyCommonSizes}
                          className="text-xs text-primary hover:underline h-auto p-0"
                        >
                          + تعيين أحجام شائعة (صغير / وسط / كبير)
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {formData.sizes.map((size, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-background p-2.5 rounded-xl border border-border/60 shadow-xs"
                          >
                            <Input
                              value={size.name}
                              onChange={(e) => handleUpdateSize(idx, "name", e.target.value)}
                              placeholder="اسم الحجم (مثال: وسط، كبير)..."
                              className="flex-1 text-xs sm:text-sm h-9 bg-transparent border-0 focus-visible:ring-0"
                            />
                            <div className="flex items-center gap-1.5 w-28 border-s border-border/50 ps-2">
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                value={size.price || ""}
                                onChange={(e) => handleUpdateSize(idx, "price", e.target.value)}
                                placeholder="السعر"
                                className="text-xs sm:text-sm h-9 bg-transparent border-0 focus-visible:ring-0 text-left font-bold"
                              />
                              <span className="text-[11px] text-muted-foreground shrink-0">{activeCurrency}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSize(idx)}
                              className="size-8 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0"
                              title="حذف هذا الحجم"
                            >
                              <Trash2Icon className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSize}
                        className="w-full text-xs gap-1.5 rounded-xl border-dashed h-9"
                      >
                        <PlusIcon className="size-3.5" />
                        <span>إضافة حجم آخر للطبق</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* 3. الإضافات والملحقات التابعة للطبق */}
                <div className="p-4 sm:p-5 rounded-xl bg-muted/20 border border-border/50 space-y-4 text-right">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <SlidersHorizontalIcon className="size-4 text-indigo-500" />
                        <h4 className="text-sm font-bold text-foreground">
                          الإضافات والملحقات التابعة للطبق
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        حدد الملحقات التي تتاح مع هذا الطبق في الكاشير والفاتورة.
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                      {formData.modifier_ids.length} إضافات محددة
                    </span>
                  </div>

                  {/* قائمة الإضافات المتاحة للاختيار */}
                  {modifiers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 max-h-48 overflow-y-auto p-1">
                      {modifiers.map((mod) => {
                        const isChecked = formData.modifier_ids.includes(mod.id)
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => handleToggleModifier(mod.id)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-right transition-all ${
                              isChecked
                                ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 shadow-xs"
                                : "bg-background border-border/60 hover:bg-muted/50 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`size-4 rounded-md flex items-center justify-center border transition-colors ${
                                  isChecked
                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                    : "border-muted-foreground/40 bg-background"
                                }`}
                              >
                                {isChecked && <CheckIcon className="size-3 stroke-[3]" />}
                              </div>
                              <span className="text-xs font-semibold">{mod.name}</span>
                            </div>
                            <span className="text-xs font-bold shrink-0">
                              {mod.price > 0 ? `+${mod.price} ${activeCurrency}` : "مجاني"}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-1">لا توجد إضافات عامة مضافة بعد.</p>
                  )}

                  {/* إنشاء ملحق سريع خاص بهذا الطبق */}
                  <div className="pt-3 border-t border-border/40 space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      + إنشاء ملحق مخصص لهذا الطبق سريعاً:
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <Input
                        value={newExtraName}
                        onChange={(e) => setNewExtraName(e.target.value)}
                        placeholder="اسم الملحق (مثال: صوص جبنة، بطاطس)..."
                        className="flex-1 text-xs h-9 bg-background rounded-xl border-border/70"
                      />
                      <div className="flex items-center gap-1.5 w-full sm:w-28">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={newExtraPrice}
                          onChange={(e) => setNewExtraPrice(e.target.value)}
                          placeholder="السعر"
                          className="text-xs h-9 bg-background rounded-xl border-border/70 text-left font-bold"
                        />
                        <span className="text-[11px] text-muted-foreground shrink-0">{activeCurrency}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleQuickAddModifier}
                        disabled={!newExtraName.trim()}
                        className="w-full sm:w-auto text-xs h-9 rounded-xl shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <PlusIcon className="size-3.5" />
                        <span>إضافة وربط</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 4. حالة التوفر للطلب */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50">
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold text-foreground">حالة التوفر للطلب</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formData.is_active
                        ? "المنتج متوفر وجاهز للطلب في المنيو والكاشير"
                        : "غير متوفر حالياً في المطبخ"}
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>

              {/* العمود الأيسر (5 أعمدة): رفع وإدارة صور الطبق من الجهاز */}
              <div className="lg:col-span-5 space-y-5">
                <div className="p-4 sm:p-5 rounded-xl bg-muted/20 border border-border/50 space-y-4 text-right">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">صور الطبق</h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {formData.images.length} صور
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ارفع صور الطبق من جهازك، ويمكنك اختيار عدة صور وتحديد واحدة لتكون الصورة الرئيسية.
                  </p>

                  {/* زر ومنطقة رفع الصور */}
                  <label className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 rounded-xl cursor-pointer transition-all text-center group">
                    <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform shadow-xs">
                      <UploadIcon className="size-6" />
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      اضغط لاختيار صور من جهازك
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      يمكنك تحديد صورة واحدة أو عدة صور معاً
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        handleFilesUpload(e.target.files)
                        e.target.value = ""
                      }}
                    />
                  </label>

                  {/* معاينة الصورة الرئيسية */}
                  {formData.image ? (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <span className="text-xs font-semibold text-foreground block">
                        الصورة الرئيسية الحالية للطبق:
                      </span>
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-primary/60 shadow-md bg-muted group">
                        <img
                          src={formData.image}
                          alt="الصورة الرئيسية"
                          className="size-full object-cover"
                        />
                        <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-md">
                          <StarIcon className="size-3.5 fill-current" />
                          <span>الصورة الرئيسية</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(formData.image)}
                          className="absolute top-2.5 end-2.5 size-8 rounded-full bg-destructive/90 hover:bg-destructive text-white flex items-center justify-center transition-colors shadow-md"
                          title="حذف هذه الصورة"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-border/80 bg-background/50 text-center text-muted-foreground space-y-1">
                      <p className="text-xs font-medium">لم يتم اختيار أي صورة لهذا الطبق بعد</p>
                      <p className="text-[11px] text-muted-foreground/70">
                        قم برفع صور من جهازك لتظهر لزبائن المنيو وفي شاشة الكاشير
                      </p>
                    </div>
                  )}

                  {/* معرض كافة الصور المرفوعة */}
                  {formData.images.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-border/40">
                      <span className="text-xs font-semibold text-foreground block">
                        كافة الصور المرفوعة ({formData.images.length}):
                      </span>
                      <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                        {formData.images.map((imgUrl, idx) => {
                          const isPrimary = formData.image === imgUrl || (!formData.image && idx === 0)
                          return (
                            <div
                              key={idx}
                              className={`relative group rounded-xl overflow-hidden border-2 transition-all p-1 bg-background ${
                                isPrimary
                                  ? "border-primary shadow-xs ring-2 ring-primary/20"
                                  : "border-border/60 hover:border-border"
                              }`}
                            >
                              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={imgUrl}
                                  alt={`صورة ${idx + 1}`}
                                  className="size-full object-cover"
                                />

                                {isPrimary && (
                                  <span className="absolute top-1 start-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-xs">
                                    <StarIcon className="size-2.5 fill-current" />
                                    <span>الرئيسية</span>
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(imgUrl)}
                                  className="absolute top-1 end-1 size-6 rounded-full bg-destructive/90 hover:bg-destructive text-white flex items-center justify-center transition-colors shadow-xs"
                                  title="حذف الصورة"
                                >
                                  <Trash2Icon className="size-3" />
                                </button>
                              </div>

                              {!isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryImage(imgUrl)}
                                  className="w-full mt-1.5 py-1 px-1.5 text-[11px] font-medium rounded-lg bg-muted/60 hover:bg-primary hover:text-primary-foreground text-foreground transition-colors flex items-center justify-center gap-1"
                                >
                                  <StarIcon className="size-3" />
                                  <span>تعيين كرئيسية</span>
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* أزرار الحفظ والإلغاء */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="w-full sm:w-auto rounded-xl px-5 h-11 text-muted-foreground hover:text-foreground"
                disabled={isSaving}
              >
                إلغاء
              </Button>

              <Button
                type="submit"
                disabled={isSaving || !formData.name.trim() || !formData.category_id}
                className="w-full sm:w-auto min-w-40 rounded-xl px-6 h-11 font-bold shadow-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="size-4" />
                    <span>{editingProduct ? "حفظ التعديلات" : "إضافة الطبق للمنيو"}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-xl p-5 sm:p-6 shadow-xl bg-card border border-border/60 text-right">
          <AlertDialogHeader className="space-y-2 text-right">
            <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-1">
              <Trash2Icon className="size-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold">
              هل أنت متأكد من حذف هذا الطبق؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              سيتم حذف الطبق{" "}
              <span className="font-semibold text-foreground">
                &quot;{productToDelete?.name}&quot;
              </span>{" "}
              نهائياً من المنيو. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4 sm:space-x-reverse">
            <AlertDialogCancel className="rounded-xl text-muted-foreground shadow-none">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
            >
              نعم، حذف المنتج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
