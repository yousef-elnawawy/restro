"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useDeliveryDriverStore } from "@/store/delivery-driver.store"
import { type DeliveryDriver, type CreateDeliveryDriverPayload } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
  TruckIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  PhoneIcon,
  BikeIcon,
  CarIcon,
  Edit2Icon,
  Trash2Icon,
  ShieldCheckIcon,
  ClockIcon,
  MessageCircleIcon,
} from "lucide-react"

export default function DeliveryDriversPage() {
  const {
    drivers,
    isLoading,
    isSaving,
    error,
    searchQuery,
    statusFilter,
    fetchDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
    updateStatus,
    setSearchQuery,
    setStatusFilter,
  } = useDeliveryDriverStore()

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    fetchDrivers()
  }, [fetchDrivers])

  // نافذة الإضافة / التعديل
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingDriver, setEditingDriver] = React.useState<DeliveryDriver | null>(null)
  const [formData, setFormData] = React.useState<CreateDeliveryDriverPayload>({
    name: "",
    phone: "",
    vehicle_type: "motorcycle",
    license_plate: "",
    status: "available",
    is_active: true,
    notes: "",
  })
  const [formError, setFormError] = React.useState<string | null>(null)

  // نافذة تأكيد الحذف
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [driverToDelete, setDriverToDelete] = React.useState<DeliveryDriver | null>(null)

  // إشعار العملية
  const [bannerMessage, setBannerMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMessage({ type, text })
    setTimeout(() => setBannerMessage(null), 3500)
  }

  // فلترة المناديب
  const filteredDrivers = React.useMemo(() => {
    return drivers.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const nameMatch = d.name?.toLowerCase().includes(q)
        const phoneMatch = d.phone?.toLowerCase().includes(q)
        const plateMatch = d.license_plate?.toLowerCase().includes(q)
        return nameMatch || phoneMatch || plateMatch
      }
      return true
    })
  }, [drivers, statusFilter, searchQuery])

  // إحصائيات سريعة
  const stats = React.useMemo(() => {
    const total = drivers.length
    const available = drivers.filter((d) => d.status === "available" && d.is_active).length
    const onDelivery = drivers.filter((d) => d.status === "on_delivery" && d.is_active).length
    const offDuty = drivers.filter((d) => d.status === "off_duty" || !d.is_active).length
    return { total, available, onDelivery, offDuty }
  }, [drivers])

  // فتح نافذة الإضافة
  const handleOpenAdd = () => {
    setEditingDriver(null)
    setFormData({
      name: "",
      phone: "",
      vehicle_type: "motorcycle",
      license_plate: "",
      status: "available",
      is_active: true,
      notes: "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // فتح نافذة التعديل
  const handleOpenEdit = (driver: DeliveryDriver) => {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      phone: driver.phone,
      vehicle_type: driver.vehicle_type,
      license_plate: driver.license_plate || "",
      status: driver.status,
      is_active: driver.is_active,
      notes: driver.notes || "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // حفظ الإضافة أو التعديل
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError("يرجى إدخال اسم المندوب.")
      return
    }

    if (!formData.phone.trim()) {
      setFormError("يرجى إدخال رقم الهاتف.")
      return
    }

    if (editingDriver) {
      const res = await updateDriver(editingDriver.id, formData)
      if (res.success) {
        setDialogOpen(false)
        showBanner("تم تحديث بيانات المندوب بنجاح.")
      } else {
        setFormError(res.message)
      }
    } else {
      const res = await createDriver(formData)
      if (res.success) {
        setDialogOpen(false)
        showBanner("تمت إضافة مندوب التوصيل بنجاح.")
      } else {
        setFormError(res.message)
      }
    }
  }

  // تأكيد الحذف
  const handleConfirmDelete = async () => {
    if (!driverToDelete) return
    const res = await deleteDriver(driverToDelete.id)
    setDeleteConfirmOpen(false)
    setDriverToDelete(null)
    if (res.success) {
      showBanner("تم حذف المندوب بنجاح.")
    } else {
      showBanner(res.message, "error")
    }
  }

  // تغيير سريع للحالة
  const handleStatusChange = async (
    driverId: number,
    newStatus: "available" | "on_delivery" | "off_duty"
  ) => {
    const res = await updateStatus(driverId, newStatus)
    if (res.success) {
      showBanner("تم تحديث حالة المندوب.")
    } else {
      showBanner(res.message, "error")
    }
  }

  // وسيلة التوصيل
  const renderVehicleBadge = (type: string, plate?: string | null) => {
    const labels: Record<string, { label: string; icon: React.ReactNode }> = {
      motorcycle: { label: "موتوسيكل", icon: <BikeIcon className="size-3" /> },
      car: { label: "سيارة", icon: <CarIcon className="size-3" /> },
      scooter: { label: "سكوتر", icon: <BikeIcon className="size-3" /> },
      bicycle: { label: "عجلة", icon: <BikeIcon className="size-3" /> },
    }
    const item = labels[type] || { label: type, icon: <TruckIcon className="size-3" /> }
    return (
      <div className="flex items-center gap-1.5 text-xs text-foreground/80">
        <span className="text-muted-foreground">{item.icon}</span>
        <span>{item.label}</span>
        {plate && <span className="font-mono text-[10px] text-muted-foreground">({plate})</span>}
      </div>
    )
  }

  // شارة الحالة
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            جاهز ومتاح
          </span>
        )
      case "on_delivery":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            في مهمة توصيل
          </span>
        )
      case "off_duty":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            خارج الوردية
          </span>
        )
    }
  }

  return (
    <PageContainer
      title="مناديب وكباتن الديليفري"
      description="إدارة أسطول التوصيل، متابعة وسيلة النقل، وتحديث حالة جاهزية السائقين"
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchDrivers()}
            disabled={isLoading}
            className="h-8.5 rounded-md text-xs gap-1.5"
            title="تحديث القائمة"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="h-8.5 px-3 rounded-md text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PlusIcon className="size-3.5" />
            <span>إضافة مندوب</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* إشعار النجاح / الخطأ */}
        {bannerMessage && (
          <div
            className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-md border text-xs font-medium animate-in fade-in duration-150 ${
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
              className="text-xs opacity-70 hover:opacity-100 p-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* بطاقات الإحصائيات العلوية */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TruckIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي المناديب</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                {mounted ? stats.total : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">جاهز للتوصيل</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {mounted ? stats.available : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ClockIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">في مهمة توصيل</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {mounted ? stats.onDelivery : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ShieldCheckIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">خارج الوردية</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-muted-foreground font-mono">
                {mounted ? stats.offDuty : 0}
              </p>
            </div>
          </div>
        </div>

        {/* شريط البحث والفلترة */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="relative flex-1 w-full sm:max-w-md">
            <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المندوب أو الهاتف أو لوحة المركبة..."
              className="ps-9 h-8.5 text-xs bg-muted/40 rounded-lg border-border/60"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground"
              }`}
            >
              الكل ({drivers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("available")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "available"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground"
              }`}
            >
              متاح ({drivers.filter((d) => d.status === "available").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("on_delivery")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "on_delivery"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground"
              }`}
            >
              في مهمة ({drivers.filter((d) => d.status === "on_delivery").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("off_duty")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "off_duty"
                  ? "bg-muted-foreground text-background shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground"
              }`}
            >
              خارج العمل ({drivers.filter((d) => d.status === "off_duty").length})
            </button>
          </div>
        </div>

        {/* عرض جدول المناديب */}
        {isLoading && drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-card border border-border/60 rounded-md space-y-2">
            <RefreshCwIcon className="size-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">جاري تحميل بيانات المناديب...</p>
          </div>
        ) : error && drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-card border border-destructive/30 rounded-md space-y-2 text-destructive">
            <AlertCircleIcon className="size-6" />
            <p className="text-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchDrivers()} className="h-8 text-xs">
              إعادة المحاولة
            </Button>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-card border border-border/60 rounded-md space-y-2 text-muted-foreground">
            <TruckIcon className="size-8 text-muted-foreground/40" />
            <p className="text-xs">لا توجد نتائج مطابقة لبحثك.</p>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-7 text-xs">
                إلغاء البحث
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            {/* جدول للشاشات المتوسطة والكبيرة */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-right">المندوب</TableHead>
                    <TableHead className="text-right">رقم الهاتف</TableHead>
                    <TableHead className="text-right">مركبة التوصيل</TableHead>
                    <TableHead className="text-center">حالة التوفر</TableHead>
                    <TableHead className="text-center">تحديث الحالة</TableHead>
                    <TableHead className="text-center w-24">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} className="hover:bg-muted/30">
                      <TableCell className="p-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7.5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {driver.name.trim().charAt(0) || "س"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground block text-xs truncate">
                              {driver.name}
                            </span>
                            {driver.notes && (
                              <span className="text-[10px] text-muted-foreground block line-clamp-1">
                                {driver.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${driver.phone}`}
                            className="font-mono text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1"
                            dir="ltr"
                          >
                            <PhoneIcon className="size-3 text-muted-foreground" />
                            {driver.phone}
                          </a>
                          <a
                            href={`https://wa.me/${driver.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600 transition-colors"
                            title="واتساب"
                          >
                            <MessageCircleIcon className="size-3" />
                          </a>
                        </div>
                      </TableCell>

                      <TableCell className="p-2.5">
                        {renderVehicleBadge(driver.vehicle_type, driver.license_plate)}
                      </TableCell>

                      <TableCell className="p-2.5 text-center">
                        {renderStatusBadge(driver.status)}
                      </TableCell>

                      <TableCell className="p-2.5 text-center">
                        <div className="inline-flex items-center gap-0.5 p-0.5 bg-muted/60 rounded-md border border-border/40 text-xs">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(driver.id, "available")}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              driver.status === "available"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            متاح
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(driver.id, "on_delivery")}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              driver.status === "on_delivery"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            في مهمة
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(driver.id, "off_duty")}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              driver.status === "off_duty"
                                ? "bg-muted-foreground text-background shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            خارج العمل
                          </button>
                        </div>
                      </TableCell>

                      <TableCell className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleOpenEdit(driver)}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="تعديل"
                          >
                            <Edit2Icon className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              setDriverToDelete(driver)
                              setDeleteConfirmOpen(true)
                            }}
                            className="size-7 text-muted-foreground hover:text-destructive"
                            title="حذف"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* كروت مدمجة للموبايل */}
            <div className="md:hidden divide-y divide-border/40">
              {filteredDrivers.map((driver) => (
                <div key={driver.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {driver.name.trim().charAt(0) || "س"}
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-xs block">
                          {driver.name}
                        </span>
                        <a
                          href={`tel:${driver.phone}`}
                          className="font-mono text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                          dir="ltr"
                        >
                          <PhoneIcon className="size-2.5" />
                          {driver.phone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleOpenEdit(driver)}
                        className="size-7 text-muted-foreground"
                      >
                        <Edit2Icon className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setDriverToDelete(driver)
                          setDeleteConfirmOpen(true)
                        }}
                        className="size-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-muted/30 px-2.5 py-1.5 rounded">
                    {renderVehicleBadge(driver.vehicle_type, driver.license_plate)}
                    <div>{renderStatusBadge(driver.status)}</div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs">
                    <span className="text-[11px] text-muted-foreground">الحالة:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(driver.id, "available")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          driver.status === "available"
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        متاح
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(driver.id, "on_delivery")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          driver.status === "on_delivery"
                            ? "bg-amber-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        في مهمة
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(driver.id, "off_duty")}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          driver.status === "off_duty"
                            ? "bg-muted-foreground text-background"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        خارج العمل
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* نافذة إضافة / تعديل المندوب */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingDriver ? "تعديل بيانات المندوب" : "إضافة مندوب توصيل جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل بيانات وسيلة التوصيل ورقم الهاتف الخاص بالمندوب.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3 py-1 text-xs">
            {formError && (
              <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-1.5">
                <AlertCircleIcon className="size-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                اسم المندوب <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: إسلام فؤاد"
                className="h-8.5 text-xs rounded-md"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                رقم الهاتف <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="مثال: 01022334455"
                className="h-8.5 text-xs rounded-md"
                dir="ltr"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">وسيلة التوصيل</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vehicle_type: e.target.value as "motorcycle" | "car" | "bicycle" | "scooter",
                    })
                  }
                  className="w-full h-8.5 text-xs bg-muted/40 dark:bg-muted/30 border border-border/60 rounded-md px-2 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary [&>option]:bg-card [&>option]:text-foreground"
                >
                  <option value="motorcycle">موتوسيكل</option>
                  <option value="car">سيارة</option>
                  <option value="scooter">سكوتر</option>
                  <option value="bicycle">عجلة</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">رقم اللوحة (اختياري)</label>
                <Input
                  value={formData.license_plate || ""}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                  placeholder="مثال: أ ب ج 1234"
                  className="h-8.5 text-xs rounded-md"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">حالة التوفر</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "available" | "on_delivery" | "off_duty",
                  })
                }
                className="w-full h-8.5 text-xs bg-muted/40 dark:bg-muted/30 border border-border/60 rounded-md px-2 text-foreground font-medium outline-none focus:ring-1 focus:ring-primary [&>option]:bg-card [&>option]:text-foreground"
              >
                <option value="available">جاهز ومتاح لتوصيل الطلبات</option>
                <option value="on_delivery">في مهمة توصيل حالياً</option>
                <option value="off_duty">خارج الوردية / غير متاح</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">ملاحظات إضافية</label>
              <Input
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="مثال: يغطي منطقة الدقي..."
                className="h-8.5 text-xs rounded-md"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="h-8 rounded-md text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="gap-1.5 bg-primary text-primary-foreground font-bold h-8 px-3 rounded-md text-xs shadow-xs"
              >
                {isSaving && <RefreshCwIcon className="size-3 animate-spin" />}
                <span>{editingDriver ? "حفظ التعديلات" : "إضافة المندوب"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد حذف المندوب */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-destructive flex items-center gap-1.5">
              <AlertCircleIcon className="size-4" />
              <span>تأكيد حذف المندوب</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              هل أنت متأكد من حذف المندوب{" "}
              <strong className="text-foreground">({driverToDelete?.name})</strong>؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs rounded-md">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="h-8 text-xs rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              نعم، حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
