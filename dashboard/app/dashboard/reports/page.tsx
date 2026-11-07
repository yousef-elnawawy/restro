"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useRegisterStore } from "@/store/register.store"
import { useSettingStore } from "@/store/setting.store"
import {
  getReportsApi,
  getMenuEngineeringApi,
  getPeakHoursApi,
  type ReportsData,
  type MenuEngineeringData,
  type MenuEngineeringItem,
  type PeakHoursData,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { ComboboxSelect } from "@/components/ui/combobox-select"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart3Icon,
  PrinterIcon,
  CalendarIcon,
  RefreshCwIcon,
  DollarSignIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  BanknoteIcon,
  LandmarkIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  TruckIcon,
  ArmchairIcon,
  FileTextIcon,
  Loader2Icon,
  ArrowRightIcon,
  ReceiptIcon,
  SparklesIcon,
  ClockIcon,
  TargetIcon,
  AlertTriangleIcon,
  SearchIcon,
  FlameIcon,
  LightbulbIcon,
  ChefHatIcon,
  ActivityIcon,
  PercentIcon,
  AwardIcon,
  ShieldCheckIcon,
  EyeIcon,
  UserIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { useShiftStore } from "@/store/shift.store"
import { ZReportDialog } from "@/components/z-report-dialog"

export default function ReportsPage() {
  const { registers, fetchRegisters } = useRegisterStore()
  const { settings, fetchSettings } = useSettingStore()

  // التبويب النشط
  const [activeTab, setActiveTab] = React.useState<"financial" | "shifts" | "menu_matrix" | "peak_hours">("financial")

  // --- 1. حالة التقرير المالي ---
  const [dateFrom, setDateFrom] = React.useState<string>(new Date().toISOString().split("T")[0])
  const [dateTo, setDateTo] = React.useState<string>(new Date().toISOString().split("T")[0])
  const [selectedRegisterId, setSelectedRegisterId] = React.useState<number | "all">("all")
  const [reportsData, setReportsData] = React.useState<ReportsData | null>(null)
  const [isLoadingFinancial, setIsLoadingFinancial] = React.useState(true)

  // --- 2. حالة مصفوفة هندسة المنيو (BCG Matrix) ---
  const [menuDateFrom, setMenuDateFrom] = React.useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [menuDateTo, setMenuDateTo] = React.useState<string>(() => new Date().toISOString().split("T")[0])
  const [menuData, setMenuData] = React.useState<MenuEngineeringData | null>(null)
  const [isLoadingMenu, setIsLoadingMenu] = React.useState(false)
  const [menuSearch, setMenuSearch] = React.useState("")
  const [selectedQuadrant, setSelectedQuadrant] = React.useState<"all" | "star" | "plowhorse" | "puzzle" | "dog">("all")

  // --- 3. حالة ساعات الذروة والخريطة الحرارية ---
  const [peakDays, setPeakDays] = React.useState<number>(30)
  const [peakData, setPeakData] = React.useState<PeakHoursData | null>(null)
  const [isLoadingPeak, setIsLoadingPeak] = React.useState(false)

  // --- 4. حالة سجل الورديات وإغلاقات Z-Reports ---
  const {
    shifts,
    fetchShifts,
    isLoading: isLoadingShifts,
    loadZReport,
    activeZReport,
    activeZReportShift,
  } = useShiftStore()
  const [shiftDateFrom, setShiftDateFrom] = React.useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split("T")[0]
  })
  const [shiftDateTo, setShiftDateTo] = React.useState<string>(() => new Date().toISOString().split("T")[0])
  const [shiftRegisterId, setShiftRegisterId] = React.useState<number | "all">("all")
  const [shiftStatusFilter, setShiftStatusFilter] = React.useState<string>("all")
  const [zReportModalOpen, setZReportModalOpen] = React.useState(false)

  // دالة جلب التقرير المالي
  const loadFinancialReports = React.useCallback(async () => {
    setIsLoadingFinancial(true)
    try {
      const res = await getReportsApi({
        date_from: dateFrom,
        date_to: dateTo,
        cash_register_id: selectedRegisterId,
      })
      if (res.success && res.data) {
        setReportsData(res.data)
      }
    } finally {
      setIsLoadingFinancial(false)
    }
  }, [dateFrom, dateTo, selectedRegisterId])

  // دالة جلب هندسة المنيو
  const loadMenuEngineering = React.useCallback(async () => {
    setIsLoadingMenu(true)
    try {
      const res = await getMenuEngineeringApi({
        date_from: menuDateFrom,
        date_to: menuDateTo,
      })
      if (res.success && res.data) {
        setMenuData(res.data)
      }
    } finally {
      setIsLoadingMenu(false)
    }
  }, [menuDateFrom, menuDateTo])

  // دالة جلب ساعات الذروة
  const loadPeakHours = React.useCallback(async (days = peakDays) => {
    setIsLoadingPeak(true)
    try {
      const res = await getPeakHoursApi(days)
      if (res.success && res.data) {
        setPeakData(res.data)
      }
    } finally {
      setIsLoadingPeak(false)
    }
  }, [peakDays])

  // دالة جلب سجل الورديات
  const loadShiftsData = React.useCallback(async () => {
    await fetchShifts({
      cash_register_id: shiftRegisterId === "all" ? undefined : shiftRegisterId,
      status: shiftStatusFilter === "all" ? undefined : shiftStatusFilter,
      date_from: shiftDateFrom,
      date_to: shiftDateTo,
    })
  }, [fetchShifts, shiftRegisterId, shiftStatusFilter, shiftDateFrom, shiftDateTo])

  // التحميل الأولي
  React.useEffect(() => {
    fetchRegisters()
    fetchSettings()
    loadFinancialReports()
  }, [fetchRegisters, fetchSettings, loadFinancialReports])

  // التحميل عند الانتقال للتبويبات
  React.useEffect(() => {
    if (activeTab === "shifts") {
      loadShiftsData()
    }
    if (activeTab === "menu_matrix" && !menuData && !isLoadingMenu) {
      loadMenuEngineering()
    }
    if (activeTab === "peak_hours" && !peakData && !isLoadingPeak) {
      loadPeakHours(peakDays)
    }
  }, [activeTab, menuData, peakData, isLoadingMenu, isLoadingPeak, loadMenuEngineering, loadPeakHours, loadShiftsData, peakDays])

  // فلاتر المواعيد السريعة للورديات
  const setQuickShiftDate = (type: "today" | "yesterday" | "week" | "month") => {
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split("T")[0]

    if (type === "today") {
      const d = formatDate(today)
      setShiftDateFrom(d)
      setShiftDateTo(d)
    } else if (type === "yesterday") {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      const d = formatDate(y)
      setShiftDateFrom(d)
      setShiftDateTo(d)
    } else if (type === "week") {
      const w = new Date(today)
      w.setDate(w.getDate() - 7)
      setShiftDateFrom(formatDate(w))
      setShiftDateTo(formatDate(today))
    } else if (type === "month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1)
      setShiftDateFrom(formatDate(m))
      setShiftDateTo(formatDate(today))
    }
  }

  const currency = reportsData?.summary?.currency || menuData?.summary?.currency || peakData?.currency || settings?.currency || "ج.م"
  const summary = reportsData?.summary

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // مؤشرات الأداء الحسابية والتحليلات
  const totalSales = Number(summary?.total_sales || 0)
  const ordersCount = Number(summary?.orders_count || 0)
  const cancelledCount = Number(summary?.cancelled_orders_count || 0)
  const totalOrdersAttempted = ordersCount + cancelledCount
  const completionRate = totalOrdersAttempted > 0 ? Math.round((ordersCount / totalOrdersAttempted) * 100) : 100
  const aov = ordersCount > 0 ? Math.round(totalSales / ordersCount) : 0
  const totalSubtotal = Number(summary?.total_subtotal || 0)
  const totalTax = Number(summary?.total_tax || 0)
  const totalDeliveryFees = Number(summary?.total_delivery_fees || 0)

  // 1. بيانات منحنى تطور المبيعات
  const salesTrendData = React.useMemo(() => {
    if (!reportsData?.orders || reportsData.orders.length === 0) {
      if (reportsData?.summary?.total_sales) {
        return [
          {
            date: dateFrom,
            displayDate: new Date(dateFrom).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
            sales: Number(reportsData.summary.total_sales || 0),
            orders: Number(reportsData.summary.orders_count || 0),
          },
        ]
      }
      return []
    }

    const map = new Map<string, { date: string; displayDate: string; sales: number; orders: number }>()
    const sorted = [...reportsData.orders].sort(
      (a, b) => new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
    )

    for (const o of sorted) {
      if (!o.created_at) continue
      const d = o.created_at.split("T")[0]
      const existing = map.get(d)
      const display = new Date(d).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })
      if (existing) {
        existing.sales += Number(o.total || 0)
        existing.orders += 1
      } else {
        map.set(d, {
          date: d,
          displayDate: display,
          sales: Number(o.total || 0),
          orders: 1,
        })
      }
    }

    return Array.from(map.values())
  }, [reportsData?.orders, reportsData?.summary, dateFrom])

  // 2. بيانات توزيع مبيعات أنواع الطلبات (صالة / سفري / دليفري)
  const orderTypesData = React.useMemo(() => {
    const dinein = reportsData?.by_order_type?.dinein || { count: 0, total: 0 }
    const takeaway = reportsData?.by_order_type?.takeaway || { count: 0, total: 0 }
    const delivery = reportsData?.by_order_type?.delivery || { count: 0, total: 0 }
    const total = (dinein.total || 0) + (takeaway.total || 0) + (delivery.total || 0)

    return [
      {
        name: "تناول محلي (صالة)",
        shortName: "صالة",
        value: Number(dinein.total || 0),
        total: Number(dinein.total || 0),
        count: Number(dinein.count || 0),
        color: "#3b82f6",
        percent: total > 0 ? Math.round((dinein.total / total) * 100) : 0,
      },
      {
        name: "سفري واستلام",
        shortName: "سفري",
        value: Number(takeaway.total || 0),
        total: Number(takeaway.total || 0),
        count: Number(takeaway.count || 0),
        color: "#10b981",
        percent: total > 0 ? Math.round((takeaway.total / total) * 100) : 0,
      },
      {
        name: "توصيل دليفري",
        shortName: "دليفري",
        value: Number(delivery.total || 0),
        total: Number(delivery.total || 0),
        count: Number(delivery.count || 0),
        color: "#f59e0b",
        percent: total > 0 ? Math.round((delivery.total / total) * 100) : 0,
      },
    ].filter((item) => item.value > 0 || item.count > 0)
  }, [reportsData?.by_order_type])

  // فلاتر المواعيد السريعة للتقرير المالي
  const setQuickDate = (type: "today" | "yesterday" | "week" | "month") => {
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split("T")[0]

    if (type === "today") {
      const d = formatDate(today)
      setDateFrom(d)
      setDateTo(d)
    } else if (type === "yesterday") {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      const d = formatDate(y)
      setDateFrom(d)
      setDateTo(d)
    } else if (type === "week") {
      const w = new Date(today)
      w.setDate(w.getDate() - 7)
      setDateFrom(formatDate(w))
      setDateTo(formatDate(today))
    } else if (type === "month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1)
      setDateFrom(formatDate(m))
      setDateTo(formatDate(today))
    }
  }

  // فلاتر المواعيد السريعة لهندسة المنيو
  const setQuickMenuDate = (days: number) => {
    const today = new Date()
    const past = new Date()
    past.setDate(past.getDate() - days)
    const formatDate = (d: Date) => d.toISOString().split("T")[0]
    setMenuDateFrom(formatDate(past))
    setMenuDateTo(formatDate(today))
  }

  // طباعة التقرير
  const handlePrint = () => {
    window.print()
  }

  // تجميع أصناف هندسة المنيو للفلترة
  const allMenuItems: MenuEngineeringItem[] = React.useMemo(() => {
    if (!menuData?.matrix) return []
    return [
      ...menuData.matrix.stars,
      ...menuData.matrix.plowhorses,
      ...menuData.matrix.puzzles,
      ...menuData.matrix.dogs,
    ]
  }, [menuData])

  const filteredMenuItems = React.useMemo(() => {
    let items = allMenuItems
    if (selectedQuadrant !== "all") {
      items = items.filter((item) => item.category === selectedQuadrant)
    }
    if (menuSearch.trim()) {
      const q = menuSearch.trim().toLowerCase()
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category_name.toLowerCase().includes(q)
      )
    }
    return items
  }, [allMenuItems, selectedQuadrant, menuSearch])

  // ترتيب أيام الأسبوع لشبكة الخريطة الحرارية (يبدأ بالسبت)
  const orderedDays = React.useMemo(() => {
    return [
      { id: 6, name: "السبت" },
      { id: 0, name: "الأحد" },
      { id: 1, name: "الإثنين" },
      { id: 2, name: "الثلاثاء" },
      { id: 3, name: "الأربعاء" },
      { id: 4, name: "الخميس" },
      { id: 5, name: "الجمعة" },
    ]
  }, [])

  // أعلى قيمة طلبات في خلايا الخريطة الحرارية لتحديد شدة اللون
  const maxHeatmapOrders = React.useMemo(() => {
    if (!peakData?.heatmap_grid || peakData.heatmap_grid.length === 0) return 1
    const maxVal = Math.max(...peakData.heatmap_grid.map((c) => c.orders_count))
    return maxVal > 0 ? maxVal : 1
  }, [peakData])

  // أعلى قيمة طلبات في المنحنى الساعي
  const maxHourlyOrders = React.useMemo(() => {
    if (!peakData?.hourly_aggregate || peakData.hourly_aggregate.length === 0) return 1
    const maxVal = Math.max(...peakData.hourly_aggregate.map((h) => h.count))
    return maxVal > 0 ? maxVal : 1
  }, [peakData])

  // دالة تحديد لون خلية الخريطة الحرارية
  const getHeatmapColorClass = (count: number) => {
    if (count === 0) {
      return "bg-muted/30 border-border/20 text-muted-foreground/50 hover:border-border/60"
    }
    const ratio = count / maxHeatmapOrders
    if (ratio < 0.25) {
      return "bg-primary/20 border-primary/30 text-foreground font-medium hover:brightness-110"
    } else if (ratio < 0.5) {
      return "bg-primary/45 border-primary/50 text-foreground font-bold hover:brightness-110"
    } else if (ratio < 0.75) {
      return "bg-primary/75 border-primary/80 text-primary-foreground font-bold hover:brightness-110 shadow-xs"
    } else {
      return "bg-primary border-primary text-primary-foreground font-black hover:brightness-110 shadow-sm"
    }
  }

  // إحصائيات الورديات المحسوبة
  const shiftMetrics = React.useMemo(() => {
    const totalCount = shifts.length
    const openCount = shifts.filter((s) => s.status === "open").length
    const closedCount = shifts.filter((s) => s.status === "closed").length
    const totalSales = shifts.reduce((acc, s) => acc + Number(s.total_sales || 0), 0)
    const totalCashSales = shifts.reduce((acc, s) => acc + Number(s.cash_sales || 0), 0)
    const totalCardSales = shifts.reduce((acc, s) => acc + Number(s.card_sales || 0), 0)
    const totalExpectedCash = shifts.reduce((acc, s) => acc + Number(s.expected_cash || 0), 0)
    const totalActualCash = shifts.reduce((acc, s) => acc + (s.actual_cash !== null ? Number(s.actual_cash) : 0), 0)
    const totalDifference = shifts.reduce((acc, s) => acc + (s.difference !== null ? Number(s.difference) : 0), 0)
    const avgSales = totalCount > 0 ? totalSales / totalCount : 0
    const totalOrdersCount = shifts.reduce((acc, s) => acc + Number(s.total_orders || 0), 0)

    return {
      totalCount,
      openCount,
      closedCount,
      totalSales,
      totalCashSales,
      totalCardSales,
      totalExpectedCash,
      totalActualCash,
      totalDifference,
      avgSales,
      totalOrdersCount,
    }
  }, [shifts])

  return (
    <PageContainer
      title="مركز التقارير والذكاء التشغيلي"
      description="متابعة التدفقات المالية، هندسة المنيو والربحية، وتحليل ساعات الذروة والضغط لتنظيم الكادر"
      action={
        <div className="flex items-center gap-2">
          {activeTab === "financial" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 h-8.5 px-3 rounded-lg border-border/60 hover:bg-muted text-xs font-medium cursor-pointer"
              >
                <PrinterIcon className="size-3.5 text-primary" />
                <span>طباعة التقرير</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={loadFinancialReports}
                disabled={isLoadingFinancial}
                className="gap-1.5 h-8.5 px-3 rounded-lg font-semibold shadow-xs text-xs cursor-pointer"
              >
                <RefreshCwIcon className={`size-3.5 ${isLoadingFinancial ? "animate-spin" : ""}`} />
                <span>تحديث التقرير</span>
              </Button>
            </>
          )}

          {activeTab === "shifts" && (
            <Button
              variant="default"
              size="sm"
              onClick={loadShiftsData}
              disabled={isLoadingShifts}
              className="gap-1.5 h-8.5 px-3 rounded-lg font-semibold shadow-xs text-xs cursor-pointer"
            >
              <RefreshCwIcon className={`size-3.5 ${isLoadingShifts ? "animate-spin" : ""}`} />
              <span>تحديث سجل الورديات</span>
            </Button>
          )}

          {activeTab === "menu_matrix" && (
            <Button
              variant="default"
              size="sm"
              onClick={loadMenuEngineering}
              disabled={isLoadingMenu}
              className="gap-1.5 h-8.5 px-3 rounded-lg font-semibold shadow-xs text-xs cursor-pointer"
            >
              <RefreshCwIcon className={`size-3.5 ${isLoadingMenu ? "animate-spin" : ""}`} />
              <span>تحديث تحليل المنيو</span>
            </Button>
          )}

          {activeTab === "peak_hours" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => loadPeakHours(peakDays)}
              disabled={isLoadingPeak}
              className="gap-1.5 h-8.5 px-3 rounded-lg font-semibold shadow-xs text-xs cursor-pointer"
            >
              <RefreshCwIcon className={`size-3.5 ${isLoadingPeak ? "animate-spin" : ""}`} />
              <span>تحديث ساعات الذروة</span>
            </Button>
          )}
        </div>
      }
    >
      {/* شريط التبويبات الرئيسي الفاخر */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 w-full sm:w-fit overflow-x-auto shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("financial")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "financial"
              ? "bg-card text-foreground shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LandmarkIcon className="size-3.5 text-primary" />
          <span>التقرير المالي العام والخزائن</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("shifts")
            loadShiftsData()
          }}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "shifts"
              ? "bg-card text-foreground shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShieldCheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>سجل إغلاق الورديات</span>
          {shifts.length > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              {shifts.length}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("menu_matrix")
            if (!menuData) loadMenuEngineering()
          }}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "menu_matrix"
              ? "bg-card text-foreground shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <SparklesIcon className="size-3.5 text-amber-500" />
          <span>هندسة قائمة الطعام والربحية</span>
          {menuData?.summary?.total_products ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
              {menuData.summary.total_products}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("peak_hours")
            if (!peakData) loadPeakHours(peakDays)
          }}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "peak_hours"
              ? "bg-card text-foreground shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ClockIcon className="size-3.5 text-blue-500" />
          <span>ساعات الذروة والضغط</span>
        </button>
      </div>

      {/* =========================================================
          التبويب الأول: التقرير المالي العام وحركة الخزائن
          ========================================================= */}
      {activeTab === "financial" && (
        <div className="space-y-4">
          {/* شريط الفلاتر والتواريخ */}
          <Card className="p-3 sm:p-3.5 rounded-xl border-border/60 shadow-xs bg-card">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* أزرار سريعة */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickDate("today")}
                  className="text-xs h-8 rounded-lg"
                >
                  اليوم
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickDate("yesterday")}
                  className="text-xs h-8 rounded-lg"
                >
                  أمس
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickDate("week")}
                  className="text-xs h-8 rounded-lg"
                >
                  آخر ٧ أيام
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickDate("month")}
                  className="text-xs h-8 rounded-lg"
                >
                  هذا الشهر
                </Button>
              </div>

              {/* تحديد التواريخ والخزنة */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">من:</span>
                  <DatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    placeholder="من تاريخ"
                    className="h-8 text-xs w-36 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">إلى:</span>
                  <DatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    placeholder="إلى تاريخ"
                    className="h-8 text-xs w-36 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">الخزنة:</span>
                  <div className="w-48">
                    <ComboboxSelect
                      options={[
                        { value: "all", label: "جميع الخزائن" },
                        ...registers.map((r) => ({
                          value: String(r.id),
                          label: r.name,
                          badge: `${Number(r.balance || 0).toLocaleString()} ${currency}`,
                          badgeVariant: r.is_active ? ("outline" as const) : ("secondary" as const),
                        })),
                      ]}
                      value={String(selectedRegisterId)}
                      onValueChange={(val) => setSelectedRegisterId(val === "all" ? "all" : Number(val))}
                      placeholder="اختر الخزينة..."
                      searchPlaceholder="بحث في الخزائن..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* شبكة المؤشرات المالية التنفيذية للفترة (Executive KPI Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* 1. إجمالي المبيعات */}
            <div className="flex flex-col justify-between p-3.5 rounded-xl bg-card border border-border/60 shadow-xs hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">إجمالي المبيعات</span>
                <div className="flex size-7.5 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <DollarSignIcon className="size-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                  {totalSales.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{currency}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  الصافي: {totalSubtotal.toLocaleString()} {currency}
                </p>
              </div>
            </div>

            {/* 2. الطلبات المكتملة */}
            <div className="flex flex-col justify-between p-3.5 rounded-xl bg-card border border-border/60 shadow-xs hover:border-blue-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">الطلبات المكتملة</span>
                <div className="flex size-7.5 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ShoppingBagIcon className="size-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-lg sm:text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
                  {ordersCount.toLocaleString()} <span className="text-xs font-normal">طلب</span>
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                    {completionRate}% نجاح
                  </span>
                </div>
              </div>
            </div>

            {/* 3. متوسط قيمة الطلب AOV */}
            <div className="flex flex-col justify-between p-3.5 rounded-xl bg-card border border-border/60 shadow-xs hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">متوسط الفاتورة (AOV)</span>
                <div className="flex size-7.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUpIcon className="size-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                  {aov.toLocaleString()} <span className="text-xs font-normal">{currency}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  لكل طلب منجز
                </p>
              </div>
            </div>

            {/* 4. الضرائب المحسوبة */}
            <div className="flex flex-col justify-between p-3.5 rounded-xl bg-card border border-border/60 shadow-xs hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">الضرائب المحسوبة</span>
                <div className="flex size-7.5 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ReceiptIcon className="size-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                  {totalTax.toLocaleString()} <span className="text-xs font-normal">{currency}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  ضريبة القيمة المضافة
                </p>
              </div>
            </div>

            {/* 5. رسوم التوصيل */}
            <div className="flex flex-col justify-between p-3.5 rounded-xl bg-card border border-border/60 shadow-xs hover:border-orange-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">رسوم الدليفري</span>
                <div className="flex size-7.5 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <TruckIcon className="size-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-lg sm:text-xl font-bold tracking-tight text-orange-600 dark:text-orange-400 font-mono">
                  {totalDeliveryFees.toLocaleString()} <span className="text-xs font-normal">{currency}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {reportsData?.by_order_type?.delivery?.count || 0} طلب توصيل
                </p>
              </div>
            </div>

            {/* 6. الطلبات الملغاة */}
            <div className="flex flex-col justify-between p-3.5 rounded-xl bg-card border border-border/60 shadow-xs hover:border-rose-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">طلبات ملغاة</span>
                <div className="flex size-7.5 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangleIcon className="size-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-lg sm:text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
                  {cancelledCount.toLocaleString()} <span className="text-xs font-normal">طلب</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {totalOrdersAttempted > 0 ? ((cancelledCount / totalOrdersAttempted) * 100).toFixed(1) : 0}% من الإجمالي
                </p>
              </div>
            </div>
          </div>

          {/* رسم بياني لتطور المبيعات اليومية عبر الفترة */}
          <Card className="rounded-xl border-border/60 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-border/40 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUpIcon className="size-4 text-primary" />
                    <span>منحنى حركة وتطور المبيعات خلال الفترة</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    متابعة التدفق المالي وحجم المبيعات اليومي للمطعم
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">
                    {dateFrom} إلى {dateTo}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-bold font-mono">
                    {totalSales.toLocaleString()} {currency}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-4">
              {isLoadingFinancial ? (
                <div className="h-[240px] flex items-center justify-center">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : salesTrendData.length > 0 && mounted ? (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={salesTrendData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="fillReportSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                      <XAxis
                        dataKey="displayDate"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-xs fill-muted-foreground font-medium"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-xs fill-muted-foreground font-mono"
                        tickFormatter={(v) => Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : `${v}`}
                      />
                      <RechartsTooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload || !payload.length) return null
                          const item = payload[0].payload
                          return (
                            <div className="rounded-lg border bg-popover p-2.5 shadow-md text-right text-xs space-y-1">
                              <p className="font-bold text-foreground">{item.date || item.displayDate}</p>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">المبيعات:</span>
                                <span className="font-mono font-bold text-primary">
                                  {Number(item.sales || 0).toLocaleString()} {currency}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">عدد الطلبات:</span>
                                <span className="font-mono font-semibold text-foreground">
                                  {item.orders} طلب
                                </span>
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#fillReportSales)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <BarChart3Icon className="size-10 stroke-[1.5] text-muted-foreground/50" />
                  <p className="text-xs">لا توجد مبيعات مسجلة في هذا النطاق الزمني لعرض الرسم البياني.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* قسم التحليلات البصرية: مبيعات أنواع الطلبات */}
          <Card className="rounded-xl border-border/60 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingBagIcon className="size-4 text-primary" />
                  <span>مبيعات أنواع الطلبات (صالة / سفري / دليفري)</span>
                </span>
                <Badge variant="outline" className="text-[11px] font-mono">
                  {orderTypesData.reduce((acc, c) => acc + c.count, 0)} طلب
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {mounted && orderTypesData.some((d) => d.value > 0) ? (
                  <div className="h-[200px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload || !payload.length) return null
                            const p = payload[0].payload
                            return (
                              <div className="rounded-lg border bg-popover p-2 shadow-md text-right text-xs">
                                <span className="font-bold text-foreground block">{p.name}</span>
                                <span className="font-mono text-primary font-bold">
                                  {Number(p.value).toLocaleString()} {currency} ({p.percent}%)
                                </span>
                              </div>
                            )
                          }}
                        />
                        <Pie
                          data={orderTypesData}
                          dataKey="value"
                          nameKey="shortName"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={3}
                        >
                          {orderTypesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                    لا توجد بيانات طلبات مسجلة
                  </div>
                )}

                {/* تفصيل أنواع الطلبات */}
                <div className="space-y-2.5">
                  {orderTypesData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-2.5">
                        <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-foreground">{item.name}</span>
                        <span className="text-[11px] text-muted-foreground">({item.count} طلب)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">
                          {item.total.toLocaleString()} {currency}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الأطباق الأكثر طلباً ومساهمة في المبيعات مع أشرطة تقدم بصرية */}
          <Card className="rounded-xl border-border/60 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <AwardIcon className="size-4 text-amber-500" />
                    <span>الأطباق الأكثر طلباً ومساهمة في الإيرادات</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    تحليل الأطباق الأكثر شعبية وحصة كل طبق من دخل المطعم
                  </CardDescription>
                </div>
                {reportsData?.top_dishes && reportsData.top_dishes.length > 0 && (
                  <Badge variant="outline" className="gap-1 bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
                    <SparklesIcon className="size-3" />
                    <span>الأعلى مبيعاً: {reportsData.top_dishes[0].name}</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/60">
                    <TableHead className="text-right font-bold text-xs py-3 w-12">#</TableHead>
                    <TableHead className="text-right font-bold text-xs">الصنف / الطبق</TableHead>
                    <TableHead className="text-right font-bold text-xs">الكمية المباعة</TableHead>
                    <TableHead className="text-right font-bold text-xs">إجمالي الإيرادات</TableHead>
                    <TableHead className="text-right font-bold text-xs w-48">نسبة المساهمة المالية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsData?.top_dishes && reportsData.top_dishes.length > 0 ? (
                    reportsData.top_dishes.map((dish, idx) => {
                      const totalRev = totalSales || 1
                      const pct = Math.round((dish.revenue / totalRev) * 100)
                      return (
                        <TableRow key={idx} className="border-border/40 hover:bg-muted/30">
                          <TableCell className="font-mono font-bold text-xs py-3 text-muted-foreground">
                            #{idx + 1}
                          </TableCell>
                          <TableCell className="font-bold text-xs py-3">{dish.name}</TableCell>
                          <TableCell className="font-mono text-xs font-medium">
                            <span className="px-2 py-0.5 rounded bg-muted font-bold">{dish.quantity.toLocaleString()}</span> طلب
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs text-primary">
                            {dish.revenue.toLocaleString()} {currency}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: idx === 0 ? "#f59e0b" : idx === 1 ? "#3b82f6" : "#10b981",
                                  }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-bold text-muted-foreground w-8 text-left">
                                {pct}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        لا توجد بيانات أطباق مسجلة خلال الفترة المحددة.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* تقرير حركة الخزائن */}
          <Card className="rounded-xl border-border/60 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <LandmarkIcon className="size-4 text-primary" />
                    <span>تقرير حركة الخزائن النقدية للفترة</span>
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  الفترة: {dateFrom} إلى {dateTo}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/60">
                    <TableHead className="text-right font-bold text-xs py-3.5">الخزنة</TableHead>
                    <TableHead className="text-right font-bold text-xs">مقبوضات الطلبات</TableHead>
                    <TableHead className="text-right font-bold text-xs">سندات القبض</TableHead>
                    <TableHead className="text-right font-bold text-xs">المصروفات وسندات الصرف</TableHead>
                    <TableHead className="text-right font-bold text-xs">صافي تدفق الفترة</TableHead>
                    <TableHead className="text-right font-bold text-xs">الرصيد الفعلي الحالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsData?.registers && reportsData.registers.length > 0 ? (
                    reportsData.registers.map((reg) => (
                      <TableRow key={reg.id} className="border-border/40 hover:bg-muted/30">
                        <TableCell className="font-bold text-sm py-3.5">{reg.name}</TableCell>
                        <TableCell className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          +{reg.period_order_payments.toLocaleString()} {currency}
                        </TableCell>
                        <TableCell className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          +{reg.period_receipt_vouchers.toLocaleString()} {currency}
                        </TableCell>
                        <TableCell className="font-mono font-medium text-rose-600 dark:text-rose-400">
                          -{reg.period_expenses.toLocaleString()} {currency}
                        </TableCell>
                        <TableCell className="font-mono font-black text-sm">
                          {reg.net_period_flow >= 0 ? "+" : ""}{reg.net_period_flow.toLocaleString()} {currency}
                        </TableCell>
                        <TableCell className="font-mono font-extrabold text-sm text-foreground">
                          {reg.current_balance.toLocaleString()} {currency}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                        لا توجد خزائن مالية مسجلة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================
          التبويب الثاني: سجل الورديات وإغلاقات Z-Reports
          ========================================================= */}
      {activeTab === "shifts" && (
        <div className="space-y-4">
          {/* فلتر فترة الورديات والخزائن */}
          <Card className="p-3 sm:p-3.5 rounded-xl border-border/60 shadow-xs bg-card">
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
              {/* خيارات المواعيد السريعة */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickShiftDate("today")}
                  className="text-xs h-8 rounded-lg cursor-pointer"
                >
                  اليوم
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickShiftDate("yesterday")}
                  className="text-xs h-8 rounded-lg cursor-pointer"
                >
                  أمس
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickShiftDate("week")}
                  className="text-xs h-8 rounded-lg font-bold cursor-pointer"
                >
                  آخر ٧ أيام
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickShiftDate("month")}
                  className="text-xs h-8 rounded-lg cursor-pointer"
                >
                  هذا الشهر
                </Button>
              </div>

              {/* النطاق الزمني واختيار الخزينة والحالة */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">من:</span>
                  <DatePicker
                    value={shiftDateFrom}
                    onChange={setShiftDateFrom}
                    placeholder="من تاريخ"
                    className="h-8 text-xs w-34 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">إلى:</span>
                  <DatePicker
                    value={shiftDateTo}
                    onChange={setShiftDateTo}
                    placeholder="إلى تاريخ"
                    className="h-8 text-xs w-34 rounded-lg"
                  />
                </div>

                <div className="w-44">
                  <ComboboxSelect
                    options={[
                      { value: "all", label: "جميع الخزائن" },
                      ...registers.map((r) => ({
                        value: String(r.id),
                        label: r.name,
                      })),
                    ]}
                    value={String(shiftRegisterId)}
                    onValueChange={(val) => setShiftRegisterId(val === "all" ? "all" : Number(val))}
                    placeholder="الخزينة..."
                    className="h-8 text-xs rounded-lg"
                  />
                </div>

                <div className="w-36">
                  <ComboboxSelect
                    options={[
                      { value: "all", label: "جميع الحالات" },
                      { value: "open", label: "مفتوحة الآن" },
                      { value: "closed", label: "مقفلة بتقرير إغلاق" },
                    ]}
                    value={shiftStatusFilter}
                    onValueChange={(val) => setShiftStatusFilter(val)}
                    placeholder="الحالة..."
                    className="h-8 text-xs rounded-lg"
                  />
                </div>

                <Button
                  size="xs"
                  onClick={loadShiftsData}
                  disabled={isLoadingShifts}
                  className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <RefreshCwIcon className={`size-3.5 ${isLoadingShifts ? "animate-spin" : ""}`} />
                  <span>تطبيق</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* بطاقات المؤشرات المالية لإغلاقات الورديات */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheckIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">إجمالي الورديات</p>
                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                  {shiftMetrics.totalCount} <span className="text-xs font-normal text-muted-foreground">وردية</span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  مفتوحة: <span className="text-emerald-600 font-bold">{shiftMetrics.openCount}</span> | مقفلة: {shiftMetrics.closedCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DollarSignIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">مبيعات الورديات المحققة</p>
                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                  {shiftMetrics.totalSales.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{currency}</span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  نقدي: {shiftMetrics.totalCashSales.toLocaleString()} | شبكة: {shiftMetrics.totalCardSales.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                Math.abs(shiftMetrics.totalDifference) < 0.01
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : shiftMetrics.totalDifference > 0
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}>
                <BanknoteIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground truncate">مطابقة النقدية (الفارق)</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    Math.abs(shiftMetrics.totalDifference) < 0.01
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : shiftMetrics.totalDifference > 0
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                  }`}>
                    {Math.abs(shiftMetrics.totalDifference) < 0.01 ? "مطابق" : shiftMetrics.totalDifference > 0 ? "زيادة" : "عجز"}
                  </span>
                </div>
                <p className={`text-lg sm:text-xl font-bold tracking-tight font-mono ${
                  shiftMetrics.totalDifference < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                }`}>
                  {shiftMetrics.totalDifference > 0 ? "+" : ""}{shiftMetrics.totalDifference.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{currency}</span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  الفعلي: {shiftMetrics.totalActualCash.toLocaleString()} | المتوقع: {shiftMetrics.totalExpectedCash.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TrendingUpIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">متوسط دخل الوردية</p>
                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                  {Math.round(shiftMetrics.avgSales).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{currency}</span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  إجمالي {shiftMetrics.totalOrdersCount} طلب منجز بالورديات
                </p>
              </div>
            </div>
          </div>

          {/* جدول الورديات وإغلاقات Z-Reports */}
          <Card className="border-border/60 shadow-xs bg-card overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <ShieldCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>سجل الورديات وإغلاقات الكاشير اليومية</span>
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-semibold self-start sm:self-auto">
                {shifts.length} وردية
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40">
                    <TableHead className="text-right text-xs font-bold">الوردية وتقرير الإغلاق</TableHead>
                    <TableHead className="text-right text-xs font-bold">الكاشير والخزينة</TableHead>
                    <TableHead className="text-right text-xs font-bold">التوقيت والمدة</TableHead>
                    <TableHead className="text-right text-xs font-bold">العهدة الافتتاحية</TableHead>
                    <TableHead className="text-right text-xs font-bold">مبيعات الوردية</TableHead>
                    <TableHead className="text-right text-xs font-bold">المتوقع مقابل الفعلي</TableHead>
                    <TableHead className="text-right text-xs font-bold">الفارق (العجز/الزيادة)</TableHead>
                    <TableHead className="text-right text-xs font-bold">الحالة</TableHead>
                    <TableHead className="text-center text-xs font-bold">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingShifts ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2Icon className="size-6 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">جاري تحميل سجل الورديات...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : shifts.length > 0 ? (
                    shifts.map((shift) => {
                      const diff = Number(shift.difference ?? 0)
                      const isClosed = shift.status === "closed"
                      return (
                        <TableRow key={shift.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-xs font-bold">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-foreground">#{shift.shift_number}</span>
                              {shift.z_report_number ? (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {shift.z_report_number}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-500 font-medium">مسودة (مفتوحة)</span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <UserIcon className="size-3 text-muted-foreground" />
                                {shift.user?.name || "غير محدد"}
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <LandmarkIcon className="size-3 text-muted-foreground" />
                                {shift.cash_register?.name || "الخزينة العامة"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs font-mono">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] text-foreground">{formatShiftDateTime(shift.opened_at)}</span>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span>{isClosed ? formatShiftDateTime(shift.closed_at) : "الآن"}</span>
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                  {getShiftDuration(shift.opened_at, shift.closed_at)}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs text-foreground font-semibold">
                            {Number(shift.starting_cash || 0).toLocaleString()} {currency}
                          </TableCell>

                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-0.5 font-mono">
                              <span className="font-bold text-primary">
                                {Number(shift.total_sales || 0).toLocaleString()} {currency}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                كاش: {Number(shift.cash_sales || 0).toLocaleString()} | شبكة: {Number(shift.card_sales || 0).toLocaleString()}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-muted-foreground text-[11px]">
                                متوقع: {Number(shift.expected_cash || 0).toLocaleString()}
                              </span>
                              <span className="font-bold text-foreground">
                                فعلي: {shift.actual_cash !== null ? `${Number(shift.actual_cash).toLocaleString()}` : "—"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {isClosed && shift.actual_cash !== null ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  Math.abs(diff) < 0.01
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                    : diff > 0
                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                                }`}
                              >
                                {diff > 0 ? `+${diff.toFixed(2)} زيادة` : diff < 0 ? `${diff.toFixed(2)} عجز` : "مطابق 0.00"}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {shift.status === "open" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[10px] font-bold">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>مفتوحة</span>
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] font-medium">
                                مقفلة (Z)
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={async () => {
                                const res = await loadZReport(shift.id)
                                if (res.success) {
                                  setZReportModalOpen(true)
                                }
                              }}
                              className="h-7 px-2 text-xs font-semibold gap-1 text-primary hover:bg-primary/10 border-primary/20 cursor-pointer"
                            >
                              <EyeIcon className="size-3" />
                              <span>تقرير Z</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <ShieldCheckIcon className="size-8 text-muted-foreground/50" />
                          <p className="text-sm font-bold text-foreground">لا توجد ورديات مسجلة خلال الفترة المحددة</p>
                          <p className="text-xs text-muted-foreground">
                            جرب تغيير النطاق الزمني أو اختيار خزينة أخرى للبحث في سجل الورديات السابقة.
                          </p>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setQuickShiftDate("month")
                              setShiftRegisterId("all")
                              setShiftStatusFilter("all")
                            }}
                            className="mt-2 text-xs cursor-pointer"
                          >
                            عرض ورديات الشهر الحالي
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================
          التبويب الثاني: مصفوفة هندسة المنيو والربحية (BCG Matrix)
          ========================================================= */}
      {activeTab === "menu_matrix" && (
        <div className="space-y-4">
          {/* فلتر فترة هندسة المنيو */}
          <Card className="p-3 sm:p-3.5 rounded-xl border-border/60 shadow-xs bg-card">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickMenuDate(7)}
                  className="text-xs h-8 rounded-lg"
                >
                  آخر ٧ أيام
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickMenuDate(30)}
                  className="text-xs h-8 rounded-lg font-bold"
                >
                  آخر ٣٠ يوم (موصى به)
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setQuickMenuDate(90)}
                  className="text-xs h-8 rounded-lg"
                >
                  آخر ٣ أشهر
                </Button>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">من:</span>
                  <DatePicker
                    value={menuDateFrom}
                    onChange={setMenuDateFrom}
                    placeholder="من تاريخ"
                    className="h-8 text-xs w-36 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">إلى:</span>
                  <DatePicker
                    value={menuDateTo}
                    onChange={setMenuDateTo}
                    placeholder="إلى تاريخ"
                    className="h-8 text-xs w-36 rounded-lg"
                  />
                </div>
                <Button
                  size="xs"
                  onClick={loadMenuEngineering}
                  disabled={isLoadingMenu}
                  className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5"
                >
                  <RefreshCwIcon className={`size-3.5 ${isLoadingMenu ? "animate-spin" : ""}`} />
                  <span>تطبيق التحليل</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* المؤشرات التلخيصية لهندسة المنيو */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ChefHatIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">الأصناف المحللة</p>
                <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                  {menuData?.summary?.total_products ?? 0} صنف
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSignIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">إجمالي الإيرادات</p>
                <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                  {(menuData?.summary?.total_revenue ?? 0).toLocaleString()} {currency}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ShoppingBagIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">إجمالي الأطباق المباعة</p>
                <p className="text-lg sm:text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
                  {(menuData?.summary?.total_quantity_sold ?? 0).toLocaleString()} طبق
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <TrendingUpIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">متوسط هامش الربح للصنف</p>
                <p className="text-lg sm:text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono">
                  {(menuData?.summary?.avg_margin_threshold ?? 0).toLocaleString()} {currency}
                </p>
              </div>
            </div>
          </div>

          {/* كروت الأرباع الأربعة لمصفوفة BCG (تفاعلية للفلترة) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* النجوم Stars */}
            <div
              onClick={() => setSelectedQuadrant(selectedQuadrant === "star" ? "all" : "star")}
              className={cn(
                "cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden",
                selectedQuadrant === "star"
                  ? "bg-emerald-500/10 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20"
                  : "bg-card border-border/60 hover:border-emerald-500/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <SparklesIcon className="size-4" />
                  </div>
                  <span className="font-bold text-xs text-foreground">النجوم</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  {menuData?.matrix?.stars?.length ?? 0} صنف
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                شعبية عالية + هامش ربح مرتفع. الأكثر ربحية وإقبالاً بالمطعم.
              </p>
              <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                <AwardIcon className="size-3.5 shrink-0" />
                <span>حافظ على الجودة وثبات الوصفة والترويج</span>
              </div>
            </div>

            {/* أحصنة الجر Plowhorses */}
            <div
              onClick={() => setSelectedQuadrant(selectedQuadrant === "plowhorse" ? "all" : "plowhorse")}
              className={cn(
                "cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden",
                selectedQuadrant === "plowhorse"
                  ? "bg-amber-500/10 border-amber-500 shadow-sm ring-2 ring-amber-500/20"
                  : "bg-card border-border/60 hover:border-amber-500/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <FlameIcon className="size-4" />
                  </div>
                  <span className="font-bold text-xs text-foreground">الأصناف الشعبية (عالية الطلب)</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  {menuData?.matrix?.plowhorses?.length ?? 0} صنف
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                شعبية عالية جداً ومبيعات ضخمة لكن بهامش ربح منخفض.
              </p>
              <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
                <TrendingUpIcon className="size-3.5 shrink-0" />
                <span>عدّل السعر بذكاء أو قلل تكلفة المكونات</span>
              </div>
            </div>

            {/* الألغاز Puzzles */}
            <div
              onClick={() => setSelectedQuadrant(selectedQuadrant === "puzzle" ? "all" : "puzzle")}
              className={cn(
                "cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden",
                selectedQuadrant === "puzzle"
                  ? "bg-blue-500/10 border-blue-500 shadow-sm ring-2 ring-blue-500/20"
                  : "bg-card border-border/60 hover:border-blue-500/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <TargetIcon className="size-4" />
                  </div>
                  <span className="font-bold text-xs text-foreground">الأصناف الواعدة (عالية الربح)</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                  {menuData?.matrix?.puzzles?.length ?? 0} صنف
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                هامش ربح ممتاز جداً لكن الإقبال ضعيف وعدد الطلبات قليل.
              </p>
              <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1.5">
                <LightbulbIcon className="size-3.5 shrink-0" />
                <span>أبرزه في صدارة المنيو واجعله ترشيح الكاشير</span>
              </div>
            </div>

            {/* الأصناف الراكدة Dogs */}
            <div
              onClick={() => setSelectedQuadrant(selectedQuadrant === "dog" ? "all" : "dog")}
              className={cn(
                "cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden",
                selectedQuadrant === "dog"
                  ? "bg-rose-500/10 border-rose-500 shadow-sm ring-2 ring-rose-500/20"
                  : "bg-card border-border/60 hover:border-rose-500/50"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    <AlertTriangleIcon className="size-4" />
                  </div>
                  <span className="font-bold text-xs text-foreground">الأصناف الراكدة</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                  {menuData?.matrix?.dogs?.length ?? 0} صنف
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                شعبية منخفضة وهامش ربح منخفض وتستهلك مخزون وهدر.
              </p>
              <div className="mt-3 pt-2.5 border-t border-border/40 text-[11px] text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1.5">
                <TrendingDownIcon className="size-3.5 shrink-0" />
                <span>أعد صياغة الوصفة أو احذفه لتقليل الهدر</span>
              </div>
            </div>
          </div>

          {/* شريط البحث وتصفية الأصناف */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={selectedQuadrant === "all" ? "default" : "outline"}
                size="xs"
                onClick={() => setSelectedQuadrant("all")}
                className="text-xs h-7.5 rounded-lg"
              >
                الكل ({allMenuItems.length})
              </Button>
              <Button
                variant={selectedQuadrant === "star" ? "default" : "outline"}
                size="xs"
                onClick={() => setSelectedQuadrant("star")}
                className="text-xs h-7.5 rounded-lg text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              >
                النجوم ({menuData?.matrix?.stars?.length ?? 0})
              </Button>
              <Button
                variant={selectedQuadrant === "plowhorse" ? "default" : "outline"}
                size="xs"
                onClick={() => setSelectedQuadrant("plowhorse")}
                className="text-xs h-7.5 rounded-lg text-amber-600 dark:text-amber-400 border-amber-500/30"
              >
                أحصنة الجر ({menuData?.matrix?.plowhorses?.length ?? 0})
              </Button>
              <Button
                variant={selectedQuadrant === "puzzle" ? "default" : "outline"}
                size="xs"
                onClick={() => setSelectedQuadrant("puzzle")}
                className="text-xs h-7.5 rounded-lg text-blue-600 dark:text-blue-400 border-blue-500/30"
              >
                الألغاز ({menuData?.matrix?.puzzles?.length ?? 0})
              </Button>
              <Button
                variant={selectedQuadrant === "dog" ? "default" : "outline"}
                size="xs"
                onClick={() => setSelectedQuadrant("dog")}
                className="text-xs h-7.5 rounded-lg text-rose-600 dark:text-rose-400 border-rose-500/30"
              >
                الراكدة ({menuData?.matrix?.dogs?.length ?? 0})
              </Button>
            </div>

            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الصنف أو القسم..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="pr-8 h-8 text-xs rounded-lg"
              />
            </div>
          </div>

          {/* جدول تفاصيل تحليل هندسة المنيو */}
          <Card className="rounded-xl border-border/60 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <SparklesIcon className="size-4 text-amber-500" />
                <span>جدول تحليل وتصنيف أطباق قائمة الطعام</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/60">
                    <TableHead className="text-right font-bold text-xs py-3.5">الصنف والقسم</TableHead>
                    <TableHead className="text-right font-bold text-xs">التصنيف الاستراتيجي</TableHead>
                    <TableHead className="text-right font-bold text-xs">السعر والتكلفة</TableHead>
                    <TableHead className="text-right font-bold text-xs">هامش الوحدة</TableHead>
                    <TableHead className="text-right font-bold text-xs">المبيعات (الكمية)</TableHead>
                    <TableHead className="text-right font-bold text-xs">إجمالي الإيراد</TableHead>
                    <TableHead className="text-right font-bold text-xs">إجمالي الأرباح</TableHead>
                    <TableHead className="text-right font-bold text-xs min-w-[260px]">التوصية الاستراتيجية الذكية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMenu ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                          <Loader2Icon className="size-5 animate-spin text-primary" />
                          <span>جاري احتساب مصفوفة هندسة المنيو...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMenuItems.length > 0 ? (
                    filteredMenuItems.map((item) => (
                      <TableRow key={item.id} className="border-border/40 hover:bg-muted/30">
                        {/* الصنف والقسم */}
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-foreground">{item.name}</span>
                            <span className="text-[11px] text-muted-foreground">{item.category_name}</span>
                          </div>
                        </TableCell>

                        {/* التصنيف الاستراتيجي */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-bold gap-1",
                              item.badge_color === "emerald" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
                              item.badge_color === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
                              item.badge_color === "blue" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
                              item.badge_color === "rose" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                            )}
                          >
                            {item.category === "star" && <SparklesIcon className="size-3" />}
                            {item.category === "plowhorse" && <FlameIcon className="size-3" />}
                            {item.category === "puzzle" && <TargetIcon className="size-3" />}
                            {item.category === "dog" && <AlertTriangleIcon className="size-3" />}
                            <span>{item.category_label}</span>
                          </Badge>
                        </TableCell>

                        {/* السعر والتكلفة */}
                        <TableCell>
                          <div className="flex flex-col text-xs font-mono">
                            <span className="font-bold text-foreground">{item.price.toFixed(2)} {currency}</span>
                            <span className="text-[10px] text-muted-foreground">التكلفة: ~{item.estimated_cost.toFixed(2)}</span>
                          </div>
                        </TableCell>

                        {/* هامش الربح للوحدة */}
                        <TableCell>
                          <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <span>+{item.unit_margin.toFixed(2)} {currency}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              ({Math.round((item.unit_margin / (item.price || 1)) * 100)}%)
                            </span>
                          </div>
                        </TableCell>

                        {/* الكمية المباعة */}
                        <TableCell className="font-mono text-xs font-bold">
                          {item.quantity_sold} طلب
                        </TableCell>

                        {/* إجمالي الإيراد */}
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          {item.total_revenue.toLocaleString()} {currency}
                        </TableCell>

                        {/* إجمالي الأرباح */}
                        <TableCell className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          {item.total_margin.toLocaleString()} {currency}
                        </TableCell>

                        {/* التوصية التشغيلية الذكية */}
                        <TableCell className="text-xs">
                          <p className="p-2 rounded-lg bg-muted/40 border border-border/40 text-[11px] leading-relaxed text-muted-foreground">
                            {item.recommendation}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                        لا توجد أصناف تطابق معايير الفلترة المحددة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================
          التبويب الثالث: ساعات الذروة والضغط (Heatmap)
          ========================================================= */}
      {activeTab === "peak_hours" && (
        <div className="space-y-4">
          {/* شريط اختيار مدة التحليل */}
          <Card className="p-3 sm:p-3.5 rounded-xl border-border/60 shadow-xs bg-card">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">المدى الزمني لتحليل ساعات الذروة:</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: "آخر ٧ أيام", days: 7 },
                  { label: "آخر ١٤ يوم", days: 14 },
                  { label: "آخر ٣٠ يوم (شهري)", days: 30 },
                  { label: "آخر ٦٠ يوم (شامل)", days: 60 },
                ].map((item) => (
                  <Button
                    key={item.days}
                    variant={peakDays === item.days ? "default" : "outline"}
                    size="xs"
                    onClick={() => {
                      setPeakDays(item.days)
                      loadPeakHours(item.days)
                    }}
                    className="text-xs h-8 rounded-lg"
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {/* ساعات الذروة الذهبية (Top Peak Hours) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs">
              <p className="text-xs text-muted-foreground">إجمالي الطلبات المحللة</p>
              <p className="text-2xl font-black text-foreground font-mono mt-1">
                {peakData?.total_analyzed_orders ?? 0} طلب
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                خلال آخر {peakData?.period_days ?? peakDays} يوماً
              </p>
            </div>

            {/* المراكز الثلاثة لساعات الذروة */}
            {peakData?.top_peak_hours?.slice(0, 3).map((peak, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-xl border shadow-xs relative overflow-hidden",
                  idx === 0
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-100"
                    : idx === 1
                    ? "bg-blue-500/10 border-blue-500/40 text-blue-950 dark:text-blue-100"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    {idx === 0 && "🥇 ذروة المطعم الأولى"}
                    {idx === 1 && "🥈 ذروة المطعم الثانية"}
                    {idx === 2 && "🥉 ذروة المطعم الثالثة"}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs font-black">
                    {peak.hour_label}
                  </Badge>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-black font-mono">{peak.orders_count} طلب</span>
                  <span className="text-xs font-mono font-bold">
                    {peak.total_sales.toLocaleString()} {currency}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  أعلى ضغط تشغيلي وإقبال من العملاء
                </p>
              </div>
            ))}
          </div>

          {/* خريطة الضغط الحرارية 7x24 (Heatmap Grid) */}
          <Card className="rounded-xl border-border/60 shadow-xs overflow-hidden">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ActivityIcon className="size-4 text-primary" />
                    <span>الخريطة الحرارية الأسبوعية للضغط وحجم الطلبات (7 × 24 ساعة)</span>
                  </CardTitle>
                </div>

                {/* مفتاح الألوان الدليلي (Legend) */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground self-start sm:self-auto">
                  <span>هادئ</span>
                  <span className="size-3 rounded bg-muted/40 border border-border/30" />
                  <span className="size-3 rounded bg-primary/20 border border-primary/30" />
                  <span className="size-3 rounded bg-primary/45 border border-primary/50" />
                  <span className="size-3 rounded bg-primary/75 border border-primary/80" />
                  <span className="size-3 rounded bg-primary border border-primary" />
                  <span>ذروة قصوى</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 overflow-x-auto">
              {isLoadingPeak ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground text-xs">
                  <Loader2Icon className="size-5 animate-spin text-primary" />
                  <span>جاري توليد الخريطة الحرارية...</span>
                </div>
              ) : (
                <div className="min-w-[760px]">
                  {/* رأس الساعات (00:00 إلى 23:00) */}
                  <div className="grid grid-cols-[70px_repeat(24,1fr)] gap-1 mb-1 text-center">
                    <div className="text-[10px] font-bold text-muted-foreground text-right pr-1">اليوم \ الساعة</div>
                    {Array.from({ length: 24 }).map((_, h) => (
                      <div key={h} className="text-[9px] font-mono text-muted-foreground truncate">
                        {h}:00
                      </div>
                    ))}
                  </div>

                  {/* صفوف الأيام السبعة */}
                  <div className="space-y-1">
                    {orderedDays.map((day) => (
                      <div key={day.id} className="grid grid-cols-[70px_repeat(24,1fr)] gap-1 items-center">
                        <div className="text-xs font-bold text-foreground text-right truncate">
                          {day.name}
                        </div>
                        {Array.from({ length: 24 }).map((_, h) => {
                          const cell = peakData?.heatmap_grid?.find(
                            (c) => c.day === day.id && c.hour === h
                          )
                          const count = cell?.orders_count ?? 0
                          const sales = cell?.total_sales ?? 0

                          return (
                            <div
                              key={h}
                              title={`${day.name} - ${sprintfHour(h)} | ${count} طلب (${sales.toLocaleString()} ${currency})`}
                              className={cn(
                                "group relative h-8 rounded border flex items-center justify-center cursor-pointer transition-all duration-150 text-[10px] font-mono",
                                getHeatmapColorClass(count)
                              )}
                            >
                              <span>{count > 0 ? count : ""}</span>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* التوزيع الساعي للأوامر على مدار اليوم */}
          <Card className="rounded-xl border-border/60 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3Icon className="size-4 text-primary" />
                <span>منحنى توزيع الطلبات على مدار الـ 24 ساعة</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-12 md:grid-cols-24 gap-1.5 items-end h-44 pt-6 pb-2 border-b border-border/40">
                {peakData?.hourly_aggregate?.map((item) => {
                  const pct = Math.max(8, Math.round((item.count / maxHourlyOrders) * 100))
                  const isPeak = item.count === maxHourlyOrders && item.count > 0
                  return (
                    <div key={item.hour} className="group flex flex-col items-center h-full justify-end relative">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-popover text-popover-foreground border border-border shadow-xs text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                        {item.count} طلب ({item.sales.toLocaleString()} {currency})
                      </div>
                      <div
                        style={{ height: `${pct}%` }}
                        className={cn(
                          "w-full rounded-t transition-all",
                          isPeak
                            ? "bg-amber-500 shadow-xs"
                            : item.count > 0
                            ? "bg-primary/80 group-hover:bg-primary"
                            : "bg-muted/40"
                        )}
                      />
                      <span className="text-[9px] font-mono text-muted-foreground mt-1 truncate">
                        {item.hour}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* بوكس التوصيات التشغيلية الذكية المبنية على بيانات ساعات الذروة */}
          <Card className="rounded-xl border-border/60 shadow-xs bg-linear-to-r from-primary/5 via-card to-amber-500/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <LightbulbIcon className="size-4 text-amber-500" />
                <span>إرشادات الذكاء التشغيلي لإدارة فترات الذروة</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <ChefHatIcon className="size-3.5 text-primary" />
                  <span>تجهيز المكونات مسبقاً</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  وجّه طاقم المطبخ للبدء في تجهيز التتبيلات، تقطيع الخضروات، والصلصات قبل أول ساعة ذروة بساعة كاملة لتجنب الاختناق وقت الذروة.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <TruckIcon className="size-3.5 text-amber-500" />
                  <span>تأهب أسطول الدليفري</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  تأكد من تواجد جميع كباتن التوصيل في أوقات الذروة الذهبية (خاصة المسائية) وتوزيع الطلبات المتجاورة جغرافياً لتقليص زمن التسليم.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <CreditCardIcon className="size-3.5 text-emerald-500" />
                  <span>موازنة الكاشير والدفع الإلكتروني</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  شجع الدفع بالبطاقات ونقاط البيع السريعة لتقليل وقت الطوابير أمام الكاونتر وتنظيم الاستلام بسلاسة.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* نافذة معاينة وطباعة تقرير Z-Report للوردية */}
      <ZReportDialog
        open={zReportModalOpen}
        onOpenChange={setZReportModalOpen}
        zReport={activeZReport}
        shift={activeZReportShift}
      />
    </PageContainer>
  )
}

// دالة مساعدة لحساب مدة الوردية
function getShiftDuration(openedAt: string, closedAt?: string | null): string {
  if (!openedAt) return "—"
  const start = new Date(openedAt).getTime()
  const end = closedAt ? new Date(closedAt).getTime() : Date.now()
  const diffMinutes = Math.max(0, Math.floor((end - start) / 60000))
  const hours = Math.floor(diffMinutes / 60)
  const mins = diffMinutes % 60
  if (hours === 0) return `${mins} د`
  return `${hours} س ${mins > 0 ? `و ${mins} د` : ""}`
}

// دالة مساعدة لتنسيق التاريخ والوقت للورديات
function formatShiftDateTime(isoStr?: string | null): string {
  if (!isoStr) return "—"
  try {
    const d = new Date(isoStr)
    return d.toLocaleString("ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return isoStr
  }
}

// دالة مساعدة لتنسيق الوقت بصيغة 12 ساعة مع ص/م
function sprintfHour(h: number): string {
  if (h === 0) return "12:00 منتصف الليل"
  if (h === 12) return "12:00 ظهراً"
  if (h < 12) return `${h}:00 صباحاً`
  return `${h - 12}:00 مساءً`
}
