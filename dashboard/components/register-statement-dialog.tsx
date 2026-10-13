"use client"

import * as React from "react"
import {
  type CashRegisterStatementResponse,
  type StatementEntry,
  getCashRegisterStatementApi,
} from "@/lib/api"
import { useSettingStore } from "@/store/setting.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  LandmarkIcon,
  PrinterIcon,
  RefreshCwIcon,
  CalendarIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ShoppingBagIcon,
  ReceiptIcon,
  CoinsIcon,
  ClockIcon,
  FilterIcon,
  UserIcon,
} from "lucide-react"

interface RegisterStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registerId: number | null
}

export function RegisterStatementDialog({
  open,
  onOpenChange,
  registerId,
}: RegisterStatementDialogProps) {
  const currency = useSettingStore((state) => state.settings?.currency) || "ج.م"
  const restaurantName = useSettingStore((state) => state.settings?.restaurant_name) || "مطعمنا"

  const [isLoading, setIsLoading] = React.useState(false)
  const [statementData, setStatementData] = React.useState<CashRegisterStatementResponse | null>(null)
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<"all" | "income" | "expense">("all")

  const loadStatement = React.useCallback(async () => {
    if (!registerId) return
    setIsLoading(true)
    const res = await getCashRegisterStatementApi(registerId, {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      type: typeFilter,
    })
    setIsLoading(false)
    if (res.success && res.data) {
      setStatementData(res.data)
    }
  }, [registerId, dateFrom, dateTo, typeFilter])

  React.useEffect(() => {
    if (open && registerId) {
      loadStatement()
    } else {
      setStatementData(null)
    }
  }, [open, registerId, loadStatement])

  const handlePrint = () => {
    window.print()
  }

  const register = statementData?.register
  const summary = statementData?.summary
  const entries = statementData?.entries || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl border border-border/80 bg-card print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none">
        {/* رأس النافذة */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 shrink-0 bg-muted/20 flex flex-row items-center justify-between gap-3 text-right print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LandmarkIcon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <span>كشف حساب الخزنة: {register?.name || "..."}</span>
                  {register?.is_default && (
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-bold">
                      الخزنة الرئيسية
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  سجل المعاملات والسيولة التراكمية مع حركة رصيد أول المدة والمقبوضات والمصروفات
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8.5 rounded-xl text-xs gap-1.5 font-bold border-border/70"
            >
              <PrinterIcon className="size-3.5" />
              <span>طباعة الكشف</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadStatement}
              disabled={isLoading}
              className="h-8.5 rounded-xl text-xs gap-1.5"
            >
              <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">تحديث</span>
            </Button>
          </div>
        </DialogHeader>

        {/* جسم كشف الحساب */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4 text-xs">
          {/* الترويسة المطبوعة (تظهر في الطباعة فقط) */}
          <div className="hidden print:block border-b-2 border-foreground/30 pb-3 mb-4 text-center">
            <h1 className="text-xl font-black">{restaurantName}</h1>
            <h2 className="text-sm font-bold text-muted-foreground mt-1">
              كشف حساب الخزنة: {register?.name} (الرصيد الافتتاحي: {Number(summary?.opening_balance || 0).toLocaleString("ar-EG")} {currency})
            </h2>
            <div className="text-xs text-muted-foreground mt-1 flex justify-center gap-4">
              <span>تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")} {new Date().toLocaleTimeString("ar-EG")}</span>
              {dateFrom && <span>من: {dateFrom}</span>}
              {dateTo && <span>إلى: {dateTo}</span>}
            </div>
          </div>

          {/* كروت الملخص المالي للحساب */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">رصيد أول المدة</span>
              <span className="font-mono font-bold text-sm sm:text-base text-foreground mt-1">
                {Number(summary?.opening_balance || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <ArrowDownLeftIcon className="size-3" />
                <span>إجمالي المقبوضات (+)</span>
              </span>
              <span className="font-mono font-bold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 mt-1">
                {Number(summary?.total_income || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <ArrowUpRightIcon className="size-3" />
                <span>إجمالي المصروفات (-)</span>
              </span>
              <span className="font-mono font-bold text-sm sm:text-base text-rose-600 dark:text-rose-400 mt-1">
                {Number(summary?.total_expenses || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">صافي الحركة</span>
              <span className={`font-mono font-bold text-sm sm:text-base mt-1 ${
                Number(summary?.net_flow || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}>
                {Number(summary?.net_flow || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 shadow-xs col-span-2 sm:col-span-1 flex flex-col justify-between">
              <span className="text-[11px] text-primary font-bold">الرصيد الحالي الفعلي</span>
              <span className="font-mono font-black text-base sm:text-lg text-primary mt-1">
                {Number(summary?.current_balance || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[10px] font-normal text-primary/80">{currency}</span>
              </span>
            </div>
          </div>

          {/* شريط الفلترة بالتاريخ ونوع الحركة (مخفي في الطباعة) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground font-medium">من:</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs w-32"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground font-medium">إلى:</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs w-32"
                />
              </div>

              {(dateFrom || dateTo) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom("")
                    setDateTo("")
                  }}
                  className="h-8 text-xs text-muted-foreground px-2"
                >
                  إلغاء التاريخ ✕
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  typeFilter === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الكل ({entries.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("income")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  typeFilter === "income" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                المقبوضات (+)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("expense")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  typeFilter === "expense" ? "bg-rose-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                المصروفات (-)
              </button>
            </div>
          </div>

          {/* جدول كشف الحساب التفصيلي */}
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <RefreshCwIcon className="size-6 animate-spin mx-auto text-primary" />
              <p className="text-xs">جارٍ تحميل كشف حساب الخزنة وحساب الأرصدة...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-card border border-border/60 rounded-xl">
              لا توجد حركات مسجلة على هذه الخزنة بالفترة المحددة.
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs">
              <div className="overflow-x-auto">
                <Table className="w-full text-right text-xs">
                  <TableHeader className="bg-muted/50 border-b border-border/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 text-center font-bold">#</TableHead>
                      <TableHead className="w-32 font-bold">التاريخ والوقت</TableHead>
                      <TableHead className="w-28 font-bold">نوع الحركة</TableHead>
                      <TableHead className="w-28 font-bold">رقم السند/الطلب</TableHead>
                      <TableHead className="font-bold min-w-[180px]">البيان / الوصف</TableHead>
                      <TableHead className="w-28 text-emerald-600 font-bold">وارد (+)</TableHead>
                      <TableHead className="w-28 text-rose-600 font-bold">صادر (-)</TableHead>
                      <TableHead className="w-32 font-black text-foreground bg-primary/5">الرصيد التراكمي</TableHead>
                      <TableHead className="w-24 font-bold print:hidden">المسؤول</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40">
                    {entries.map((entry, idx) => {
                      const isOpening = entry.type === "opening_balance"
                      const hasCredit = entry.credit > 0
                      const hasDebit = entry.debit > 0

                      return (
                        <TableRow
                          key={entry.id || idx}
                          className={`hover:bg-muted/30 transition-colors ${
                            isOpening ? "bg-amber-500/5 font-semibold" : ""
                          }`}
                        >
                          <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                            {idx + 1}
                          </TableCell>

                          <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {entry.date}
                          </TableCell>

                          <TableCell>
                            {isOpening ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                رصيد أول المدة
                              </Badge>
                            ) : entry.type === "pos_payment" ? (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                                مبيعات كاشير
                              </Badge>
                            ) : entry.type === "receipt" ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                                سند قبض
                              </Badge>
                            ) : entry.type === "expense" ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                سند مصاريف
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">
                                سند صرف
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">
                            {entry.reference}
                          </TableCell>

                          <TableCell className="max-w-[260px] truncate" title={entry.description}>
                            <span className="font-medium text-foreground">{entry.description}</span>
                            {entry.notes && (
                              <span className="block text-[10px] text-muted-foreground truncate">
                                📝 {entry.notes}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="font-mono font-bold text-emerald-600 whitespace-nowrap">
                            {hasCredit ? `+${Number(entry.credit).toLocaleString("ar-EG")}` : "-"}
                          </TableCell>

                          <TableCell className="font-mono font-bold text-rose-600 whitespace-nowrap">
                            {hasDebit ? `-${Number(entry.debit).toLocaleString("ar-EG")}` : "-"}
                          </TableCell>

                          <TableCell className="font-mono font-black text-foreground bg-primary/5 whitespace-nowrap">
                            {Number(entry.running_balance).toLocaleString("ar-EG")} {currency}
                          </TableCell>

                          <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap print:hidden">
                            {entry.user_name || "النظام"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* التوقيعات الرسمية في الطباعة */}
          <div className="hidden print:grid grid-cols-3 gap-6 pt-10 text-center text-xs font-bold border-t border-foreground/20 mt-8">
            <div>
              <p>أمين الخزنة / الصندوق</p>
              <p className="mt-8">........................</p>
            </div>
            <div>
              <p>المحاسب المالي</p>
              <p className="mt-8">........................</p>
            </div>
            <div>
              <p>مدير المطعم / الإدارة</p>
              <p className="mt-8">........................</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
