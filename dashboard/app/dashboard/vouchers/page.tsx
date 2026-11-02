"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useFinancialStore } from "@/store/financial.store"
import { useRegisterStore } from "@/store/register.store"
import { useSettingStore } from "@/store/setting.store"
import { useAuthStore } from "@/store/auth.store"
import { type FinancialTransaction, type FinancialTransactionType } from "@/lib/api"
import { QuickVoucherDialog } from "@/components/quick-voucher-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import { ComboboxSelect } from "@/components/ui/combobox-select"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
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
  ReceiptIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  PrinterIcon,
  Trash2Icon,
  CoinsIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

export default function VouchersPage() {
  const {
    transactions,
    summary,
    isLoading,
    typeFilter,
    registerFilter,
    searchQuery,
    fetchTransactions,
    deleteTransaction,
    setTypeFilter,
    setRegisterFilter,
    setSearchQuery,
  } = useFinancialStore()

  const { registers, fetchRegisters } = useRegisterStore()
  const { settings, fetchSettings } = useSettingStore()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === "admin"

  const currency = settings?.currency || "ج.م"
  const restaurantName = settings?.restaurant_name || "مطعمنا"

  // Quick Voucher Dialog
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [initialType, setInitialType] = React.useState<FinancialTransactionType>("expense")

  // Delete Alert
  const [deleteId, setDeleteId] = React.useState<number | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Single Voucher Print
  const [printingTx, setPrintingTx] = React.useState<FinancialTransaction | null>(null)

  // Date filters
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  React.useEffect(() => {
    fetchSettings()
    fetchRegisters()
    fetchTransactions()
  }, [fetchSettings, fetchRegisters, fetchTransactions])

  const handleOpenDialog = (t: FinancialTransactionType) => {
    setInitialType(t)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    await deleteTransaction(deleteId)
    setIsDeleting(false)
    setDeleteId(null)
  }

  const handlePrintVoucher = (tx: FinancialTransaction) => {
    setPrintingTx(tx)
    setTimeout(() => {
      window.print()
    }, 100)
  }

  // Filtered transactions
  const filteredList = React.useMemo(() => {
    return transactions.filter((tx) => {
      if (dateFrom && tx.date < dateFrom) return false
      if (dateTo && tx.date > dateTo) return false
      return true
    })
  }, [transactions, dateFrom, dateTo])

  return (
    <PageContainer
      title="السندات والمصاريف"
      description="سجل سندات القبض والصرف والمصروفات التشغيلية للمطعم"
      action={
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTransactions()}
            disabled={isLoading}
            className="h-8.5 rounded-lg text-xs gap-1.5"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenDialog("receipt")}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PlusIcon className="size-3.5" />
            <span>سند قبض</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenDialog("expense")}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            <PlusIcon className="size-3.5" />
            <span>تسجيل مصروف</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenDialog("payment")}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-rose-600 hover:bg-rose-700 text-white"
          >
            <PlusIcon className="size-3.5" />
            <span>سند صرف</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* 1. STATS CARDS */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 print:hidden">
            {/* Receipts */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeftIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">إجمالي المقبوضات</p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                  +{summary.total_receipts.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal">{currency}</span>
                </p>
              </div>
            </div>

            {/* Payments */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ArrowUpRightIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">سندات الصرف</p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
                  -{summary.total_payments.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal">{currency}</span>
                </p>
              </div>
            </div>

            {/* Expenses */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ReceiptIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">المصروفات التشغيلية</p>
                <p className="text-base sm:text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                  -{summary.total_expenses.toLocaleString("ar-EG")}{" "}
                  <span className="text-[10px] font-normal">{currency}</span>
                </p>
              </div>
            </div>

            {/* Net */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <SlidersHorizontalIcon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">صافي حركة السندات</p>
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
          </div>
        )}

        {/* 2. FILTER BAR */}
        <div className="p-3 rounded-xl bg-card border border-border/60 shadow-xs space-y-2.5 print:hidden">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40">
              {[
                { id: "all", label: "الكل" },
                { id: "receipt", label: "مقبوضات" },
                { id: "payment", label: "صرف" },
                { id: "expense", label: "مصروفات" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id as any)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    typeFilter === t.id
                      ? "bg-card text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Register Select */}
            <div className="flex items-center gap-2 max-w-xs flex-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">الخزنة:</span>
              <ComboboxSelect
                value={registerFilter ? String(registerFilter) : "all"}
                onValueChange={(val) => setRegisterFilter(val === "all" ? "all" : Number(val))}
                options={[
                  { value: "all", label: "جميع الخزائن" },
                  ...registers.map((r) => ({
                    value: String(r.id),
                    label: `${r.name} (${Number(r.balance).toLocaleString("ar-EG")} ${currency})`,
                  })),
                ]}
                placeholder="تصفية بالخزنة..."
                className="h-8 text-xs rounded-lg w-full"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-border/40">
            {/* Search */}
            <div className="relative flex-1">
              <SearchIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="بحث برقم السند، البيان، المستفيد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8 h-8 text-xs rounded-lg"
              />
            </div>

            {/* Date Inputs */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>من:</span>
              <DatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="من تاريخ"
                className="h-8 text-xs rounded-lg w-34"
              />
              <span>إلى:</span>
              <DatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="إلى تاريخ"
                className="h-8 text-xs rounded-lg w-34"
              />
            </div>
          </div>
        </div>

        {/* 3. TABLE */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs print:border-none print:shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs">
                  <TableHead className="text-start font-semibold">رقم السند</TableHead>
                  <TableHead className="text-start font-semibold">النوع</TableHead>
                  <TableHead className="text-start font-semibold">الخزنة</TableHead>
                  <TableHead className="text-center font-semibold">المبلغ</TableHead>
                  <TableHead className="text-start font-semibold">طريقة الدفع</TableHead>
                  <TableHead className="text-start font-semibold">البيان والتصنيف</TableHead>
                  <TableHead className="text-start font-semibold">المستفيد / الدافع</TableHead>
                  <TableHead className="text-center font-semibold">التاريخ</TableHead>
                  <TableHead className="text-center font-semibold print:hidden">إجراءات</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground">
                      <RefreshCwIcon className="size-4 animate-spin inline-block ml-1 text-primary" />
                      جاري تحميل السندات...
                    </TableCell>
                  </TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground">
                      لا توجد سندات أو معاملات مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((tx) => {
                    const isReceipt = tx.transaction_type === "receipt"
                    const isExpense = tx.transaction_type === "expense"
                    const amount = Number(tx.amount)

                    return (
                      <TableRow key={tx.id} className="text-xs hover:bg-muted/20">
                        <TableCell className="p-2.5 font-mono font-medium text-foreground whitespace-nowrap">
                          {tx.voucher_number || `VOU-${tx.id}`}
                        </TableCell>

                        <TableCell className="p-2.5 whitespace-nowrap">
                          {isReceipt ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              سند قبض
                            </Badge>
                          ) : isExpense ? (
                            <Badge variant="outline" className="text-[10px] font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              مصروفات
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                              سند صرف
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="p-2.5 whitespace-nowrap text-foreground">
                          {tx.cash_register?.name || "الخزنة"}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono font-bold whitespace-nowrap">
                          <span
                            className={
                              isReceipt
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isExpense
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {isReceipt ? "+" : "-"}
                            {amount.toLocaleString("ar-EG")} {currency}
                          </span>
                        </TableCell>

                        <TableCell className="p-2.5 whitespace-nowrap text-muted-foreground">
                          {tx.payment_method === "cash"
                            ? "نقدي"
                            : tx.payment_method === "card"
                            ? "بطاقة"
                            : "تحويل"}
                        </TableCell>

                        <TableCell className="p-2.5 max-w-xs">
                          <p className="text-foreground truncate">
                            {tx.description || (isExpense ? tx.category : "—")}
                          </p>
                          {tx.category && isExpense && tx.category !== tx.description && (
                            <span className="text-[10px] text-muted-foreground">
                              {tx.category}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="p-2.5 whitespace-nowrap text-muted-foreground">
                          {tx.recipient_or_payer || tx.customer?.name || "—"}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {tx.date}
                        </TableCell>

                        <TableCell className="p-2.5 text-center print:hidden whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintVoucher(tx)}
                              className="size-7 rounded-md text-muted-foreground hover:text-foreground"
                              title="طباعة إيصال السند"
                            >
                              <PrinterIcon className="size-3.5" />
                            </Button>

                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(tx.id)}
                                className="size-7 rounded-md text-muted-foreground hover:text-destructive"
                                title="حذف السند"
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            )}
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

        {/* PRINT RECEIPT */}
        {printingTx && (
          <div className="hidden print:block fixed inset-0 bg-white p-6 text-black z-50">
            <div className="max-w-sm mx-auto border border-black p-4 rounded text-center space-y-3">
              <h2 className="text-base font-bold">{restaurantName}</h2>
              <div className="border-b border-dashed border-black pb-2">
                <h3 className="text-sm font-bold">
                  {printingTx.transaction_type === "receipt"
                    ? "سند قبض نقدي"
                    : printingTx.transaction_type === "expense"
                    ? "سند مصروفات تشغيلية"
                    : "سند صرف نقدي"}
                </h3>
                <p className="text-xs font-mono">رقم السند: {printingTx.voucher_number || `VOU-${printingTx.id}`}</p>
                <p className="text-xs">التاريخ: {printingTx.date}</p>
              </div>

              <div className="text-right space-y-1.5 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span className="font-bold">المبلغ:</span>
                  <span className="font-bold font-mono">
                    {Number(printingTx.amount).toLocaleString("ar-EG")} {currency}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>الخزنة:</span>
                  <span>{printingTx.cash_register?.name || "الخزنة"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>طريقة الدفع:</span>
                  <span>{printingTx.payment_method === "cash" ? "نقدي" : "أخرى"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>المعني:</span>
                  <span>{printingTx.recipient_or_payer || printingTx.customer?.name || "—"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span>البيان:</span>
                  <span>{printingTx.description || printingTx.category || "—"}</span>
                </div>
              </div>

              <div className="flex justify-between pt-6 text-[11px]">
                <div>
                  <p className="mb-4">المستلم</p>
                  <p>................</p>
                </div>
                <div>
                  <p className="mb-4">أمين الخزنة</p>
                  <p>................</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Voucher Dialog */}
      <QuickVoucherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialType={initialType}
        onSuccess={() => {
          fetchTransactions()
          fetchRegisters()
        }}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">تأكيد حذف السند المالي</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              هل أنت متأكد من حذف هذا السند؟ سيتم عكس تأثير المبلغ على رصيد الخزنة المالية فوراً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-lg text-xs">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg text-xs"
            >
              {isDeleting ? "جاري الحذف..." : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
