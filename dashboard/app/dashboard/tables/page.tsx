"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageContainer } from "@/components/page-container"
import { useTableStore } from "@/store/table.store"
import { useOrderStore } from "@/store/order.store"
import { useSettingStore } from "@/store/setting.store"
import { type RestaurantTable, type TablePayload, type Order } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  ArmchairIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  UsersIcon,
  MapPinIcon,
  ReceiptIcon,
  Edit2Icon,
  Trash2Icon,
  ArrowRightIcon,
  ClockIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  XIcon,
  QrCodeIcon,
} from "lucide-react"
import { TableQrDialog } from "@/components/table-qr-dialog"

export default function TablesPage() {
  const router = useRouter()
  const {
    tables,
    isLoading,
    isSaving,
    error,
    searchQuery,
    statusFilter,
    locationFilter,
    fetchTables,
    createTable,
    updateTable,
    deleteTable,
    setSearchQuery,
    setStatusFilter,
    setLocationFilter,
  } = useTableStore()

  const { cancelOrder } = useOrderStore()
  const { settings, fetchSettings } = useSettingStore()

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    fetchTables()
    fetchSettings()

    const interval = setInterval(() => {
      fetchTables()
    }, 8000)

    return () => clearInterval(interval)
  }, [fetchTables, fetchSettings])

  const activeCurrency = settings?.currency || "ج.م"

  // نافذة الإضافة / التعديل
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingTable, setEditingTable] = React.useState<RestaurantTable | null>(null)
  const [formData, setFormData] = React.useState<TablePayload>({
    name: "",
    capacity: 4,
    location: "الصالة الرئيسية",
    notes: "",
  })
  const [formError, setFormError] = React.useState<string | null>(null)

  // نافذة تأكيد الحذف
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [tableToDelete, setTableToDelete] = React.useState<RestaurantTable | null>(null)

  // نافذة عرض تفاصيل طلب الطاولة المشغولة
  const [activeOrderModalOpen, setActiveOrderModalOpen] = React.useState(false)
  const [selectedTableWithOrder, setSelectedTableWithOrder] = React.useState<RestaurantTable | null>(null)

  // نافذة ملصقات باركود الـ QR
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false)
  const [qrSelectedTable, setQrSelectedTable] = React.useState<RestaurantTable | null>(null)

  // إشعار العملية (Alert Banner)
  const [bannerMessage, setBannerMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMessage({ type, text })
    setTimeout(() => setBannerMessage(null), 4000)
  }

  // فلترة الطاولات
  const filteredTables = React.useMemo(() => {
    return tables.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (locationFilter !== "all" && t.location !== locationFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchName = t.name.toLowerCase().includes(q)
        const matchLocation = t.location?.toLowerCase().includes(q)
        if (!matchName && !matchLocation) return false
      }
      return true
    })
  }, [tables, statusFilter, locationFilter, searchQuery])

  // قائمة الأماكن المتاحة الفريدة
  const locations = React.useMemo(() => {
    const locs = new Set<string>()
    tables.forEach((t) => {
      if (t.location) locs.add(t.location)
    })
    return Array.from(locs)
  }, [tables])

  // إحصائيات سريعة
  const totalCount = tables.length
  const availableCount = tables.filter((t) => t.status === "available").length
  const occupiedCount = tables.filter((t) => t.status === "occupied").length

  // فتح نافذة الإضافة
  const handleOpenCreate = () => {
    setEditingTable(null)
    setFormData({
      name: "",
      capacity: 4,
      location: "الصالة الرئيسية",
      notes: "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // فتح نافذة التعديل
  const handleOpenEdit = (table: RestaurantTable, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingTable(table)
    setFormData({
      name: table.name,
      capacity: table.capacity,
      location: table.location || "الصالة الرئيسية",
      notes: table.notes || "",
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // حفظ الطاولة
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError("يرجى إدخال اسم أو رقم الطاولة.")
      return
    }

    if (editingTable) {
      const res = await updateTable(editingTable.id, formData)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    } else {
      const res = await createTable(formData)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    }
  }

  // حذف طاولة
  const handleOpenDelete = (table: RestaurantTable, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setTableToDelete(table)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!tableToDelete) return
    const res = await deleteTable(tableToDelete.id)
    setDeleteConfirmOpen(false)
    setTableToDelete(null)
    if (res.success) {
      showBanner(res.message, "success")
    } else {
      showBanner(res.message, "error")
    }
  }

  // فتح نافذة تفاصيل الطلب عند النقر على طاولة مشغولة
  const handleTableClick = (table: RestaurantTable) => {
    if (table.status === "occupied" && table.current_order) {
      setSelectedTableWithOrder(table)
      setActiveOrderModalOpen(true)
    } else if (table.status === "available") {
      // إذا كانت الطاولة شاغرة، يمكن الانتقال لفتح نقطة البيع وحجزها مباشرة
      router.push(`/dashboard/pos?tableId=${table.id}&tableName=${encodeURIComponent(table.name)}`)
    }
  }

  // الانتقال للدفع في نقطة البيع
  const handleProceedToPayment = (order: Order) => {
    setActiveOrderModalOpen(false)
    router.push(`/dashboard/pos?orderId=${order.id}`)
  }

  // إلغاء الطلب من الطاولة
  const handleCancelOrder = async (orderId: number) => {
    const res = await cancelOrder(orderId)
    if (res.success) {
      setActiveOrderModalOpen(false)
      showBanner(res.message, "success")
      fetchTables()
    } else {
      showBanner(res.message, "error")
    }
  }

  return (
    <PageContainer
      title="إدارة الطاولات"
      description="متابعة حالة إشغال طاولات الصالة، الطلبات الحالية وسداد الحسابات"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTables()}
            disabled={isLoading}
            className="h-8.5 rounded-lg text-xs gap-1.5"
            title="تحديث البيانات"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQrSelectedTable(null)
              setQrDialogOpen(true)
            }}
            className="h-8.5 rounded-lg text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            title="توليد وطباعة ملصقات الباركود QR لكافة الطاولات"
          >
            <QrCodeIcon className="size-3.5" />
            <span>طباعة باركود QR</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8.5 gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold"
          >
            <PlusIcon className="size-4" />
            <span>إضافة طاولة جديدة</span>
          </Button>
        </div>
      }
    >
      {/* إشعار العملية المنبثق */}
      {bannerMessage && (
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-md text-sm font-medium transition-all duration-200 ${
            bannerMessage.type === "success"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
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
            className="text-xs opacity-70 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* كروت الإحصائيات العلوية */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArmchairIcon className="size-4.5 sm:size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">إجمالي الطاولات</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono">{mounted ? totalCount : 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4.5 sm:size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">طاولات شاغرة (متاحة)</p>
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {mounted ? availableCount : 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ReceiptIcon className="size-4.5 sm:size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">طاولات مشغولة بطلبات</p>
            <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {mounted ? occupiedCount : 0}
            </p>
          </div>
        </div>
      </div>

      {/* شريط البحث والفلترة */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-xs">
        {/* حقل البحث */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم أو اسم الطاولة أو المكان..."
            className="ps-9 bg-muted/40 rounded-lg text-xs h-8.5 border-border/60"
          />
        </div>

        {/* أزرار فلتر الحالة */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-muted/40 w-full sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter("all")}
            className={`h-7.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === "all"
                ? "bg-card shadow-xs text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({mounted ? totalCount : 0})
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter("available")}
            className={`h-7.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === "available"
                ? "bg-card shadow-xs text-emerald-600 font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            شاغرة ({mounted ? availableCount : 0})
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter("occupied")}
            className={`h-7.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === "occupied"
                ? "bg-card shadow-xs text-amber-600 font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            مشغولة ({mounted ? occupiedCount : 0})
          </Button>
        </div>
      </div>

      {/* شبكة كروت الطاولات */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
        {filteredTables.map((table) => {
          const isOccupied = table.status === "occupied"
          const currentOrder = table.current_order

          return (
            <div
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={`group relative flex flex-col justify-between p-3 rounded-xl border transition-all duration-150 cursor-pointer text-right ${
                isOccupied
                  ? "bg-card border-amber-500/50 hover:border-amber-500 hover:shadow-md"
                  : "bg-card border-border/70 hover:border-primary/60 hover:shadow-sm"
              }`}
            >
              <div>
                {/* رأس كارت الطاولة */}
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex size-8 items-center justify-center rounded-lg ${
                        isOccupied
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      <ArmchairIcon className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{table.name}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="size-3" />
                          <span>{table.capacity} مقاعد</span>
                        </span>
                        {table.location && (
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="size-3" />
                            <span>{table.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* شارة الحالة */}
                  <span
                    className={`px-2 py-0.5 rounded-sm text-[11px] font-bold ${
                      isOccupied
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {isOccupied ? "مشغولة" : "شاغرة"}
                  </span>
                </div>

                {/* محتوى حالة الطاولة والطلب */}
                <div className="py-3 text-xs space-y-2">
                  {isOccupied && currentOrder ? (
                    <div className="p-2.5 rounded-md bg-amber-500/5 border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span>رقم الطلب:</span>
                        <span className="font-mono text-primary font-bold">{currentOrder.order_number}</span>
                      </div>

                      {/* حالة تحضير المطبخ للطلب */}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">حالة المطبخ:</span>
                        {currentOrder.status === "pending" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                            ⏳ انتظار البدء
                          </span>
                        )}
                        {currentOrder.status === "preparing" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            🔥 جاري التحضير
                          </span>
                        )}
                        {currentOrder.status === "ready" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/40 animate-pulse">
                            🛎️ جاهز للتقديم!
                          </span>
                        )}
                        {currentOrder.status === "served" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30">
                            🍽️ تم التقديم بالصالة
                          </span>
                        )}
                        {currentOrder.status === "completed" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            ✓ مكتمل
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>الأصناف:</span>
                        <span>{currentOrder.items?.length || 0} أصناف</span>
                      </div>

                      <div className="flex items-center justify-between font-bold text-foreground pt-1 border-t border-amber-500/20">
                        <div className="flex items-center gap-1.5">
                          <span>الإجمالي:</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            currentOrder.payment_status === "paid"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                          }`}>
                            {currentOrder.payment_status === "paid" ? "مدفوع ✓" : "غير مدفوع"}
                          </span>
                        </div>
                        <span className="text-amber-600 dark:text-amber-400 text-sm font-black">
                          {currentOrder.total} {activeCurrency}
                        </span>
                      </div>

                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-0.5">
                        <ClockIcon className="size-3" />
                        <span>انقر لعرض الطلب والدفع</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-md bg-muted/20 border border-dashed border-border text-center text-muted-foreground text-[11px]">
                      الطاولة جاهزة لاستقبال طلب جديد
                    </div>
                  )}

                  {table.notes && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      ملاحظة: {table.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* أزرار الإجراءات السفلية */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                {isOccupied && currentOrder ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleProceedToPayment(currentOrder)
                      }}
                      className="flex-1 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold"
                    >
                      <CreditCardIcon className="size-3.5" />
                      <span>الدفع في الكاشير</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQrSelectedTable(table)
                        setQrDialogOpen(true)
                      }}
                      className="p-2 h-auto rounded-md text-primary hover:bg-primary/10 border-primary/20"
                      title="طباعة باركود QR للطاولة"
                    >
                      <QrCodeIcon className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQrSelectedTable(table)
                        setQrDialogOpen(true)
                      }}
                      className="text-xs text-primary hover:text-primary hover:bg-primary/10 p-1.5 h-auto rounded-md"
                      title="توليد وطباعة باركود QR للطاولة"
                    >
                      <QrCodeIcon className="size-3.5 ms-1" />
                      <span>رمز QR</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleOpenEdit(table, e)}
                        className="text-xs text-muted-foreground hover:text-foreground p-1.5 h-auto rounded-md"
                      >
                        <Edit2Icon className="size-3.5 ms-1" />
                        <span>تعديل</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleOpenDelete(table, e)}
                        className="text-xs text-muted-foreground hover:text-destructive p-1.5 h-auto rounded-md"
                      >
                        <Trash2Icon className="size-3.5 ms-1" />
                        <span>حذف</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {filteredTables.length === 0 && (
          <div className="col-span-full p-12 text-center bg-card rounded-md border border-border/60">
            <ArmchairIcon className="size-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-semibold text-foreground">لا توجد طاولات مطابقة للبحث أو الفلتر المحدد</p>
            <p className="text-xs text-muted-foreground mt-1">يمكنك إضافة طاولات جديدة من زر "إضافة طاولة جديدة"</p>
          </div>
        )}
      </div>

      {/* =========================================================
          نافذة تفاصيل الطلب الموجود على الطاولة المشغولة
          ========================================================= */}
      <Dialog open={activeOrderModalOpen} onOpenChange={setActiveOrderModalOpen}>
        <DialogContent className="max-w-lg rounded-xl p-5 bg-card border border-border/60 text-right shadow-xl">
          <DialogHeader className="text-right space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-sm border border-amber-500/30">
                طلب طاولة نشط
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {selectedTableWithOrder?.current_order?.order_number}
              </span>
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              تفاصيل طلب ({selectedTableWithOrder?.name})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              الأصناف والمبالغ المستحقة على هذه الطاولة حالياً.
            </DialogDescription>
          </DialogHeader>

          {selectedTableWithOrder?.current_order && (
            <div className="space-y-3 mt-2 text-xs">
              {/* قائمة الأصناف في الطلب */}
              <div className="border rounded-md divide-y divide-border/50 max-h-56 overflow-y-auto bg-muted/10">
                {selectedTableWithOrder.current_order.items?.map((item) => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-foreground">
                        {item.product_name}
                        {item.size_name && (
                          <span className="text-muted-foreground font-normal me-1"> ({item.size_name})</span>
                        )}
                        <span className="text-primary font-bold ms-2">x{item.quantity}</span>
                      </div>
                      {item.selected_extras && item.selected_extras.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selected_extras.map((extra, i) => (
                            <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground">
                              +{extra.name} ({extra.price} {activeCurrency})
                            </span>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-amber-600 mt-0.5">ملاحظة: {item.notes}</p>
                      )}
                    </div>
                    <div className="font-bold text-foreground text-sm font-mono">
                      {item.total_price} {activeCurrency}
                    </div>
                  </div>
                ))}
              </div>

              {/* ملخص الحساب */}
              <div className="p-3 rounded-md bg-muted/30 border space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>المجموع الفرعي:</span>
                  <span>{selectedTableWithOrder.current_order.subtotal} {activeCurrency}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>ضريبة القيمة المضافة ({settings?.tax_percentage ?? 14}%):</span>
                  <span>{selectedTableWithOrder.current_order.tax} {activeCurrency}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-foreground pt-1.5 border-t border-border">
                  <span>الإجمالي الكلي:</span>
                  <span className="text-primary font-black">
                    {selectedTableWithOrder.current_order.total} {activeCurrency}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedTableWithOrder?.current_order?.id) {
                  if (confirm("هل أنت متأكد من رغبتك في إلغاء هذا الطلب وتفريغ الطاولة؟")) {
                    handleCancelOrder(selectedTableWithOrder.current_order.id)
                  }
                }
              }}
              className="rounded-md text-xs text-destructive hover:bg-destructive/10"
            >
              إلغاء الطلب
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedTableWithOrder?.current_order) {
                  setActiveOrderModalOpen(false)
                  router.push(`/dashboard/pos?orderId=${selectedTableWithOrder.current_order.id}&tableId=${selectedTableWithOrder.id}`)
                }
              }}
              className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-bold rounded-md text-xs"
            >
              <PlusIcon className="size-3.5" />
              <span>إضافة أصناف / تعديل الطلب</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (selectedTableWithOrder?.current_order) {
                  handleProceedToPayment(selectedTableWithOrder.current_order)
                }
              }}
              className="gap-1.5 bg-primary text-primary-foreground font-bold rounded-md text-xs"
            >
              <CreditCardIcon className="size-3.5" />
              <span>الدفع في نقطة البيع (POS)</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          نافذة إضافة / تعديل طاولة
          ========================================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 text-right shadow-xl">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-base font-bold text-foreground">
              {editingTable ? "تعديل بيانات الطاولة" : "إضافة طاولة جديدة"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              أدخل رقم أو اسم الطاولة وسعتها لتنظيم صالة الطعام.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5 mt-2 text-right">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                اسم أو رقم الطاولة <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="مثال: طاولة 1، VIP 2، طاولة الشرفة 5..."
                className="bg-muted/40 rounded-md text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  السعة (عدد الأشخاص) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.capacity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, capacity: Number(e.target.value) || 1 }))}
                  className="bg-muted/40 rounded-md text-sm text-center"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  الموقع / القسم
                </label>
                <Input
                  value={formData.location || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="مثال: الصالة، العائلات، التراس..."
                  className="bg-muted/40 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                ملاحظات إضافية (اختياري)
              </label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="أي ملاحظات تخص موقع الطاولة أو تجهيزاتها..."
                rows={2}
                className="bg-muted/40 rounded-md text-xs resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="rounded-md text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary text-primary-foreground font-semibold rounded-md text-xs"
              >
                {isSaving ? "جاري الحفظ..." : editingTable ? "تحديث الطاولة" : "إضافة الطاولة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          نافذة تأكيد الحذف
          ========================================================= */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 text-right shadow-xl">
          <AlertDialogHeader className="text-right space-y-1">
            <AlertDialogTitle className="text-base font-bold text-destructive">
              هل أنت متأكد من حذف هذه الطاولة؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              سيتم حذف بيانات ({tableToDelete?.name}) نهائياً من النظام.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-reverse pt-3">
            <AlertDialogCancel className="rounded-md text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md text-xs font-semibold"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* =========================================================
          نافذة توليد وطباعة ملصقات الـ QR Code للطاولات
          ========================================================= */}
      <TableQrDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        tables={tables}
        initialTable={qrSelectedTable}
      />
    </PageContainer>
  )
}
