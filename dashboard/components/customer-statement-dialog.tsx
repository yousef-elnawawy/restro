"use client"

import * as React from "react"
import {
  type Customer,
  type CustomerStatementData,
  type CashRegister,
  getCustomerStatementApi,
  createFinancialTransactionApi,
  getCashRegistersApi,
} from "@/lib/api"
import { useSettingStore } from "@/store/setting.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/combobox-select"
import {
  ReceiptIcon,
  PlusIcon,
  PrinterIcon,
  RefreshCwIcon,
  CoinsIcon,
  ShoppingBagIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ArrowDownLeftIcon,
  CalendarIcon,
  CreditCardIcon,
  LandmarkIcon,
  BanknoteIcon,
} from "lucide-react"

interface CustomerStatementDialogProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onBalanceUpdated?: () => void
}

export function CustomerStatementDialog({
  customer,
  open,
  onOpenChange,
  onBalanceUpdated,
}: CustomerStatementDialogProps) {
  const currency = useSettingStore((state) => state.settings?.currency) || "ج.م"
  const [data, setData] = React.useState<CustomerStatementData | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Registers for quick receipt voucher
  const [registers, setRegisters] = React.useState<CashRegister[]>([])
  const [showVoucherForm, setShowVoucherForm] = React.useState(false)
  const [isSubmittingVoucher, setIsSubmittingVoucher] = React.useState(false)
  const [voucherError, setVoucherError] = React.useState<string | null>(null)
  const [voucherSuccess, setVoucherSuccess] = React.useState<string | null>(null)

  const [voucherData, setVoucherData] = React.useState({
    cash_register_id: 0,
    amount: "",
    payment_method: "cash" as "cash" | "card" | "transfer",
    description: "سداد حساب العميل",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })

  // Load statement
  const loadStatement = React.useCallback(async (customerId: number) => {
    setIsLoading(true)
    setError(null)
    const res = await getCustomerStatementApi(customerId)
    if (res.success && res.data) {
      setData(res.data)
    } else {
      setError(res.message || "تعذر تحميل كشف حساب العميل.")
    }
    setIsLoading(false)
  }, [])

  // Load cash registers
  React.useEffect(() => {
    if (open) {
      getCashRegistersApi({ status: "active" }).then((res) => {
        if (res.success && res.data) {
          setRegisters(res.data)
          if (res.data.length > 0 && voucherData.cash_register_id === 0) {
            const def = res.data.find((r) => r.is_default) || res.data[0]
            setVoucherData((prev) => ({ ...prev, cash_register_id: def.id }))
          }
        }
      })
    }
  }, [open, voucherData.cash_register_id])

  React.useEffect(() => {
    if (open && customer) {
      loadStatement(customer.id)
      setShowVoucherForm(false)
      setVoucherError(null)
      setVoucherSuccess(null)
    } else {
      setData(null)
    }
  }, [open, customer, loadStatement])

  // Submit quick receipt voucher
  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    setVoucherError(null)
    setVoucherSuccess(null)

    const amountNum = parseFloat(voucherData.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setVoucherError("يرجى إدخال مبلغ صحيح أكبر من الصفر.")
      return
    }

    if (!voucherData.cash_register_id) {
      setVoucherError("يرجى اختيار الخزنة المالية المستلمة.")
      return
    }

    setIsSubmittingVoucher(true)

    const res = await createFinancialTransactionApi({
      transaction_type: "receipt",
      cash_register_id: voucherData.cash_register_id,
      customer_id: customer.id,
      amount: amountNum,
      payment_method: voucherData.payment_method,
      recipient_or_payer: customer.name,
      description: voucherData.description || `سداد من العميل ${customer.name}`,
      date: voucherData.date || new Date().toISOString().split("T")[0],
      notes: voucherData.notes,
    })

    setIsSubmittingVoucher(false)

    if (res.success) {
      setVoucherSuccess(res.message)
      setVoucherData((prev) => ({
        ...prev,
        amount: "",
        notes: "",
      }))
      setShowVoucherForm(false)
      // Reload statement
      await loadStatement(customer.id)
      if (onBalanceUpdated) onBalanceUpdated()
    } else {
      setVoucherError(res.message || "فشل تسجيل سند القبض.")
    }
  }

  // Print statement
  const handlePrint = () => {
    window.print()
  }

  if (!customer) return null

  const currentBalance = data ? data.summary.current_balance : Number(customer.balance || 0)
  const isDebit = currentBalance < 0 // مديونية عليه
  const isCredit = currentBalance > 0 // له رصيد متبقي
  const isZero = currentBalance === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-5 overflow-hidden">
        <DialogHeader className="border-b border-border/40 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <ReceiptIcon className="size-4.5 text-primary" />
                <span>كشف حساب العميل: {customer.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                هاتف: {customer.phone} {customer.address ? `• ${customer.address}` : ""}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => loadStatement(customer.id)}
                disabled={isLoading}
                className="gap-1 text-xs"
              >
                <RefreshCwIcon className={`size-3 ${isLoading ? "animate-spin" : ""}`} />
                <span>تحديث</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handlePrint}
                className="gap-1 text-xs no-print"
              >
                <PrinterIcon className="size-3" />
                <span>طباعة</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* محتوى كشف الحساب */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pe-1">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {voucherSuccess && (
            <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2Icon className="size-4 shrink-0" />
              <span>{voucherSuccess}</span>
            </div>
          )}

          {/* بطاقات المؤشرات المالية */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* الرصيد الحالي */}
            <div className={`p-3 rounded-lg border flex flex-col justify-between ${
              isDebit
                ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
                : isCredit
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : "bg-muted/40 border-border/60 text-muted-foreground"
            }`}>
              <div className="text-[11px] font-medium flex items-center justify-between">
                <span>الرصيد الحالي</span>
                <CoinsIcon className="size-3.5 opacity-80" />
              </div>
              <div className="mt-1 font-mono font-bold text-base sm:text-lg">
                {Math.abs(currentBalance).toLocaleString("ar-EG")}{" "}
                <span className="text-[11px] font-normal">{currency}</span>
              </div>
              <div className="text-[10px] font-semibold mt-0.5">
                {isDebit ? "⚠️ مديونية مستحقة عليه" : isCredit ? "✓ رصيد متبقي له" : "خالص (لا يوجد مديونية)"}
              </div>
            </div>

            {/* إجمالي المشتريات */}
            <div className="p-3 rounded-lg border border-border/60 bg-card text-card-foreground flex flex-col justify-between">
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>إجمالي المشتريات</span>
                <ShoppingBagIcon className="size-3.5 text-primary" />
              </div>
              <div className="mt-1 font-mono font-bold text-base sm:text-lg text-foreground">
                {Number(data?.summary.total_orders_amount || customer.total_spent || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">{currency}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {data?.summary.total_orders_count ?? customer.total_orders ?? 0} طلب مسجل
              </div>
            </div>

            {/* إجمالي المدفوعات المسددة */}
            <div className="p-3 rounded-lg border border-border/60 bg-card text-card-foreground flex flex-col justify-between">
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>إجمالي المسدد</span>
                <ArrowDownLeftIcon className="size-3.5 text-emerald-500" />
              </div>
              <div className="mt-1 font-mono font-bold text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
                {Number(data?.summary.total_payments_amount || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">{currency}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                طلبات وسندات قبض
              </div>
            </div>

            {/* زر تسجيل سند قبض سريع */}
            <div className="p-2 rounded-lg border border-primary/30 bg-primary/5 flex flex-col justify-center items-center gap-1.5 text-center">
              <span className="text-[11px] font-bold text-primary">تسديد / إيداع</span>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowVoucherForm(!showVoucherForm)}
                className="w-full text-xs gap-1 rounded-md h-7.5"
              >
                <PlusIcon className="size-3.5" />
                <span>{showVoucherForm ? "إلغاء السند" : "سند قبض نقدي"}</span>
              </Button>
            </div>
          </div>

          {/* نموذج سند قبض سريع للعميل */}
          {showVoucherForm && (
            <form onSubmit={handleCreateReceipt} className="p-3 rounded-lg border border-primary/40 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <ArrowDownLeftIcon className="size-3.5" />
                  <span>تسجيل سند قبض لحساب العميل ({customer.name})</span>
                </h4>
                <span className="text-[11px] text-muted-foreground">سيتم إيداع المبلغ بالخزنة وتخفيض مديونية العميل</span>
              </div>

              {voucherError && (
                <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {voucherError}
                </div>
              )}

              {/* الخزنة والمبلغ وطريقة الدفع بنمط راقي */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">الخزنة المستلمة *</label>
                  <ComboboxSelect
                    value={voucherData.cash_register_id ? String(voucherData.cash_register_id) : ""}
                    onValueChange={(val) => setVoucherData({ ...voucherData, cash_register_id: Number(val) })}
                    options={registers.map((r) => ({
                      value: String(r.id),
                      label: `${r.name} ${r.is_default ? "(الرئيسية)" : ""}`,
                      badge: `${Number(r.balance || 0).toLocaleString("ar-EG")} ${currency}`,
                      badgeVariant: "success" as const,
                    }))}
                    placeholder="اختر الخزنة..."
                    emptyText="لا توجد خزائن"
                    className="h-8 text-xs rounded-md"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">المبلغ ({currency}) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={voucherData.amount}
                    onChange={(e) => setVoucherData({ ...voucherData, amount: e.target.value })}
                    placeholder="0.00"
                    className="h-8 text-xs font-mono font-bold rounded-md"
                    required
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">طريقة الدفع *</label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setVoucherData({ ...voucherData, payment_method: "cash" })}
                      className={`flex items-center justify-center gap-1 h-8 rounded-md border text-[11px] font-bold transition-all cursor-pointer ${
                        voucherData.payment_method === "cash"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
                          : "border-border/60 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <BanknoteIcon className="size-3.5 shrink-0" />
                      <span>كاش</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVoucherData({ ...voucherData, payment_method: "card" })}
                      className={`flex items-center justify-center gap-1 h-8 rounded-md border text-[11px] font-bold transition-all cursor-pointer ${
                        voucherData.payment_method === "card"
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border/60 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <CreditCardIcon className="size-3.5 shrink-0" />
                      <span>شبكة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVoucherData({ ...voucherData, payment_method: "transfer" })}
                      className={`flex items-center justify-center gap-1 h-8 rounded-md border text-[11px] font-bold transition-all cursor-pointer ${
                        voucherData.payment_method === "transfer"
                          ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-xs"
                          : "border-border/60 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <LandmarkIcon className="size-3.5 shrink-0" />
                      <span>تحويل</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">البيان / الوصف</label>
                  <Input
                    value={voucherData.description}
                    onChange={(e) => setVoucherData({ ...voucherData, description: e.target.value })}
                    placeholder="مثال: سداد حساب أو دفعة مقدمة"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">التاريخ</label>
                  <Input
                    type="date"
                    value={voucherData.date}
                    onChange={(e) => setVoucherData({ ...voucherData, date: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setShowVoucherForm(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="xs"
                  disabled={isSubmittingVoucher}
                  className="gap-1 font-bold"
                >
                  <CheckCircle2Icon className="size-3.5" />
                  <span>{isSubmittingVoucher ? "جارٍ الحفظ..." : "حفظ وترحيل السند"}</span>
                </Button>
              </div>
            </form>
          )}

          {/* جدول كشف الحساب التراكمي */}
          <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
            <div className="p-2.5 bg-muted/40 border-b border-border/50 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 text-primary" />
                <span>حركات الحساب والعمليات السابقة</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                مرتبة زمنياً من الأحدث إلى الأقدم
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCwIcon className="size-5 animate-spin text-primary" />
                <span>جارٍ تحميل كشف حساب العميل...</span>
              </div>
            ) : !data || data.ledger.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                لا توجد حركات مسجلة في حساب هذا العميل حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-start text-xs font-bold w-28">التاريخ</TableHead>
                      <TableHead className="text-start text-xs font-bold">المرجع / المستند</TableHead>
                      <TableHead className="text-start text-xs font-bold">النوع / البيان</TableHead>
                      <TableHead className="text-center text-xs font-bold text-rose-600 dark:text-rose-400">
                        مدين (مشتريات)
                      </TableHead>
                      <TableHead className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        دائن (سداد)
                      </TableHead>
                      <TableHead className="text-center text-xs font-bold text-primary">
                        الرصيد التراكمي
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ledger.map((row) => (
                      <TableRow key={row.id} className="text-xs hover:bg-muted/30 transition-colors">
                        <TableCell className="p-2 font-mono text-[11px] text-muted-foreground">
                          {row.date.split(" ")[0]}
                          <div className="text-[10px] text-muted-foreground/70">
                            {row.date.split(" ")[1] || ""}
                          </div>
                        </TableCell>

                        <TableCell className="p-2 font-mono font-semibold">
                          {row.reference}
                        </TableCell>

                        <TableCell className="p-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {row.type === "voucher" ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  <ArrowDownLeftIcon className="size-2.5" />
                                  {row.title}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                  <ShoppingBagIcon className="size-2.5" />
                                  {row.title}
                                </span>
                              )}
                              {row.payment_method && (
                                <span className="text-[10px] text-muted-foreground bg-muted/60 px-1 rounded">
                                  {row.payment_method === "cash"
                                    ? "كاش"
                                    : row.payment_method === "card"
                                    ? "بطاقة"
                                    : "تحويل"}
                                </span>
                              )}
                            </div>
                            {row.description && (
                              <div className="text-[10px] text-muted-foreground line-clamp-1">
                                {row.description}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* مدين */}
                        <TableCell className="p-2 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                          {row.debit > 0 ? (
                            <span>{row.debit.toLocaleString("ar-EG")} {currency}</span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </TableCell>

                        {/* دائن */}
                        <TableCell className="p-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {row.credit > 0 ? (
                            <span>{row.credit.toLocaleString("ar-EG")} {currency}</span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </TableCell>

                        {/* الرصيد بعد العملية */}
                        <TableCell className="p-2 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              row.running_balance < 0
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : row.running_balance > 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {Math.abs(row.running_balance).toLocaleString("ar-EG")} {currency}{" "}
                            {row.running_balance < 0 ? "(عليه)" : row.running_balance > 0 ? "(له)" : ""}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
