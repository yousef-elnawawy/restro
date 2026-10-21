"use client"

import * as React from "react"
import Link from "next/link"
import { PageContainer } from "@/components/page-container"
import { useRegisterStore } from "@/store/register.store"
import { useSettingStore } from "@/store/setting.store"
import {
  getReportsApi,
  type ReportsData,
} from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ComboboxSelect } from "@/components/ui/combobox-select"
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
} from "lucide-react"

export default function ReportsPage() {
  const { registers, fetchRegisters } = useRegisterStore()
  const { settings, fetchSettings } = useSettingStore()

  const [dateFrom, setDateFrom] = React.useState<string>(new Date().toISOString().split("T")[0])
  const [dateTo, setDateTo] = React.useState<string>(new Date().toISOString().split("T")[0])
  const [selectedRegisterId, setSelectedRegisterId] = React.useState<number | "all">("all")
  const [reportsData, setReportsData] = React.useState<ReportsData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const loadReports = React.useCallback(async () => {
    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, selectedRegisterId])

  React.useEffect(() => {
    fetchRegisters()
    fetchSettings()
    loadReports()
  }, [fetchRegisters, fetchSettings, loadReports])

  const currency = reportsData?.summary?.currency || settings?.currency || "ج.م"
  const summary = reportsData?.summary

  // فلاتر المواعيد السريعة
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

  // طباعة تقرير إغلاق الوردية
  const handlePrint = () => {
    window.print()
  }

  return (
    <PageContainer
      title="تقارير المبيعات وإغلاق الوردية (Z-Report)"
      description="تحليل شامل لحركة الإيرادات، طرق الدفع، مبيعات الأقسام، وحركة الخزائن المالية"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 h-8.5 px-3 rounded-lg border-border/60 hover:bg-muted text-xs font-medium"
          >
            <PrinterIcon className="size-3.5 text-primary" />
            <span>طباعة التقرير</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={loadReports}
            disabled={isLoading}
            className="gap-1.5 h-8.5 px-3 rounded-lg font-semibold shadow-xs text-xs"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث التقرير</span>
          </Button>
        </div>
      }
    >
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
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-xs w-36 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground whitespace-nowrap">إلى:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
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

      {/* المؤشرات المالية الإجمالية للفترة الموحدة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <DollarSignIcon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">إجمالي مبيعات الفترة</p>
            <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
              {(summary?.total_sales ?? 0).toLocaleString()} {currency}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ShoppingBagIcon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">الطلبات المكتملة</p>
            <p className="text-lg sm:text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
              {summary?.orders_count ?? 0} طلب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ReceiptIcon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">الضرائب المحسوبة</p>
            <p className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {(summary?.total_tax ?? 0).toLocaleString()} {currency}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TruckIcon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">رسوم التوصيل</p>
            <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {(summary?.total_delivery_fees ?? 0).toLocaleString()} {currency}
            </p>
          </div>
        </div>
      </div>

      {/* تفاصيل طرق الدفع وأنواع الطلبات */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* طرق الدفع */}
        <Card className="rounded-xl border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BanknoteIcon className="size-4 text-primary" />
              <span>المبيعات بحسب طريقة السداد</span>
            </CardTitle>
            <CardDescription className="text-xs">توزيع المقبوضات بين النقد والبطاقات والتحويلات</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-bold">
                  نقدي
                </div>
                <div>
                  <div className="text-sm font-bold">دفع نقدي (كاش)</div>
                  <div className="text-xs text-muted-foreground">{reportsData?.by_payment_method?.cash?.count ?? 0} عملية</div>
                </div>
              </div>
              <span className="font-mono font-black text-sm">
                {(reportsData?.by_payment_method?.cash?.total ?? 0).toLocaleString()} {currency}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 font-bold">
                  شبكة
                </div>
                <div>
                  <div className="text-sm font-bold">بطاقة بنكية / فيزا</div>
                  <div className="text-xs text-muted-foreground">{reportsData?.by_payment_method?.card?.count ?? 0} عملية</div>
                </div>
              </div>
              <span className="font-mono font-black text-sm">
                {(reportsData?.by_payment_method?.card?.total ?? 0).toLocaleString()} {currency}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 font-bold">
                  تحويل
                </div>
                <div>
                  <div className="text-sm font-bold">تحويل بنكي / محفظة</div>
                  <div className="text-xs text-muted-foreground">{reportsData?.by_payment_method?.transfer?.count ?? 0} عملية</div>
                </div>
              </div>
              <span className="font-mono font-black text-sm">
                {(reportsData?.by_payment_method?.transfer?.total ?? 0).toLocaleString()} {currency}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* أنواع الطلبات */}
        <Card className="rounded-xl border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingBagIcon className="size-4 text-amber-500" />
              <span>المبيعات بحسب قنوات الطلب</span>
            </CardTitle>
            <CardDescription className="text-xs">توزيع الطلبات بين الصالة والتوصيل والاستلام الخارجي</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <ArmchairIcon className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">طلبات الصالة (طاولات)</div>
                  <div className="text-xs text-muted-foreground">{reportsData?.by_order_type?.dinein?.count ?? 0} طلب</div>
                </div>
              </div>
              <span className="font-mono font-black text-sm">
                {(reportsData?.by_order_type?.dinein?.total ?? 0).toLocaleString()} {currency}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <TruckIcon className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">طلبات التوصيل (دليفري)</div>
                  <div className="text-xs text-muted-foreground">{reportsData?.by_order_type?.delivery?.count ?? 0} طلب</div>
                </div>
              </div>
              <span className="font-mono font-black text-sm">
                {(reportsData?.by_order_type?.delivery?.total ?? 0).toLocaleString()} {currency}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                  <ShoppingBagIcon className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">طلبات الاستلام (تيك أواي)</div>
                  <div className="text-xs text-muted-foreground">{reportsData?.by_order_type?.takeaway?.count ?? 0} طلب</div>
                </div>
              </div>
              <span className="font-mono font-black text-sm">
                {(reportsData?.by_order_type?.takeaway?.total ?? 0).toLocaleString()} {currency}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تقرير إغلاق الوردية للخزائن (Z-Report Shift Summary) */}
      <Card className="rounded-xl border-border/60 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <LandmarkIcon className="size-4 text-primary" />
                <span>تقرير حركة الخزائن وإغلاق الوردية (Z-Report)</span>
              </CardTitle>
              <CardDescription className="text-xs">المتحصلات والمدفوعات وصافي التدفق النقدي لكل خزنة في الفترة</CardDescription>
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
    </PageContainer>
  )
}
