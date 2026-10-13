"use client"

import * as React from "react"
import Link from "next/link"
import { PageContainer } from "@/components/page-container"
import { useOrderStore } from "@/store/order.store"
import { type Order, type OrderStatus } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSidebar } from "@/components/ui/sidebar"
import {
  ChefHatIcon,
  ClockIcon,
  CheckCircle2Icon,
  FlameIcon,
  ShoppingBagIcon,
  BikeIcon,
  RefreshCwIcon,
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  Volume2Icon,
  VolumeXIcon,
  ArmchairIcon,
  AlertTriangleIcon,
  CheckSquareIcon,
  SquareIcon,
  SearchIcon,
  TruckIcon,
  LayoutGridIcon,
  ListIcon,
  UtensilsCrossedIcon,
  PanelLeftIcon,
  CheckIcon,
} from "lucide-react"

// حساب الدقائق المنقضية منذ إنشاء الطلب
function getElapsedMinutes(createdAt?: string, nowTime?: number): number {
  if (!createdAt) return 0
  const created = new Date(createdAt).getTime()
  const now = nowTime || Date.now()
  return Math.max(0, Math.floor((now - created) / 60000))
}

// دالة تشغيل نغمة تنبيه صوتية باستخدام Web Audio API عند استقبال تذكرة جديدة
function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // نغمة مزدوجة لطيفة (Ding-Dong)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = "sine"
    osc1.frequency.setValueAtTime(587.33, now) // D5
    osc1.frequency.setValueAtTime(880, now + 0.15) // A5

    osc2.type = "sine"
    osc2.frequency.setValueAtTime(880, now)
    osc2.frequency.setValueAtTime(1174.66, now + 0.15) // D6

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.8)
    osc2.stop(now + 0.8)
  } catch (err) {
    console.warn("Kitchen chime audio playback prevented by browser:", err)
  }
}

