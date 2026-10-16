"use client"

import * as React from "react"
import {
  type CashRegister,
  type Customer,
  type FinancialTransactionType,
  createFinancialTransactionApi,
  getCustomersApi,
} from "@/lib/api"
import { useSettingStore } from "@/store/setting.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ShoppingBagIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Loader2Icon,
  UserIcon,
} from "lucide-react"

interface VoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: FinancialTransactionType
  registers: CashRegister[]
  onSuccess: (message: string) => void
}

const EXPENSE_CATEGORIES = [
  "كهرباء ومياه وغاز",
  "إيجار المقر / المحل",
  "مشتريات خامات ومواد غذائية",
  "رواتب وأجور عمالة",
  "صيانة وأعطال أجهزة",
  "أدوات نظافة ومستهلكات",
  "نثريات وضيافة وإكراميات",
  "دعاية وتسويق وإعلانات",
  "تراخيص ورسوم حكومية",
  "مصاريف تشغيلية أخرى",
]

export function VoucherDialog({
  open,
  onOpenChange,
  initialType = "expense",
  registers,
  onSuccess,
}: VoucherDialogProps) {
  const currency = useSettingStore((state) => state.settings?.currency) || "ج.م"
  const [type, setType] = React.useState<FinancialTransactionType>(initialType)
  const [cashRegisterId, setCashRegisterId] = React.useState<number>(0)
  const [customerId, setCustomerId] = React.useState<string>("")
  const [amount, setAmount] = React.useState<string>("")
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "card" | "transfer">("cash")
  const [category, setCategory] = React.useState<string>(EXPENSE_CATEGORIES[0])
  const [recipientOrPayer, setRecipientOrPayer] = React.useState<string>("")
  const [description, setDescription] = React.useState<string>("")
  const [date, setDate] = React.useState<string>(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = React.useState<string>("")

  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // مزامنة النوع المبدئي والخزنة الافتراضية وقائمة العملاء
  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setType(initialType)
        setError(null)
        setAmount("")
        setCustomerId("")
        setRecipientOrPayer("")
        setPaymentMethod("cash")
        setDescription(
          initialType === "expense"
            ? "مصروفات تشغيلية"
            : initialType === "receipt"
            ? "سند قبض نقدي من عميل"
            : "سند صرف / رد مبالغ لعميل"
        )
        setNotes("")
        setDate(new Date().toISOString().split("T")[0])
      }, 0)

      if (registers.length > 0 && cashRegisterId === 0) {
        const def = registers.find((r) => r.is_default) || registers[0]
        setCashRegisterId(def.id)
      }

      // تحميل قائمة العملاء لسندات القبض والصرف
      getCustomersApi({ is_active: true }).then((res) => {
        if (res.success && res.data) {
          setCustomers(res.data)
        }
      })
    }
  }, [open, initialType, registers, cashRegisterId])

  // الخزنة والعميل المحددان
  const selectedRegister = registers.find((r) => r.id === cashRegisterId)
  const selectedCustomer = customers.find((c) => c.id === Number(customerId))

  // التبديل بين أنواع السندات
  const handleTypeChange = (newType: FinancialTransactionType) => {
    setType(newType)
    setError(null)
    if (newType === "expense") {
      setCustomerId("")
      setRecipientOrPayer("")
      setPaymentMethod("cash")
      setDescription("مصروفات تشغيلية")
    } else if (newType === "receipt") {
      setPaymentMethod("cash")
      setDescription(selectedCustomer ? `سند قبض - ${selectedCustomer.name}` : "سند قبض نقدي من عميل")
    } else {
      setPaymentMethod("cash")
      setDescription(selectedCustomer ? `سند صرف - ${selectedCustomer.name}` : "سند صرف / رد مبالغ لعميل")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("يرجى إدخال مبلغ صحيح أكبر من الصفر.")
      return
    }

    if (!cashRegisterId) {
      setError("يرجى اختيار الخزنة المالية.")
      return
    }

    // سند القبض وسند الصرف للعملاء فقط
    if ((type === "receipt" || type === "payment") && !customerId) {
      setError("يرجى اختيار العميل المطلوب إصدار السند له.")
      return
    }

    setIsSubmitting(true)

    const customerObj = customerId ? customers.find((c) => c.id === Number(customerId)) : null
    const finalRecipient = type === "expense" ? null : (customerObj?.name || recipientOrPayer || null)

    const res = await createFinancialTransactionApi({
      transaction_type: type,
      cash_register_id: cashRegisterId,
      customer_id: customerId ? Number(customerId) : null,
      amount: amountNum,
      // للمصاريف يتم التثبيت التلقائي كاش بدون إدخال نوع الدفع
      payment_method: type === "expense" ? "cash" : paymentMethod,
      category: type === "expense" ? category : null,
      // للمصاريف لا يوجد مدفوع له نهائياً
      recipient_or_payer: finalRecipient,
      description:
        description ||
        (type === "expense"
          ? category
          : type === "receipt"
          ? `سند قبض - ${customerObj?.name || "عميل"}`
          : `سند صرف - ${customerObj?.name || "عميل"}`),
      date: date || new Date().toISOString().split("T")[0],
      notes: notes || null,
    })

    setIsSubmitting(false)

    if (res.success) {
      onOpenChange(false)
      onSuccess(res.message)
    } else {
      setError(res.message || "فشل تسجيل السند المالي.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl border border-border/80 bg-card">
        {/* رأس النافذة الثابت */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 shrink-0 bg-muted/20 text-right">
          <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            {type === "receipt" ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeftIcon className="size-5 shrink-0" />
                <span>إصدار سند قبض (تحصيل نقدية من عميل)</span>
              </span>
            ) : type === "payment" ? (
              <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                <ArrowUpRightIcon className="size-5 shrink-0" />
                <span>إصدار سند صرف (رد مبالغ / صرف لعميل)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <ShoppingBagIcon className="size-5 shrink-0" />
                <span>تسجيل سند مصاريف تشغيلية</span>
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {type === "expense"
              ? "تسجيل المصروفات التشغيلية للمطعم مع خصم المبلغ فورياً من الخزنة المحددة."
              : "سندات القبض والصرف مخصصة لحسابات العملاء لتعديل الأرصدة والمديونيات والخزينة."}
          </DialogDescription>
        </DialogHeader>

        {/* جسم النموذج التفاعلي */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-3.5 text-xs text-right">
            {error && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-1.5 font-medium">
                <AlertCircleIcon className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* أزرار اختيار نوع السند */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
              <button
                type="button"
                onClick={() => handleTypeChange("receipt")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                  type === "receipt"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <ArrowDownLeftIcon className="size-3.5 shrink-0" />
                <span>سند قبض</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("payment")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                  type === "payment"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <ArrowUpRightIcon className="size-3.5 shrink-0" />
                <span>سند صرف</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("expense")}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                  type === "expense"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <ShoppingBagIcon className="size-3.5 shrink-0" />
                <span>سند مصاريف</span>
              </button>
            </div>

            {/* الخزنة والمبلغ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>الخزنة المالية <span className="text-destructive">*</span></span>
                  {selectedRegister && (
                    <span className="text-[10px] text-muted-foreground font-mono font-medium">
                      الرصيد: {Number(selectedRegister.balance).toLocaleString("ar-EG")} {currency}
                    </span>
                  )}
                </label>
                <select
                  value={cashRegisterId}
                  onChange={(e) => setCashRegisterId(Number(e.target.value))}
                  className="w-full h-9 text-xs bg-card border border-border/70 rounded-lg px-2.5 text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [&>option]:bg-card [&>option]:text-foreground"
                  required
                >
                  {registers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.is_default ? "(الرئيسية)" : ""} - الرصيد: {Number(r.balance).toLocaleString("ar-EG")} {currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  المبلغ ({currency}) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-9 text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* في حال المصاريف: فقط تصنيف المصروف (بدون مدفوع له وبدون نوع دفع) */}
            {type === "expense" && (
              <div className="space-y-1">
                <label className="font-semibold text-foreground">تصنيف المصروف <span className="text-destructive">*</span></label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 text-xs bg-card border border-border/70 rounded-lg px-2.5 text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [&>option]:bg-card [&>option]:text-foreground"
                  required
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* في حال سند القبض أو الصرف: للعملاء فقط وطريقة التحصيل/الصرف */}
            {(type === "receipt" || type === "payment") && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* اختيار العميل */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <UserIcon className="size-3 text-primary" />
                        <span>
                          {type === "receipt" ? "العميل (المستلم منه) *" : "العميل (صرف مبالغ له) *"}
                        </span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">حسابات العملاء فقط</span>
                    </label>
                    <select
                      value={customerId}
                      onChange={(e) => {
                        const cId = e.target.value
                        setCustomerId(cId)
                        if (cId) {
                          const c = customers.find((cust) => cust.id === Number(cId))
                          if (c) {
                            setRecipientOrPayer(c.name)
                            setDescription(
                              type === "receipt"
                                ? `سند قبض - العميل ${c.name}`
                                : `سند صرف - العميل ${c.name}`
                            )
                          }
                        } else {
                          setRecipientOrPayer("")
                        }
                      }}
                      className="w-full h-9 text-xs bg-card border border-border/70 rounded-lg px-2.5 text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [&>option]:bg-card [&>option]:text-foreground"
                      required
                    >
                      <option value="">-- اختر العميل من القائمة --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone || "بدون هاتف"}) - الرصيد: {Number(c.balance || 0).toLocaleString("ar-EG")} {currency}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* طريقة التحصيل / الصرف */}
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">
                      {type === "receipt" ? "طريقة التحصيل / القبض *" : "طريقة الصرف والدفع *"}
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as "cash" | "card" | "transfer")}
                      className="w-full h-9 text-xs bg-card border border-border/70 rounded-lg px-2.5 text-foreground font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [&>option]:bg-card [&>option]:text-foreground"
                    >
                      <option value="cash">نقدي (كاش الخزينة)</option>
                      <option value="card">بطاقة بنكية / شبكة</option>
                      <option value="transfer">تحويل بنكي / محفظة</option>
                    </select>
                  </div>
                </div>

                {/* كارت ملخص رصيد العميل المختار */}
                {selectedCustomer && (
                  <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <UserIcon className="size-3.5 text-primary" />
                      <span>{selectedCustomer.name}</span>
                      {selectedCustomer.phone && (
                        <span className="text-muted-foreground font-mono text-[11px]">({selectedCustomer.phone})</span>
                      )}
                    </div>
                    <div className="text-[11px] font-medium">
                      <span className="text-muted-foreground">رصيد حسابه الحالي: </span>
                      <span className="font-bold text-primary font-mono">
                        {Number(selectedCustomer.balance || 0).toLocaleString("ar-EG")} {currency}
                      </span>
                      <span className="text-muted-foreground text-[10px] ms-1">
                        {type === "receipt" ? "(سيتم إيداع المبلغ وتخفيض مديونيته)" : "(سيتم خصم المبلغ من حسابه)"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* البيان والتاريخ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-foreground">البيان / الوصف</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="البيان التفصيلي للعملية"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">تاريخ السند <span className="text-destructive">*</span></label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* ملاحظات إضافية */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">ملاحظات إضافية</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات أو أرقام فواتير ورقية تابعة للسند..."
                className="text-xs min-h-[55px] resize-none"
              />
            </div>
          </div>

          {/* شريط الإجراءات السفلي الثابت */}
          <DialogFooter className="p-4 sm:p-5 pt-3 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-xl text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className={`h-9 rounded-xl text-xs gap-1.5 font-bold shadow-xs ${
                type === "receipt"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : type === "payment"
                  ? "bg-sky-600 hover:bg-sky-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckCircle2Icon className="size-4" />
              )}
              <span>{isSubmitting ? "جارٍ حفظ السند..." : "حفظ وترحيل السند"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
