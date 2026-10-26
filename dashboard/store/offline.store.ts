import { create } from "zustand"
import {
  type OfflineOrder,
  getOfflineOrders,
  getPendingOfflineOrders,
  saveOfflineOrder,
  updateOfflineOrderStatus,
  deleteOfflineOrder,
  clearSyncedOfflineOrders,
} from "@/lib/offline-db"
import { createOrderApi, payOrderApi, type Order, type CreateOrderPayload } from "@/lib/api"

interface OfflineState {
  isOnline: boolean
  pendingOrders: OfflineOrder[]
  isSyncing: boolean
  lastSyncTime: string | null
  syncError: string | null

  // Actions
  initNetworkListener: () => () => void
  checkConnection: () => Promise<boolean>
  refreshPendingOrders: () => Promise<void>
  saveOrderLocally: (
    payload: CreateOrderPayload,
    paymentInfo?: {
      cash_register_id: number
      amount: number
      payment_method?: string
      notes?: string
      complete_order?: boolean
    }
  ) => Promise<{ success: boolean; order: Order; offlineId: string }>
  syncAllPendingOrders: () => Promise<{ successCount: number; failCount: number }>
  removePendingOrder: (id: string) => Promise<void>
  clearSynced: () => Promise<void>
}

export const useOfflineStore = create<OfflineState>()((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingOrders: [],
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,

  initNetworkListener: () => {
    if (typeof window === "undefined") return () => {}

    const handleOnline = () => {
      set({ isOnline: true })
      // Auto sync when coming back online
      get().syncAllPendingOrders()
    }

    const handleOffline = () => {
      set({ isOnline: false })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial load of pending orders
    get().refreshPendingOrders()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  },

  checkConnection: async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ isOnline: false })
      return false
    }

    try {
      // Ping a lightweight endpoint with a short timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3500)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/settings`, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      })
      clearTimeout(timeoutId)
      const online = res.ok || res.status === 401 || res.status === 403
      set({ isOnline: online })
      return online
    } catch {
      set({ isOnline: false })
      return false
    }
  },

  refreshPendingOrders: async () => {
    const list = await getOfflineOrders()
    set({ pendingOrders: list })
  },

  saveOrderLocally: async (payload, paymentInfo) => {
    const timestamp = Date.now()
    const offlineId = `OFF-${timestamp}`
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const orderNumber = `OFF-${dateStr}-${timestamp.toString().slice(-4)}`

    const offlineRecord: OfflineOrder = {
      id: offlineId,
      orderNumber,
      payload,
      paymentInfo,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    await saveOfflineOrder(offlineRecord)
    await get().refreshPendingOrders()

    // Construct a synthetic Order object so POS UI and Receipt modal render seamlessly
    const syntheticOrder: Order = {
      id: -timestamp, // negative id indicates unsynced offline order
      order_number: orderNumber,
      order_type: payload.order_type,
      status: paymentInfo?.complete_order ? "completed" : "pending",
      payment_status: paymentInfo ? "paid" : "unpaid",
      payment_method: paymentInfo?.payment_method || "cash",
      table_id: payload.table_id || null,
      customer_id: payload.customer_id || null,
      customer_name: payload.customer_name || null,
      subtotal: payload.subtotal ?? 0,
      tax: payload.tax || 0,
      delivery_fee: payload.delivery_fee || 0,
      delivery_address: payload.delivery_address || null,
      delivery_distance: payload.delivery_distance || null,
      total: payload.total ?? 0,
      notes: payload.notes || "طلب محلي بدون اتصال (Offline)",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: payload.items.map((it: any, idx: number) => ({
        id: -(timestamp + idx),
        order_id: -timestamp,
        product_id: it.product_id || null,
        product_name: it.product_name,
        size_name: it.size_name || null,
        unit_price: it.unit_price,
        quantity: it.quantity,
        total_price: it.total_price,
        selected_extras: it.selected_extras || null,
        notes: it.notes || null,
      })),
      payments: paymentInfo
        ? [
            {
              id: -(timestamp + 99),
              order_id: -timestamp,
              cash_register_id: paymentInfo.cash_register_id,
              amount: paymentInfo.amount,
              payment_method: paymentInfo.payment_method || "cash",
              paid_at: new Date().toISOString(),
            },
          ]
        : [],
    }

    return { success: true, order: syntheticOrder, offlineId }
  },

  syncAllPendingOrders: async () => {
    const pending = await getPendingOfflineOrders()
    if (pending.length === 0) return { successCount: 0, failCount: 0 }

    set({ isSyncing: true, syncError: null })

    let successCount = 0
    let failCount = 0

    for (const offlineOrder of pending) {
      await updateOfflineOrderStatus(offlineOrder.id, "syncing")
      try {
        // 1. Create order on server
        const resCreate = await createOrderApi(offlineOrder.payload)
        if (!resCreate.success || !resCreate.data) {
          throw new Error(resCreate.message || "فشل تسجيل الطلب على الخادم")
        }

        const serverOrder = resCreate.data

        // 2. If it was paid offline, record the payment on server
        if (offlineOrder.paymentInfo) {
          const resPay = await payOrderApi(serverOrder.id, {
            cash_register_id: offlineOrder.paymentInfo.cash_register_id,
            amount: offlineOrder.paymentInfo.amount,
            payment_method: offlineOrder.paymentInfo.payment_method,
            notes: `سداد طلب بدون اتصال: ${offlineOrder.orderNumber}`,
            complete_order: offlineOrder.paymentInfo.complete_order,
          })

          if (!resPay.success) {
            console.warn(`[Sync] Payment recording failed for synced order ${serverOrder.order_number}:`, resPay.message)
          }
        }

        await updateOfflineOrderStatus(offlineOrder.id, "synced")
        successCount++
      } catch (err: any) {
        failCount++
        await updateOfflineOrderStatus(offlineOrder.id, "failed", err?.message || "خطأ غير معروف")
      }
    }

    await get().refreshPendingOrders()
    set({
      isSyncing: false,
      lastSyncTime: new Date().toISOString(),
      syncError: failCount > 0 ? `فشلت مزامنة ${failCount} طلبات، يرجى إعادة المحاولة.` : null,
    })

    return { successCount, failCount }
  },

  removePendingOrder: async (id: string) => {
    await deleteOfflineOrder(id)
    await get().refreshPendingOrders()
  },

  clearSynced: async () => {
    await clearSyncedOfflineOrders()
    await get().refreshPendingOrders()
  },
}))