export default function KitchenPage() {
  const { orders, isLoading, fetchOrders, updateOrderStatus } = useOrderStore()
  const [filterTab, setFilterTab] = React.useState<"all" | "pending" | "preparing" | "ready">("all")
  const [orderTypeFilter, setOrderTypeFilter] = React.useState<"all" | "dinein" | "takeaway" | "delivery">("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [viewMode, setViewMode] = React.useState<"grid" | "compact">("grid")
  const [updatingId, setUpdatingId] = React.useState<number | null>(null)
  const [now, setNow] = React.useState(Date.now())
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [completedItems, setCompletedItems] = React.useState<Set<string>>(new Set())

  const { setOpen, open, toggleSidebar } = useSidebar()

  // طي القائمة الجانبية لمرة واحدة فقط عند الدخول لشاشة المطبخ في الشاشات المتوسطة لتوفير مساحة لتذاكر الأوردرات
  const hasAutoCollapsedRef = React.useRef(false)
  React.useEffect(() => {
    if (!hasAutoCollapsedRef.current) {
      hasAutoCollapsedRef.current = true
      if (typeof window !== "undefined" && window.innerWidth < 1200) {
        setOpen(false)
      }
    }
  }, [setOpen])

  // تتبع الطلبات المعروفة لإطلاق الصوت فقط عند دخول طلب جديد
  const knownOrderIdsRef = React.useRef<Set<number>>(new Set())
  const isFirstLoadRef = React.useRef(true)

  // استرجاع تفضيل الصوت من التخزين المحلي
  React.useEffect(() => {
    try {
      const savedSound = localStorage.getItem("restro_kitchen_sound")
      if (savedSound !== null) {
        setSoundEnabled(savedSound === "true")
      }
    } catch {}
  }, [])

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem("restro_kitchen_sound", String(next))
      } catch {}
      if (next) {
        playKitchenChime()
      }
      return next
    })
  }

  // وضع ملء الشاشة لشاشات العرض داخل المطبخ
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  React.useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  // تحديث التوقيت الدوري والـ Auto-polling التلقائي كل 7 ثوانٍ
  React.useEffect(() => {
    fetchOrders()

    const clockInterval = setInterval(() => {
      setNow(Date.now())
    }, 15000)

    const pollInterval = setInterval(() => {
      fetchOrders()
    }, 7000)

    return () => {
      clearInterval(clockInterval)
      clearInterval(pollInterval)
    }
  }, [fetchOrders])

  // كشف الطلبات الجديدة وإطلاق التنبيه الصوتي
  React.useEffect(() => {
    if (orders.length === 0) return

    const pendingOrders = orders.filter((o) => o.status === "pending")
    let hasNewPending = false

    pendingOrders.forEach((o) => {
      if (!knownOrderIdsRef.current.has(o.id)) {
        hasNewPending = true
      }
    })

    const currentIds = new Set(orders.map((o) => o.id))
    knownOrderIdsRef.current = currentIds

    if (!isFirstLoadRef.current && hasNewPending && soundEnabled) {
      playKitchenChime()
    }
    isFirstLoadRef.current = false
  }, [orders, soundEnabled])

  // فلترة الطلبات المعنية بالمطبخ فقط (جديد، قيد التحضير، جاهز)
  const kitchenOrders = React.useMemo(() => {
    return orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status))
  }, [orders])

  const pendingCount = React.useMemo(() => kitchenOrders.filter((o) => o.status === "pending").length, [kitchenOrders])
  const preparingCount = React.useMemo(() => kitchenOrders.filter((o) => o.status === "preparing").length, [kitchenOrders])
  const readyCount = React.useMemo(() => kitchenOrders.filter((o) => o.status === "ready").length, [kitchenOrders])

  // فلترة الطلبات المعروضة بناءً على التبويب، نوع الطلب، والبحث السريع
  const displayedOrders = React.useMemo(() => {
    return kitchenOrders.filter((order) => {
      // فلتر التبويب
      if (filterTab !== "all" && order.status !== filterTab) {
        return false
      }
      // فلتر نوع الطلب
      if (orderTypeFilter !== "all" && order.order_type !== orderTypeFilter) {
        return false
      }
      // فلتر البحث
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const orderNum = (order.order_number || "").toLowerCase()
        const customer = (order.customer_name || "").toLowerCase()
        const table = (order.table?.name || "").toLowerCase()
        const hasItem = order.items.some((it) => it.product_name.toLowerCase().includes(q))
        if (!orderNum.includes(q) && !customer.includes(q) && !table.includes(q) && !hasItem) {
          return false
        }
      }
      return true
    })
  }, [kitchenOrders, filterTab, orderTypeFilter, searchQuery])

  // تشطيب صنف فردي داخل التذكرة (Interactive Item Checklist)
  const toggleItemDone = (orderId: number, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`
    setCompletedItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // إجراءات المطبخ السريعة
  const handleNextStatus = async (order: Order) => {
    setUpdatingId(order.id)
    try {
      let nextStatus: OrderStatus = "preparing"

      if (order.status === "pending") {
        nextStatus = "preparing"
      } else if (order.status === "preparing") {
        nextStatus = "ready"
      } else if (order.status === "ready") {
        if (order.order_type === "dinein") {
          nextStatus = "served"
        } else if (order.order_type === "delivery") {
          if (!order.delivery_driver_id) {
            alert("يرجى تعيين سائق توصيل لهذا الطلب من شاشة الطلبات قبل تسليمه للخروج.")
            return
          }
          nextStatus = "out_for_delivery"
        } else {
          nextStatus = "completed"
        }
      }

      const res = await updateOrderStatus(order.id, { status: nextStatus })
      if (!res.success) {
        alert(res.message || "تعذر تحديث حالة الطلب.")
      }
      fetchOrders()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <PageContainer
      title="شاشة المطبخ (KDS)"
      description="متابعة تذاكر تحضير الطلبات اللحظية، بنود الوجبات، وزمن الطهي"
      className="p-1 sm:p-2.5 max-w-full gap-2 sm:gap-2.5"
      action={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* شارة عدد الطلبات النشطة الحالية (مثل شارة الخزنة في الكاشير) */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <ChefHatIcon className="size-3.5" />
            <span>{kitchenOrders.length} طلبات نشطة</span>
          </div>

          {/* تبديل طريقة العرض شبكة / مدمج (نفس الكاشير) */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-md border border-border/50">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض الشبكة"
            >
              <LayoutGridIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === "compact"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض القائمة"
            >
              <ListIcon className="size-3.5" />
            </button>
          </div>

          {/* زر تبديل القائمة الجانبية لتوفير أقصى مساحة */}
          <Button
            variant="outline"
            size="xs"
            onClick={toggleSidebar}
            className="h-8 px-2 rounded-md border-border/60 text-xs"
            title={open ? "طي القائمة الجانبية" : "عرض القائمة"}
          >
            <PanelLeftIcon className="size-3.5" />
            <span className="hidden md:inline">{open ? "طي" : "قائمة"}</span>
          </Button>

          {/* زر التحكم بالصوت */}
          <Button
            variant="outline"
            size="xs"
            onClick={toggleSound}
            className="size-8 p-0 rounded-md border-border/60"
            title={soundEnabled ? "الصوت مفعل - انقر للكتم" : "الصوت مكتوم - انقر للتفعيل"}
          >
            {soundEnabled ? <Volume2Icon className="size-3.5 text-emerald-600" /> : <VolumeXIcon className="size-3.5 text-muted-foreground" />}
          </Button>

          {/* زر شاشة كاملة */}
          <Button
            variant="outline"
            size="xs"
            onClick={toggleFullscreen}
            className="size-8 p-0 rounded-md border-border/60"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2Icon className="size-3.5" /> : <Maximize2Icon className="size-3.5" />}
          </Button>

          {/* زر التحديث اليدوي */}
          <Button
            variant="outline"
            size="xs"
            onClick={() => fetchOrders()}
            disabled={isLoading}
            className="size-8 p-0 rounded-md border-border/60"
            title="تحديث البيانات"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </Button>
        </div>
      }
    >
      {/* =========================================================================
          شريط تبويبات حالة الطلبات - بنفس تصميم أزرار تبويبات الكاشير بالضبط
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/50 shadow-xs">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filterTab === "all"
              ? "bg-card text-primary shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <ChefHatIcon className="size-3.5" />
          <span>كل الطلبات</span>
          <span className="px-1.5 py-0.2 rounded-full bg-muted text-[10px] font-mono">
            {kitchenOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("pending")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filterTab === "pending"
              ? "bg-card text-sky-600 dark:text-sky-400 shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <ClockIcon className="size-3.5 text-sky-500" />
          <span>جديد</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-mono font-bold animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("preparing")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filterTab === "preparing"
              ? "bg-card text-amber-600 dark:text-amber-400 shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <FlameIcon className="size-3.5 text-amber-500" />
          <span>قيد التحضير</span>
          {preparingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold">
              {preparingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("ready")}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filterTab === "ready"
              ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <CheckCircle2Icon className="size-3.5 text-emerald-500" />
          <span>جاهز للتسليم</span>
          {readyCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
              {readyCount}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          بطاقة التحكم السريع والبحث - بنفس شكل كارت تحكم الكاشير
          ========================================================================= */}
      <div className="p-2 sm:p-2.5 rounded-xl bg-card border border-border/60 shadow-xs space-y-2">
        {/* الصف 1: نوع الطلب (الكل / طاولة / سفري / توصيل) */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setOrderTypeFilter("all")}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                orderTypeFilter === "all"
                  ? "bg-card shadow-xs text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>الكل</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderTypeFilter("dinein")}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                orderTypeFilter === "dinein"
                  ? "bg-card shadow-xs text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArmchairIcon className="size-3.5" />
              <span>طاولة</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderTypeFilter("takeaway")}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                orderTypeFilter === "takeaway"
                  ? "bg-card shadow-xs text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShoppingBagIcon className="size-3.5" />
              <span>سفري</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderTypeFilter("delivery")}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                orderTypeFilter === "delivery"
                  ? "bg-card shadow-xs text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TruckIcon className="size-3.5" />
              <span>توصيل</span>
            </button>
          </div>

          {/* دليل ألوان التوقيت (مدمج ومرتب) */}
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground font-medium shrink-0 px-1">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>&lt; ١٥ د</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-500" />
              <span>١٥ - ٢٥ د</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              <span>&gt; ٢٥ د</span>
            </span>
          </div>
        </div>

        {/* الصف 2: حقل البحث السريع */}
        <div className="relative pt-1 border-t border-border/40">
          <SearchIcon className="absolute start-2.5 top-[calc(50%+2px)] -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الطلب، اسم العميل، رقم الطاولة، أو اسم الصنف..."
            className="ps-8.5 h-8.5 bg-muted/30 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* =========================================================================
          شبكة تذاكر المطبخ المتجاوبة تلقائياً (نفس نظام شبكة كروت الكاشير)
          ========================================================================= */}
      {displayedOrders.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-2.5 sm:gap-3"
              : "grid grid-cols-1 md:grid-cols-2 gap-2"
          }
        >
          {displayedOrders.map((order) => {
            const elapsed = getElapsedMinutes(order.created_at, now)
            const isUrgent = elapsed >= 25
            const isWarning = elapsed >= 15 && elapsed < 25

            const timeBadgeColor = isUrgent
              ? "bg-rose-500 text-white font-extrabold animate-pulse shadow-xs"
              : isWarning
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold"
              : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold"

            const orderTypeBadge =
              order.order_type === "dinein" ? (
                <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-bold">
                  <ArmchairIcon className="size-3" />
                  <span>{order.table?.name || "صالة"}</span>
                </Badge>
              ) : order.order_type === "delivery" ? (
                <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                  <BikeIcon className="size-3" />
                  <span>توصيل</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs font-bold">
                  <ShoppingBagIcon className="size-3" />
                  <span>سفري</span>
                </Badge>
              )

            const paymentBadge =
              order.payment_status === "paid" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <CheckCircle2Icon className="size-3" />
                  <span>مدفوع بالكامل</span>
                </span>
              ) : order.payment_status === "partially_paid" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/20">
                  <AlertTriangleIcon className="size-3" />
                  <span>مدفوع جزئياً</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/20">
                  <AlertTriangleIcon className="size-3" />
                  <span>غير مدفوع</span>
                </span>
              )

            return (
              <Card
                key={order.id}
                className={`group flex flex-col justify-between rounded-xl overflow-hidden transition-all border bg-card text-right shadow-xs ${
                  isUrgent
                    ? "border-rose-500/70 ring-1 ring-rose-500/20"
                    : order.status === "ready"
                    ? "border-emerald-500/50"
                    : order.status === "preparing"
                    ? "border-amber-500/50"
                    : "border-border/60 hover:border-primary/50"
                }`}
              >
                {/* رأس التذكرة */}
                <div className="p-3 border-b border-border/40 bg-muted/20">
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-base text-foreground tracking-tight">
                          #{order.order_number.replace(/^ORD-/, "")}
                        </span>
                        {orderTypeBadge}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        العميل: <span className="font-semibold text-foreground">{order.customer_name || "زبون عادي"}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${timeBadgeColor}`}>
                        <ClockIcon className="size-2.5" />
                        <span>{elapsed} دقيقة</span>
                      </span>

                      <Badge
                        className={`text-[9px] px-1.5 py-0.2 border-0 font-bold ${
                          order.status === "pending"
                            ? "bg-sky-500/20 text-sky-700 dark:text-sky-400"
                            : order.status === "preparing"
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                            : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {order.status === "pending" && "طلب جديد"}
                        {order.status === "preparing" && "جاري التحضير"}
                        {order.status === "ready" && "جاهز للتسليم"}
                      </Badge>
                    </div>
                  </div>

                  {/* شريط حالة السداد ورسالة الملاحظات السريعة */}
                  <div className="mt-2 pt-1.5 border-t border-border/30 flex items-center justify-between">
                    {paymentBadge}
                    {order.delivery_driver_id && order.order_type === "delivery" && (
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <BikeIcon className="size-3 text-primary" />
                        <span>{order.deliveryDriver?.name || "مندوب"}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* بنود الوجبات والأطباق مع إمكانية التشطيب الفردي */}
                <div className="p-3 flex-1 space-y-2">
                  <div className="space-y-1.5">
                    {order.items.map((it, idx) => {
                      const itemKey = `${order.id}-${idx}`
                      const isItemDone = completedItems.has(itemKey)

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItemDone(order.id, idx)}
                          className={`flex items-start justify-between gap-1.5 border-b border-border/30 pb-1.5 last:border-0 last:pb-0 cursor-pointer select-none rounded-lg p-1 transition-colors ${
                            isItemDone ? "bg-muted/40 opacity-60" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary font-black text-[11px] shrink-0 font-mono">
                                {it.quantity}×
                              </span>
                              <span
                                className={`font-bold text-xs text-foreground leading-tight truncate ${
                                  isItemDone ? "line-through text-muted-foreground" : ""
                                }`}
                              >
                                {it.product_name}
                              </span>
                            </div>

                            {it.size_name && (
                              <div className="text-[10px] text-muted-foreground me-6">
                                الحجم: <span className="font-semibold text-foreground">{it.size_name}</span>
                              </div>
                            )}

                            {it.selected_extras && it.selected_extras.length > 0 && (
                              <div className="text-[10px] text-primary font-medium me-6 truncate">
                                + {it.selected_extras.map((e) => e.name).join("، ")}
                              </div>
                            )}

                            {it.notes && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold me-6 bg-amber-500/10 px-1 py-0.5 rounded">
                                ملاحظة: {it.notes}
                              </div>
                            )}
                          </div>

                          <div className="pt-0.5 text-muted-foreground shrink-0">
                            {isItemDone ? (
                              <CheckSquareIcon className="size-4 text-emerald-600" />
                            ) : (
                              <SquareIcon className="size-4 text-muted-foreground/60" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {order.notes && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      ⚠️ {order.notes}
                    </div>
                  )}
                </div>

                {/* زر الإجراء السريع للمطبخ - عريض وواضح وعالي التباين */}
                <div className="p-2.5 border-t border-border/40 bg-muted/20">
                  <Button
                    onClick={() => handleNextStatus(order)}
                    disabled={updatingId === order.id}
                    className={`w-full h-9 rounded-lg font-bold text-xs shadow-xs gap-1.5 cursor-pointer ${
                      order.status === "pending"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : order.status === "preparing"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    }`}
                  >
                    {updatingId === order.id ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : order.status === "pending" ? (
                      <>
                        <FlameIcon className="size-3.5" />
                        <span>بدء التحضير في المطبخ</span>
                      </>
                    ) : order.status === "preparing" ? (
                      <>
                        <CheckCircle2Icon className="size-3.5" />
                        <span>جاهز للاستلام / التقديم ✓</span>
                      </>
                    ) : order.order_type === "dinein" ? (
                      <>
                        <ArmchairIcon className="size-3.5" />
                        <span>تم التقديم على الطاولة ✓</span>
                      </>
                    ) : order.order_type === "delivery" ? (
                      <>
                        <BikeIcon className="size-3.5" />
                        <span>تسليم للمندوب والتوصيل 🛵</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2Icon className="size-3.5" />
                        <span>تم تسليم الطلب للعميل ✓</span>
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* الحالة الفارغة - بنفس أسلوب كروت الكاشير */
        <div className="py-14 sm:py-16 text-center rounded-xl bg-card border border-border/60 p-6 flex flex-col items-center justify-center shadow-xs">
          <div className="p-3.5 rounded-full bg-primary/10 text-primary mb-3">
            <ChefHatIcon className="size-8" />
          </div>
          <h3 className="font-bold text-sm text-foreground">لا توجد طلبات معلقة في المطبخ حالياً</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {filterTab !== "all" || orderTypeFilter !== "all" || searchQuery
              ? "لا توجد نتائج مطابقة لخيارات الفلترة المحددة. جرب تغيير خيارات البحث."
              : "المطبخ هادئ وجميع الطلبات تم تحضيرها بنجاح. ستظهر الطلبات الجديدة هنا فور إنشائها في الكاشير."}
          </p>
          {filterTab !== "all" || orderTypeFilter !== "all" || searchQuery ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFilterTab("all")
                setOrderTypeFilter("all")
                setSearchQuery("")
              }}
              className="mt-3 text-xs h-8 rounded-lg cursor-pointer"
            >
              إعادة ضبط الفلاتر
            </Button>
          ) : (
            <Link href="/dashboard/pos" className="mt-3">
              <Button size="sm" className="text-xs h-8 rounded-lg font-bold gap-1.5 cursor-pointer">
                <UtensilsCrossedIcon className="size-3.5" />
                <span>الانتقال لنقطة البيع (الكاشير)</span>
              </Button>
            </Link>
          )}
        </div>
      )}
    </PageContainer>
  )
}
