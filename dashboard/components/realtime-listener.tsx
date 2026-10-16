"use client"

import * as React from "react"
import { getEcho } from "@/lib/echo"
import { playNewOrderSound, playOrderReadySound } from "@/lib/sound"
import { useAuthStore } from "@/store/auth.store"
import { useOrderStore } from "@/store/order.store"
import { useTableStore } from "@/store/table.store"
import {
  BellRingIcon,
  ChefHatIcon,
  CheckCircle2Icon,
  XIcon,
  RadioIcon,
} from "lucide-react"

interface RealtimeToast {
  id: string
  title: string
  description: string
  type: "kitchen" | "cashier" | "info"
}

export function RealtimeListener() {
  const { user } = useAuthStore()
  const { fetchOrders } = useOrderStore()
  const { fetchTables } = useTableStore()

  const [toasts, setToasts] = React.useState<RealtimeToast[]>([])

  const addToast = (toast: Omit<RealtimeToast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])

    // إخفاء التنبيه تلقائياً بعد 6 ثوانٍ
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 6000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  React.useEffect(() => {
    const echo = getEcho()
    if (!echo) return

    // 1. الاستماع لقناة المطبخ (تذاكر الطلبات الجديدة)
    const kitchenChannel = echo.channel("kitchen-orders")
    kitchenChannel.listen(".order.created", (data: any) => {
      const order = data?.order || data
      fetchOrders()
      fetchTables()

      // تنبيه المطبخ والمدير صوتياً ومرئياً
      if (!user || user.role === "kitchen" || user.role === "admin") {
        playNewOrderSound()
        addToast({
          title: `طلب جديد للمطبخ: #${order.order_number || ""}`,
          description: `نوع الطلب: ${order.order_type === "dinein" ? `طاولة ${order.table?.name || ""}` : order.order_type === "delivery" ? "توصيل" : "استلام سفري"} • إجمالي الأصناف: ${order.items?.length || 1}`,
          type: "kitchen",
        })
      }
    })

    // 2. الاستماع لقناة الكاشير (جاهزية الطلبات وتغيير الحالات)
    const cashierChannel = echo.channel("cashier-orders")
    cashierChannel.listen(".order.status.updated", (data: any) => {
      const order = data?.order || data
      const isReady = data?.is_ready || order.status === "ready"
      fetchOrders()
      fetchTables()

      if (isReady) {
        // تنبيه الكاشير والمدير بصوت ورسالة أن الوجبة جاهزة للتسليم
        if (!user || user.role === "cashier" || user.role === "admin") {
          playOrderReadySound()
          addToast({
            title: `جاهز للتسليم: #${order.order_number || ""}`,
            description: `المطبخ انتهى من تحضير الطلب! يرجى تسليمه للعميل أو الطيار الآن.`,
            type: "cashier",
          })
        }
      } else if (data?.message) {
        addToast({
          title: `تحديث طلب: #${order.order_number || ""}`,
          description: data.message,
          type: "info",
        })
      }
    })

    return () => {
      echo.leaveChannel("kitchen-orders")
      echo.leaveChannel("cashier-orders")
    }
  }, [user, fetchOrders, fetchTables])

  return (
    <>
      {/* نافذة التنبيهات اللحظية العائمة أعلى الشاشة */}
      <div className="fixed top-4 end-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md animate-in slide-in-from-top-3 duration-200 ${
              toast.type === "kitchen"
                ? "bg-amber-500/15 border-amber-500/40 text-foreground"
                : toast.type === "cashier"
                ? "bg-emerald-500/15 border-emerald-500/40 text-foreground"
                : "bg-card border-border/80 text-foreground"
            }`}
          >
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                toast.type === "kitchen"
                  ? "bg-amber-500 text-white shadow-xs"
                  : toast.type === "cashier"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {toast.type === "kitchen" ? (
                <ChefHatIcon className="size-5" />
              ) : toast.type === "cashier" ? (
                <CheckCircle2Icon className="size-5" />
              ) : (
                <BellRingIcon className="size-5" />
              )}
            </div>

            <div className="flex-1 min-w-0 text-right">
              <h4 className="text-xs font-bold text-foreground leading-tight">{toast.title}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{toast.description}</p>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
