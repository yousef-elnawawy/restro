"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useAuthStore } from "@/store/auth.store"
import { useOrderStore } from "@/store/order.store"
import { useDeliveryDriverStore } from "@/store/delivery-driver.store"
import { useRegisterStore } from "@/store/register.store"
import { useSettingStore } from "@/store/setting.store"
import { DriverPortalView } from "@/components/delivery/driver-portal-view"
import { getEcho } from "@/lib/echo"
import { playNewOrderSound, playOrderReadySound } from "@/lib/sound"
import {
  type Order,
  type OrderStatus,
  type DeliveryDriver,
  type CreateDeliveryDriverPayload,
  type CashRegister,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
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
  ChefHatIcon,
  CheckIcon,
  XIcon,
  ArrowRightIcon,
  MapPinIcon,
  UserIcon,
  LandmarkIcon,
  ReceiptIcon,
  DollarSignIcon,
  SendIcon,
  EyeIcon,
  BanknoteIcon,
  CreditCardIcon,
  SparklesIcon,
  LayersIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

// تصنيفات أعمدة كانبان التوصيل
type DeliveryColumnKey = "pending" | "preparing" | "ready" | "out_for_delivery" | "completed"

interface DeliveryColumnDef {
  key: DeliveryColumnKey
  title: string
  subtitle: string
  statuses: OrderStatus[]
  badgeClass: string
  headerBg: string
  icon: React.ElementType
}

const DELIVERY_COLUMNS: DeliveryColumnDef[] = [
  {
    key: "pending",
    title: "طلبات جديدة",
    subtitle: "بانتظار التأكيد والإرسال للمطبخ",
    statuses: ["pending"],
    badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
    headerBg: "border-t-4 border-t-blue-500",
    icon: ClockIcon,
  },
  {
    key: "preparing",
    title: "في المطبخ",
    subtitle: "جاري تجهيز وطهي الأطباق",
    statuses: ["preparing"],
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
    headerBg: "border-t-4 border-t-amber-500",
    icon: ChefHatIcon,
  },
  {
    key: "ready",
    title: "جاهزة وبانتظار طيار",
    subtitle: "الوجبة ساخنة ومحتاجة مندوب",
    statuses: ["ready"],
    badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25 animate-pulse",
    headerBg: "border-t-4 border-t-orange-500",
    icon: SparklesIcon,
  },
  {
    key: "out_for_delivery",
    title: "في الطريق مع الطيار",
    subtitle: "خرجت للتوصيل إلى عنوان العميل",
    statuses: ["out_for_delivery"],
    badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25",
    headerBg: "border-t-4 border-t-purple-500",
    icon: TruckIcon,
  },
  {
    key: "completed",
    title: "تم التسليم والتوريد",
    subtitle: "طلبات سلمت للعملاء وسُددت اليوم",
    statuses: ["completed"],
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    headerBg: "border-t-4 border-t-emerald-500",
    icon: CheckCircle2Icon,
  },
]

export default function DeliveryOperationsPage() {
  const authUser = useAuthStore((state) => state.user)
  const isDriver = authUser?.role === "delivery"

  const {
    orders,
    fetchOrders,
    updateOrderStatus,
    assignDriver,
    payOrder,
    isLoading: ordersLoading,
  } = useOrderStore()

  const {
    drivers,
    fetchDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
    updateStatus: updateDriverStatus,
    isLoading: driversLoading,
    isSaving: driverSaving,
  } = useDeliveryDriverStore()

  const { registers, fetchRegisters } = useRegisterStore()
  const { settings, fetchSettings } = useSettingStore()
  const currency = settings.currency || "ج.م"

  // السائق المربوط بهذا المستخدم
  const myDriver = React.useMemo(() => {
    return drivers.find((d) => d.user_id === authUser?.id) || authUser?.delivery_driver || null
  }, [drivers, authUser])

  // التبديل بين شاشة الكانبان اللحظية وأسطول المناديب ومعاينة المندوب
  const [activeTab, setActiveTab] = React.useState<"dispatch" | "fleet" | "driver_preview">(
    isDriver ? "driver_preview" : "dispatch"
  )

  // الفلاتر والبحث
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedDriverFilter, setSelectedDriverFilter] = React.useState<number | "all">("all")

  // إشعار العملية المنبثق
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null)
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // تحميل البيانات الأولية
  React.useEffect(() => {
    fetchOrders()
    fetchDrivers()
    fetchRegisters()
    fetchSettings()
  }, [fetchOrders, fetchDrivers, fetchRegisters, fetchSettings])

  // الاستماع اللحظي للأحداث عبر WebSocket (Laravel Reverb)
  React.useEffect(() => {
    const echo = getEcho()
    if (!echo) return

    const ordersChannel = echo.channel("orders")
    const cashierChannel = echo.channel("cashier-orders")

    const handleCreated = (data: any) => {
      const order = data?.order || data
      if (order?.order_type === "delivery") {
        playNewOrderSound()
        showToast(`طلب دليفري جديد #${order.order_number || ""}`, "success")
      }
      fetchOrders()
      fetchDrivers()
    }

    const handleUpdated = (data: any) => {
      const order = data?.order || data
      if (order?.order_type === "delivery") {
        if (data?.is_ready || order.status === "ready") {
          playOrderReadySound()
          showToast(`طلب التوصيل #${order.order_number || ""} جاهز للتسليم الآن!`, "success")
        }
      }
      fetchOrders()
      fetchDrivers()
    }

    ordersChannel.listen(".order.created", handleCreated)
    ordersChannel.listen(".order.status.updated", handleUpdated)
    cashierChannel.listen(".order.created", handleCreated)
    cashierChannel.listen(".order.status.updated", handleUpdated)

    return () => {
      echo.leaveChannel("orders")
      echo.leaveChannel("cashier-orders")
    }
  }, [fetchOrders, fetchDrivers])

  // فلترة طلبات التوصيل فقط
  const deliveryOrders = React.useMemo(() => {
    return orders.filter((o) => {
      if (o.order_type !== "delivery") return false
      if (selectedDriverFilter !== "all" && o.delivery_driver_id !== selectedDriverFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const orderNum = o.order_number?.toLowerCase() || ""
        const custName = (o.customer?.name || o.customer_name || "").toLowerCase()
        const custPhone = (o.customer?.phone || "").toLowerCase()
        const custAddress = (o.customer?.address || "").toLowerCase()
        const driverName = (o.deliveryDriver?.name || "").toLowerCase()
        return (
          orderNum.includes(q) ||
          custName.includes(q) ||
          custPhone.includes(q) ||
          custAddress.includes(q) ||
          driverName.includes(q)
        )
      }
      return true
    })
  }, [orders, searchQuery, selectedDriverFilter])

  // حساب الإحصائيات السريعة للشريط العلوي
  const stats = React.useMemo(() => {
    const active = deliveryOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled")
    const pending = deliveryOrders.filter((o) => o.status === "pending")
    const preparing = deliveryOrders.filter((o) => o.status === "preparing")
    const ready = deliveryOrders.filter((o) => o.status === "ready")
    const outForDelivery = deliveryOrders.filter((o) => o.status === "out_for_delivery")
    const completedToday = deliveryOrders.filter((o) => o.status === "completed")

    // المناديب
    const totalDrivers = drivers.length
    const availableDrivers = drivers.filter((d) => d.status === "available" && d.is_active).length
    const onDeliveryDrivers = drivers.filter((d) => d.status === "on_delivery" && d.is_active).length

    // إجمالي المبالغ المعلقة مع الطيارين في الطريق
    const pendingCashInTransit = outForDelivery
      .filter((o) => o.payment_status !== "paid")
      .reduce((sum, o) => sum + Number(o.total || 0), 0)

    return {
      activeCount: active.length,
      pendingCount: pending.length,
      preparingCount: preparing.length,
      readyCount: ready.length,
      outCount: outForDelivery.length,
      completedTodayCount: completedToday.length,
      totalDrivers,
      availableDrivers,
      onDeliveryDrivers,
      pendingCashInTransit,
    }
  }, [deliveryOrders, drivers])

  // تفاصيل الطلب المعروض في نافذة منبثقة
  const [inspectingOrder, setInspectingOrder] = React.useState<Order | null>(null)

  // تعيين سائق سريع
  const [assigningOrderId, setAssigningOrderId] = React.useState<number | null>(null)
  const [selectedDriverForOrder, setSelectedDriverForOrder] = React.useState<Record<number, number>>({})

  // نافذة توريد وسداد النقدية للمندوب (Cash Settlement)
  const [settlementOrder, setSettlementOrder] = React.useState<Order | null>(null)
  const [settlementRegisterId, setSettlementRegisterId] = React.useState<number>(0)
  const [settlementMethod, setSettlementMethod] = React.useState<"cash" | "card">("cash")
  const [settlementNotes, setSettlementNotes] = React.useState("")
  const [isSettling, setIsSettling] = React.useState(false)

  // نافذة إضافة / تعديل مندوب جديد
  const [driverModalOpen, setDriverModalOpen] = React.useState(false)
  const [editingDriver, setEditingDriver] = React.useState<DeliveryDriver | null>(null)
  const [driverFormData, setDriverFormData] = React.useState<CreateDeliveryDriverPayload>({
    name: "",
    phone: "",
    vehicle_type: "motorcycle",
    license_plate: "",
    status: "available",
    is_active: true,
    notes: "",
  })

  // نافذة تأكيد حذف مندوب
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [driverToDelete, setDriverToDelete] = React.useState<DeliveryDriver | null>(null)

  // معالجة تغيير حالة الطلب
  const handleMoveStatus = async (
    order: Order,
    newStatus: OrderStatus,
    driverId?: number
  ) => {
    const res = await updateOrderStatus(order.id, {
      status: newStatus,
      delivery_driver_id: driverId || order.delivery_driver_id || undefined,
    })
    if (res.success) {
      showToast(`تم تحديث حالة الطلب #${order.order_number} بنجاح.`, "success")
      fetchOrders()
      fetchDrivers()
    } else {
      showToast(res.message, "error")
    }
  }

  // معالجة تعيين السائق وخروجه للتوصيل
  const handleAssignAndDispatch = async (order: Order) => {
    const driverId = selectedDriverForOrder[order.id] || order.delivery_driver_id
    if (!driverId) {
      showToast("يرجى اختيار سائق التوصيل أولاً قبل الإخراج للتوصيل.", "error")
      return
    }

    // 1. تعيين السائق
    await assignDriver(order.id, driverId)
    // 2. تحديث الحالة إلى out_for_delivery
    const res = await updateOrderStatus(order.id, {
      status: "out_for_delivery",
      delivery_driver_id: driverId,
    })

    if (res.success) {
      showToast(`خرج الطلب #${order.order_number} للتوصيل الآن 🛵`, "success")
      fetchOrders()
      fetchDrivers()
    } else {
      showToast(res.message, "error")
    }
  }

  // فتح نافذة سداد وتوريد النقدية
  const handleOpenSettlement = (order: Order) => {
    setSettlementOrder(order)
    setSettlementMethod("cash")
    setSettlementNotes(`توريد نقدية الطلب دليفري #${order.order_number} من المندوب`)
    const defReg = registers.find((r) => r.is_default && r.is_active) || registers[0]
    if (defReg) {
      setSettlementRegisterId(defReg.id)
    }
  }

  // تأكيد توريد النقدية والخزينة
  const handleConfirmSettlement = async () => {
    if (!settlementOrder) return
    if (!settlementRegisterId) {
      showToast("يرجى اختيار الخزينة النقدية المستلمة.", "error")
      return
    }

    setIsSettling(true)
    try {
      // 1. تسجيل السداد في الخزنة
      const payRes = await payOrder(settlementOrder.id, {
        cash_register_id: settlementRegisterId,
        payment_method: settlementMethod,
        amount: Number(settlementOrder.total || 0),
        notes: settlementNotes,
      })

      if (!payRes.success) {
        showToast(payRes.message, "error")
        setIsSettling(false)
        return
      }

      // 2. تحديث الحالة لمكتمل إن لم تكن مكتملة
      if (settlementOrder.status !== "completed") {
        await updateOrderStatus(settlementOrder.id, { status: "completed" })
      }

      showToast(`تم توريد مبلغ ${settlementOrder.total} ${currency} للخزينة بنجاح!`, "success")
      setSettlementOrder(null)
      fetchOrders()
      fetchDrivers()
      fetchRegisters()
    } finally {
      setIsSettling(false)
    }
  }

  // حفظ المندوب (إضافة أو تعديل)
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driverFormData.name.trim() || !driverFormData.phone.trim()) {
      showToast("يرجى ملء اسم المندوب ورقم هاتفه.", "error")
      return
    }

    if (editingDriver) {
      const res = await updateDriver(editingDriver.id, driverFormData)
      if (res.success) {
        showToast("تم تحديث بيانات المندوب بنجاح.", "success")
        setDriverModalOpen(false)
        setEditingDriver(null)
      } else {
        showToast(res.message, "error")
      }
    } else {
      const res = await createDriver(driverFormData)
      if (res.success) {
        showToast("تم إضافة المندوب لأسطول التوصيل بنجاح.", "success")
        setDriverModalOpen(false)
        setDriverFormData({
          name: "",
          phone: "",
          vehicle_type: "motorcycle",
          license_plate: "",
          status: "available",
          is_active: true,
          notes: "",
        })
      } else {
        showToast(res.message, "error")
      }
    }
  }

  // حذف مندوب
  const handleDeleteDriverConfirm = async () => {
    if (!driverToDelete) return
    const res = await deleteDriver(driverToDelete.id)
    if (res.success) {
      showToast("تم حذف المندوب من الأسطول.", "success")
      setDeleteConfirmOpen(false)
      setDriverToDelete(null)
    } else {
      showToast(res.message, "error")
    }
  }

  // تنسيق الوقت النسبي
  const formatTimePassed = (dateStr: string) => {
    const diffMin = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000)
    if (diffMin < 1) return "الآن"
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`
    const hours = Math.floor(diffMin / 60)
    return `منذ ${hours} ساعة`
  }

  // تبديل حالة تفرغ واستراحة المندوب
  const handleToggleDriverDuty = async (newStatus: "available" | "off_duty") => {
    if (!myDriver) return
    const res = await updateDriverStatus(myDriver.id, newStatus)
    if (res.success) {
      showToast(
        newStatus === "available"
          ? "أنت الآن متاح وجاهز لاستلام الطلبات 🟢"
          : "أنت الآن في استراحة ☕",
        "success"
      )
      fetchDrivers()
    } else {
      showToast(res.message, "error")
    }
  }

  // إذا كان المستخدم هو كابتن التوصيل، نعرض له شاشة الكابتن المخصصة والنقية فوراً
  if (isDriver) {
    return (
      <PageContainer>
        {/* إشعار العملية العائم */}
        {toastMessage && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold backdrop-blur-md border animate-in fade-in slide-in-from-top-4 duration-200 select-none ${
              toastMessage.type === "success"
                ? "bg-emerald-500/95 text-white border-emerald-400/40"
                : "bg-destructive/95 text-destructive-foreground border-destructive/40"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2Icon className="size-4" />
            ) : (
              <AlertCircleIcon className="size-4" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        <DriverPortalView
          orders={orders}
          myDriver={myDriver}
          driverName={authUser?.name || "الكابتن"}
          currency={currency}
          isLoading={ordersLoading}
          onRefresh={() => {
            fetchOrders()
            fetchDrivers()
            showToast("تم تحديث الطلبات لحظياً", "success")
          }}
          onUpdateStatus={async (order, newStatus) => {
            await handleMoveStatus(order, newStatus, myDriver?.id)
          }}
          onToggleDriverDuty={handleToggleDriverDuty}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* إشعار العملية العائم */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl text-xs font-semibold backdrop-blur-md border animate-in fade-in slide-in-from-top-4 duration-200 select-none ${
            toastMessage.type === "success"
              ? "bg-emerald-500/95 text-white border-emerald-400/40"
              : "bg-destructive/95 text-destructive-foreground border-destructive/40"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2Icon className="size-4" />
          ) : (
            <AlertCircleIcon className="size-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* الترويسة وأزرار التحكم العليا */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <TruckIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                التوصيل والديليفري
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                توجيه ومتابعة طلبات الدليفري اللحظية، وتوزيع الطلبات على مناديب الأسطول
              </p>
            </div>
          </div>
        </div>

        {/* أزرار التبديل وإضافة مندوب وتحديث */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* تبويبات العرض (الكانبان vs الأسطول) */}
          <div className="flex bg-muted/80 p-1 rounded-xl border border-border/60 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("dispatch")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "dispatch"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayersIcon className="size-3.5 text-primary" />
              <span>لوحة التوجيه اللحظية</span>
              {stats.activeCount > 0 && (
                <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  {stats.activeCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("fleet")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "fleet"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BikeIcon className="size-3.5" />
              <span>أسطول المناديب ({stats.totalDrivers})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("driver_preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "driver_preview"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TruckIcon className="size-3.5 text-emerald-500" />
              <span>معاينة شاشة الكابتن</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setEditingDriver(null)
              setDriverFormData({
                name: "",
                phone: "",
                vehicle_type: "motorcycle",
                license_plate: "",
                status: "available",
                is_active: true,
                notes: "",
              })
              setDriverModalOpen(true)
            }}
            className="rounded-xl gap-1.5 h-9 shrink-0 text-xs font-semibold"
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">إضافة مندوب</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchOrders()
              fetchDrivers()
              showToast("تم تحديث البيانات لحظياً", "success")
            }}
            disabled={ordersLoading || driversLoading}
            title="تحديث البيانات"
            className="rounded-xl h-9 w-9 shrink-0"
          >
            <RefreshCwIcon className={`size-4 ${ordersLoading ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* كروت المؤشرات السريعة (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
        <Card className="border-border/60 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
              <span>طلبات جارية</span>
              <TruckIcon className="size-3.5 text-primary" />
            </div>
            <div className="text-xl font-bold font-mono mt-1 text-foreground">
              {stats.activeCount}
            </div>
            <p className="text-[10px] text-muted-foreground">نشطة بالمطعم والتوصيل</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
              <span>في المطبخ</span>
              <ChefHatIcon className="size-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
              {stats.preparingCount}
            </div>
            <p className="text-[10px] text-muted-foreground">جاري طهيها الآن</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
              <span>جاهزة للطيار</span>
              <SparklesIcon className="size-3.5 text-orange-500" />
            </div>
            <div className="text-xl font-bold font-mono mt-1 text-orange-600 dark:text-orange-400">
              {stats.readyCount}
            </div>
            <p className="text-[10px] text-muted-foreground">تنتظر تعيين وخروج</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
              <span>في الطريق 🛵</span>
              <BikeIcon className="size-3.5 text-purple-500" />
            </div>
            <div className="text-xl font-bold font-mono mt-1 text-purple-600 dark:text-purple-400">
              {stats.outCount}
            </div>
            <p className="text-[10px] text-muted-foreground">مع المناديب للعملاء</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
              <span>المناديب المتاحين</span>
              <span className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
              {stats.availableDrivers} <span className="text-xs text-muted-foreground font-normal">/ {stats.totalDrivers}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">جاهزون للاستلام فوراً</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs bg-card/60 backdrop-blur-xs">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
              <span>نقدية مع المناديب</span>
              <BanknoteIcon className="size-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-bold font-mono mt-1 text-foreground">
              {stats.pendingCashInTransit} <span className="text-[11px] font-sans font-medium text-muted-foreground">{currency}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">بانتظار توريدها للخزينة</p>
          </CardContent>
        </Card>
      </div>

      {/* شريط البحث وتصفية المناديب */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4 bg-card/40 p-2 rounded-xl border border-border/50">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="بحث برقم الطلب، اسم العميل، الهاتف، العنوان، أو المندوب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 h-9 text-xs rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
            <SlidersHorizontalIcon className="size-3.5 text-primary" />
            <span>تصفية بمندوب:</span>
          </div>
          <select
            value={selectedDriverFilter}
            onChange={(e) => setSelectedDriverFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="h-9 text-xs rounded-lg border border-border/60 bg-background px-2.5 font-medium outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">كل المناديب</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.status === "available" ? "متاح" : d.status === "on_delivery" ? "في الطريق" : "غير متاح"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =========================================================
          التبويب 1: لوحة التوجيه والمتابعة اللحظية (Kanban Board)
          ========================================================= */}
      {activeTab === "dispatch" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto pb-6">
          {DELIVERY_COLUMNS.map((col) => {
            const ColumnIcon = col.icon
            const colOrders = deliveryOrders.filter((o) => col.statuses.includes(o.status))

            return (
              <div
                key={col.key}
                className="flex flex-col bg-muted/25 rounded-2xl border border-border/60 min-w-[270px] max-w-full overflow-hidden shadow-xs"
              >
                {/* رأس العمود */}
                <div className={`p-3 bg-card/80 border-b border-border/50 ${col.headerBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-muted text-foreground">
                        <ColumnIcon className="size-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-foreground leading-tight">{col.title}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{col.subtitle}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`font-mono text-xs px-2 py-0.5 font-bold ${col.badgeClass}`}>
                      {colOrders.length}
                    </Badge>
                  </div>
                </div>

                {/* جسم العمود وقائمة الكروت */}
                <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
                  {colOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground/60 border border-dashed border-border/40 rounded-xl my-4">
                      <ColumnIcon className="size-7 opacity-30 mb-2" />
                      <span className="text-xs font-medium">لا توجد طلبات هنا</span>
                    </div>
                  ) : (
                    colOrders.map((order) => {
                      const customerName = order.customer?.name || order.customer_name || "عميل بدون اسم"
                      const customerPhone = order.customer?.phone || ""
                      const customerAddress = order.customer?.address || order.notes || "العنوان غير مسجل"
                      const currentDriver = order.deliveryDriver
                      const isPaid = order.payment_status === "paid"

                      return (
                        <div
                          key={order.id}
                          className="group relative rounded-xl border border-border/70 bg-card p-3 shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-200"
                        >
                          {/* رأس الكارت: رقم الطلب + التوقيت + معاينة الفاتورة */}
                          <div className="flex items-start justify-between gap-1.5 pb-2 border-b border-border/40">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold font-mono text-sm text-foreground">
                                  #{order.order_number}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] px-1.5 py-0 font-medium ${
                                    isPaid
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  }`}
                                >
                                  {isPaid ? "مسدد ✅" : "كاش عند الاستلام"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <ClockIcon className="size-3" />
                                <span>{formatTimePassed(order.created_at)}</span>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setInspectingOrder(order)}
                              title="عرض تفاصيل الفاتورة"
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <EyeIcon className="size-3.5" />
                            </Button>
                          </div>

                          {/* بيانات العميل والتواصل الفوري */}
                          <div className="py-2 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                                <UserIcon className="size-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{customerName}</span>
                              </div>

                              {/* أزرار الاتصال وواتساب */}
                              {customerPhone && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <a
                                    href={`tel:${customerPhone}`}
                                    title="اتصال هاتفي بالعميل"
                                    className="p-1 rounded-md bg-muted hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <PhoneIcon className="size-3" />
                                  </a>
                                  <a
                                    href={`https://wa.me/${customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                      `مرحباً ${customerName}، بخصوص طلبكم رقم #${order.order_number} من مطعم ريسترو.`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="مراسلة واتساب فورية"
                                    className="p-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-colors"
                                  >
                                    <MessageCircleIcon className="size-3" />
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* العنوان وملاحظة التوصيل */}
                            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-muted/30 p-1.5 rounded-lg border border-border/30">
                              <MapPinIcon className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2 leading-relaxed" title={customerAddress}>
                                {customerAddress}
                              </span>
                            </div>

                            {/* ملخص الأصناف */}
                            {order.items && order.items.length > 0 && (
                              <div className="text-[10px] text-muted-foreground/80 line-clamp-1 border-t border-border/20 pt-1">
                                {order.items.map((it) => `${it.quantity}x ${it.product?.name || ""}`).join(" • ")}
                              </div>
                            )}

                            {/* الإجمالي ورسوم التوصيل */}
                            <div className="flex items-center justify-between pt-1 font-mono text-xs">
                              <span className="text-muted-foreground text-[10px]">
                                توصيل: +{order.delivery_fee || 0} {currency}
                              </span>
                              <span className="font-extrabold text-foreground text-sm">
                                {order.total_amount} {currency}
                              </span>
                            </div>
                          </div>

                          {/* المندوب المعين حالياً إن وجد */}
                          {currentDriver && (
                            <div className="mt-1 mb-2 p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 truncate">
                                <BikeIcon className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                <span className="font-semibold text-purple-700 dark:text-purple-300 truncate">
                                  {currentDriver.name}
                                </span>
                              </div>
                              {currentDriver.phone && (
                                <a
                                  href={`tel:${currentDriver.phone}`}
                                  title="اتصال بالطيار"
                                  className="p-0.5 text-purple-600 hover:text-purple-800 dark:hover:text-purple-300"
                                >
                                  <PhoneIcon className="size-3" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* أزرار الإجراءات التفاعلية حسب المرحلة */}
                          <div className="pt-2 border-t border-border/40 flex flex-col gap-1.5">
                            {/* 1. عمود جديد: زر إرسال للمطبخ */}
                            {col.key === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => handleMoveStatus(order, "preparing")}
                                className="w-full h-8 text-xs font-bold rounded-lg gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <ChefHatIcon className="size-3.5" />
                                <span>إرسال للتحضير بالمطبخ</span>
                              </Button>
                            )}

                            {/* 2. عمود في المطبخ: زر جاهز للتسليم */}
                            {col.key === "preparing" && (
                              <Button
                                size="sm"
                                onClick={() => handleMoveStatus(order, "ready")}
                                className="w-full h-8 text-xs font-bold rounded-lg gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                <CheckIcon className="size-3.5" />
                                <span>الوجبة جاهزة للتسليم</span>
                              </Button>
                            )}

                            {/* 3. عمود جاهز للتسليم: تعيين السائق والخروج فوراً */}
                            {col.key === "ready" && (
                              <div className="space-y-1.5">
                                <select
                                  value={selectedDriverForOrder[order.id] || order.delivery_driver_id || ""}
                                  onChange={(e) =>
                                    setSelectedDriverForOrder((prev) => ({
                                      ...prev,
                                      [order.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full h-8 text-xs rounded-lg border border-border/80 bg-background px-2 font-medium"
                                >
                                  <option value="">-- اختر طيار التوصيل --</option>
                                  {drivers
                                    .filter((d) => d.is_active)
                                    .map((d) => (
                                      <option key={d.id} value={d.id}>
                                        {d.name} ({d.status === "available" ? "🟢 متاح" : "🟡 في الطريق"})
                                      </option>
                                    ))}
                                </select>
                                <Button
                                  size="sm"
                                  onClick={() => handleAssignAndDispatch(order)}
                                  className="w-full h-8 text-xs font-bold rounded-lg gap-1.5 bg-orange-600 hover:bg-orange-700 text-white shadow-xs"
                                >
                                  <SendIcon className="size-3.5" />
                                  <span>خروج مع المندوب للتوصيل 🛵</span>
                                </Button>
                              </div>
                            )}

                            {/* 4. عمود في الطريق: تم التسليم وتوريد الكاش */}
                            {col.key === "out_for_delivery" && (
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenSettlement(order)}
                                  className="flex-1 h-8 text-xs font-bold rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <CheckCircle2Icon className="size-3.5" />
                                  <span>تم التسليم والتوريد</span>
                                </Button>
                              </div>
                            )}

                            {/* 5. عمود تم التسليم: إذا كان كاش ولم يُسدد بعد بالخزنة */}
                            {col.key === "completed" && !isPaid && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenSettlement(order)}
                                className="w-full h-7 text-[11px] font-bold rounded-lg gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                              >
                                <BanknoteIcon className="size-3" />
                                <span>توريد الكاش للخزينة</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =========================================================
          التبويب 3: معاينة شاشة الكابتن للمدير
          ========================================================= */}
      {activeTab === "driver_preview" && (
        <DriverPortalView
          orders={orders}
          myDriver={drivers[0] || null}
          driverName={authUser?.name || "المدير (معاينة)"}
          currency={currency}
          isLoading={ordersLoading}
          onRefresh={() => {
            fetchOrders()
            fetchDrivers()
            showToast("تم تحديث الطلبات لحظياً", "success")
          }}
          onUpdateStatus={async (order, newStatus) => {
            await handleMoveStatus(order, newStatus)
          }}
          isAdminPreview={true}
        />
      )}

      {/* =========================================================
          التبويب 2: أسطول مناديب التوصيل (Drivers Management)
          ========================================================= */}
      {activeTab === "fleet" && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/10">
            <div>
              <h2 className="text-base font-bold text-foreground">طاقم أسطول التوصيل (الطيارون)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                إدارة السائقين، أرقام الهواتف، لوحات المركبات، وحالات التفرغ اللحظية
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 font-bold text-foreground">#</TableHead>
                  <TableHead className="font-bold text-foreground">المندوب</TableHead>
                  <TableHead className="font-bold text-foreground">رقم الهاتف</TableHead>
                  <TableHead className="font-bold text-foreground">المركبة واللوحة</TableHead>
                  <TableHead className="font-bold text-foreground">الحالة اللحظية</TableHead>
                  <TableHead className="font-bold text-foreground">النشاط</TableHead>
                  <TableHead className="text-left font-bold text-foreground">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BikeIcon className="size-8 opacity-30" />
                        <span>لم يتم تسجيل أي مندوب توصيل حتى الآن.</span>
                        <Button
                          size="sm"
                          onClick={() => setDriverModalOpen(true)}
                          className="mt-1 text-xs rounded-xl"
                        >
                          إضافة أول مندوب
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  drivers.map((driver, idx) => (
                    <TableRow key={driver.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                            {driver.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm">{driver.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">ID: #{driver.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <a
                          href={`tel:${driver.phone}`}
                          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <PhoneIcon className="size-3" />
                          <span>{driver.phone}</span>
                        </a>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {driver.vehicle_type === "car" ? (
                            <CarIcon className="size-4 text-primary" />
                          ) : (
                            <BikeIcon className="size-4 text-primary" />
                          )}
                          <span className="font-medium">
                            {driver.vehicle_type === "car"
                              ? "سيارة"
                              : driver.vehicle_type === "bicycle"
                              ? "دراجة"
                              : "موتوسيكل"}
                          </span>
                          {driver.license_plate && (
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {driver.license_plate}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          value={driver.status}
                          onChange={(e) =>
                            updateDriverStatus(driver.id, e.target.value as "available" | "on_delivery" | "off_duty")
                          }
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                            driver.status === "available"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                              : driver.status === "on_delivery"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25"
                              : "bg-muted text-muted-foreground border-border/60"
                          }`}
                        >
                          <option value="available">🟢 متاح للطلبات</option>
                          <option value="on_delivery">🛵 في الطريق لتوصيل</option>
                          <option value="off_duty">⚪️ غير متفرغ / خارج الدوام</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            driver.is_active
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {driver.is_active ? "نشط" : "معطل"}
                        </span>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingDriver(driver)
                              setDriverFormData({
                                name: driver.name,
                                phone: driver.phone,
                                vehicle_type: driver.vehicle_type,
                                license_plate: driver.license_plate || "",
                                status: driver.status,
                                is_active: driver.is_active,
                                notes: driver.notes || "",
                              })
                              setDriverModalOpen(true)
                            }}
                            title="تعديل بيانات المندوب"
                            className="size-8 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2Icon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDriverToDelete(driver)
                              setDeleteConfirmOpen(true)
                            }}
                            title="حذف المندوب"
                            className="size-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2Icon className="size-4" />
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
      )}

      {/* =========================================================
          نافذة تفاصيل الطلب والفاتورة الكاملة (Order Details Modal)
          ========================================================= */}
      <Dialog open={Boolean(inspectingOrder)} onOpenChange={(open) => !open && setInspectingOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ReceiptIcon className="size-5 text-primary" />
              <span>تفاصيل طلب التوصيل #{inspectingOrder?.order_number}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              البيانات الكاملة للأصناف، العميل، وموقع التوصيل
            </DialogDescription>
          </DialogHeader>

          {inspectingOrder && (
            <div className="space-y-3 py-2 text-xs">
              {/* بطاقة العميل */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground text-sm">
                    {inspectingOrder.customer?.name || inspectingOrder.customer_name || "عميل بدون اسم"}
                  </span>
                  <span className="font-mono text-muted-foreground">{inspectingOrder.customer?.phone}</span>
                </div>
                <div className="flex items-start gap-1.5 text-muted-foreground pt-1">
                  <MapPinIcon className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{inspectingOrder.customer?.address || inspectingOrder.notes || "العنوان غير محدد"}</span>
                </div>
              </div>

              {/* بنود الأصناف */}
              <div className="space-y-1.5 border rounded-xl p-2.5 bg-card">
                <div className="text-[11px] font-bold text-muted-foreground mb-1">الأصناف المطلوبة:</div>
                {inspectingOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
                    <div>
                      <span className="font-bold font-mono ml-2 text-primary">{it.quantity}x</span>
                      <span className="font-semibold text-foreground">{it.product?.name || "صنف"}</span>
                      {it.selected_size && (
                        <span className="text-[10px] text-muted-foreground mr-1">({it.selected_size.name})</span>
                      )}
                    </div>
                    <span className="font-mono font-bold">{it.total_price} {currency}</span>
                  </div>
                ))}
              </div>

              {/* الحسابات */}
              <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1 text-muted-foreground">
                <div className="flex justify-between text-xs">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono">{inspectingOrder.subtotal} {currency}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>رسوم التوصيل:</span>
                  <span className="font-mono">+{inspectingOrder.delivery_fee || 0} {currency}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>الضريبة:</span>
                  <span className="font-mono">{inspectingOrder.tax_amount || 0} {currency}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-foreground pt-1 border-t border-border/40">
                  <span>الإجمالي المطلوب:</span>
                  <span className="font-mono text-primary">{inspectingOrder.total_amount} {currency}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInspectingOrder(null)} className="rounded-xl text-xs">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          نافذة توريد وسداد نقدية المندوب للخزينة (Cash Settlement Modal)
          ========================================================= */}
      <Dialog open={Boolean(settlementOrder)} onOpenChange={(open) => !open && setSettlementOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-600">
              <BanknoteIcon className="size-5" />
              <span>توريد نقدية الطلب #{settlementOrder?.order_number}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              تسوية عهدة طيار التوصيل وإيداع النقدية المستلمة في خزينة المطعم
            </DialogDescription>
          </DialogHeader>

          {settlementOrder && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground">المبلغ المطلوب توريده من المندوب:</div>
                  <div className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {settlementOrder.total_amount} {currency}
                  </div>
                </div>
                {settlementOrder.deliveryDriver && (
                  <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-700">
                    <BikeIcon className="size-3" />
                    <span>{settlementOrder.deliveryDriver.name}</span>
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">الخزينة المستلمة *</label>
                <select
                  value={settlementRegisterId}
                  onChange={(e) => setSettlementRegisterId(Number(e.target.value))}
                  className="w-full h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium outline-none focus:ring-1 focus:ring-primary"
                >
                  {registers
                    .filter((r) => r.is_active)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.is_default ? "(الخزنة الافتراضية)" : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">طريقة السداد المستلمة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlementMethod("cash")}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      settlementMethod === "cash"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border/60 hover:bg-muted"
                    }`}
                  >
                    <BanknoteIcon className="size-4" />
                    <span>نقدي / كاش</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlementMethod("card")}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      settlementMethod === "card"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-muted"
                    }`}
                  >
                    <CreditCardIcon className="size-4" />
                    <span>بطاقة / فيزا</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">ملاحظات التوريد</label>
                <Input
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder="ملاحظة عن السداد أو رقم العملية..."
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettlementOrder(null)}
              className="rounded-xl text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSettlement}
              disabled={isSettling}
              className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2Icon className="size-4" />
              <span>{isSettling ? "جاري التوريد..." : "تأكيد إيداع المبلغ بالخزينة"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          نافذة إضافة / تعديل مندوب توصيل (Driver Modal)
          ========================================================= */}
      <Dialog open={driverModalOpen} onOpenChange={setDriverModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <BikeIcon className="size-5 text-primary" />
              <span>{editingDriver ? "تعديل بيانات مندوب التوصيل" : "إضافة طيار توصيل جديد"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل اسم المندوب ورقم هاتفه ونوع المركبة لإضافته للأسطول
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDriver} className="space-y-3 pt-2 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">اسم المندوب *</label>
              <Input
                required
                value={driverFormData.name}
                onChange={(e) => setDriverFormData({ ...driverFormData, name: e.target.value })}
                placeholder="مثال: محمود إبراهيم"
                className="h-9 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">رقم الهاتف *</label>
              <Input
                required
                value={driverFormData.phone}
                onChange={(e) => setDriverFormData({ ...driverFormData, phone: e.target.value })}
                placeholder="مثال: 01012345678"
                dir="ltr"
                className="h-9 rounded-xl font-mono text-sm text-right"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">نوع المركبة</label>
              <select
                value={driverFormData.vehicle_type}
                onChange={(e) =>
                  setDriverFormData({
                    ...driverFormData,
                    vehicle_type: e.target.value as "motorcycle" | "bicycle" | "car",
                  })
                }
                className="w-full h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium"
              >
                <option value="motorcycle">🏍️ موتوسيكل / سكوتر</option>
                <option value="car">🚗 سيارة</option>
                <option value="bicycle">🚲 دراجة هوائية</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">رقم اللوحة (إن وجد)</label>
              <Input
                value={driverFormData.license_plate || ""}
                onChange={(e) => setDriverFormData({ ...driverFormData, license_plate: e.target.value })}
                placeholder="مثال: أ ب ج 123"
                className="h-9 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">ملاحظات إضافية</label>
              <Input
                value={driverFormData.notes || ""}
                onChange={(e) => setDriverFormData({ ...driverFormData, notes: e.target.value })}
                placeholder="منطقة التوصيل المعتادة، شفت العمل..."
                className="h-9 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDriverModalOpen(false)}
                className="rounded-xl text-xs"
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={driverSaving} className="rounded-xl text-xs font-bold">
                {driverSaving ? "جاري الحفظ..." : "حفظ المندوب"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          نافذة تأكيد حذف المندوب
          ========================================================= */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">هل أنت متأكد من حذف هذا المندوب؟</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              سيتم إزالة المندوب ({driverToDelete?.name}) من قائمة الأسطول ولن تتمكن من تعيينه للطلبات اللاحقة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDriverConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
