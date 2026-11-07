"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PageContainer } from "@/components/page-container"
import {
  type CashRegister,
  type CashRegisterStatementResponse,
  getCashRegistersApi,
  getCashRegisterStatementApi,
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
  LandmarkIcon,
  RefreshCwIcon,
  PrinterIcon,
  SearchIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CoinsIcon,
  WalletIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  ArrowRightIcon,
} from "lucide-react"

export default function RegisterStatementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramId = searchParams.get("id")

  const currency = useSettingStore((state) => state.settings?.currency) || "ج.م"
  const restaurantName = useSettingStore((state) => state.settings?.restaurant_name) || "مطعمنا"
  const restaurantAddress = useSettingStore((state) => state.settings?.restaurant_address) || ""
  const restaurantPhone = useSettingStore((state) => state.settings?.restaurant_phone) || ""

  const [registers, setRegisters] = React.useState<CashRegister[]>([])
  const [selectedRegisterId, setSelectedRegisterId] = React.useState<number>(0)
  const [isLoadingStatement, setIsLoadingStatement] = React.useState(false)
  const [statementData, setStatementData] = React.useState<CashRegisterStatementResponse | null>(null)

  // Filters
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activePreset, setActivePreset] = React.useState<string>("all")

  // Quick Voucher Dialog
  const [voucherDialogOpen, setVoucherDialogOpen] = React.useState(false)
  const [voucherInitialType, setVoucherInitialType] = React.useState<"receipt" | "payment" | "expense">("expense")

  // 1. Fetch Registers
  React.useEffect(() => {
    getCashRegistersApi({ status: "all" }).then((res) => {
      if (res.success && res.data) {
        setRegisters(res.data)
        if (paramId) {
          setSelectedRegisterId(Number(paramId))
        } else {
          const def = res.data.find((r) => r.is_default) || res.data[0]
          if (def) setSelectedRegisterId(def.id)
        }
      }
    })
  }, [paramId])

  // 2. Fetch Statement for selected register
  const loadStatement = React.useCallback(async () => {
    if (!selectedRegisterId) return
    setIsLoadingStatement(true)
    const res = await getCashRegisterStatementApi(selectedRegisterId, {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
    })
    setIsLoadingStatement(false)
    if (res.success && res.data) {
      setStatementData(res.data)
    }
  }, [selectedRegisterId, dateFrom, dateTo, typeFilter])

  React.useEffect(() => {
    if (selectedRegisterId) {
      loadStatement()
    }
  }, [selectedRegisterId, loadStatement])

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

  const handleRegisterChange = (idStr: string) => {
    const id = Number(idStr)
    setSelectedRegisterId(id)
    router.replace(`/dashboard/registers/statement?id=${id}`)
  }

  const register = statementData?.register
  const summary = statementData?.summary
  const entries = statementData?.entries || []

  // Filter entries locally by search text
  const filteredEntries = React.useMemo(() => {
    if (!searchQuery.trim()) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter(
      (e) =>
        e.reference?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.type_label?.toLowerCase().includes(q) ||
        e.user_name?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q)
    )
  }, [entries, searchQuery])

  return (
    <PageContainer
      title={register ? `كشف حساب: ${register.name}` : "كشف حساب الخزنة"}
      description="متابعة رصيد أول المدة، إجمالي المقبوضات والمصروفات، والرصيد التراكمي للخزنة"
      action={
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/registers")}
            className="h-8.5 px-2.5 rounded-lg text-xs gap-1"
          >
            <ArrowRightIcon className="size-3.5" />
            <span>الخزائن</span>
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

          <Button
            size="sm"
            onClick={() => {
              setVoucherInitialType("expense")
              setVoucherDialogOpen(true)
            }}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PlusIcon className="size-3.5" />
            <span>سند مالي</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* PRINT HEADER */}
        <div className="hidden print:block mb-4 border-b pb-3 text-center">
          <h2 className="text-base font-bold">{restaurantName}</h2>
          {restaurantAddress && <p className="text-xs text-muted-foreground">{restaurantAddress}</p>}
          <h3 className="text-sm font-bold mt-1">
            كشف حساب الخزنة: {register?.name || ""}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            الفترة: {dateFrom ? `من ${dateFrom}` : "البداية"} {dateTo ? `إلى ${dateTo}` : "حتى الآن"} — تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}
          </p>
        </div>

        {/* 1. SELECTION & FILTER BAR */}
        <div className="p-3 rounded-xl bg-card border border-border/60 shadow-xs space-y-2.5 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Register Select */}
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <span className="text-xs text-muted-foreground whitespace-nowrap">الخزنة:</span>
              <div className="flex-1">
                <ComboboxSelect
                  value={String(selectedRegisterId)}
                  onValueChange={handleRegisterChange}
                  options={registers.map((r) => ({
                    value: String(r.id),
                    label: `${r.name} (${Number(r.balance).toLocaleString("ar-EG")} ${currency})${r.is_default ? " (الرئيسية)" : ""}`,
                  }))}
                  placeholder="اختر الخزنة..."
                  className="h-8.5 text-xs rounded-lg w-full"
                />
              </div>
            </div>

            {/* Presets */}
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
                placeholder="بحث في الحركات، البيان، المرجع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8 h-8 text-xs rounded-lg"
              />
            </div>

            {/* Movement Type */}
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40">
              {[
                { id: "all", label: "الكل" },
                { id: "income", label: "مقبوضات" },
                { id: "expense", label: "مدفوعات ومصاريف" },
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

        {/* 2. STATS CARDS (Matching Dashboard standard style) */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Opening Balance */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CoinsIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {dateFrom ? "رصيد بداية الفترة" : "رصيد أول المدة"}
                </p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-foreground font-mono">
                  {summary.opening_balance.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
                </p>
              </div>
            </div>

            {/* Total Income */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeftIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">إجمالي المقبوضات</p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                  +{summary.total_income.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal">{currency}</span>
                </p>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ArrowUpRightIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">إجمالي المصروفات</p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
                  -{summary.total_expenses.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal">{currency}</span>
                </p>
              </div>
            </div>

            {/* Net Flow */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <SlidersHorizontalIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">صافي الحركة</p>
                <p
                  className={`text-base sm:text-lg font-bold tracking-tight font-mono ${
                    summary.net_flow >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {summary.net_flow >= 0 ? "+" : ""}
                  {summary.net_flow.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal">{currency}</span>
                </p>
              </div>
            </div>

            {/* Current Balance */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-primary/30 shadow-xs col-span-2 sm:col-span-1">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <WalletIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-primary font-medium truncate">
                  {dateTo ? "رصيد نهاية الفترة" : "الرصيد الفعلي الحالي"}
                </p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-primary font-mono">
                  {(summary.closing_balance ?? summary.current_balance).toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal text-primary/80">{currency}</span>
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
                  <TableHead className="text-start font-semibold">المرجع</TableHead>
                  <TableHead className="text-start font-semibold">البيان والتفاصيل</TableHead>
                  <TableHead className="text-center font-bold text-emerald-600 dark:text-emerald-400">وارد / مقبوضات (+)</TableHead>
                  <TableHead className="text-center font-bold text-rose-600 dark:text-rose-400">منصرف / مدفوعات (-)</TableHead>
                  <TableHead className="text-center font-bold">رصيد الخزنة الفعلي</TableHead>
                  <TableHead className="text-start font-semibold">المسؤول</TableHead>
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
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      لا توجد حركات مسجلة لهذه الخزنة في الفترة المحددة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((item, idx) => {
                    const isCredit = item.credit > 0
                    const isDebit = item.debit > 0
                    const isOpening = item.type === "opening_balance"

                    return (
                      <TableRow key={item.id || idx} className="text-xs hover:bg-muted/20">
                        <TableCell className="p-2.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                          {item.date}
                        </TableCell>

                        <TableCell className="p-2.5 whitespace-nowrap">
                          {isOpening ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-muted">
                              رصيد أول المدة
                            </Badge>
                          ) : item.type === "pos_payment" ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              مبيعات كاشير
                            </Badge>
                          ) : item.type === "receipt" ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              سند قبض
                            </Badge>
                          ) : item.type === "expense" ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              مصروفات
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
                          <p className="text-foreground truncate">{item.description}</p>
                          {item.notes && (
                            <p className="text-[10px] text-muted-foreground truncate">{item.notes}</p>
                          )}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono font-semibold whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                          {isCredit ? `+${item.credit.toLocaleString("ar-EG")}` : "—"}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono font-semibold whitespace-nowrap text-rose-600 dark:text-rose-400">
                          {isDebit ? `-${item.debit.toLocaleString("ar-EG")}` : "—"}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono font-bold whitespace-nowrap text-foreground bg-muted/15">
                          {item.running_balance.toLocaleString("ar-EG")} {currency}
                        </TableCell>

                        <TableCell className="p-2.5 whitespace-nowrap text-muted-foreground">
                          {item.user_name || "النظام"}
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
            <p className="font-semibold mb-6">أمين الخزينة</p>
            <p className="border-t border-dashed pt-1">التوقيع: .................</p>
          </div>
          <div className="text-center w-40">
            <p className="font-semibold mb-6">مدير الحسابات</p>
            <p className="border-t border-dashed pt-1">الاعتماد: .................</p>
          </div>
        </div>
      </div>

      {/* Quick Voucher Dialog */}
      <QuickVoucherDialog
        open={voucherDialogOpen}
        onOpenChange={setVoucherDialogOpen}
        initialType={voucherInitialType}
        preselectedRegisterId={selectedRegisterId}
        onSuccess={() => {
          loadStatement()
        }}
      />
    </PageContainer>
  )
}
