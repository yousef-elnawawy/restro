import { create } from "zustand"
import {
  type CashRegister,
  type CashRegisterPayload,
  getCashRegistersApi,
  getCashRegisterApi,
  createCashRegisterApi,
  updateCashRegisterApi,
  deleteCashRegisterApi,
  toggleCashRegisterActiveApi,
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

interface RegisterState {
  registers: CashRegister[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
  statusFilter: "all" | "active" | "inactive"

  // Actions
  fetchRegisters: () => Promise<void>
  createRegister: (payload: CashRegisterPayload) => Promise<{ success: boolean; message: string; data?: CashRegister }>
  updateRegister: (
    id: number,
    payload: Partial<CashRegisterPayload>
  ) => Promise<{ success: boolean; message: string; data?: CashRegister }>
  deleteRegister: (id: number) => Promise<{ success: boolean; message: string }>
  toggleRegisterActive: (id: number) => Promise<{ success: boolean; message: string }>
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: "all" | "active" | "inactive") => void
  resetFilters: () => void
}

export const useRegisterStore = create<RegisterState>()((set, get) => ({
  registers: [],
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",

  fetchRegisters: async () => {
    set({ isLoading: true, error: null })
    try {
      const { searchQuery, statusFilter } = get()
      const res = await getCashRegistersApi({
        search: searchQuery || undefined,
        status: statusFilter,
      })

      if (res.success && res.data) {
        set({ registers: res.data, isLoading: false, error: null })
      } else {
        set({
          error: extractErrorMessage(res, "فشل في تحميل بيانات الخزائن."),
          isLoading: false,
        })
      }
    } catch {
      set({
        error: "تعذر الاتصال بالخادم لجلب بيانات الخزائن.",
        isLoading: false,
      })
    }
  },

  createRegister: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await createCashRegisterApi(payload)
      if (res.success && res.data) {
        const current = get().registers
        set({ registers: [...current, res.data], isSaving: false })
        return { success: true, message: res.message || "تمت إضافة الخزنة بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في إضافة الخزنة.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لإضافة الخزنة." }
    }
  },

  updateRegister: async (id, payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await updateCashRegisterApi(id, payload)
      if (res.success && res.data) {
        const updated = get().registers.map((r) => (r.id === id ? res.data! : r))
        set({ registers: updated, isSaving: false })
        return { success: true, message: res.message || "تم تحديث الخزنة بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في تحديث بيانات الخزنة.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتحديث الخزنة." }
    }
  },

  deleteRegister: async (id) => {
    set({ isSaving: true, error: null })
    try {
      const res = await deleteCashRegisterApi(id)
      if (res.success) {
        const filtered = get().registers.filter((r) => r.id !== id)
        set({ registers: filtered, isSaving: false })
        return { success: true, message: res.message || "تم حذف الخزنة بنجاح." }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في حذف الخزنة.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لحذف الخزنة." }
    }
  },

  toggleRegisterActive: async (id) => {
    try {
      const res = await toggleCashRegisterActiveApi(id)
      if (res.success && res.data) {
        const updated = get().registers.map((r) => (r.id === id ? res.data! : r))
        set({ registers: updated })
        return { success: true, message: res.message || "تم تغيير حالة الخزنة." }
      } else {
        return { success: false, message: extractErrorMessage(res, "فشل في تغيير حالة الخزنة.") }
      }
    } catch {
      return { success: false, message: "تعذر الاتصال بالخادم لتغيير حالة الخزنة." }
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter })
  },

  resetFilters: () => {
    set({
      searchQuery: "",
      statusFilter: "all",
    })
  },
}))
