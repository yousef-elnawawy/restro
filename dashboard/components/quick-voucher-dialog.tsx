"use client"

import * as React from "react"
import {
  type CashRegister,
  type Customer,
  type FinancialTransactionType,
  createFinancialTransactionApi,
  getCashRegistersApi,
  getCustomersApi,
} from "@/lib/api"
import { useSettingStore } from "@/store/setting.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ComboboxSelect } from "@/components/ui/combobox-select"
import {
  Loader2Icon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "lucide-react"

interface QuickVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: FinancialTransactionType
  preselectedRegisterId?: number
  preselectedCustomerId?: number
  onSuccess?: (message: string) => void
}

const EXPENSE_CATEGORIES = [
  "خامات ومشتريات",
  "كهرباء ومياه وغاز",
  "نظافة ومستهلكات",
  "بوفيه وضيافة",
  "صيانة وأعطال",
  "إيجار المقر",
  "رواتب ويوميات",
  "دعاية وإعلانات",
  "مصاريف أخرى",
]

const QUICK_AMOUNTS = [20, 50, 100, 200, 500]

export function QuickVoucherDialog({
  open,
  onOpenChange,
  initialType = "expense",
  preselectedRegisterId,
  preselectedCustomerId,
  onSuccess,
}: QuickVoucherDialogProps) {
  const currency = useSettingStore((state) => state.settings?.currency) || "ج.م"
  const [type, setType] = React.useState<FinancialTransactionType>(initialType)

  const [registers, setRegisters] = React.useState<CashRegister[]>([])
  const [customers, setCustomers] = React.useState<Customer[]>([])

  const [cashRegisterId, setCashRegisterId] = React.useState<number>(0)
  const [customerId, setCustomerId] = React.useState<string>("")
  const [recipientOrPayer, setRecipientOrPayer] = React.useState<string>("")
  const [amount, setAmount] = React.useState<string>("")
  const [category, setCategory] = React.useState<string>(EXPENSE_CATEGORIES[0])
  const [description, setDescription] = React.useState<string>("")
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "card" | "transfer">("cash")

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    setType(initialType)
    setError(null)
    setSuccessMsg(null)
    setAmount("")
    setPaymentMethod("cash")

    if (initialType === "expense") {
      setCategory(EXPENSE_CATEGORIES[0])
      setDescription(EXPENSE_CATEGORIES[0])
    } else if (initialType === "receipt") {
      setDescription("تحصيل نقدية")
    } else {
      setDescription("صرف نقدية")
    }

    if (preselectedCustomerId) {
      setCustomerId(String(preselectedCustomerId))
    } else {
      setCustomerId("")
      setRecipientOrPayer("")
    }

    Promise.all([
      getCashRegistersApi({ status: "active" }),
      getCustomersApi({ is_active: true }),
    ]).then(([regRes, custRes]) => {
      if (regRes.success && regRes.data) {
        setRegisters(regRes.data)
        if (preselectedRegisterId) {
          setCashRegisterId(preselectedRegisterId)
        } else {
          const def = regRes.data.find((r) => r.is_default) || regRes.data[0]
          if (def) setCashRegisterId(def.id)
        }
      }
      if (custRes.success && custRes.data) {
        setCustomers(custRes.data)
      }
    })
  }, [open, initialType, preselectedRegisterId, preselectedCustomerId])

  const handleTypeTab = (t: FinancialTransactionType) => {
    setType(t)
    setError(null)
    if (t === "expense") {
      setCategory(EXPENSE_CATEGORIES[0])
      setDescription(EXPENSE_CATEGORIES[0])
    } else if (t === "receipt") {
      setDescription("تحصيل نقدية")
    } else {
      setDescription("صرف نقدية")
    }
  }

  const handleAddAmount = (add: number) => {
    const current = parseFloat(amount) || 0
    setAmount(String(current + add))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("يرجى إدخال مبلغ صحيح.")
      return
    }

    if (!cashRegisterId) {
      setError("يرجى اختيار الخزنة.")
      return
    }

    const reg = registers.find((r) => r.id === cashRegisterId)
    if ((type === "expense" || type === "payment") && reg) {
      if (parsedAmount > Number(reg.balance)) {
        setError(`رصيد الخزنة (${Number(reg.balance).toLocaleString("ar-EG")} ${currency}) غير كافٍ للصرف.`)
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload = {
        transaction_type: type,
        cash_register_id: cashRegisterId,
        customer_id: customerId ? Number(customerId) : null,
        amount: parsedAmount,
        payment_method: paymentMethod,
        category: type === "expense" ? category : null,
        recipient_or_payer:
          type === "expense"
            ? category
            : customerId
            ? customers.find((c) => c.id === Number(customerId))?.name || recipientOrPayer
            : recipientOrPayer || (type === "receipt" ? "عميل نقدي" : "مستفيد"),
        description: description || (type === "expense" ? category : type === "receipt" ? "سند قبض" : "سند صرف"),
        date: new Date().toISOString().split("T")[0],
        notes: null,
      }

      const res = await createFinancialTransactionApi(payload)
      if (res.success) {
        setSuccessMsg("تم تسجيل الحركة بنجاح")
        onSuccess?.("تم تسجيل السند المالي بنجاح.")
        setTimeout(() => {
          onOpenChange(false)
        }, 600)
      } else {
        setError(res.message || "تعذر حفظ السند.")
      }
    } catch {
      setError("حدث خطأ أثناء حفظ السند.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-4 sm:p-5 rounded-xl border border-border/60 bg-card shadow-lg">
        <DialogHeader className="p-0 pb-3 border-b border-border/40 text-start space-y-1">
          <DialogTitle className="text-sm font-bold">
            تسجيل حركة مالية
          </DialogTitle>
          {/* Calm type tabs */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40 pt-1">
            <button
              type="button"
              onClick={() => handleTypeTab("receipt")}
              className={`flex-1 py-1 text-xs rounded-md font-medium transition-colors ${
                type === "receipt"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              سند قبض
            </button>
            <button
              type="button"
              onClick={() => handleTypeTab("expense")}
              className={`flex-1 py-1 text-xs rounded-md font-medium transition-colors ${
                type === "expense"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              مصروفات
            </button>
            <button
              type="button"
              onClick={() => handleTypeTab("payment")}
              className={`flex-1 py-1 text-xs rounded-md font-medium transition-colors ${
                type === "payment"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              سند صرف
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-xs">
          {error && (
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-1.5">
              <AlertCircleIcon className="size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5 font-medium">
              <CheckCircle2Icon className="size-3.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1">
            <label className="font-semibold text-foreground">
              المبلغ ({currency}) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step="any"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
              className="h-9 text-base font-mono font-bold rounded-lg"
            />
            <div className="flex items-center gap-1 pt-0.5">
              <span className="text-[11px] text-muted-foreground">إضافة:</span>
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAddAmount(q)}
                  className="px-2 py-0.5 text-[11px] font-mono rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                >
                  +{q}
                </button>
              ))}
            </div>
          </div>

          {/* Expense Category */}
          {type === "expense" && (
            <div className="space-y-1">
              <label className="font-semibold text-foreground">بند المصروف</label>
              <ComboboxSelect
                value={category}
                onValueChange={(val) => {
                  setCategory(val)
                  setDescription(val)
                }}
                options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
                placeholder="اختر بند المصروف..."
                className="h-8.5 text-xs rounded-lg w-full"
              />
            </div>
          )}

          {/* Receipt/Payment Customer or Payer */}
          {type !== "expense" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  العميل {type === "receipt" ? "(اختياري)" : ""}
                </label>
                <ComboboxSelect
                  value={customerId}
                  onValueChange={(val) => {
                    setCustomerId(val)
                    if (val) {
                      const c = customers.find((cust) => cust.id === Number(val))
                      if (c) setDescription(`${type === "receipt" ? "تحصيل من" : "صرف إلى"} ${c.name}`)
                    }
                  }}
                  options={[
                    { value: "", label: "بدون عميل مسجل" },
                    ...customers.map((c) => ({
                      value: String(c.id),
                      label: `${c.name} (${Number(c.balance).toLocaleString("ar-EG")} ${currency})`,
                    })),
                  ]}
                  placeholder="اختر العميل..."
                  searchPlaceholder="بحث في العملاء..."
                  emptyText="لا يوجد عملاء"
                  className="h-8.5 text-xs rounded-lg w-full"
                />
              </div>

              {!customerId && (
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    {type === "receipt" ? "اسم الدافع" : "اسم المستفيد"}
                  </label>
                  <Input
                    value={recipientOrPayer}
                    onChange={(e) => setRecipientOrPayer(e.target.value)}
                    placeholder={type === "receipt" ? "اسم الدافع..." : "اسم المستفيد..."}
                    className="h-8.5 text-xs rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Safe & Payment Method */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">الخزنة</label>
              <ComboboxSelect
                value={String(cashRegisterId)}
                onValueChange={(val) => setCashRegisterId(Number(val))}
                options={registers.map((r) => ({
                  value: String(r.id),
                  label: `${r.name} (${Number(r.balance).toLocaleString("ar-EG")} ${currency})`,
                }))}
                placeholder="اختر الخزنة..."
                className="h-8.5 text-xs rounded-lg w-full"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">طريقة الدفع</label>
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40">
                {[
                  { id: "cash", label: "نقدي" },
                  { id: "card", label: "بطاقة" },
                  { id: "transfer", label: "تحويل" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`flex-1 py-1 text-[11px] rounded transition-colors ${
                      paymentMethod === m.id
                        ? "bg-card text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-semibold text-foreground">البيان</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للعملية..."
              className="h-8.5 text-xs rounded-lg"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-8.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin ml-1" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <span>حفظ الحركة</span>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8.5 px-3 rounded-lg text-xs"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
