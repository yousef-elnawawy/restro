import { create } from "zustand"
import {
  type Customer,
  type CreateCustomerPayload,
  type UpdateCustomerPayload,
  getCustomersApi,
  createCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
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

interface CustomerState {
  customers: Customer[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
  statusFilter: "all" | "active" | "inactive"

  // Actions
  fetchCustomers: () => Promise<void>
  createCustomer: (payload: CreateCustomerPayload) => Promise<{ success: boolean; message: string; data?: Customer }>
  updateCustomer: (
    id: number,
    payload: UpdateCustomerPayload
  ) => Promise<{ success: boolean; message: string; data?: Customer }>
  deleteCustomer: (id: number) => Promise<{ success: boolean; message: string }>
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: "all" | "active" | "inactive") => void
  resetFilters: () => void
}

export const useCustomerStore = create<CustomerState>()((set, get) => ({
  customers: [],
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",

  fetchCustomers: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await getCustomersApi()
      if (res.success && res.data) {
        set({ customers: res.data, isLoading: false })
      } else {
        set({ error: res.message || "فشل في جلب قائمة العملاء", isLoading: false })
      }
    } catch {
      set({ error: "تعذر الاتصال بالخادم لجلب العملاء", isLoading: false })
    }
  },

  createCustomer: async (payload) => {
    set({ isSaving: true })
    try {
      const res = await createCustomerApi(payload)
      if (res.success && res.data) {
        set((state) => ({
          customers: [res.data!, ...state.customers],
          isSaving: false,
        }))
        return { success: true, message: "تمت إضافة العميل بنجاح", data: res.data }
      }
      set({ isSaving: false })
      return { success: false, message: extractErrorMessage(res, "فشل في إضافة العميل") }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  updateCustomer: async (id, payload) => {
    set({ isSaving: true })
    try {
      const res = await updateCustomerApi(id, payload)
      if (res.success && res.data) {
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? res.data! : c)),
          isSaving: false,
        }))
        return { success: true, message: "تم تحديث بيانات العميل بنجاح", data: res.data }
      }
      set({ isSaving: false })
      return { success: false, message: extractErrorMessage(res, "فشل في تحديث بيانات العميل") }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  deleteCustomer: async (id) => {
    set({ isSaving: true })
    try {
      const res = await deleteCustomerApi(id)
      if (res.success) {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
          isSaving: false,
        }))
        return { success: true, message: "تم حذف العميل بنجاح" }
      }
      set({ isSaving: false })
      return { success: false, message: extractErrorMessage(res, "فشل في حذف العميل") }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  resetFilters: () => set({ searchQuery: "", statusFilter: "all" }),
}))
