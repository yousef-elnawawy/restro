"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PageContainer } from "@/components/page-container"
import { useOrderStore } from "@/store/order.store"
import { useRegisterStore } from "@/store/register.store"
import { useDeliveryDriverStore } from "@/store/delivery-driver.store"
import { useSettingStore } from "@/store/setting.store"
import { useAuthStore } from "@/store/auth.store"
import { type Order, type OrderStatus, type PaymentStatus } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/combobox-select"
import { ThermalReceiptCard } from "@/components/thermal-receipt-card"
import { printThermalReceipt } from "@/lib/receipt-printer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ReceiptIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  EyeIcon,
  PrinterIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  ArmchairIcon,
  LandmarkIcon,
  BikeIcon,
  ChefHatIcon,
  BellRingIcon,
  SparklesIcon,
  MoreVerticalIcon,
  ArrowRightIcon,
  AlertCircleIcon,
  UserIcon,
  Edit2Icon,
} from "lucide-react"

// خريطة تفاصيل حالات الطلب
function getOrderStatusInfo(status: OrderStatus) {
  switch (status) {
    case "pending":
      return {
        label: "جديد",
        color: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
        icon: ClockIcon,
      }
    case "preparing":
      return {
        label: "جاري التحضير",
        color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        icon: ChefHatIcon,
      }
    case "ready":
      return {
        label: "جاهز للاستلام",
        color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
        icon: BellRingIcon,
      }
    case "served":
      return {
        label: "تم التقديم",
        color: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30",
        icon: ArmchairIcon,
      }
    case "out_for_delivery":
      return {
        label: "خرج للتوصيل",
        color: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
        icon: BikeIcon,
      }
    case "completed":
      return {
        label: "مكتمل",
        color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        icon: CheckCircle2Icon,
      }
    case "cancelled":
      return {
        label: "ملغي",
        color: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
        icon: XCircleIcon,
      }
    default:
      return {
        label: status,
        color: "bg-muted text-muted-foreground border-border",
        icon: ClockIcon,
      }
  }
}

