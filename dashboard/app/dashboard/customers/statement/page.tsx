"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PageContainer } from "@/components/page-container"
import {
  type Customer,
  type CustomerStatementData,
  getCustomersApi,
  getCustomerStatementApi,
} from "@/lib/api"
import { useSettingStore } from "@/store/setting.store"
import { QuickVoucherDialog } from "@/components/quick-voucher-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { ComboboxSelect } from "@/components/ui/combobox-select"
import {
  UsersIcon,
  RefreshCwIcon,
  PrinterIcon,
  SearchIcon,
  PhoneIcon,
  CoinsIcon,
  ArrowDownLeftIcon,
  ShoppingBagIcon,
  WalletIcon,
  ArrowRightIcon,
  PlusIcon,
} from "lucide-react"

export default function CustomerStatementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramId = searchParams.get("id")

  const currency = useSettingStore((state) => state.settings?.currency) || "ج.م"
  const restaurantName = useSettingStore((state) => state.settings?.restaurant_name) || "مطعمنا"
  const restaurantAddress = useSettingStore((state) => state.settings?.restaurant_address) || ""
  const restaurantPhone = useSettingStore((state) => state.settings?.restaurant_phone) || ""

  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<number>(0)
  const [isLoadingStatement, setIsLoadingStatement] = React.useState(false)
  const [statementData, setStatementData] = React.useState<CustomerStatementData | null>(null)

  // Filters
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activePreset, setActivePreset] = React.useState<string>("all")

  // Quick Voucher Dialog
  const [voucherDialogOpen, setVoucherDialogOpen] = React.useState(false)

  // 1. Fetch all customers
  React.useEffect(() => {
    getCustomersApi({ is_active: true }).then((res) => {
      if (res.success && res.data) {
        setCustomers(res.data)
        if (paramId) {
          setSelectedCustomerId(Number(paramId))
        } else if (res.data.length > 0) {
          setSelectedCustomerId(res.data[0].id)
        }
      }
    })
  }, [paramId])

  // 2. Fetch Statement for selected customer
  const loadStatement = React.useCallback(async () => {
    if (!selectedCustomerId) return
    setIsLoadingStatement(true)
    const res = await getCustomerStatementApi(selectedCustomerId, {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
    })
    setIsLoadingStatement(false)
    if (res.success && res.data) {
      setStatementData(res.data)
    }
  }, [selectedCustomerId, dateFrom, dateTo, typeFilter])

  React.useEffect(() => {
    if (selectedCustomerId) {
      loadStatement()
    }
  }, [selectedCustomerId, loadStatement])

  const applyPreset = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "all") => {
    setActivePreset(preset)
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split("T")[0]

    if (preset === "today") {
      const d = formatDate(today)
      setDateFrom(d)
      setDateTo(d)
    } else if (preset === "yesterday") {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      const d = formatDate(y)
      setDateFrom(d)
      setDateTo(d)
    } else if (preset === "last7") {
      const past = new Date(today)
      past.setDate(past.getDate() - 6)
      setDateFrom(formatDate(past))
      setDateTo(formatDate(today))
    } else if (preset === "thisMonth") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      setDateFrom(formatDate(firstDay))
      setDateTo(formatDate(today))
    } else {
      setDateFrom("")
      setDateTo("")
    }
  }

  const handleCustomerChange = (idStr: string) => {
    const id = Number(idStr)
    setSelectedCustomerId(id)
    router.replace(`/dashboard/customers/statement?id=${id}`)
  }

  const customer = statementData?.customer
  const summary = statementData?.summary
  const ledger = statementData?.ledger || []

  // Local text search
  const filteredLedger = React.useMemo(() => {
    if (!searchQuery.trim()) return ledger
    const q = searchQuery.toLowerCase()
    return ledger.filter(
      (entry) =>
        entry.reference?.toLowerCase().includes(q) ||
        entry.title?.toLowerCase().includes(q) ||
        entry.description?.toLowerCase().includes(q) ||
        entry.notes?.toLowerCase().includes(q)
    )
  }, [ledger, searchQuery])

  const balance = Number(customer?.balance || 0)
  const isDebt = balance < 0
  const isCredit = balance > 0

  return (
    <PageContainer
      title={customer ? `كشف حساب: ${customer.name}` : "كشف حساب العميل"}
      description="سجل فواتير الطلبات، مدفوعات العميل، ورصيد المديونية التراكمي"
      action={
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/customers")}
            className="h-8.5 px-2.5 rounded-lg text-xs gap-1"
          >
            <ArrowRightIcon className="size-3.5" />
            <span>العملاء</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={!statementData}
            className="h-8.5 rounded-lg text-xs gap-1.5"
          >
            <PrinterIcon className="size-3.5" />
            <span>طباعة</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadStatement}
            disabled={isLoadingStatement}
            className="h-8.5 rounded-lg text-xs gap-1.5"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoadingStatement ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          {customer && (
            <Button
              size="sm"
              onClick={() => setVoucherDialogOpen(true)}
              className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PlusIcon className="size-3.5" />
              <span>سند قبض</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* PRINT HEADER */}
        <div className="hidden print:block mb-4 border-b pb-3 text-center">
          <h2 className="text-base font-bold">{restaurantName}</h2>
          {restaurantAddress && <p className="text-xs text-muted-foreground">{restaurantAddress}</p>}
          <h3 className="text-sm font-bold mt-1">
            كشف حساب العميل: {customer?.name || ""} {customer?.phone ? `(${customer.phone})` : ""}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            الفترة: {dateFrom ? `من ${dateFrom}` : "البداية"} {dateTo ? `إلى ${dateTo}` : "حتى الآن"} — تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}
          </p>
        </div>

        {/* 1. SELECTION & FILTER BAR */}
        <div className="p-3 rounded-xl bg-card border border-border/60 shadow-xs space-y-2.5 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Customer Select */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <span className="text-xs text-muted-foreground whitespace-nowrap">العميل:</span>
              <div className="flex-1">
                <ComboboxSelect
                  value={String(selectedCustomerId)}
                  onValueChange={handleCustomerChange}
                  options={customers.map((c) => ({
                    value: String(c.id),
                    label: `${c.name} ${c.phone ? `(${c.phone})` : ""} - الرصيد: ${Number(c.balance).toLocaleString("ar-EG")} ${currency}`,
                  }))}
                  placeholder="ابحث عن العميل..."
                  searchPlaceholder="اكتب اسم أو هاتف العميل..."
                  emptyText="لا يوجد عملاء بهذا الاسم"
                  className="h-8.5 text-xs rounded-lg w-full"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
              {[
                { id: "today", label: "اليوم" },
                { id: "yesterday", label: "أمس" },
                { id: "last7", label: "7 أيام" },
                { id: "thisMonth", label: "الشهر" },
                { id: "all", label: "الكل" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id as any)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    activePreset === p.id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-border/40">
            {/* Search */}
            <div className="relative flex-1">
              <SearchIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="بحث في فواتير وسندات العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8 h-8 text-xs rounded-lg"
              />
            </div>

            {/* Movement Type */}
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40">
              {[
                { id: "all", label: "الكل" },
                { id: "orders", label: "فواتير فقط" },
                { id: "vouchers", label: "سندات فقط" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-2 py-1 text-[11px] rounded-md transition-colors ${
                    typeFilter === t.id
                      ? "bg-card text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Date Inputs */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>من:</span>
              <DatePicker
                value={dateFrom}
                onChange={(val) => {
                  setDateFrom(val)
                  setActivePreset("custom")
                }}
                placeholder="من تاريخ"
                className="h-8 text-xs rounded-lg w-34"
              />
              <span>إلى:</span>
              <DatePicker
                value={dateTo}
                onChange={(val) => {
                  setDateTo(val)
                  setActivePreset("custom")
                }}
                placeholder="إلى تاريخ"
                className="h-8 text-xs rounded-lg w-34"
              />
            </div>
          </div>
        </div>

        {/* 2. STATS CARDS */}
        {summary && customer && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Balance */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                  isDebt
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : isCredit
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <WalletIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {isDebt ? "مديونية مستحقة (عليه)" : isCredit ? "رصيد متبقي للعميل (له)" : "الحساب خالص تماماً"}
                </p>
                <p
                  className={`text-base sm:text-lg font-bold tracking-tight font-mono ${
                    isDebt
                      ? "text-rose-600 dark:text-rose-400"
                      : isCredit
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {Math.abs(balance).toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal">{currency}</span>
                </p>
              </div>
            </div>

            {/* Total Orders */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShoppingBagIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">إجمالي الطلبات</p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-foreground font-mono">
                  {summary.total_orders_amount.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
                </p>
              </div>
            </div>

            {/* Total Paid */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeftIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">إجمالي المسدد</p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                  {summary.total_payments_amount.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal">{currency}</span>
                </p>
              </div>
            </div>

            {/* Orders Count */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CoinsIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">عدد الطلبات</p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-foreground font-mono">
                  {summary.total_orders_count}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">طلب</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. TABLE */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs">
                  <TableHead className="text-start font-semibold">التاريخ والوقت</TableHead>
                  <TableHead className="text-start font-semibold">نوع المعاملة</TableHead>
                  <TableHead className="text-start font-semibold">رقم المرجع</TableHead>
                  <TableHead className="text-start font-semibold">البيان</TableHead>
                  <TableHead className="text-center font-bold text-rose-600 dark:text-rose-400">مطلوب / مشتريات (عليه)</TableHead>
                  <TableHead className="text-center font-bold text-emerald-600 dark:text-emerald-400">مدفوع / سداد (منه)</TableHead>
                  <TableHead className="text-center font-bold">الرصيد المتبقي</TableHead>
                  <TableHead className="text-start font-semibold">حالة السداد</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoadingStatement ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      <RefreshCwIcon className="size-4 animate-spin inline-block ml-1 text-primary" />
                      جاري تحميل كشف الحساب...
                    </TableCell>
                  </TableRow>
                ) : filteredLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      لا توجد حركات مسجلة لهذا العميل في الفترة المحددة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedger.map((item, idx) => {
                    const isOrder = item.type === "order"
                    const isReceipt = item.voucher_type === "receipt"

                    return (
                      <TableRow key={item.id || idx} className="text-xs hover:bg-muted/20">
                        <TableCell className="p-2.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                          {item.date}
                        </TableCell>

                        <TableCell className="p-2.5 whitespace-nowrap">
                          {isOrder ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-primary/10 text-primary border-primary/20">
                              طلب #{item.reference}
                            </Badge>
                          ) : isReceipt ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              سند تحصيل
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                              سند صرف
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="p-2.5 font-mono font-medium text-foreground whitespace-nowrap">
                          {item.reference}
                        </TableCell>

                        <TableCell className="p-2.5 max-w-xs">
                          <p className="text-foreground truncate">
                            {item.title || item.description || "معاملة مالية"}
                          </p>
                          {item.notes && (
                            <p className="text-[10px] text-muted-foreground truncate">{item.notes}</p>
                          )}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono font-semibold whitespace-nowrap text-rose-600 dark:text-rose-400">
                          {item.debit > 0 ? `+${item.debit.toLocaleString("ar-EG")}` : "—"}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono font-semibold whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                          {item.credit > 0 ? `-${item.credit.toLocaleString("ar-EG")}` : "—"}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono font-bold whitespace-nowrap bg-muted/15">
                          <span
                            className={
                              item.running_balance < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : item.running_balance > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }
                          >
                            {Math.abs(item.running_balance).toLocaleString("ar-EG")} {currency}{" "}
                            {item.running_balance < 0 ? "(عليه)" : item.running_balance > 0 ? "(له)" : "(خالص)"}
                          </span>
                        </TableCell>

                        <TableCell className="p-2.5 whitespace-nowrap text-muted-foreground">
                          {item.payment_status === "paid" ? (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">مسدد</span>
                          ) : item.payment_status === "partial" ? (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">مسدد جزئياً</span>
                          ) : item.payment_status === "unpaid" ? (
                            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">غير مسدد</span>
                          ) : (
                            <span className="text-[11px]">
                              {item.register_name || "—"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* PRINT FOOTER */}
        <div className="hidden print:flex justify-between items-end mt-12 pt-6 border-t text-xs">
          <div className="text-center w-40">
            <p className="font-semibold mb-6">العميل</p>
            <p className="border-t border-dashed pt-1">التوقيع: .................</p>
          </div>
          <div className="text-center w-40">
            <p className="font-semibold mb-6">إدارة المطعم</p>
            <p className="border-t border-dashed pt-1">الاعتماد: .................</p>
          </div>
        </div>
      </div>

      {/* Quick Collect Voucher Dialog */}
      <QuickVoucherDialog
        open={voucherDialogOpen}
        onOpenChange={setVoucherDialogOpen}
        initialType="receipt"
        preselectedCustomerId={selectedCustomerId}
        onSuccess={() => {
          loadStatement()
        }}
      />
    </PageContainer>
  )
}
