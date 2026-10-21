"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useSettingStore } from "@/store/setting.store"
import { type RestaurantSettings } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  StoreIcon,
  CoinsIcon,
  TruckIcon,
  PrinterIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Loader2Icon,
  SaveIcon,
  RefreshCwIcon,
  UploadIcon,
  Trash2Icon,
  PercentIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  FileTextIcon,
  UtensilsCrossedIcon,
  ShoppingBagIcon,
  RotateCcwIcon,
  CheckIcon,
  Building2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  XIcon,
  CameraIcon,
  LinkIcon,
  ImageIcon,
} from "lucide-react"

// ضغط وتصغير الصورة تلقائياً لسرعة التخزين والتحميل
async function compressImage(file: File, maxDim = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
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

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(e.target?.result as string)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const format = file.type === "image/png" ? "image/png" : "image/jpeg"
        resolve(canvas.toDataURL(format, quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// العملات المعتمدة
const CURRENCY_PRESETS = [
  { label: "جنيه مصري", symbol: "ج.م", flag: "🇪🇬" },
  { label: "ريال سعودي", symbol: "ر.س", flag: "🇸🇦" },
  { label: "درهم إماراتي", symbol: "د.إ", flag: "🇦🇪" },
  { label: "دينار كويتي", symbol: "د.ك", flag: "🇰🇼" },
  { label: "ريال قطري", symbol: "ر.ق", flag: "🇶🇦" },
  { label: "دولار أمريكي", symbol: "$", flag: "🇺🇸" },
]

// النسب الضريبية الشائعة
const TAX_PRESETS = [
  { label: "14% (مصر)", value: 14 },
  { label: "15% (السعودية)", value: 15 },
  { label: "5% (الإمارات)", value: 5 },
  { label: "10% (البحرين)", value: 10 },
]

// نماذج ترويسة وتذييل الفاتورة
const HEADER_TEMPLATES = [
  "أهلاً وسهلاً بكم في مطعمنا! نسعد بخدمتكم دائماً",
  "طعام طازج يُحضر بحب يومياً بأعلى معايير الجودة",
]

const FOOTER_TEMPLATES = [
  "شكراً لزيارتكم! رأيك يهمنا، نسعد بلقائك قريباً.",
  "تابع عروضنا على صفحات التواصل الاجتماعي @Restro",
]

export default function SettingsPage() {
  const { settings, isLoading, isSaving, fetchSettings, updateSettings } = useSettingStore()

  const [formData, setFormData] = React.useState<RestaurantSettings>(settings)
  const [mounted, setMounted] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("profile")
  const [banner, setBanner] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  // مقارنة التعديلات لمعرفة ما إذا كانت هناك تغييرات غير محفوظة
  const hasChanges = React.useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(settings)
  }, [formData, settings])

  React.useEffect(() => {
    setMounted(true)
    fetchSettings()
  }, [fetchSettings])

  React.useEffect(() => {
    setFormData(settings)
  }, [settings])

  // دعم اختصار Ctrl+S / Cmd+S للحفظ
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [formData, isSaving, isLoading])

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false)
  const [showUrlInput, setShowUrlInput] = React.useState(false)
  const [urlInput, setUrlInput] = React.useState("")

  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBanner({ type, text })
    setTimeout(() => setBanner(null), 4000)
  }

  // رفع وتغيير الصورة من الجهاز مع ضغط تلقائي وحفظ فوري
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    try {
      const base64 = await compressImage(file)
      const updated = { ...formData, logo: base64 }
      setFormData(updated)

      // حفظ فوري في قاعدة البيانات
      const res = await updateSettings(updated)
      if (res.success) {
        showBanner("تم رفع وتحديث صورة الشعار وحفظها بنجاح ✓", "success")
      } else {
        showBanner("تم اختيار الصورة بنجاح. اضغط حفظ لتأكيد التغيير.", "success")
      }
    } catch {
      showBanner("تعذر معالجة الصورة، يرجى اختيار ملف صورة صالح (PNG أو JPG أو WebP).", "error")
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // تطبيق رابط صورة خارجي وحفظه فورياً
  const handleSaveLogoUrl = async () => {
    const cleanUrl = urlInput.trim()
    if (!cleanUrl) return

    setIsUploadingLogo(true)
    const updated = { ...formData, logo: cleanUrl }
    setFormData(updated)
    try {
      const res = await updateSettings(updated)
      if (res.success) {
        showBanner("تم حفظ وتحديث رابط شعار المطعم بنجاح ✓", "success")
        setShowUrlInput(false)
        setUrlInput("")
      } else {
        showBanner(res.message || "فشل حفظ رابط الشعار", "error")
      }
    } catch {
      showBanner("حدث خطأ أثناء حفظ رابط الصورة", "error")
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // إزالة الشعار وحفظ التغيير
  const handleRemoveLogo = async () => {
    setIsUploadingLogo(true)
    const updated = { ...formData, logo: null }
    setFormData(updated)
    try {
      const res = await updateSettings(updated)
      if (res.success) {
        showBanner("تمت إزالة الشعار بنجاح ✓", "success")
      }
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleResetChanges = () => {
    setFormData(settings)
    showBanner("تم التراجع عن التعديلات", "success")
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formData.restaurant_name.trim()) {
      showBanner("يرجى إدخال اسم المطعم.", "error")
      setActiveTab("profile")
      return
    }

    const res = await updateSettings(formData)
    if (res.success) {
      showBanner(res.message, "success")
    } else {
      showBanner(res.message, "error")
    }
  }

  const handlePrintTestReceipt = () => {
    window.print()
  }

  if (!mounted) {
    return null
  }

  return (
    <PageContainer
      title="إعدادات النظام والمنشأة"
      description="تخصيص هوية المطعم، العملات والضرائب، قنوات البيع وتصميم الفاتورة الحرارية"
      action={
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetChanges}
              disabled={isSaving}
              className="h-8.5 rounded-lg text-xs gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
            >
              <RotateCcwIcon className="size-3.5" />
              <span>تراجع</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchSettings()}
            disabled={isLoading || isSaving}
            className="h-8.5 rounded-lg text-xs gap-1.5"
            title="تحديث البيانات"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSave()}
            disabled={isSaving || isLoading}
            className="h-8.5 px-3.5 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SaveIcon className="size-3.5" />
            )}
            <span>حفظ الإعدادات</span>
            <span className="hidden sm:inline-block text-[10px] opacity-75 font-mono px-1 py-0.5 rounded bg-black/20">
              Ctrl+S
            </span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* إشعار العملية */}
        {banner && (
          <div
            className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-lg text-xs font-medium border animate-in fade-in duration-150 ${
              banner.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/25 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
              )}
              <span>{banner.text}</span>
            </div>
            <button
              onClick={() => setBanner(null)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )}

        {/* أشرطة التبويبات الموحدة */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-3.5">
          <div className="p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-xs">
            <TabsList className="bg-muted/50 p-1 rounded-lg h-8.5 border border-border/60 flex-wrap sm:flex-nowrap">
              <TabsTrigger
                value="profile"
                className="rounded-md gap-1.5 text-xs font-semibold h-6.5 px-2.5"
              >
                <Building2Icon className="size-3 text-primary" />
                <span>هوية المطعم</span>
              </TabsTrigger>

              <TabsTrigger
                value="finance"
                className="rounded-md gap-1.5 text-xs font-semibold h-6.5 px-2.5"
              >
                <CoinsIcon className="size-3 text-amber-500" />
                <span>العملة والضرائب</span>
              </TabsTrigger>

              <TabsTrigger
                value="channels"
                className="rounded-md gap-1.5 text-xs font-semibold h-6.5 px-2.5"
              >
                <TruckIcon className="size-3 text-sky-500" />
                <span>قنوات الطلبات والتوصيل</span>
              </TabsTrigger>

              <TabsTrigger
                value="receipt"
                className="rounded-md gap-1.5 text-xs font-semibold h-6.5 px-2.5"
              >
                <PrinterIcon className="size-3 text-purple-500" />
                <span>الفاتورة الحرارية</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. هوية المطعم */}
          <TabsContent value="profile" className="space-y-4 mt-0">
            <Card className="rounded-xl border border-border/60 bg-card shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <StoreIcon className="size-4 text-primary" />
                  <span>البيانات الأساسية للمنشأة</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  تظهر هذه البيانات على الفواتير المطبوعة والمستندات الرسمية
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* رفع وتعديل الشعار مع دعم النقر المباشر والرابط والتفريغ الفوري */}
                <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      {/* صندوق معاينة الصورة التفاعلي - يقبل النقر المباشر */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="relative size-16 sm:size-18 rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary bg-muted/30 hover:bg-muted/60 flex items-center justify-center overflow-hidden shrink-0 shadow-xs cursor-pointer group transition-all"
                        title="اضغط لاختيار صورة من جهازك"
                      >
                        {formData.logo ? (
                          <img
                            src={formData.logo}
                            alt="شعار المطعم"
                            className="size-full object-contain p-1.5 transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground/60 group-hover:text-primary transition-colors">
                            <StoreIcon className="size-7" />
                            <span className="text-[9px] font-semibold mt-0.5">شعار</span>
                          </div>
                        )}

                        {/* تأثير التمرير والأيقونة */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-0.5 backdrop-blur-xs">
                          {isUploadingLogo ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <>
                              <CameraIcon className="size-4" />
                              <span className="text-[9px] font-bold">تغيير</span>
                            </>
                          )}
                        </div>
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">شعار المطعم الرسمي</h4>
                          {formData.logo && (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 px-2 py-0">
                              مفعّل ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          يظهر الشعار في الفاتورة الحرارية، وقائمة الزبائن، والتقارير.
                        </p>
                        <p className="text-[11px] text-muted-foreground/80">
                          صورة PNG أو JPG أو WebP (يتم ضغطها وتجهيزها تلقائياً وبدون أي قيود).
                        </p>
                      </div>
                    </div>

                    {/* أزرار التحكم بالصورة */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* زر رفع الصورة المباشر */}
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="h-8.5 rounded-lg text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                      >
                        {isUploadingLogo ? (
                          <Loader2Icon className="size-3.5 animate-spin" />
                        ) : (
                          <UploadIcon className="size-3.5" />
                        )}
                        <span>{formData.logo ? "تغيير الصورة" : "رفع صورة من جهازك"}</span>
                      </Button>

                      {/* زر إضافة رابط صورة */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="h-8.5 rounded-lg text-xs gap-1.5"
                      >
                        <LinkIcon className="size-3.5" />
                        <span>{showUrlInput ? "إلغاء الرابط" : "رابط إنترنت"}</span>
                      </Button>

                      {/* زر إزالة الشعار */}
                      {formData.logo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          disabled={isUploadingLogo}
                          className="h-8.5 rounded-lg text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 gap-1.5"
                          title="إزالة الشعار الحالي"
                        >
                          <Trash2Icon className="size-3.5" />
                          <span>إزالة</span>
                        </Button>
                      )}

                      {/* مدخل الملفات الخفي الحقيقي */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* حقل إدخال الرابط عند الفتح */}
                  {showUrlInput && (
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="ضع رابط الصورة المباشر هنا (مثل: https://example.com/logo.png)"
                        dir="ltr"
                        className="h-8.5 text-xs rounded-lg flex-1 font-mono text-left"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveLogoUrl}
                          disabled={!urlInput.trim() || isUploadingLogo}
                          className="h-8.5 rounded-lg text-xs font-bold gap-1.5"
                        >
                          {isUploadingLogo ? <Loader2Icon className="size-3.5 animate-spin" /> : <CheckIcon className="size-3.5" />}
                          <span>تطبيق وحفظ الرابط</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowUrlInput(false)
                            setUrlInput("")
                          }}
                          className="h-8.5 rounded-lg text-xs"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* شبكة حقول البيانات المتناسقة */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <StoreIcon className="size-3.5 text-primary" />
                      <span>اسم المطعم / المنشأة *</span>
                    </label>
                    <Input
                      value={formData.restaurant_name}
                      onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                      placeholder="مثال: مطعم ريسترو"
                      className="h-9 rounded-lg text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <PhoneIcon className="size-3.5 text-primary" />
                      <span>رقم الهاتف المعتمد</span>
                    </label>
                    <Input
                      value={formData.restaurant_phone || ""}
                      onChange={(e) => setFormData({ ...formData, restaurant_phone: e.target.value })}
                      placeholder="01000000000"
                      className="h-9 rounded-lg text-xs font-mono text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <MailIcon className="size-3.5 text-primary" />
                      <span>البريد الإلكتروني للفرع</span>
                    </label>
                    <Input
                      type="email"
                      value={formData.restaurant_email || ""}
                      onChange={(e) => setFormData({ ...formData, restaurant_email: e.target.value })}
                      placeholder="info@restro.com"
                      className="h-9 rounded-lg text-xs font-mono text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <MapPinIcon className="size-3.5 text-primary" />
                      <span>العنوان التفصيلي وموقع الفرع</span>
                    </label>
                    <Input
                      value={formData.restaurant_address || ""}
                      onChange={(e) => setFormData({ ...formData, restaurant_address: e.target.value })}
                      placeholder="مثال: شارع النصر، المعادي، القاهرة"
                      className="h-9 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. العملة والضرائب */}
          <TabsContent value="finance" className="space-y-4 mt-0">
            {/* بطاقة العملة المعتمدة */}
            <Card className="rounded-xl border border-border/60 bg-card shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CoinsIcon className="size-4 text-amber-500" />
                  <span>العملة المعتمدة للنظام</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  العملة التي ستعتمد في تسعير الأطباق، الفواتير المطبوعة، وكشوف الحسابات
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-wrap gap-2">
                  {CURRENCY_PRESETS.map((curr) => {
                    const isSelected = formData.currency === curr.symbol
                    return (
                      <button
                        key={curr.symbol}
                        type="button"
                        onClick={() => setFormData({ ...formData, currency: curr.symbol })}
                        className={`h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card border-border/70 hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        <span>{curr.flag}</span>
                        <span>{curr.label}</span>
                        <span className="font-mono font-bold opacity-80">({curr.symbol})</span>
                        {isSelected && <CheckIcon className="size-3.5" />}
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/40 max-w-sm">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    رمز مخصص:
                  </span>
                  <Input
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="رمز العملة يدوي"
                    className="h-8.5 rounded-lg text-xs font-bold text-center w-28"
                  />
                  <span className="text-[11px] text-muted-foreground">رمز العملة الحالي للنظام</span>
                </div>
              </CardContent>
            </Card>

            {/* بطاقة ضريبة القيمة المضافة */}
            <Card className="rounded-xl border border-border/60 bg-card shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <PercentIcon className="size-4 text-primary" />
                      <span>ضريبة القيمة المضافة (VAT)</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      الحساب التلقائي للضريبة على الفواتير وإدراجها في إقرار المبيعات
                    </CardDescription>
                  </div>
                  <Switch
                    checked={formData.tax_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, tax_enabled: checked })}
                  />
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-3.5">
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    formData.tax_enabled
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-medium"
                      : "bg-muted/30 border-border/50 text-muted-foreground"
                  }`}
                >
                  <ShieldCheckIcon className="size-4 shrink-0" />
                  <span>
                    {formData.tax_enabled
                      ? `الضريبة مفعلة بنسبة ${formData.tax_percentage}% وتضاف تلقائياً لإجمالي كل فاتورة.`
                      : "الضريبة معطلة، تصدر الفواتير بدون احتساب أي ضريبة إضافية."}
                  </span>
                </div>

                {formData.tax_enabled && (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-muted-foreground ms-1">نسب شائعة:</span>
                      {TAX_PRESETS.map((p) => (
                        <Button
                          key={p.value}
                          type="button"
                          variant={formData.tax_percentage === p.value ? "default" : "outline"}
                          size="xs"
                          onClick={() => setFormData({ ...formData, tax_percentage: p.value })}
                          className="h-7 text-xs rounded-md"
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">نسبة الضريبة (%)</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.tax_percentage}
                          onChange={(e) =>
                            setFormData({ ...formData, tax_percentage: parseFloat(e.target.value) || 0 })
                          }
                          className="h-9 rounded-lg text-xs font-mono text-center font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">الرقم الضريبي (اختياري)</label>
                        <Input
                          value={formData.tax_number || ""}
                          onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                          placeholder="مثال: 300012345600003"
                          className="h-9 rounded-lg text-xs font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. قنوات الطلبات والتوصيل */}
          <TabsContent value="channels" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* الصالة */}
              <Card className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <UtensilsCrossedIcon className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">الصالة والطاولات</span>
                  </div>
                  <Switch
                    checked={formData.enable_tables}
                    onCheckedChange={(checked) => setFormData({ ...formData, enable_tables: checked })}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  تسجيل طلبات الصالة وحجز المقاعد والتنسيق مع المطبخ.
                </p>
                <div className="text-[10px] font-bold">
                  {formData.enable_tables ? (
                    <span className="text-emerald-600 dark:text-emerald-400">● مفعلة في الكاشير</span>
                  ) : (
                    <span className="text-muted-foreground">○ معطلة مؤقتاً</span>
                  )}
                </div>
              </Card>

              {/* التيك أواي */}
              <Card className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <ShoppingBagIcon className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">الاستلام (تيك أواي)</span>
                  </div>
                  <Switch
                    checked={formData.enable_takeaway}
                    onCheckedChange={(checked) => setFormData({ ...formData, enable_takeaway: checked })}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  إصدار وجبات سريعة للاستلام الفوري من الكاونتر.
                </p>
                <div className="text-[10px] font-bold">
                  {formData.enable_takeaway ? (
                    <span className="text-emerald-600 dark:text-emerald-400">● مفعلة في الكاشير</span>
                  ) : (
                    <span className="text-muted-foreground">○ معطلة مؤقتاً</span>
                  )}
                </div>
              </Card>

              {/* الدليفري */}
              <Card className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <TruckIcon className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">التوصيل (ديليفري)</span>
                  </div>
                  <Switch
                    checked={formData.enable_delivery}
                    onCheckedChange={(checked) => setFormData({ ...formData, enable_delivery: checked })}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  توجيه الطلبات لأسطول المناديب وتتبع العناوين والتحصيل.
                </p>
                <div className="text-[10px] font-bold">
                  {formData.enable_delivery ? (
                    <span className="text-emerald-600 dark:text-emerald-400">● مفعلة في الكاشير</span>
                  ) : (
                    <span className="text-muted-foreground">○ معطلة مؤقتاً</span>
                  )}
                </div>
              </Card>
            </div>

            {/* حساب ورسوم التوصيل والديليفري */}
            <Card className="rounded-xl border border-border/60 bg-card shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TruckIcon className="size-4 text-primary" />
                  <span>حساب وتسعير رسوم الديليفري (حسب المسافة)</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  يتم حساب تكلفة التوصيل تلقائياً في الكاشير بناءً على المسافة بالكيلومتر عند كتابة العنوان
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* الرسوم الأساسية */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>الرسوم الأساسية (فتحة العداد):</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.delivery_base_fee ?? formData.delivery_fee ?? 15}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setFormData({ ...formData, delivery_base_fee: val, delivery_fee: val })
                        }}
                        className="h-9 rounded-lg font-mono text-center font-bold text-xs"
                      />
                      <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                        {formData.currency}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      المبلغ المبدئي الثابت لكل طلب توصيل بغض النظر عن المسافة.
                    </p>
                  </div>

                  {/* سعر الكيلومتر */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>سعر الكيلومتر الواحد:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.delivery_fee_per_km ?? 5}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            delivery_fee_per_km: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-9 rounded-lg font-mono text-center font-bold text-xs"
                      />
                      <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                        {formData.currency} / كم
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      المبلغ الإضافي الذي يضرب في عدد الكيلومترات للعنوان.
                    </p>
                  </div>
                </div>

                {/* معاينة حية للمعادلة */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1 text-xs">
                  <div className="font-semibold text-primary flex items-center gap-1.5">
                    <SparklesIcon className="size-3.5" />
                    <span>معادلة الحساب المعتمدة:</span>
                  </div>
                  <p className="text-foreground/90 font-mono text-[11px]">
                    رسوم التوصيل = الرسوم الأساسية ({formData.delivery_base_fee ?? formData.delivery_fee ?? 15} {formData.currency}) + [المسافة بالكم × ({formData.delivery_fee_per_km ?? 5} {formData.currency})]
                  </p>
                  <div className="pt-1 text-[11px] text-muted-foreground flex items-center gap-2">
                    <span className="font-bold text-foreground">مثال عملي:</span>
                    <span>
                      عنوان على بعد <b className="text-primary font-mono">4 كم</b> ➔ التكلفة ={" "}
                      <b className="text-primary font-mono">
                        {(formData.delivery_base_fee ?? formData.delivery_fee ?? 15) + (4 * (formData.delivery_fee_per_km ?? 5))}{" "}
                        {formData.currency}
                      </b>
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  * ملاحظة: يمكن للكاشير دائماً تعديل رسوم التوصيل أو المسافة يدوياً أو إعفائها بالكامل لأي طلب أثناء إدخال الفاتورة.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. الفاتورة الحرارية والمطبوعات */}
          <TabsContent value="receipt" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* إعداد نصوص الفاتورة */}
              <div className="md:col-span-7 space-y-4">
                <Card className="rounded-xl border border-border/60 bg-card shadow-xs">
                  <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FileTextIcon className="size-4 text-primary" />
                      <span>نصوص الفاتورة الحرارية</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      الرسائل والنصوص الترحيبية المطبوعة للعميل على الإيصال
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* الترويسة */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>ترويسة إضافية (أعلى الفاتورة)</span>
                        <span className="text-[10px] text-muted-foreground">اختياري</span>
                      </label>
                      <Textarea
                        rows={2}
                        value={formData.receipt_header || ""}
                        onChange={(e) => setFormData({ ...formData, receipt_header: e.target.value })}
                        placeholder="أهلاً بكم في مطعمنا! نسعد بخدمتكم"
                        className="text-xs rounded-lg resize-none min-h-[50px]"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {HEADER_TEMPLATES.map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData({ ...formData, receipt_header: tmpl })}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                          >
                            {tmpl.slice(0, 26)}...
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* التذييل */}
                    <div className="space-y-1.5 pt-2 border-t border-border/40">
                      <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>تذييل الفاتورة (أسفل الفاتورة)</span>
                        <span className="text-[10px] text-muted-foreground">اختياري</span>
                      </label>
                      <Textarea
                        rows={2}
                        value={formData.receipt_footer || ""}
                        onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                        placeholder="شكراً لزيارتكم! رأيك يهمنا دائماً"
                        className="text-xs rounded-lg resize-none min-h-[50px]"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {FOOTER_TEMPLATES.map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData({ ...formData, receipt_footer: tmpl })}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                          >
                            {tmpl.slice(0, 26)}...
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* المعاينة الحية للفاتورة 80mm */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[270px] space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-muted-foreground">معاينة ورقية (80mm)</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={handlePrintTestReceipt}
                      className="h-6.5 text-[10px] rounded-md"
                    >
                      تجربة الطباعة
                    </Button>
                  </div>

                  {/* كارت ورقة الفاتورة الحرارية */}
                  <div className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white text-neutral-900 p-4 font-mono text-[11px] shadow-sm space-y-2 text-center" dir="rtl">
                    {formData.logo ? (
                      <img src={formData.logo} alt="شعار" className="h-8 mx-auto object-contain" />
                    ) : (
                      <div className="font-bold text-xs">{formData.restaurant_name || "اسم المطعم"}</div>
                    )}

                    {formData.receipt_header && (
                      <p className="text-[9px] text-neutral-600 leading-tight">{formData.receipt_header}</p>
                    )}

                    <div className="text-[9px] text-neutral-500 space-y-0.5">
                      {formData.restaurant_address && <p>{formData.restaurant_address}</p>}
                      {formData.restaurant_phone && <p dir="ltr">{formData.restaurant_phone}</p>}
                      {formData.tax_enabled && formData.tax_number && (
                        <p>رقم ضريبي: {formData.tax_number}</p>
                      )}
                    </div>

                    <div className="border-b border-dashed border-neutral-300 my-1" />

                    <div className="flex justify-between text-[9px] text-neutral-600">
                      <span>فاتورة #ORD-001</span>
                      <span>طاولة 04</span>
                    </div>

                    <div className="border-b border-dashed border-neutral-300 my-1" />

                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between">
                        <span>1 × برجر كلاسيك</span>
                        <span>120.00 {formData.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>1 × بطاطس مقلية</span>
                        <span>35.00 {formData.currency}</span>
                      </div>
                    </div>

                    <div className="border-b border-dashed border-neutral-300 my-1" />

                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between text-neutral-600">
                        <span>المجموع:</span>
                        <span>155.00 {formData.currency}</span>
                      </div>
                      {formData.tax_enabled && (
                        <div className="flex justify-between text-neutral-600">
                          <span>ضريبة ({formData.tax_percentage}%):</span>
                          <span>{(155 * (formData.tax_percentage / 100)).toFixed(2)} {formData.currency}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-neutral-950 pt-1 border-t border-neutral-300">
                        <span>الإجمالي:</span>
                        <span>
                          {(155 + (formData.tax_enabled ? 155 * (formData.tax_percentage / 100) : 0)).toFixed(2)}{" "}
                          {formData.currency}
                        </span>
                      </div>
                    </div>

                    <div className="border-b border-dashed border-neutral-300 my-1" />

                    <p className="text-[9px] text-neutral-600 leading-tight">
                      {formData.receipt_footer || "شكراً لزيارتكم! نسعد بخدمتكم دائماً."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  )
}
