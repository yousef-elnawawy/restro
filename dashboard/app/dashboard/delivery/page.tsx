"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useAuthStore } from "@/store/auth.store"
import { useOrderStore } from "@/store/order.store"
import { useDeliveryDriverStore } from "@/store/delivery-driver.store"
import { useRegisterStore } from "@/store/register.store"
import { useSettingStore } from "@/store/setting.store"
import { getEcho } from "@/lib/echo"
import { playNewOrderSound, playOrderReadySound } from "@/lib/sound"
import {
  type Order,
  type OrderStatus,
  type DeliveryDriver,
  type CreateDeliveryDriverPayload,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/combobox-select"
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
  ClockIcon,
  MessageCircleIcon,
  ChefHatIcon,
  EyeIcon,
  BanknoteIcon,
  CreditCardIcon,
  SparklesIcon,
  MapPinIcon,
  ReceiptIcon,
  UserIcon,
  CheckIcon,
  SendIcon,
} from "lucide-react"

// تفاصيل حالات طلب التوصيل الموحدة مع النظام
function getDeliveryStatusBadge(status: OrderStatus) {
  switch (status) {
    case "pending":
      return {
        label: "جديد (بانتظار التأكيد)",
        className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
        icon: ClockIcon,
      }
    case "preparing":
      return {
        label: "جاري التحضير بالمطبخ",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        icon: ChefHatIcon,
      }
    case "ready":
      return {
        label: "جاهز للتسليم للطيار",
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 animate-pulse",
        icon: SparklesIcon,
      }
    case "out_for_delivery":
      return {
        label: "في الطريق مع المندوب",
        className: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
        icon: BikeIcon,
      }
    case "completed":
      return {
        label: "تم التسليم بنجاح ✓",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        icon: CheckCircle2Icon,
      }
    case "cancelled":
      return {
        label: "ملغي ✕",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
        icon: AlertCircleIcon,
      }
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground border-border",
        icon: ClockIcon,
      }
  }
}

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
  const currency = settings?.currency || "ج.م"

  const [mounted, setMounted] = React.useState(false)

  // السائق التابع للمستخدم الحالي إن وجد
  const myDriver = React.useMemo(() => {
    return drivers.find((d) => d.user_id === authUser?.id) || authUser?.delivery_driver || null
  }, [drivers, authUser])

  // التبويب النشط
  const [activeTab, setActiveTab] = React.useState<"orders" | "fleet">("orders")

  // الفلاتر والبحث
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [driverFilter, setDriverFilter] = React.useState<string>(isDriver && myDriver ? String(myDriver.id) : "all")

  // إشعار العملية
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null)
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // تحميل البيانات
  React.useEffect(() => {
    setMounted(true)
    fetchOrders()
    fetchDrivers()
    fetchRegisters()
    fetchSettings()
  }, [fetchOrders, fetchDrivers, fetchRegisters, fetchSettings])

  // الاستماع اللحظي للطلبات عبر WebSockets
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

  // تصفية طلبات التوصيل
  const deliveryOrders = React.useMemo(() => {
    return orders.filter((o) => {
      if (o.order_type !== "delivery") return false
      if (statusFilter !== "all" && o.status !== statusFilter) return false
      if (driverFilter !== "all" && String(o.delivery_driver_id) !== driverFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const orderNum = o.order_number?.toLowerCase() || ""
        const custName = (o.customer?.name || o.customer_name || "").toLowerCase()
        const custPhone = (o.customer?.phone || "").toLowerCase()
        const custAddress = (o.customer?.address || o.notes || "").toLowerCase()
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
  }, [orders, statusFilter, driverFilter, searchQuery])

  // حساب الإحصائيات الموحدة
  const stats = React.useMemo(() => {
    const allDelivery = orders.filter((o) => o.order_type === "delivery")
    const total = allDelivery.length
    const preparing = allDelivery.filter((o) => o.status === "preparing").length
    const ready = allDelivery.filter((o) => o.status === "ready").length
    const outForDelivery = allDelivery.filter((o) => o.status === "out_for_delivery").length
    const completed = allDelivery.filter((o) => o.status === "completed").length

    // إجمالي مبالغ الكاش في الطريق مع المناديب
    const cashInTransit = allDelivery
      .filter((o) => o.status === "out_for_delivery" && o.payment_status !== "paid")
      .reduce((sum, o) => sum + Number(o.total || 0), 0)

    const availableDrivers = drivers.filter((d) => d.status === "available" && d.is_active).length

    return { total, preparing, ready, outForDelivery, completed, cashInTransit, availableDrivers }
  }, [orders, drivers])

  // حالة النوافذ المنبثقة
  const [inspectingOrder, setInspectingOrder] = React.useState<Order | null>(null)
  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null)
  const [selectedDriverForOrder, setSelectedDriverForOrder] = React.useState<Record<number, number>>({})

  // نافذة توريد وسداد النقدية
  const [settlementOrder, setSettlementOrder] = React.useState<Order | null>(null)
  const [settlementRegisterId, setSettlementRegisterId] = React.useState<number>(0)
  const [settlementMethod, setSettlementMethod] = React.useState<"cash" | "card">("cash")
  const [settlementNotes, setSettlementNotes] = React.useState("")
  const [isSettling, setIsSettling] = React.useState(false)

  // نافذة إضافة / تعديل مندوب
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

  // ترقية حالة الطلب
  const handleMoveStatus = async (order: Order, newStatus: OrderStatus, driverId?: number) => {
    setActionLoadingId(order.id)
    try {
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
    } finally {
      setActionLoadingId(null)
    }
  }

  // تعيين السائق وخروج الطلب للتوصيل
  const handleAssignAndDispatch = async (order: Order) => {
    const driverId = selectedDriverForOrder[order.id] || order.delivery_driver_id
    if (!driverId) {
      showToast("يرجى اختيار مندوب التوصيل أولاً قبل الإخراج.", "error")
      return
    }

    setActionLoadingId(order.id)
    try {
      await assignDriver(order.id, driverId)
      const res = await updateOrderStatus(order.id, {
        status: "out_for_delivery",
        delivery_driver_id: driverId,
      })

      if (res.success) {
        showToast(`خرج الطلب #${order.order_number} للتوصيل الآن.`, "success")
        fetchOrders()
        fetchDrivers()
      } else {
        showToast(res.message, "error")
      }
    } finally {
      setActionLoadingId(null)
    }
  }

  // فتح نافذة سداد وتوريد النقدية
  const handleOpenSettlement = (order: Order) => {
    setSettlementOrder(order)
    setSettlementMethod("cash")
    setSettlementNotes(`توريد نقدية طلب التوصيل #${order.order_number}`)
    const defReg = registers.find((r) => r.is_default && r.is_active) || registers[0]
    if (defReg) {
      setSettlementRegisterId(defReg.id)
    }
  }

  // تأكيد توريد النقدية بالخزينة
  const handleConfirmSettlement = async () => {
    if (!settlementOrder) return
    if (!settlementRegisterId) {
      showToast("يرجى اختيار الخزينة المستلمة للنقدية.", "error")
      return
    }

    setIsSettling(true)
    try {
      const payRes = await payOrder(settlementOrder.id, {
        cash_register_id: settlementRegisterId,
        payment_method: settlementMethod,
        amount: Number(settlementOrder.total || 0),
        notes: settlementNotes,
      })

      if (!payRes.success) {
        showToast(payRes.message, "error")
        return
      }

      if (settlementOrder.status !== "completed") {
        await updateOrderStatus(settlementOrder.id, { status: "completed" })
      }

      showToast(`تم إيداع مبلغ ${settlementOrder.total} ${currency} بالخزينة بنجاح.`, "success")
      setSettlementOrder(null)
      fetchOrders()
      fetchDrivers()
      fetchRegisters()
    } finally {
      setIsSettling(false)
    }
  }

  // حفظ بيانات المندوب
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driverFormData.name.trim() || !driverFormData.phone.trim()) {
      showToast("يرجى إدخال اسم المندوب ورقم هاتفه.", "error")
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
        showToast("تمت إضافة المندوب بنجاح.", "success")
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
      showToast("تم حذف المندوب من النظام.", "success")
      setDeleteConfirmOpen(false)
      setDriverToDelete(null)
    } else {
      showToast(res.message, "error")
    }
  }

  // تبديل حالة تفرغ واستراحة السائق
  const handleToggleDriverDuty = async (newStatus: "available" | "off_duty") => {
    if (!myDriver) return
    const res = await updateDriverStatus(myDriver.id, newStatus)
    if (res.success) {
      showToast(
        newStatus === "available" ? "تم تعيين حالتك إلى: متاح للتوصيل" : "تم تعيين حالتك إلى: في استراحة",
        "success"
      )
      fetchDrivers()
    } else {
      showToast(res.message, "error")
    }
  }

  return (
    <PageContainer
      title="إدارة التوصيل والديليفري"
      description="متابعة وتوجيه طلبات الديليفري اللحظية، إدارة أسطول المناديب، وتسوية العهد والتوريد النقدي"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {/* زر تبديل حالة المندوب إن كان المستخدم سائقاً */}
          {myDriver && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                handleToggleDriverDuty(myDriver.status === "available" ? "off_duty" : "available")
              }
              className="h-8.5 rounded-lg text-xs gap-1.5 font-bold"
            >
              <span
                className={`size-2 rounded-full ${
                  myDriver.status === "available" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                }`}
              />
              <span>{myDriver.status === "available" ? "متاح للطلبات" : "في استراحة"}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOrders()
              fetchDrivers()
              fetchRegisters()
              showToast("تم تحديث البيانات لحظياً", "success")
            }}
            disabled={ordersLoading || driversLoading}
            className="h-8.5 rounded-lg text-xs gap-1.5"
            title="تحديث البيانات"
          >
            <RefreshCwIcon className={`size-3.5 ${ordersLoading || driversLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            type="button"
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
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PlusIcon className="size-3.5" />
            <span>إضافة مندوب</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* إشعار العملية المنبثق */}
        {toastMessage && (
          <div
            className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-md border text-xs font-medium animate-in fade-in duration-150 ${
              toastMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/25 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 p-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* بطاقات الإحصائيات العلوية الموحدة */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TruckIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي طلبات التوصيل</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                {mounted ? stats.total : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ChefHatIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">بالمطبخ / جاهزة</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {mounted ? stats.preparing + stats.ready : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BikeIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">في الطريق مع المندوب</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
                {mounted ? stats.outForDelivery : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">تم التسليم بنجاح</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {mounted ? stats.completed : 0}
              </p>
            </div>
          </div>
        </div>

        {/* شريط التبويبات الموحد */}
        <div className="flex items-center gap-1.5 border-b border-border/60 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "orders"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <TruckIcon className="size-3.5" />
            <span>طلبات التوصيل ({deliveryOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fleet")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "fleet"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <BikeIcon className="size-3.5" />
            <span>أسطول المناديب ({drivers.length})</span>
          </button>
        </div>

        {/* =========================================================================
            التبويب الأول: قائمة طلبات التوصيل
            ========================================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            {/* شريط البحث والفلاتر الموحد */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="relative flex-1 w-full sm:max-w-md">
                <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث برقم الطلب، العميل، الهاتف، العنوان، أو المندوب..."
                  className="ps-9 bg-muted/40 rounded-lg text-xs h-8.5 border-border/60"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
                {/* فلتر حالة الطلب */}
                <div className="w-36 sm:w-40">
                  <ComboboxSelect
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val || "all")}
                    options={[
                      { value: "all", label: "كل الحالات" },
                      { value: "pending", label: "جديد" },
                      { value: "preparing", label: "في المطبخ" },
                      { value: "ready", label: "جاهز للتسليم" },
                      { value: "out_for_delivery", label: "في الطريق" },
                      { value: "completed", label: "تم التسليم ✓" },
                      { value: "cancelled", label: "ملغي ✕" },
                    ]}
                    placeholder="حالة الطلب..."
                    className="h-8.5 text-xs bg-muted/40 rounded-lg"
                  />
                </div>

                {/* فلتر المندوب */}
                <div className="w-40 sm:w-44">
                  <ComboboxSelect
                    value={driverFilter}
                    onValueChange={(val) => setDriverFilter(val || "all")}
                    options={[
                      { value: "all", label: "كل المناديب" },
                      ...drivers.map((d) => ({
                        value: String(d.id),
                        label: d.name,
                        badge: d.status === "available" ? "متاح" : "في الطريق",
                        badgeVariant: d.status === "available" ? ("success" as const) : ("secondary" as const),
                      })),
                    ]}
                    placeholder="المندوب..."
                    className="h-8.5 text-xs bg-muted/40 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* جدول طلبات التوصيل الموحد */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">العميل والتواصل</TableHead>
                    <TableHead className="text-right">عنوان التوصيل</TableHead>
                    <TableHead className="text-right">الأصناف</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead className="text-right">حالة السداد</TableHead>
                    <TableHead className="text-right">المندوب المكلف</TableHead>
                    <TableHead className="text-right">حالة الطلب</TableHead>
                    <TableHead className="text-center min-w-[150px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-xs">
                        لا توجد طلبات توصيل مسجلة مطابقة للبحث أو الفلتر المحدد.
                      </TableCell>
                    </TableRow>
                  ) : (
                    deliveryOrders.map((order) => {
                      const customerName = order.customer?.name || order.customer_name || "عميل بدون اسم"
                      const customerPhone = order.customer?.phone || ""
                      const customerAddress = order.delivery_address || order.customer?.address || order.notes || "العنوان غير مسجل"
                      const deliveryDistance = order.delivery_distance
                      const currentDriver = order.deliveryDriver
                      const isPaid = order.payment_status === "paid"
                      const statusInfo = getDeliveryStatusBadge(order.status)
                      const StatusIcon = statusInfo.icon
                      const isCurrentActionLoading = actionLoadingId === order.id

                      return (
                        <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                          {/* رقم الطلب */}
                          <TableCell className="font-mono font-bold text-xs text-foreground">
                            #{order.order_number}
                          </TableCell>

                          {/* العميل ورقم الهاتف مع أزرار الاتصال وواتساب */}
                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-foreground">{customerName}</span>
                              {customerPhone ? (
                                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                                  <a
                                    href={`tel:${customerPhone}`}
                                    className="hover:text-primary transition-colors flex items-center gap-1"
                                    title="اتصال هاتفي"
                                  >
                                    <PhoneIcon className="size-3" />
                                    <span>{customerPhone}</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/${customerPhone.replace(/[^0-9]/g, "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 p-0.5"
                                    title="مراسلة واتساب"
                                  >
                                    <MessageCircleIcon className="size-3" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">بدون هاتف</span>
                              )}
                            </div>
                          </TableCell>

                          {/* عنوان التوصيل */}
                          <TableCell className="text-xs max-w-[200px]">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-start gap-1 text-muted-foreground truncate" title={customerAddress}>
                                <MapPinIcon className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                                <span className="truncate">{customerAddress}</span>
                              </div>
                              {deliveryDistance && (
                                <span className="text-[10px] text-primary font-mono font-bold ps-4.5">
                                  {deliveryDistance} كم
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* الأصناف */}
                          <TableCell className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{order.items?.length || 0}</span> صنف
                          </TableCell>

                          {/* الإجمالي */}
                          <TableCell className="text-xs">
                            <div className="font-mono font-bold text-foreground">
                              {order.total} {currency}
                            </div>
                            {Number(order.delivery_fee || 0) > 0 && (
                              <div className="text-[10px] text-muted-foreground font-mono">
                                توصيل: +{order.delivery_fee} {currency}
                                {deliveryDistance && ` (${deliveryDistance} كم)`}
                              </div>
                            )}
                          </TableCell>

                          {/* حالة السداد */}
                          <TableCell className="text-xs">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-2 py-0.5 font-medium ${
                                isPaid
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                              }`}
                            >
                              {isPaid ? "مدفوع بالكامل ✓" : "كاش عند الاستلام"}
                            </Badge>
                          </TableCell>

                          {/* المندوب المكلف */}
                          <TableCell className="text-xs">
                            {currentDriver ? (
                              <div className="flex items-center gap-1 text-foreground font-medium">
                                <BikeIcon className="size-3.5 text-primary" />
                                <span>{currentDriver.name}</span>
                              </div>
                            ) : order.status === "ready" ? (
                              <div className="w-36">
                                <ComboboxSelect
                                  value={selectedDriverForOrder[order.id] ? String(selectedDriverForOrder[order.id]) : ""}
                                  onValueChange={(val) =>
                                    setSelectedDriverForOrder((prev) => ({
                                      ...prev,
                                      [order.id]: Number(val),
                                    }))
                                  }
                                  options={drivers
                                    .filter((d) => d.is_active)
                                    .map((d) => ({
                                      value: String(d.id),
                                      label: d.name,
                                      badge: d.status === "available" ? "متاح" : "مشغول",
                                      badgeVariant: d.status === "available" ? ("success" as const) : ("secondary" as const),
                                    }))}
                                  placeholder="اختر مندوب..."
                                  emptyText="لا يوجد مناديب"
                                  className="h-7 text-[11px]"
                                />
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">غير معين</span>
                            )}
                          </TableCell>

                          {/* حالة الطلب */}
                          <TableCell className="text-xs">
                            <Badge
                              variant="outline"
                              className={`gap-1 text-[11px] font-medium ${statusInfo.className}`}
                            >
                              <StatusIcon className="size-3" />
                              <span>{statusInfo.label}</span>
                            </Badge>
                          </TableCell>

                          {/* الإجراءات */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* زر المرحلة التالية الذكية */}
                              {order.status === "pending" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isCurrentActionLoading}
                                  onClick={() => handleMoveStatus(order, "preparing")}
                                  className="h-7 px-2.5 text-[11px] font-bold rounded-md gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <ChefHatIcon className={`size-3 ${isCurrentActionLoading ? "animate-spin" : ""}`} />
                                  <span>للمطبخ</span>
                                </Button>
                              )}

                              {order.status === "preparing" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isCurrentActionLoading}
                                  onClick={() => handleMoveStatus(order, "ready")}
                                  className="h-7 px-2.5 text-[11px] font-bold rounded-md gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  <CheckIcon className={`size-3 ${isCurrentActionLoading ? "animate-spin" : ""}`} />
                                  <span>جاهز للتسليم</span>
                                </Button>
                              )}

                              {order.status === "ready" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isCurrentActionLoading}
                                  onClick={() => handleAssignAndDispatch(order)}
                                  className="h-7 px-2.5 text-[11px] font-bold rounded-md gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  <SendIcon className={`size-3 ${isCurrentActionLoading ? "animate-spin" : ""}`} />
                                  <span>خروج مع المندوب</span>
                                </Button>
                              )}

                              {order.status === "out_for_delivery" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isCurrentActionLoading}
                                  onClick={() => handleOpenSettlement(order)}
                                  className="h-7 px-2.5 text-[11px] font-bold rounded-md gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <CheckCircle2Icon className={`size-3 ${isCurrentActionLoading ? "animate-spin" : ""}`} />
                                  <span>تم التسليم والتوريد</span>
                                </Button>
                              )}

                              {order.status === "completed" && !isPaid && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenSettlement(order)}
                                  className="h-7 px-2.5 text-[11px] font-bold rounded-md gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                                >
                                  <BanknoteIcon className="size-3" />
                                  <span>توريد الكاش</span>
                                </Button>
                              )}

                              {/* زر عرض تفاصيل الطلب */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setInspectingOrder(order)}
                                className="size-7 text-muted-foreground hover:text-foreground"
                                title="عرض تفاصيل الفاتورة"
                              >
                                <EyeIcon className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* =========================================================================
            التبويب الثاني: إدارة أسطول المناديب
            ========================================================================= */}
        {activeTab === "fleet" && (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 font-bold text-foreground">#</TableHead>
                  <TableHead className="font-bold text-foreground">المندوب</TableHead>
                  <TableHead className="font-bold text-foreground">رقم الهاتف</TableHead>
                  <TableHead className="font-bold text-foreground">المركبة واللوحة</TableHead>
                  <TableHead className="font-bold text-foreground">الحالة التشغيلية</TableHead>
                  <TableHead className="font-bold text-foreground">الحساب</TableHead>
                  <TableHead className="text-left font-bold text-foreground">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BikeIcon className="size-8 opacity-30" />
                        <span>لم يتم تسجيل أي مندوب توصيل حتى الآن.</span>
                        <Button
                          size="sm"
                          onClick={() => setDriverModalOpen(true)}
                          className="mt-1 text-xs rounded-lg"
                        >
                          إضافة أول مندوب
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  drivers.map((driver, idx) => (
                    <TableRow key={driver.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                            {driver.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm">{driver.name}</div>
                            {driver.notes && (
                              <div className="text-[10px] text-muted-foreground line-clamp-1">{driver.notes}</div>
                            )}
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
                        <div className="w-40">
                          <ComboboxSelect
                            value={driver.status}
                            onValueChange={(val) =>
                              val && updateDriverStatus(driver.id, val as "available" | "on_delivery" | "off_duty")
                            }
                            options={[
                              { value: "available", label: "متاح للتوصيل", badge: "متاح", badgeVariant: "success" },
                              { value: "on_delivery", label: "في الطريق لتوصيل", badge: "مشغول", badgeVariant: "secondary" },
                              { value: "off_duty", label: "في استراحة / خارج الدوام", badge: "استراحة", badgeVariant: "destructive" },
                            ]}
                            className="h-7 text-[11px]"
                          />
                        </div>
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
                            className="size-7 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2Icon className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDriverToDelete(driver)
                              setDeleteConfirmOpen(true)
                            }}
                            title="حذف المندوب"
                            className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* =========================================================================
          نافذة تفاصيل الطلب والفاتورة
          ========================================================================= */}
      <Dialog open={Boolean(inspectingOrder)} onOpenChange={(open) => !open && setInspectingOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ReceiptIcon className="size-4.5 text-primary" />
              <span>تفاصيل طلب التوصيل #{inspectingOrder?.order_number}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              بيانات العميل، أصناف الوجبة، وتفاصيل الحساب المالي
            </DialogDescription>
          </DialogHeader>

          {inspectingOrder && (
            <div className="space-y-3 py-2 text-xs">
              {/* بيانات العميل */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground text-sm">
                    {inspectingOrder.customer?.name || inspectingOrder.customer_name || "عميل بدون اسم"}
                  </span>
                  <span className="font-mono text-muted-foreground">{inspectingOrder.customer?.phone}</span>
                </div>
                <div className="flex items-start gap-1.5 text-muted-foreground pt-1">
                  <MapPinIcon className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{inspectingOrder.delivery_address || inspectingOrder.customer?.address || inspectingOrder.notes || "العنوان غير محدد"}</span>
                </div>
                {inspectingOrder.delivery_distance && (
                  <div className="text-xs text-primary font-mono font-semibold pt-0.5 ps-5">
                    مسافة التوصيل: {inspectingOrder.delivery_distance} كم
                  </div>
                )}
              </div>

              {/* بنود الأصناف */}
              <div className="space-y-1 border border-border/60 rounded-lg p-2.5 bg-card">
                <div className="text-[11px] font-bold text-muted-foreground mb-1">الأصناف المطلوبة:</div>
                {inspectingOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
                    <div>
                      <span className="font-bold font-mono ml-2 text-primary">{it.quantity}x</span>
                      <span className="font-medium text-foreground">{it.product_name || "صنف"}</span>
                      {it.size_name && (
                        <span className="text-[10px] text-muted-foreground mr-1">({it.size_name})</span>
                      )}
                    </div>
                    <span className="font-mono font-bold">{it.total_price} {currency}</span>
                  </div>
                ))}
              </div>

              {/* الحسابات */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-1 text-muted-foreground">
                <div className="flex justify-between text-xs">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono">{inspectingOrder.subtotal} {currency}</span>
                </div>
                {Number(inspectingOrder.delivery_fee || 0) > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-medium">
                    <span>
                      رسوم التوصيل
                      {inspectingOrder.delivery_distance ? ` (${inspectingOrder.delivery_distance} كم)` : ""}:
                    </span>
                    <span className="font-mono">+{inspectingOrder.delivery_fee} {currency}</span>
                  </div>
                )}
                {Number(inspectingOrder.tax || 0) > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>الضريبة:</span>
                    <span className="font-mono">{inspectingOrder.tax} {currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-foreground pt-1 border-t border-border/40">
                  <span>الإجمالي المطلوب:</span>
                  <span className="font-mono text-primary">{inspectingOrder.total} {currency}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInspectingOrder(null)}
              className="text-xs rounded-lg"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          نافذة توريد وسداد نقدية المندوب للخزينة
          ========================================================================= */}
      <Dialog open={Boolean(settlementOrder)} onOpenChange={(open) => !open && setSettlementOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-600">
              <BanknoteIcon className="size-4.5" />
              <span>توريد نقدية الطلب #{settlementOrder?.order_number}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              تسوية عهدة طيار التوصيل وإيداع النقدية المستلمة في خزينة المطعم
            </DialogDescription>
          </DialogHeader>

          {settlementOrder && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground">المبلغ المطلوب توريده من المندوب:</div>
                  <div className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {settlementOrder.total} {currency}
                  </div>
                </div>
                {settlementOrder.deliveryDriver && (
                  <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-700 text-xs">
                    <BikeIcon className="size-3" />
                    <span>{settlementOrder.deliveryDriver.name}</span>
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">الخزينة المستلمة للنقدية *</label>
                <ComboboxSelect
                  value={settlementRegisterId ? String(settlementRegisterId) : ""}
                  onValueChange={(val) => setSettlementRegisterId(Number(val))}
                  options={registers
                    .filter((r) => r.is_active)
                    .map((r) => ({
                      value: String(r.id),
                      label: `${r.name} ${r.is_default ? "(الخزنة الافتراضية)" : ""}`,
                      badge: `${Number(r.balance || 0).toLocaleString("ar-EG")} ${currency}`,
                      badgeVariant: "success" as const,
                    }))}
                  placeholder="اختر الخزينة..."
                  emptyText="لا توجد خزائن نشطة"
                  className="h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">طريقة السداد المستلمة</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlementMethod("cash")}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
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
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
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
                  className="h-8.5 text-xs rounded-lg"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSettlementOrder(null)}
              className="rounded-lg text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSettlement}
              disabled={isSettling}
              className="rounded-lg text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2Icon className="size-3.5" />
              <span>{isSettling ? "جاري التوريد..." : "تأكيد الإيداع بالخزينة"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          نافذة إضافة / تعديل مندوب توصيل
          ========================================================================= */}
      <Dialog open={driverModalOpen} onOpenChange={setDriverModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <BikeIcon className="size-4.5 text-primary" />
              <span>{editingDriver ? "تعديل بيانات مندوب التوصيل" : "إضافة مندوب توصيل جديد"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل اسم المندوب ورقم هاتفه ونوع المركبة لإضافته لأسطول المطعم
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDriver} className="space-y-3 pt-1 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">اسم المندوب *</label>
              <Input
                required
                value={driverFormData.name}
                onChange={(e) => setDriverFormData({ ...driverFormData, name: e.target.value })}
                placeholder="مثال: محمود إبراهيم"
                className="h-8.5 rounded-lg"
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
                className="h-8.5 rounded-lg font-mono text-xs text-right"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">نوع المركبة</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDriverFormData({ ...driverFormData, vehicle_type: "motorcycle" })}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    driverFormData.vehicle_type === "motorcycle"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BikeIcon className="size-5" />
                  <span>موتوسيكل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDriverFormData({ ...driverFormData, vehicle_type: "car" })}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    driverFormData.vehicle_type === "car"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CarIcon className="size-5" />
                  <span>سيارة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDriverFormData({ ...driverFormData, vehicle_type: "bicycle" })}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    driverFormData.vehicle_type === "bicycle"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BikeIcon className="size-5" />
                  <span>دراجة</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">رقم اللوحة (إن وجد)</label>
              <Input
                value={driverFormData.license_plate || ""}
                onChange={(e) => setDriverFormData({ ...driverFormData, license_plate: e.target.value })}
                placeholder="مثال: أ ب ج 123"
                className="h-8.5 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">ملاحظات إضافية</label>
              <Input
                value={driverFormData.notes || ""}
                onChange={(e) => setDriverFormData({ ...driverFormData, notes: e.target.value })}
                placeholder="منطقة التوصيل المعتادة، الملاحظات..."
                className="h-8.5 rounded-lg"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDriverModalOpen(false)}
                className="rounded-lg text-xs"
              >
                إلغاء
              </Button>
              <Button type="submit" size="sm" disabled={driverSaving} className="rounded-lg text-xs font-bold">
                {driverSaving ? "جاري الحفظ..." : "حفظ المندوب"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          نافذة تأكيد حذف المندوب
          ========================================================================= */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">هل أنت متأكد من حذف هذا المندوب؟</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              سيتم إزالة المندوب ({driverToDelete?.name}) من قائمة الأسطول ولن تتمكن من تعيينه للطلبات اللاحقة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDriverConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-xs font-bold"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
