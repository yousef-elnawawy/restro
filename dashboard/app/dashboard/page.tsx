"use client"

import * as React from "react"
import Link from "next/link"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { PageContainer } from "@/components/page-container"
import { useSettingStore } from "@/store/setting.store"
import {
  getDashboardStatsApi,
  type DashboardStatsData,
} from "@/lib/api"

import {
  TrendingUpIcon,
  DollarSignIcon,
  ShoppingBagIcon,
  UtensilsCrossedIcon,
  TruckIcon,
  ClockIcon,
  UsersIcon,
  PlusIcon,
  ChefHatIcon,
  CheckCircle2Icon,
  BikeIcon,
  FlameIcon,
  ArrowUpRightIcon,
  PhoneIcon,
  SparklesIcon,
  ReceiptIcon,
  RefreshCwIcon,
  Loader2Icon,
  ArmchairIcon,
  AlertCircleIcon,
  BarChart3Icon,
} from "lucide-react"

const hourlyChartConfig = {
  sales: {
    label: "المبيعات",
    color: "var(--primary)",
  },
} satisfies ChartConfig

const weeklyChartConfig = {
  sales: {
    label: "المبيعات",
    color: "oklch(0.48 0.145 125)",
  },
  expenses: {
    label: "المشتريات / المصاريف",
    color: "oklch(0.80 0.16 82)",
  },
} satisfies ChartConfig

