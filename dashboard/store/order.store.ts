import { create } from "zustand"
import {
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type CreateOrderPayload,
  type PayOrderPayload,
  type UpdateOrderStatusPayload,
  getOrdersApi,
  getOrderApi,
  createOrderApi,
  updateOrderApi,
  payOrderApi,
  cancelOrderApi,
  updateOrderStatusApi,
  assignOrderDriverApi,
} from "@/lib/api"

function extractErrorMessage(
  res: { message?: string; errors?: Record<string, string[] | string | number> },
  fallback: string
): string {
  if (res.errors && typeof res.errors === "object") {
    const errorList = Object.values(res.errors)
      .flatMap((err) => (Array.isArray(err) ? err : [String(err)]))
      .filter(Boolean)
    if (errorList.length > 0) {
      return errorList.join(" - ")
    }
  }
  return res.message || fallback
}

interface OrderState {
  orders: Order[]
  activeOrder: Order | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
  orderTypeFilter: "all" | "dinein" | "takeaway" | "delivery"
  statusFilter: "all" | OrderStatus
  paymentFilter: "all" | PaymentStatus

  // Actions
  fetchOrders: () => Promise<void>
  getOrder: (id: number) => Promise<Order | null>
  createOrder: (payload: CreateOrderPayload) => Promise<{ success: boolean; message: string; data?: Order }>
  updateOrder: (id: number, payload: Partial<CreateOrderPayload>) => Promise<{ success: boolean; message: string; data?: Order }>
  updateOrderStatus: (id: number, payload: UpdateOrderStatusPayload) => Promise<{ success: boolean; message: string; data?: Order }>
  assignDriver: (id: number, driverId: number) => Promise<{ success: boolean; message: string; data?: Order }>
  payOrder: (id: number, payload: PayOrderPayload) => Promise<{ success: boolean; message: string; data?: Order }>
  cancelOrder: (id: number) => Promise<{ success: boolean; message: string }>
  setActiveOrder: (order: Order | null) => void
  setSearchQuery: (query: string) => void
  setOrderTypeFilter: (filter: "all" | "dinein" | "takeaway" | "delivery") => void
  setStatusFilter: (filter: "all" | OrderStatus) => void
  setPaymentFilter: (filter: "all" | PaymentStatus) => void
  resetFilters: () => void
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  orders: [],
  activeOrder: null,
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: "",
  orderTypeFilter: "all",
  statusFilter: "all",
  paymentFilter: "all",

  fetchOrders: async () => {
    set({ isLoading: true, error: null })
    try {
      const { searchQuery, orderTypeFilter, statusFilter, paymentFilter } = get()
      const res = await getOrdersApi({
        search: searchQuery || undefined,
        order_type: orderTypeFilter,
        status: statusFilter,
        payment_status: paymentFilter,
      })

      if (res.success && res.data) {
        set({ orders: res.data, isLoading: false, error: null })
      } else {
        set({
          error: extractErrorMessage(res, "فشل في تحميل الطلبات."),
          isLoading: false,
        })
      }
    } catch {
      set({
        error: "تعذر الاتصال بالخادم لجلب الطلبات.",
        isLoading: false,
      })
    }
  },

  getOrder: async (id: number) => {
    try {
      const res = await getOrderApi(id)
      if (res.success && res.data) {
        return res.data
      }
      return null
    } catch {
      return null
    }
  },

  createOrder: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await createOrderApi(payload)
      if (res.success && res.data) {
        const current = get().orders
        set({ orders: [res.data, ...current], isSaving: false })
        return { success: true, message: res.message || "تم إنشاء الطلب بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في إنشاء الطلب.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لإنشاء الطلب." }
    }
  },

  updateOrder: async (id, payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await updateOrderApi(id, payload)
      if (res.success && res.data) {
        const updated = get().orders.map((o) => (o.id === id ? res.data! : o))
        set({
          orders: updated,
          activeOrder: get().activeOrder?.id === id ? res.data : get().activeOrder,
          isSaving: false,
        })
        return { success: true, message: res.message || "تم تحديث بنود الطلب بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في تحديث بنود الطلب.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتحديث الطلب." }
    }
  },

  updateOrderStatus: async (id, payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await updateOrderStatusApi(id, payload)
      if (res.success && res.data) {
        const updated = get().orders.map((o) => (o.id === id ? res.data! : o))
        set({ orders: updated, isSaving: false })
        return { success: true, message: res.message || "تم تحديث حالة الطلب بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في تحديث حالة الطلب.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتحديث حالة الطلب." }
    }
  },

  assignDriver: async (id, driverId) => {
    set({ isSaving: true, error: null })
    try {
      const res = await assignOrderDriverApi(id, driverId)
      if (res.success && res.data) {
        const updated = get().orders.map((o) => (o.id === id ? res.data! : o))
        set({ orders: updated, isSaving: false })
        return { success: true, message: res.message || "تم تعيين سائق التوصيل بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في تعيين سائق التوصيل.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتعيين السائق." }
    }
  },

  payOrder: async (id, payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await payOrderApi(id, payload)
      if (res.success && res.data) {
        const updated = get().orders.map((o) => (o.id === id ? res.data! : o))
        set({ orders: updated, isSaving: false })
        return { success: true, message: res.message || "تم دفع الطلب بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في تسجيل دفع الطلب.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتسجيل دفع الطلب." }
    }
  },

  cancelOrder: async (id) => {
    set({ isSaving: true, error: null })
    try {
      const res = await cancelOrderApi(id)
      if (res.success) {
        const updated = get().orders.map((o) => (o.id === id ? { ...o, status: "cancelled" as const } : o))
        set({ orders: updated, isSaving: false })
        return { success: true, message: res.message || "تم إلغاء الطلب بنجاح." }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في إلغاء الطلب.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لإلغاء الطلب." }
    }
  },

  setActiveOrder: (order) => {
    set({ activeOrder: order })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  setOrderTypeFilter: (filter) => {
    set({ orderTypeFilter: filter })
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter })
  },

  setPaymentFilter: (filter) => {
    set({ paymentFilter: filter })
  },

  resetFilters: () => {
    set({
      searchQuery: "",
      orderTypeFilter: "all",
      statusFilter: "all",
      paymentFilter: "all",
    })
  },
}))
