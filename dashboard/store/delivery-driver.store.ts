import { create } from "zustand"
import {
  type DeliveryDriver,
  type CreateDeliveryDriverPayload,
  type UpdateDeliveryDriverPayload,
  getDeliveryDriversApi,
  createDeliveryDriverApi,
  updateDeliveryDriverApi,
  deleteDeliveryDriverApi,
  updateDeliveryDriverStatusApi,
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

interface DeliveryDriverState {
  drivers: DeliveryDriver[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
  statusFilter: "all" | "available" | "on_delivery" | "off_duty"

  // Actions
  fetchDrivers: () => Promise<void>
  createDriver: (
    payload: CreateDeliveryDriverPayload
  ) => Promise<{
    success: boolean
    message: string
    data?: DeliveryDriver & {
      generated_credentials?: { email: string; password?: string; login_identifier?: string }
    }
  }>
  updateDriver: (
    id: number,
    payload: UpdateDeliveryDriverPayload
  ) => Promise<{ success: boolean; message: string; data?: DeliveryDriver }>
  deleteDriver: (id: number) => Promise<{ success: boolean; message: string }>
  updateStatus: (
    id: number,
    status: "available" | "on_delivery" | "off_duty"
  ) => Promise<{ success: boolean; message: string }>
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: "all" | "available" | "on_delivery" | "off_duty") => void
  resetFilters: () => void
}

export const useDeliveryDriverStore = create<DeliveryDriverState>()((set, get) => ({
  drivers: [],
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",

  fetchDrivers: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await getDeliveryDriversApi()
      if (res.success && res.data) {
        set({ drivers: res.data, isLoading: false })
      } else {
        set({ error: res.message || "فشل في جلب قائمة المندوبين", isLoading: false })
      }
    } catch {
      set({ error: "تعذر الاتصال بالخادم لجلب المندوبين", isLoading: false })
    }
  },

  createDriver: async (payload) => {
    set({ isSaving: true })
    try {
      const res = await createDeliveryDriverApi(payload)
      if (res.success && res.data) {
        set((state) => ({
          drivers: [res.data!, ...state.drivers],
          isSaving: false,
        }))
        return { success: true, message: "تمت إضافة المندوب بنجاح", data: res.data }
      }
      set({ isSaving: false })
      return { success: false, message: extractErrorMessage(res, "فشل في إضافة المندوب") }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  updateDriver: async (id, payload) => {
    set({ isSaving: true })
    try {
      const res = await updateDeliveryDriverApi(id, payload)
      if (res.success && res.data) {
        set((state) => ({
          drivers: state.drivers.map((d) => (d.id === id ? res.data! : d)),
          isSaving: false,
        }))
        return { success: true, message: "تم تحديث بيانات المندوب بنجاح", data: res.data }
      }
      set({ isSaving: false })
      return { success: false, message: extractErrorMessage(res, "فشل في تحديث بيانات المندوب") }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  deleteDriver: async (id) => {
    set({ isSaving: true })
    try {
      const res = await deleteDeliveryDriverApi(id)
      if (res.success) {
        set((state) => ({
          drivers: state.drivers.filter((d) => d.id !== id),
          isSaving: false,
        }))
        return { success: true, message: "تم حذف المندوب بنجاح" }
      }
      set({ isSaving: false })
      return { success: false, message: extractErrorMessage(res, "فشل في حذف المندوب") }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  updateStatus: async (id, status) => {
    try {
      const res = await updateDeliveryDriverStatusApi(id, status)
      if (res.success) {
        set((state) => ({
          drivers: state.drivers.map((d) => (d.id === id ? { ...d, status } : d)),
        }))
        return { success: true, message: "تم تحديث حالة المندوب" }
      }
      return { success: false, message: extractErrorMessage(res, "فشل في تحديث الحالة") }
    } catch {
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  resetFilters: () => set({ searchQuery: "", statusFilter: "all" }),
}))