export default function DashboardPage() {
  const { settings, fetchSettings } = useSettingStore()
  const [statsData, setStatsData] = React.useState<DashboardStatsData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const loadStats = React.useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const res = await getDashboardStatsApi()
      if (res.success && res.data) {
        setStatsData(res.data)
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    fetchSettings()
    loadStats()
  }, [fetchSettings, loadStats])

  const currency = statsData?.summary?.currency || settings?.currency || "ج.م"
  const summary = statsData?.summary

  // حساب نسب إشغال الصالة
  const totalTables = summary?.tables.total || 0
  const occupiedTables = summary?.tables.occupied || 0
  const tableOccupancyPercent = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0

  return (
    <PageContainer
      title="لوحة المتابعة التشغيلية"
      description="متابعة فورية ومباشرة للمبيعات، الطاولات، طلبات المطبخ، وأسطول التوصيل"
      className="gap-4 pb-6"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStats(true)}
            disabled={isRefreshing || isLoading}
            className="gap-1.5 h-8.5 px-3 rounded-lg border-border/60 hover:bg-muted text-xs"
            title="تحديث البيانات اللحظية"
          >
            <RefreshCwIcon className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>

          <Link href="/dashboard/kitchen">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8.5 px-3 rounded-lg border-border/60 hover:bg-muted text-xs font-medium"
            >
              <ChefHatIcon className="size-3.5 text-amber-500" />
              <span>شاشة المطبخ</span>
            </Button>
          </Link>

          <Link href="/dashboard/pos">
            <Button
              size="sm"
              className="gap-1.5 h-8.5 px-3.5 font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs"
            >
              <ReceiptIcon className="size-3.5" />
              <span>الكاشير (POS)</span>
            </Button>
          </Link>
        </div>
      }
    >
      {/* ===================== كروت المؤشرات العلوية (KPIs) ===================== */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* مبيعات اليوم */}
        <Card className="p-4 sm:p-4.5 transition-all hover:bg-card/80 rounded-xl border-border/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              إجمالي مبيعات اليوم
            </span>
            <div className="flex size-8.5 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DollarSignIcon className="size-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            {isLoading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                {(summary?.today_sales ?? 0).toLocaleString()} {currency}
              </span>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                <TrendingUpIcon className="size-3 me-0.5" />
                اليوم
              </span>
              <span className="text-muted-foreground truncate">
                الكل: {(summary?.all_time_sales ?? 0).toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </Card>

        {/* الطلبات النشطة */}
        <Card className="p-4 sm:p-4.5 transition-all hover:bg-card/80 rounded-xl border-border/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              طلبات اليوم
            </span>
            <div className="flex size-8.5 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingBagIcon className="size-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            {isLoading ? (
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                {summary?.today_orders_count ?? 0} طلب
              </span>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{summary?.today_dinein_count ?? 0} صالة</span>
              <span>•</span>
              <span className="font-semibold text-foreground">{summary?.today_delivery_count ?? 0} توصيل</span>
              <span>•</span>
              <span className="font-semibold text-foreground">{summary?.today_takeaway_count ?? 0} استلام</span>
            </div>
          </div>
        </Card>

        {/* إشغال الصالة */}
        <Card className="p-4 sm:p-4.5 transition-all hover:bg-card/80 rounded-xl border-border/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              إشغال طاولات الصالة
            </span>
            <div className="flex size-8.5 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UtensilsCrossedIcon className="size-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            {isLoading ? (
              <div className="h-7 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                {occupiedTables} / {totalTables} طاولة
              </span>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-bold ${
                occupiedTables > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}>
                {tableOccupancyPercent}٪ إشغال
              </span>
              <span className="text-muted-foreground truncate">
                ({summary?.tables.available ?? 0} شاغرة)
              </span>
            </div>
          </div>
        </Card>

        {/* أسطول التوصيل والعملاء */}
        <Card className="p-4 sm:p-4.5 transition-all hover:bg-card/80 rounded-xl border-border/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              المناديب والعملاء
            </span>
            <div className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TruckIcon className="size-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            {isLoading ? (
              <div className="h-7 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                {summary?.drivers.available ?? 0} مندوب متاح
              </span>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{summary?.total_customers ?? 0} عميل</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{summary?.new_customers_30d ?? 0} جديد</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ===================== الرسوم البيانية التشغيلية ===================== */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* رسم حركة المبيعات بالساعات */}
        <Card className="lg:col-span-4 rounded-xl border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-bold">حركة المبيعات خلال اليوم</CardTitle>
              <CardDescription className="text-xs">توزيع المبيعات بالجنيه عبر ساعات العمل</CardDescription>
            </div>
            <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20 text-xs">
              <ClockIcon className="size-3" />
              <span>اليوم</span>
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-[260px] flex items-center justify-center">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : statsData?.hourly_sales && statsData.hourly_sales.length > 0 ? (
              <ChartContainer config={hourlyChartConfig} className="h-[260px] w-full">
                <AreaChart
                  data={statsData.hourly_sales}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground font-medium"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(v) => `${v}`}
                  />
                  <ChartTooltip
                    cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        formatter={(value: any) => `${Number(value).toLocaleString()} ${currency}`}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#fillSales)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground text-sm">
                <ShoppingBagIcon className="size-8 stroke-[1.5] mb-2 opacity-40" />
                <p>لا توجد مبيعات مسجلة حتى الآن اليوم</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border/40 py-3 text-xs text-muted-foreground">
            <span>ذروة الإقبال تتزامن مع أوقات الغداء والعشاء</span>
            <Link href="/dashboard/orders" className="text-primary hover:underline font-semibold flex items-center gap-1">
              عرض سجل الطلبات
              <ArrowUpRightIcon className="size-3" />
            </Link>
          </CardFooter>
        </Card>

        {/* رسم الأداء المالي الأسبوعي (المبيعات مقابل المصروفات) */}
        <Card className="lg:col-span-3 rounded-xl border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-bold">المبيعات مقابل المصروفات</CardTitle>
              <CardDescription className="text-xs">مقارنة حركة الإيرادات وسندات الصرف في ٧ أيام</CardDescription>
            </div>
            <Link href="/dashboard/reports">
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                التقرير المالي
              </Badge>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="h-[260px] flex items-center justify-center">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : statsData?.weekly_finance && statsData.weekly_finance.length > 0 ? (
              <ChartContainer config={weeklyChartConfig} className="h-[260px] w-full">
                <BarChart
                  data={statsData.weekly_finance}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground font-medium"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(v) => `${v}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        formatter={(value: any) => `${Number(value).toLocaleString()} ${currency}`}
                      />
                    }
                  />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground text-sm">
                <BarChart3Icon className="size-8 stroke-[1.5] mb-2 opacity-40" />
                <p>لا توجد بيانات أسبوعية كافية بعد</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t border-border/40 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[oklch(0.48_0.145_125)]" /> مبيعات
              <span className="size-2 rounded-full bg-[oklch(0.80_0.16_82)] ms-2" /> مصروفات وسندات
            </span>
            <Link href="/dashboard/registers" className="text-primary hover:underline font-semibold">
              الخزائن المالية
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* ===================== أقسام المتابعة المباشرة ===================== */}
      <Tabs defaultValue="orders" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-muted/80 p-1 rounded-xl h-11">
            <TabsTrigger value="orders" className="rounded-lg gap-2 text-xs sm:text-sm font-semibold">
              <ShoppingBagIcon className="size-4" />
              <span>الطلبات الجارية ({statsData?.active_orders?.length ?? 0})</span>
            </TabsTrigger>
            <TabsTrigger value="dishes" className="rounded-lg gap-2 text-xs sm:text-sm font-semibold">
              <FlameIcon className="size-4 text-amber-500" />
              <span>الأطباق الأكثر طلباً</span>
            </TabsTrigger>
            <TabsTrigger value="tables" className="rounded-lg gap-2 text-xs sm:text-sm font-semibold">
              <ArmchairIcon className="size-4 text-blue-500" />
              <span>طاولات الصالة</span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="rounded-lg gap-2 text-xs sm:text-sm font-semibold">
              <TruckIcon className="size-4 text-emerald-500" />
              <span>أسطول التوصيل</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/pos">
              <Button size="sm" variant="default" className="gap-1.5 rounded-xl font-medium shadow-xs">
                <PlusIcon className="size-4" />
                <span>إضافة طلب جديد</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. تبويب الطلبات النشطة */}
        <TabsContent value="orders" className="space-y-4 m-0">
          <Card className="rounded-xl border-border/60 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">الطلبات قيد المتابعة والتجهيز</CardTitle>
                  <CardDescription className="text-xs">تحديث مباشر بحالة الطلبات النشطة في الصالة والتوصيل والاستلام</CardDescription>
                </div>
                <Link href="/dashboard/orders">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 font-semibold text-primary">
                    عرض كل الطلبات
                    <ArrowUpRightIcon className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2Icon className="size-5 animate-spin text-primary" />
                  <span>جاري تحميل الطلبات...</span>
                </div>
              ) : statsData?.active_orders && statsData.active_orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-border/60 hover:bg-transparent">
                        <TableHead className="text-right font-bold text-xs py-3.5">رقم الطلب</TableHead>
                        <TableHead className="text-right font-bold text-xs">العميل / الطاولة</TableHead>
                        <TableHead className="text-right font-bold text-xs">النوع</TableHead>
                        <TableHead className="text-right font-bold text-xs">الأصناف</TableHead>
                        <TableHead className="text-right font-bold text-xs">الإجمالي</TableHead>
                        <TableHead className="text-right font-bold text-xs">الوقت</TableHead>
                        <TableHead className="text-center font-bold text-xs">الحالة</TableHead>
                        <TableHead className="text-center font-bold text-xs">الإجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statsData.active_orders.map((order) => (
                        <TableRow key={order.order_id} className="border-border/40 hover:bg-muted/30">
                          <TableCell className="font-mono font-bold text-xs py-3 text-primary">
                            {order.id}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{order.customer}</div>
                            <div className="text-xs text-muted-foreground">{order.place}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-semibold border-0 ${
                                order.raw_type === "dinein"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : order.raw_type === "delivery"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              }`}
                            >
                              {order.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {order.items}
                          </TableCell>
                          <TableCell className="font-extrabold text-sm text-foreground">
                            {order.total}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {order.time}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-xs px-2.5 py-0.5 rounded-full ${
                                order.status === "pending"
                                  ? "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30"
                                  : order.status === "preparing"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                  : order.status === "ready"
                                  ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30"
                                  : order.status === "out_for_delivery"
                                  ? "bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-600/30"
                                  : "bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30"
                              }`}
                            >
                              {order.status === "pending" && "جديد"}
                              {order.status === "preparing" && "جاري التحضير"}
                              {order.status === "ready" && "جاهز"}
                              {order.status === "out_for_delivery" && "خرج للتوصيل"}
                              {order.status === "served" && "تم التقديم"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Link href={`/dashboard/pos?orderId=${order.order_id}`}>
                              <Button size="xs" variant="outline" className="text-xs h-7 rounded-lg">
                                تفاصيل / دفع
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <CheckCircle2Icon className="size-10 text-emerald-500 mb-2 stroke-[1.5]" />
                  <p className="font-medium">لا توجد طلبات نشطة في الوقت الحالي</p>
                  <p className="text-xs text-muted-foreground mt-1">جميع الطلبات مكتملة أو تم سدادها</p>
                  <Link href="/dashboard/pos" className="mt-4">
                    <Button size="sm" className="rounded-xl">إنشاء طلب في الكاشير</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. تبويب الأطباق الأكثر مبيعاً */}
        <TabsContent value="dishes" className="space-y-4 m-0">
          <Card className="rounded-xl border-border/60 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">الأطباق الأكثر طلباً ومبيعاً</CardTitle>
                  <CardDescription className="text-xs">ترتيب الأصناف بحسب عدد مرات الطلب والإيرادات المحققة</CardDescription>
                </div>
                <Link href="/dashboard/menu/products">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 font-semibold text-primary">
                    إدارة قائمة الأصناف
                    <ArrowUpRightIcon className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2Icon className="size-5 animate-spin text-primary" />
                  <span>جاري تحليل بيانات المبيعات...</span>
                </div>
              ) : statsData?.top_dishes && statsData.top_dishes.length > 0 ? (
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="text-right font-bold text-xs py-3.5">اسم الصنف</TableHead>
                      <TableHead className="text-right font-bold text-xs">التصنيف</TableHead>
                      <TableHead className="text-center font-bold text-xs">عدد الطلبات</TableHead>
                      <TableHead className="text-right font-bold text-xs">إجمالي الإيرادات</TableHead>
                      <TableHead className="text-right font-bold text-xs w-48">نسبة الطلب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statsData.top_dishes.map((dish, i) => (
                      <TableRow key={dish.name} className="border-border/40 hover:bg-muted/30">
                        <TableCell className="font-semibold text-sm py-3.5 flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {i + 1}
                          </span>
                          <span>{dish.name}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {dish.category}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-sm">
                          {dish.orders}
                        </TableCell>
                        <TableCell className="font-extrabold text-sm text-foreground">
                          {dish.revenue}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${dish.percent}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground w-8">
                              {dish.percent}٪
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <FlameIcon className="size-10 text-amber-500 mb-2 stroke-[1.5]" />
                  <p className="font-medium">لم يتم تسجيل طلبات مبيعات كافية لتحليل الأصناف بعد</p>
                  <p className="text-xs text-muted-foreground mt-1">ستظهر الأصناف الأكثر طلباً تلقائياً مع تسجيل الطلبات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. تبويب حالة الطاولات */}
        <TabsContent value="tables" className="space-y-4 m-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-base">مخطط إشغال الصالة الفعلي</h3>
              <p className="text-xs text-muted-foreground">عرض فوري لحالة كل طاولة والفاتورة المفتوحة عليها</p>
            </div>
            <Link href="/dashboard/tables">
              <Button variant="outline" size="sm" className="text-xs gap-1 rounded-xl">
                إدارة الصالة والطاولات
                <ArrowUpRightIcon className="size-3.5" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2Icon className="size-5 animate-spin text-primary" />
              <span>جاري جلب بيانات الطاولات...</span>
            </div>
          ) : statsData?.tables && statsData.tables.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {statsData.tables.map((tbl) => (
                <Card
                  key={tbl.id}
                  className={`p-4 rounded-xl border transition-all ${
                    tbl.status === "occupied"
                      ? "bg-amber-500/5 border-amber-500/40 hover:border-amber-500/70"
                      : tbl.status === "reserved"
                      ? "bg-blue-500/5 border-blue-500/40 hover:border-blue-500/70"
                      : "bg-card border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{tbl.id}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 border-0 ${
                        tbl.status === "occupied"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold"
                          : tbl.status === "reserved"
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold"
                      }`}
                    >
                      {tbl.status === "occupied" ? "مشغولة" : tbl.status === "reserved" ? "محجوزة" : "شاغرة"}
                    </Badge>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{tbl.seats} مقاعد</span>
                    <span className="font-mono text-[11px]">{tbl.time}</span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[90px]">
                      {tbl.orderId}
                    </span>
                    <span className="font-extrabold text-xs text-foreground">
                      {tbl.bill}
                    </span>
                  </div>

                  {tbl.status === "occupied" ? (
                    <Link href={`/dashboard/pos?tableId=${tbl.table_id}`} className="mt-2.5 block">
                      <Button size="xs" variant="outline" className="w-full text-[11px] h-7 rounded-lg">
                        عرض الفاتورة
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/dashboard/pos?tableId=${tbl.table_id}`} className="mt-2.5 block">
                      <Button size="xs" variant="ghost" className="w-full text-[11px] h-7 rounded-lg hover:bg-primary/10 hover:text-primary">
                        فتح طلب
                      </Button>
                    </Link>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              لا توجد طاولات مضافة بعد. يمكنك إضافة طاولات من صفحة إدارة الطاولات.
            </div>
          )}
        </TabsContent>

        {/* 4. تبويب أسطول التوصيل */}
        <TabsContent value="fleet" className="space-y-4 m-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-base">حالة مناديب التوصيل الحالية</h3>
              <p className="text-xs text-muted-foreground">متابعة موقع وحالة كل مندوب وسرعة إيصال الطلبات</p>
            </div>
            <Link href="/dashboard/delivery">
              <Button variant="outline" size="sm" className="text-xs gap-1 rounded-xl">
                إدارة المناديب
                <ArrowUpRightIcon className="size-3.5" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2Icon className="size-5 animate-spin text-primary" />
              <span>جاري جلب بيانات المناديب...</span>
            </div>
          ) : statsData?.delivery_fleet && statsData.delivery_fleet.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {statsData.delivery_fleet.map((driver) => (
                <Card key={driver.driver_id} className="p-4 rounded-xl border-border/60 hover:bg-card/80 transition-all shadow-xs">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BikeIcon className="size-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{driver.driver}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <PhoneIcon className="size-2.5" />
                          <span>{driver.phone}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold border-0 ${
                        driver.raw_status === "on_delivery"
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                          : driver.raw_status === "available"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {driver.status}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>المركبة:</span>
                      <span className="font-medium text-foreground">{driver.vehicle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>الطلب الجاري:</span>
                      <span className="font-mono font-bold text-primary">{driver.order}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>الوقت / الوجهة:</span>
                      <span className="truncate max-w-[130px] font-medium text-foreground">{driver.destination}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              لا يوجد مناديب توصيل مسجلين بعد. يمكنك إضافة مناديب من صفحة إدارة التوصيل.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