// خريطة تفاصيل حالات السداد
function getPaymentStatusInfo(status: PaymentStatus) {
  switch (status) {
    case "paid":
      return {
        label: "مدفوع بالكامل ✓",
        color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      }
    case "partially_paid":
      return {
        label: "مدفوع جزئياً ⏳",
        color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      }
    case "unpaid":
      return {
        label: "غير مدفوع ✕",
        color: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
      }
    default:
      return {
        label: status,
        color: "bg-muted text-muted-foreground border-border",
      }
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const {
    orders,
    isLoading,
    isSaving,
    searchQuery,
    orderTypeFilter,
    paymentFilter,
    statusFilter,
    fetchOrders,
    updateOrderStatus,
    assignDriver,
    payOrder,
    cancelOrder,
    setSearchQuery,
    setOrderTypeFilter,
    setPaymentFilter,
    setStatusFilter,
  } = useOrderStore()

  const { registers, fetchRegisters } = useRegisterStore()
  const { drivers, fetchDrivers } = useDeliveryDriverStore()
  const { settings, fetchSettings } = useSettingStore()
  const user = useAuthStore((state) => state.user)
  const isKitchen = user?.role === "kitchen"

  const [mounted, setMounted] = React.useState(false)
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false)

  // نوافذ التعديل والسداد
  const [payModalOpen, setPayModalOpen] = React.useState(false)
  const [payForm, setPayForm] = React.useState({
    registerId: 0,
    amount: "",
    paymentMethod: "cash",
    notes: "",
    completeOrder: true,
  })

  const [statusModalOpen, setStatusModalOpen] = React.useState(false)
  const [statusForm, setStatusForm] = React.useState<{
    status: OrderStatus
    driverId: number
    notes: string
  }>({
    status: "pending",
    driverId: 0,
    notes: "",
  })

  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null)

  // فلاتر الخيارات
  const orderTypeOptions: ComboboxOption[] = React.useMemo(() => [
    { value: "all", label: "كل أنواع الطلبات" },
    { value: "dinein", label: "صالة (سفرة)" },
    { value: "takeaway", label: "سفري (تيك أواي)" },
    { value: "delivery", label: "توصيل (ديليفري)" },
  ], [])

  const statusOptions: ComboboxOption[] = React.useMemo(() => [
    { value: "all", label: "كل حالات الطلبات" },
    { value: "pending", label: "جديد (بانتظار التحضير)" },
    { value: "preparing", label: "جاري التحضير بالمطبخ" },
    { value: "ready", label: "جاهز للاستلام / للتسليم" },
    { value: "served", label: "تم التقديم على السفرة" },
    { value: "out_for_delivery", label: "في الطريق مع المندوب" },
    { value: "completed", label: "مكتمل ومغلق ✓" },
    { value: "cancelled", label: "ملغي ✕" },
  ], [])

  const paymentOptions: ComboboxOption[] = React.useMemo(() => [
    { value: "all", label: "كل حالات السداد" },
    { value: "paid", label: "مدفوع بالكامل ✓", badge: "✓", badgeVariant: "success" },
    { value: "partially_paid", label: "مدفوع جزئياً ⏳", badge: "⏳", badgeVariant: "secondary" },
    { value: "unpaid", label: "غير مدفوع ✕", badge: "✕", badgeVariant: "destructive" },
  ], [])

  React.useEffect(() => {
    setMounted(true)
    fetchOrders()
    fetchRegisters()
    fetchDrivers()
    fetchSettings()
  }, [fetchOrders, fetchRegisters, fetchDrivers, fetchSettings])

  const activeCurrency = settings?.currency || "ج.م"

  // فلترة الطلبات المعروضة
  const filteredOrders = React.useMemo(() => {
    return orders.filter((ord) => {
      if (orderTypeFilter !== "all" && ord.order_type !== orderTypeFilter) return false
      if (paymentFilter !== "all" && ord.payment_status !== paymentFilter) return false
      if (statusFilter !== "all" && ord.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchNum = ord.order_number.toLowerCase().includes(q)
        const matchCust = ord.customer_name?.toLowerCase().includes(q)
        const matchTable = ord.table?.name?.toLowerCase().includes(q)
        const matchDriver = ord.deliveryDriver?.name?.toLowerCase().includes(q)
        if (!matchNum && !matchCust && !matchTable && !matchDriver) return false
      }
      return true
    })
  }, [orders, orderTypeFilter, paymentFilter, statusFilter, searchQuery])

  // إحصائيات سريعة
  const totalCount = orders.length
  const activeCount = orders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled"
  ).length
  const paidCount = orders.filter((o) => o.payment_status === "paid").length
  const unpaidCount = orders.filter((o) => o.payment_status !== "paid").length
  const totalRevenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + Number(o.total || 0), 0)

  // عرض تفاصيل الفاتورة
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order)
    setDetailsModalOpen(true)
  }

  // الذهاب للـ POS
  const handlePayInPos = (order: Order) => {
    router.push(`/dashboard/pos?orderId=${order.id}`)
  }

  // فتح نافذة السداد السريع
  const handleOpenQuickPay = (order: Order) => {
    setSelectedOrder(order)
    const paidSum = order.payments?.reduce((acc, p) => acc + Number(p.amount || 0), 0) || 0
    const remaining = Math.max(0, Number(order.total || 0) - paidSum)
    const activeReg = registers.find((r) => r.is_active)

    setPayForm({
      registerId: activeReg ? activeReg.id : registers[0]?.id || 0,
      amount: remaining > 0 ? remaining.toFixed(2) : Number(order.total || 0).toFixed(2),
      paymentMethod: "cash",
      notes: `سداد للطلب ${order.order_number}`,
      completeOrder: true,
    })
    setPayModalOpen(true)
  }

  // حفظ السداد السريع
  const handleConfirmQuickPay = async () => {
    if (!selectedOrder || !payForm.registerId) return
    const amountVal = parseFloat(payForm.amount)
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("يرجى إدخال مبلغ دفع صحيح.")
      return
    }

    const res = await payOrder(selectedOrder.id, {
      cash_register_id: payForm.registerId,
      amount: amountVal,
      payment_method: payForm.paymentMethod,
      notes: payForm.notes,
      complete_order: payForm.completeOrder,
    })

    if (res.success) {
      setPayModalOpen(false)
      fetchOrders()
    } else {
      alert(res.message)
    }
  }

  // فتح نافذة تغيير الحالة يدويًا
  const handleOpenStatusModal = (order: Order) => {
    setSelectedOrder(order)
    setStatusForm({
      status: order.status,
      driverId: order.delivery_driver_id || 0,
      notes: "",
    })
    setStatusModalOpen(true)
  }

  // حفظ تغيير الحالة يدويًا
  const handleConfirmStatusChange = async () => {
    if (!selectedOrder) return

    // إذا تم تغيير السائق في طلب توصيل
    if (
      selectedOrder.order_type === "delivery" &&
      statusForm.driverId &&
      statusForm.driverId !== selectedOrder.delivery_driver_id
    ) {
      await assignDriver(selectedOrder.id, statusForm.driverId)
    }

    const res = await updateOrderStatus(selectedOrder.id, {
      status: statusForm.status,
      delivery_driver_id: statusForm.driverId || undefined,
      notes: statusForm.notes,
    })

    if (res.success) {
      setStatusModalOpen(false)
      fetchOrders()
    } else {
      alert(res.message)
    }
  }

  // تنفيذ الخطوة التالية الذكية بنقرة زر واحدة
  const handleSmartNextStep = async (order: Order) => {
    setActionLoadingId(order.id)
    try {
      if (order.status === "pending") {
        // جديد -> في المطبخ
        await updateOrderStatus(order.id, { status: "preparing" })
      } else if (order.status === "preparing") {
        if (order.order_type === "dinein") {
          // سفرة: في المطبخ -> تم التقديم على السفرة
          await updateOrderStatus(order.id, { status: "served" })
        } else if (order.order_type === "takeaway" || order.order_type === "delivery") {
          // سفري أو توصيل: في المطبخ -> جاهز
          await updateOrderStatus(order.id, { status: "ready" })
        }
      } else if (order.status === "ready") {
        if (order.order_type === "takeaway") {
          // سفري: جاهز -> تم الاستلام (مكتمل)
          await updateOrderStatus(order.id, { status: "completed" })
        } else if (order.order_type === "delivery") {
          // توصيل: جاهز -> للتوصيل مع الطيار
          if (!order.delivery_driver_id) {
            handleOpenStatusModal(order)
            return
          }
          await updateOrderStatus(order.id, { status: "out_for_delivery" })
        }
      } else if (order.status === "served") {
        // سفرة: تم التقديم -> إذا مدفوع يكتمل، إذا غير مدفوع يفتح نافذة السداد
        if (order.payment_status === "paid") {
          await updateOrderStatus(order.id, { status: "completed" })
        } else {
          handleOpenQuickPay(order)
          return
        }
      } else if (order.status === "out_for_delivery") {
        // توصيل: في الطريق -> تم التوصيل واكتمل
        await updateOrderStatus(order.id, { status: "completed" })
      }
      fetchOrders()
    } finally {
      setActionLoadingId(null)
    }
  }

  // حساب المتبقي على الطلب
  const getOrderRemaining = (order: Order) => {
    const paidSum = order.payments?.reduce((acc, p) => acc + Number(p.amount || 0), 0) || 0
    return Math.max(0, Number(order.total || 0) - paidSum)
  }

  // نص وزر الخطوة التالية الذكية
  const renderSmartNextButton = (order: Order) => {
    if (order.status === "completed" || order.status === "cancelled") {
      return null
    }

    let nextLabel = "ترقية الحالة"
    let NextIcon = ArrowRightIcon
    let btnStyle = "bg-primary text-primary-foreground hover:bg-primary/90"

    if (order.status === "pending") {
      nextLabel = "بدء التحضير"
      NextIcon = ChefHatIcon
      btnStyle = "bg-amber-600 hover:bg-amber-700 text-white"
    } else if (order.status === "preparing") {
      if (order.order_type === "dinein") {
        nextLabel = "تقديم للسفرة"
        NextIcon = ArmchairIcon
        btnStyle = "bg-teal-600 hover:bg-teal-700 text-white"
      } else if (order.order_type === "takeaway") {
        nextLabel = "جاهز بالكاونتر"
        NextIcon = BellRingIcon
        btnStyle = "bg-purple-600 hover:bg-purple-700 text-white"
      } else if (order.order_type === "delivery") {
        nextLabel = "جاهز للتسليم"
        NextIcon = BellRingIcon
        btnStyle = "bg-purple-600 hover:bg-purple-700 text-white"
      }
    } else if (order.status === "ready") {
      if (order.order_type === "takeaway") {
        nextLabel = "تسليم للعميل"
        NextIcon = CheckCircle2Icon
        btnStyle = "bg-emerald-600 hover:bg-emerald-700 text-white"
      } else if (order.order_type === "delivery") {
        nextLabel = order.delivery_driver_id ? "خرج مع الطيار" : "تعيين طيار وتسليم"
        NextIcon = BikeIcon
        btnStyle = "bg-blue-600 hover:bg-blue-700 text-white"
      }
    } else if (order.status === "served") {
      if (order.payment_status === "paid") {
        nextLabel = "إنهاء الطلب"
        NextIcon = CheckCircle2Icon
        btnStyle = "bg-emerald-600 hover:bg-emerald-700 text-white"
      } else {
        nextLabel = "تحصيل الحساب"
        NextIcon = CreditCardIcon
        btnStyle = "bg-emerald-600 hover:bg-emerald-700 text-white"
      }
    } else if (order.status === "out_for_delivery") {
      nextLabel = "تم التوصيل"
      NextIcon = CheckCircle2Icon
      btnStyle = "bg-emerald-600 hover:bg-emerald-700 text-white"
    }

    const isCurrentActionLoading = actionLoadingId === order.id

    return (
      <Button
        type="button"
        size="sm"
        disabled={isCurrentActionLoading}
        onClick={() => handleSmartNextStep(order)}
        className={`h-7 px-2 text-[11px] font-bold rounded-md gap-1 shadow-2xs ${btnStyle}`}
        title={`الانتقال للمرحلة التالية: ${nextLabel}`}
      >
        <NextIcon className={`size-3 ${isCurrentActionLoading ? "animate-spin" : ""}`} />
        <span>{nextLabel}</span>
      </Button>
    )
  }

  return (
    <PageContainer
      title="إدارة مسار الطلبات والمبيعات"
      description="متابعة دورة حياة الطلبات (السفرة، التيك أواي، الديليفري) مع حالات المطبخ والسداد وتعيين المناديب"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders()}
            disabled={isLoading}
            className="rounded-md text-xs gap-1.5"
            title="تحديث القائمة"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          {isKitchen ? (
            <Link href="/dashboard/kitchen">
              <Button size="sm" className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-semibold">
                <ChefHatIcon className="size-4" />
                <span>شاشة المطبخ (KDS)</span>
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard/pos">
              <Button size="sm" className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-semibold">
                <ReceiptIcon className="size-4" />
                <span>نقطة البيع (الكاشير)</span>
              </Button>
            </Link>
          )}
        </div>
      }
    >
      {/* كروت الإحصائيات العلوية */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-8.5 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShoppingBagIcon className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">إجمالي الطلبات</p>
            <p className="text-base font-bold tracking-tight text-foreground">{mounted ? totalCount : 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-8.5 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ChefHatIcon className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">قيد التحضير</p>
            <p className="text-base font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {mounted ? activeCount : 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">المسدد بالكامل</p>
            <p className="text-base font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {mounted ? paidCount : 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-8.5 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ClockIcon className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">قيد السداد</p>
            <p className="text-base font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {mounted ? unpaidCount : 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex size-8.5 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <LandmarkIcon className="size-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">المحصل</p>
            <p className="text-base font-bold tracking-tight text-foreground truncate">
              {mounted ? totalRevenue.toLocaleString("ar-EG") : 0} {activeCurrency}
            </p>
          </div>
        </div>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl bg-card border border-border/60 shadow-xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الطلب، العميل، الطاولة، أو الطيار..."
            className="ps-9 bg-muted/40 rounded-lg text-xs h-8.5 border-border/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1 rounded-lg bg-muted/40 w-full sm:w-auto text-xs">
          {/* نوع الطلب */}
          <ComboboxSelect
            value={orderTypeFilter}
            onValueChange={(val) => setOrderTypeFilter(val as any)}
            options={orderTypeOptions}
            placeholder="نوع الطلب"
            className="w-full sm:w-36 text-xs sm:text-sm h-9 bg-card border border-border/60 rounded-lg"
          />

          {/* حالة الطلب */}
          <ComboboxSelect
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as any)}
            options={statusOptions}
            placeholder="حالة الطلب"
            className="w-full sm:w-44 text-xs sm:text-sm h-9 bg-card border border-border/60 rounded-lg"
          />

          {/* حالة السداد */}
          <ComboboxSelect
            value={paymentFilter}
            onValueChange={(val) => setPaymentFilter(val as any)}
            options={paymentOptions}
            placeholder="حالة السداد"
            className="w-full sm:w-36 text-xs sm:text-sm h-9 bg-card border border-border/60 rounded-lg"
          />
        </div>
      </div>

      {/* جدول الطلبات الشامل */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-right">رقم الطلب</TableHead>
              <TableHead className="text-right">النوع / الموقع</TableHead>
              <TableHead className="text-right">الأصناف</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead className="text-right">حالة الطلب التشغيلية</TableHead>
              <TableHead className="text-right">حالة السداد</TableHead>
              <TableHead className="text-right">الخزنة المسجلة</TableHead>
              <TableHead className="text-right">التاريخ والوقت</TableHead>
              <TableHead className="text-center min-w-[150px]">الإجراءات السريعة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-xs">
                  لا توجد طلبات مسجلة مطابقة للبحث أو الفلتر المحدد.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const statusInfo = getOrderStatusInfo(order.status)
                const StatusIcon = statusInfo.icon
                const paymentInfo = getPaymentStatusInfo(order.payment_status)
                const remaining = getOrderRemaining(order)

                return (
                  <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                    {/* رقم الطلب */}
                    <TableCell className="font-mono font-bold text-xs text-foreground">
                      {order.order_number}
                    </TableCell>

                    {/* نوع الطلب وتفاصيل الموقع */}
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          {order.order_type === "dinein" ? (
                            <>
                              <ArmchairIcon className="size-3.5 text-amber-600" />
                              <span>{order.table?.name || "طاولة بالصالة"}</span>
                            </>
                          ) : order.order_type === "takeaway" ? (
                            <>
                              <ShoppingBagIcon className="size-3.5 text-primary" />
                              <span>سفري مباشر</span>
                            </>
                          ) : (
                            <>
                              <BikeIcon className="size-3.5 text-blue-600" />
                              <span>توصيل ديليفري</span>
                            </>
                          )}
                        </div>

                        {/* تفاصيل إضافية عن العميل أو الطيار */}
                        <div className="text-[11px] text-muted-foreground">
                          {order.customer_name && <span>{order.customer_name}</span>}
                          {order.order_type === "delivery" && order.deliveryDriver && (
                            <span className="ms-1 text-blue-600 dark:text-blue-400 font-medium">
                              (مع: {order.deliveryDriver.name})
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* عدد الأصناف */}
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{order.items?.length || 0}</span> صنف
                    </TableCell>

                    {/* الإجمالي والمتبقي */}
                    <TableCell className="text-xs">
                      <div className="font-mono font-black text-foreground">
                        {order.total} {activeCurrency}
                      </div>
                      {order.payment_status === "partially_paid" && remaining > 0 && (
                        <div className="text-[10px] text-amber-600 font-bold">
                          باقي: {remaining.toFixed(2)} {activeCurrency}
                        </div>
                      )}
                    </TableCell>

                    {/* حالة الطلب التشغيلية (Order Status) */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${statusInfo.color}`}
                      >
                        <StatusIcon className="size-3.5" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </TableCell>

                    {/* حالة السداد (Payment Status) */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-bold border ${paymentInfo.color}`}
                      >
                        {paymentInfo.label}
                      </span>
                    </TableCell>

                    {/* الخزنة المسجلة */}
                    <TableCell className="text-xs text-muted-foreground">
                      {order.cash_register?.name || "—"}
                    </TableCell>

                    {/* التاريخ والوقت */}
                    <TableCell className="text-[11px] text-muted-foreground font-mono">
                      {order.created_at ? new Date(order.created_at).toLocaleString("ar-EG") : "—"}
                    </TableCell>

                    {/* الإجراءات */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* الزر الذكي السريع للترقية */}
                        {renderSmartNextButton(order)}

                        {/* زر عرض الفاتورة والطباعة */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetails(order)}
                          className="size-7 p-0 rounded-md text-muted-foreground hover:text-foreground"
                          title="عرض الفاتورة والطباعة"
                        >
                          <EyeIcon className="size-3.5" />
                        </Button>

                        {/* القائمة المنسدلة للخيارات الشاملة */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={(props) => (
                              <Button
                                {...props}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 rounded-md text-muted-foreground hover:text-foreground"
                                title="المزيد من الإجراءات"
                              >
                                <MoreVerticalIcon className="size-3.5" />
                              </Button>
                            )}
                          />
                          <DropdownMenuContent align="end" className="w-52 text-right">
                            <DropdownMenuLabel>إجراءات الطلب</DropdownMenuLabel>

                            <DropdownMenuItem
                              onClick={() => handleOpenStatusModal(order)}
                              className="gap-2 cursor-pointer text-xs"
                            >
                              <RefreshCwIcon className="size-3.5 text-primary" />
                              <span>تغيير الحالة يدوياً / السائق</span>
                            </DropdownMenuItem>

                            {!isKitchen && order.status !== "completed" && order.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/pos?orderId=${order.id}`)}
                                className="gap-2 cursor-pointer text-xs font-semibold text-primary"
                              >
                                <Edit2Icon className="size-3.5" />
                                <span>تعديل الأصناف في الكاشير</span>
                              </DropdownMenuItem>
                            )}

                            {!isKitchen && order.payment_status !== "paid" && (
                              <DropdownMenuItem
                                onClick={() => handleOpenQuickPay(order)}
                                className="gap-2 cursor-pointer text-xs text-emerald-600 font-semibold"
                              >
                                <CreditCardIcon className="size-3.5" />
                                <span>سداد سريع للخزنة</span>
                              </DropdownMenuItem>
                            )}

                            {!isKitchen && order.payment_status !== "paid" && (
                              <DropdownMenuItem
                                onClick={() => handlePayInPos(order)}
                                className="gap-2 cursor-pointer text-xs"
                              >
                                <ReceiptIcon className="size-3.5 text-indigo-600" />
                                <span>فتح وسداد في شاشة POS</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => printThermalReceipt(order)}
                              className="gap-2 cursor-pointer text-xs"
                            >
                              <PrinterIcon className="size-3.5 text-muted-foreground" />
                              <span>طباعة إيصال حراري</span>
                            </DropdownMenuItem>

                            {!isKitchen && order.status !== "cancelled" && order.payment_status !== "paid" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={async () => {
                                    if (confirm(`هل أنت متأكد من رغبتك في إلغاء الطلب رقم ${order.order_number}؟`)) {
                                      await cancelOrder(order.id)
                                      fetchOrders()
                                    }
                                  }}
                                  className="gap-2 cursor-pointer text-xs text-rose-600 font-semibold focus:text-rose-600"
                                >
                                  <XCircleIcon className="size-3.5" />
                                  <span>إلغاء الطلب</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* نافذة عرض وطباعة الفاتورة */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 text-right shadow-xl">
          <DialogHeader className="text-center space-y-1">
            <DialogTitle className="text-base font-bold text-foreground">
              فاتورة الطلب ({selectedOrder?.order_number})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تفاصيل الأصناف والحساب ومسار الحالة والخزينة المسجلة.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="max-h-[62vh] overflow-y-auto p-2 bg-neutral-200/50 dark:bg-muted/30 rounded-md border border-neutral-300 dark:border-border">
              <ThermalReceiptCard
                data={selectedOrder}
                className="printable-thermal-receipt"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectedOrder && printThermalReceipt(selectedOrder)}
              className="gap-1.5 rounded-md text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 shadow-sm"
            >
              <PrinterIcon className="size-3.5" />
              <span>طباعة ريسيت حراري</span>
            </Button>

            {!isKitchen && selectedOrder && selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailsModalOpen(false)
                  router.push(`/dashboard/pos?orderId=${selectedOrder.id}`)
                }}
                className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-bold rounded-md text-xs"
              >
                <Edit2Icon className="size-3.5" />
                <span>تعديل الأصناف في الكاشير</span>
              </Button>
            )}

            {!isKitchen && selectedOrder && selectedOrder.payment_status !== "paid" && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setDetailsModalOpen(false)
                  handleOpenQuickPay(selectedOrder)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs gap-1.5"
              >
                <CreditCardIcon className="size-3.5" />
                <span>سداد سريع</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDetailsModalOpen(false)}
              className="rounded-md text-xs"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة السداد السريع المباشر */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 text-right shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <CreditCardIcon className="size-5 text-emerald-600" />
              <span>سداد فاتورة الطلب ({selectedOrder?.order_number})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تسجيل دفعة نقدية أو بنكية وتوريدها للخزينة المحددة.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-2 text-xs">
              {/* ملخص الحساب */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/40 rounded-xl text-center border">
                <div>
                  <p className="text-[11px] text-muted-foreground">إجمالي الفاتورة</p>
                  <p className="font-mono font-bold text-sm text-foreground">{selectedOrder.total} {activeCurrency}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">المدفوع مسبقاً</p>
                  <p className="font-mono font-bold text-sm text-emerald-600">
                    {(
                      selectedOrder.payments?.reduce((acc, p) => acc + Number(p.amount || 0), 0) || 0
                    ).toFixed(2)}{" "}
                    {activeCurrency}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">المتبقي المطلوب</p>
                  <p className="font-mono font-bold text-sm text-rose-600">
                    {getOrderRemaining(selectedOrder).toFixed(2)} {activeCurrency}
                  </p>
                </div>
              </div>

              {/* اختيار الخزينة */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">الخزينة المستلمة:</label>
                <select
                  value={payForm.registerId}
                  onChange={(e) => setPayForm({ ...payForm, registerId: Number(e.target.value) })}
                  className="w-full h-9.5 px-3 rounded-xl bg-muted/40 border border-border/80 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  {registers.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} {reg.is_active ? "(نشطة)" : "(غير نشطة)"} - رصيد: {reg.balance} {activeCurrency}
                    </option>
                  ))}
                </select>
              </div>

              {/* المبلغ وطريقة السداد */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">مبلغ الدفع ({activeCurrency}):</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    className="h-9.5 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">طريقة الدفع:</label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full h-9.5 px-3 rounded-md bg-muted/40 border border-border/80 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="cash">نقدي (كاش)</option>
                    <option value="card">بطاقة بنكية / فيزا</option>
                    <option value="transfer">تحويل محفظة / بنك</option>
                  </select>
                </div>
              </div>

              {/* ملاحظات */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">ملاحظات السداد:</label>
                <Input
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="ملاحظات اختيارية..."
                  className="h-9 text-xs"
                />
              </div>

              {/* إغلاق الطلب تلقائياً */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="completeOrderCheck"
                  checked={payForm.completeOrder}
                  onChange={(e) => setPayForm({ ...payForm, completeOrder: e.target.checked })}
                  className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="completeOrderCheck" className="text-xs cursor-pointer select-none">
                  إغلاق الطلب وتفريغ الطاولة تلقائياً فور السداد الكامل
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleConfirmQuickPay}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs gap-1.5"
            >
              <CheckCircle2Icon className="size-3.5" />
              <span>{isSaving ? "جاري التسجيل..." : "تأكيد واستلام المبلغ"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPayModalOpen(false)}
              className="rounded-md text-xs"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تغيير الحالة وتعيين الطيار يدوياً */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 text-right shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <RefreshCwIcon className="size-5 text-primary" />
              <span>تعديل حالة ومسار الطلب ({selectedOrder?.order_number})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تحديث الحالة التشغيلية للطلب وتعيين سائق التوصيل إذا تطلب الأمر.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-md border flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground">نوع الطلب: </span>
                  <span className="font-bold text-foreground">
                    {selectedOrder.order_type === "dinein"
                      ? `صالة (${selectedOrder.table?.name || "طاولة"})`
                      : selectedOrder.order_type === "takeaway"
                      ? "سفري (تيك أواي)"
                      : "توصيل (ديليفري)"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">الحالة الحالية: </span>
                  <span className="font-bold text-primary">
                    {getOrderStatusInfo(selectedOrder.status).label}
                  </span>
                </div>
              </div>

              {/* اختيار الحالة الجديدة */}
              <div className="space-y-1">
                <label className="font-bold text-foreground">اختر الحالة التشغيلية الجديدة:</label>
                <select
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, status: e.target.value as OrderStatus })
                  }
                  className="w-full h-9.5 px-3 rounded-md bg-muted/40 border border-border/80 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
                >
                  <option value="pending">جديد (بانتظار البدء)</option>
                  <option value="preparing">جاري التحضير بالمطبخ</option>
                  {selectedOrder.order_type === "dinein" && (
                    <option value="served">تم التقديم على السفرة</option>
                  )}
                  {selectedOrder.order_type !== "dinein" && (
                    <option value="ready">جاهز للاستلام / للتسليم</option>
                  )}
                  {selectedOrder.order_type === "delivery" && (
                    <option value="out_for_delivery">خرج للتوصيل مع الطيار</option>
                  )}
                  <option value="completed">مكتمل ومغلق ✓</option>
                  <option value="cancelled">ملغي ✕</option>
                </select>
              </div>

              {/* إذا كان ديليفري: اختيار سائق التوصيل */}
              {selectedOrder.order_type === "delivery" && (
                <div className="space-y-1">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <BikeIcon className="size-4 text-blue-600" />
                    <span>سائق التوصيل (الطيار):</span>
                  </label>
                  <select
                    value={statusForm.driverId}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, driverId: Number(e.target.value) })
                    }
                    className="w-full h-9.5 px-3 rounded-md bg-muted/40 border border-border/80 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value={0}>-- لم يتم تعيين سائق بعد --</option>
                    {drivers.map((drv) => (
                      <option key={drv.id} value={drv.id}>
                        {drv.name} ({drv.phone}) - {drv.status === "available" ? "متاح" : "في مهمة"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ملاحظات التحديث */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">ملاحظات إضافية لتغيير الحالة:</label>
                <Input
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="ملاحظات اختيارية عن التغيير..."
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleConfirmStatusChange}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md text-xs gap-1.5"
            >
              <CheckCircle2Icon className="size-3.5" />
              <span>{isSaving ? "جاري الحفظ..." : "حفظ وتحديث الحالة"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStatusModalOpen(false)}
              className="rounded-md text-xs"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
