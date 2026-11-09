"use client"

import * as React from "react"
import { type Order, type OrderItem } from "@/lib/api"
import { useOrderStore } from "@/store/order.store"
import { useRegisterStore } from "@/store/register.store"
import { useSettingStore } from "@/store/setting.store"
import { printThermalReceipt } from "@/lib/receipt-printer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  SplitIcon,
  UsersIcon,
  CheckCircle2Icon,
  PrinterIcon,
  CreditCardIcon,
  Loader2Icon,
  PlusIcon,
  MinusIcon,
  ShoppingBagIcon,
  UtensilsCrossedIcon,
} from "lucide-react"

interface SplitBillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  onSuccess?: () => void
}

export function SplitBillDialog({ open, onOpenChange, order, onSuccess }: SplitBillDialogProps) {
  const { payOrder, splitOrder, fetchOrders } = useOrderStore()
  const { registers, fetchRegisters } = useRegisterStore()
  const settings = useSettingStore((state) => state.settings)
  const currency = settings?.currency || "ج.م"

  const [activeTab, setActiveTab] = React.useState<"equal" | "items">("equal")
  const [personsCount, setPersonsCount] = React.useState<number>(2)
  const [selectedRegisterId, setSelectedRegisterId] = React.useState<number | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Items split state: Map of order_item_id -> quantity selected to split
  const [selectedItems, setSelectedItems] = React.useState<Record<number, number>>({})

  // Success message / feedback
  const [feedback, setFeedback] = React.useState<{ text: string; type: "success" | "error" } | null>(null)

  React.useEffect(() => {
    if (open) {
      fetchRegisters()
      setSelectedItems({})
      setFeedback(null)
      setPersonsCount(2)
    }
  }, [open, fetchRegisters])

  React.useEffect(() => {
    if (registers.length > 0 && !selectedRegisterId) {
      const def = registers.find((r) => r.is_default && r.is_active) || registers.find((r) => r.is_active)
      if (def) setSelectedRegisterId(def.id)
    }
  }, [registers, selectedRegisterId])

  if (!order) return null

  // Calculate order balances
  const totalPaid = (order.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
  const remainingBalance = Math.max(0, Number(order.total) - totalPaid)
  const sharePerPerson = personsCount > 0 ? Math.round((remainingBalance / personsCount) * 100) / 100 : 0

  // Calculate selected items total
  const selectedItemsList = order.items.filter((it) => (selectedItems[it.id] || 0) > 0)
  const splitItemsSubtotal = selectedItemsList.reduce(
    (sum, it) => sum + Number(it.unit_price) * (selectedItems[it.id] || 0),
    0
  )
  const taxRate = settings?.tax_enabled ? (settings.tax_percentage || 14) / 100 : 0
  const splitItemsTax = Math.round(splitItemsSubtotal * taxRate * 100) / 100
  const splitItemsTotal = Math.round((splitItemsSubtotal + splitItemsTax) * 100) / 100

  // 1. Pay an equal share installment
  const handlePayEqualShare = async () => {
    if (!selectedRegisterId) {
      setFeedback({ text: "يرجى اختيار الخزنة المالية للدفع.", type: "error" })
      return
    }

    setIsProcessing(true)
    setFeedback(null)

    try {
      const res = await payOrder(order.id, {
        cash_register_id: selectedRegisterId,
        amount: sharePerPerson,
        notes: `سداد حصة فرد (${sharePerPerson} ${currency}) من تقسيم على ${personsCount} أفراد`,
        complete_order: sharePerPerson >= remainingBalance,
      })

      if (res.success && res.data) {
        // Print individual split receipt
        printThermalReceipt({
          order_number: `${order.order_number}-حصة`,
          order_type: order.order_type,
          table: order.table ? { name: order.table.name, location: order.table.location } : undefined,
          customer_name: order.customer_name ? `${order.customer_name} (حصة فرد)` : "حصة فرد",
          items: [
            {
              product_name: `سداد حصة فرد (${personsCount} أفراد بالتساوي)`,
              quantity: 1,
              unit_price: sharePerPerson,
              total_price: sharePerPerson,
            },
          ],
          subtotal: sharePerPerson,
          tax: 0,
          total: sharePerPerson,
          payment_status: "paid",
          tendered_amount: sharePerPerson,
          change_amount: 0,
          created_at: new Date().toISOString(),
          notes: `المتبقي على الطاولة: ${(remainingBalance - sharePerPerson).toFixed(2)} ${currency}`,
        })

        setFeedback({
          text: `تم سداد حصة فرد بقيمة ${sharePerPerson} ${currency} وطباعة إيصال السداد بنجاح!`,
          type: "success",
        })

        await fetchOrders()
        if (onSuccess) onSuccess()

        if (sharePerPerson >= remainingBalance) {
          setTimeout(() => {
            onOpenChange(false)
          }, 1500)
        }
      } else {
        setFeedback({ text: res.message || "فشل تسجيل سداد الحصة.", type: "error" })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // 2. Pay items split
  const handlePayItemsSplit = async () => {
    if (!selectedRegisterId) {
      setFeedback({ text: "يرجى اختيار الخزنة المالية للدفع.", type: "error" })
      return
    }

    if (selectedItemsList.length === 0) {
      setFeedback({ text: "يرجى تحديد صنف واحد على الأقل للتقسيم.", type: "error" })
      return
    }

    setIsProcessing(true)
    setFeedback(null)

    try {
      const payloadItems = selectedItemsList.map((it) => ({
        order_item_id: it.id,
        quantity: selectedItems[it.id],
      }))

      const res = await splitOrder(order.id, {
        items: payloadItems,
        pay_now: true,
        cash_register_id: selectedRegisterId,
      })

      if (res.success && res.data?.split_order) {
        const splitOrderData = res.data.split_order

        // Print receipt for the split items
        printThermalReceipt({
          order_number: splitOrderData.order_number,
          order_type: splitOrderData.order_type,
          table: order.table ? { name: order.table.name, location: order.table.location } : undefined,
          customer_name: "فاتورة مفصولة",
          items: splitOrderData.items.map((it) => ({
            product_name: it.product_name,
            quantity: it.quantity,
            unit_price: Number(it.unit_price),
            total_price: Number(it.total_price),
            size_name: it.size_name,
            notes: it.notes,
          })),
          subtotal: Number(splitOrderData.subtotal),
          tax: Number(splitOrderData.tax),
          total: Number(splitOrderData.total),
          payment_status: "paid",
          tendered_amount: Number(splitOrderData.total),
          change_amount: 0,
          created_at: new Date().toISOString(),
        })

        setFeedback({
          text: `تم سداد الأصناف المفصولة بقيمة ${splitOrderData.total} ${currency} بنجاح!`,
          type: "success",
        })

        setSelectedItems({})
        await fetchOrders()
        if (onSuccess) onSuccess()

        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      } else {
        setFeedback({ text: res.message || "فشل تقسيم وسداد الأصناف.", type: "error" })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleItemQuantity = (itemId: number, maxQty: number, delta: number) => {
    setSelectedItems((prev) => {
      const cur = prev[itemId] || 0
      const next = Math.max(0, Math.min(maxQty, cur + delta))
      if (next === 0) {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      }
      return { ...prev, [itemId]: next }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl p-5 bg-card border border-border/60 text-right shadow-xl">
        <DialogHeader className="text-right space-y-1">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-sm border border-primary/20">
              تقسيم الفاتورة (Split Bill)
            </span>
            <span className="font-mono text-xs text-muted-foreground">{order.order_number}</span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            تقسيم حساب {order.table ? `طاولة (${order.table.name})` : `الطلب (${order.order_number})`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            إجمالي الحساب: <b className="text-foreground font-mono">{order.total} {currency}</b>
            {totalPaid > 0 && (
              <span className="me-2 text-emerald-600">
                (المسدد: {totalPaid} {currency} — المتبقي: {remainingBalance} {currency})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-2.5 rounded-lg text-xs font-semibold ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("equal")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "equal"
                ? "bg-card text-primary shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UsersIcon className="size-4" />
            <span>تقسيم بالتساوي (أفراد)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("items")}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "items"
                ? "bg-card text-primary shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBagIcon className="size-4" />
            <span>تقسيم حسب الأصناف</span>
          </button>
        </div>

        {/* Tab 1: Equal Split */}
        {activeTab === "equal" && (
          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">عدد الأفراد المطلوب تقسيم الفاتورة عليهم:</label>
              <div className="flex items-center gap-2">
                {[2, 3, 4, 5, 6].map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant={personsCount === num ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPersonsCount(num)}
                    className="flex-1 font-mono font-bold text-xs h-9 rounded-lg"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            {/* Split Result Card */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-center space-y-1">
              <p className="text-xs text-muted-foreground">نصيب الفرد الواحد حالياً:</p>
              <p className="text-2xl font-black text-primary font-mono tracking-tight">
                {sharePerPerson} <span className="text-sm font-normal text-muted-foreground">{currency}</span>
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                ({remainingBalance} {currency} مقسومة على {personsCount} أفراد)
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Split by Items */}
        {activeTab === "items" && (
          <div className="space-y-2 py-1">
            <p className="text-xs text-muted-foreground">
              حدد الأصناف والكميات التي يريد الفرد سدادها بشكل منفصل:
            </p>

            <div className="max-h-56 overflow-y-auto divide-y divide-border/40 border rounded-lg bg-card p-1">
              {order.items.map((item) => {
                const currentQty = selectedItems[item.id] || 0
                const isSelected = currentQty > 0

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                      isSelected ? "bg-primary/5 font-semibold" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">{item.product_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {item.unit_price} {currency} للقطعة • المتاح بالطلب: x{item.quantity}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ms-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => toggleItemQuantity(item.id, item.quantity, -1)}
                        disabled={currentQty === 0}
                        className="size-7 rounded-md"
                      >
                        <MinusIcon className="size-3" />
                      </Button>

                      <span className="w-6 text-center font-mono font-bold text-xs">{currentQty}</span>

                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => toggleItemQuantity(item.id, item.quantity, 1)}
                        disabled={currentQty >= item.quantity}
                        className="size-7 rounded-md"
                      >
                        <PlusIcon className="size-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Split items summary */}
            <div className="p-2.5 rounded-lg bg-muted/30 border text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي للأصناف المحددة:</span>
                <span className="font-mono">{splitItemsSubtotal.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>الضريبة:</span>
                <span className="font-mono">{splitItemsTax.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t pt-1">
                <span>إجمالي الفاتورة المفصولة:</span>
                <span className="text-primary font-black font-mono text-sm">{splitItemsTotal.toFixed(2)} {currency}</span>
              </div>
            </div>
          </div>
        )}

        {/* Register Selector */}
        {registers.length > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t text-xs">
            <span className="text-muted-foreground shrink-0">الخزنة المستلمة:</span>
            <select
              value={selectedRegisterId || ""}
              onChange={(e) => setSelectedRegisterId(Number(e.target.value))}
              className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-xs"
            >
              {registers
                .filter((r) => r.is_active)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-lg text-xs"
          >
            إلغاء
          </Button>

          {activeTab === "equal" ? (
            <Button
              type="button"
              size="sm"
              disabled={isProcessing || remainingBalance <= 0 || sharePerPerson <= 0}
              onClick={handlePayEqualShare}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
            >
              {isProcessing ? <Loader2Icon className="size-3.5 animate-spin" /> : <PrinterIcon className="size-3.5" />}
              <span>سداد حصة فرد ({sharePerPerson} {currency}) وطباعة الفاتورة</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isProcessing || selectedItemsList.length === 0}
              onClick={handlePayItemsSplit}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
            >
              {isProcessing ? <Loader2Icon className="size-3.5 animate-spin" /> : <PrinterIcon className="size-3.5" />}
              <span>سداد الأصناف المحددة ({splitItemsTotal.toFixed(2)} {currency}) وطباعتها</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
