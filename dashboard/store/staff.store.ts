import { create } from "zustand"
import {
  type StaffUser,
  type CreateStaffUserPayload,
  type UpdateStaffUserPayload,
  getStaffUsersApi,
  createStaffUserApi,
  updateStaffUserApi,
  deleteStaffUserApi,
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

interface StaffState {
  staffList: StaffUser[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
  roleFilter: "all" | "admin" | "cashier" | "kitchen" | "delivery"

  // Actions
  fetchStaff: () => Promise<void>
  createStaff: (
    payload: CreateStaffUserPayload
  ) => Promise<{ success: boolean; message: string; data?: StaffUser }>
  updateStaff: (
    id: number,
    payload: UpdateStaffUserPayload
  ) => Promise<{ success: boolean; message: string; data?: StaffUser }>
  deleteStaff: (id: number) => Promise<{ success: boolean; message: string }>
  setSearchQuery: (query: string) => void
  setRoleFilter: (filter: "all" | "admin" | "cashier" | "kitchen" | "delivery") => void
  resetFilters: () => void
}

export const useStaffStore = create<StaffState>()((set, get) => ({
  staffList: [],
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: "",
  roleFilter: "all",

  fetchStaff: async () => {
    set({ isLoading: true, error: null })
    try {
      const { roleFilter, searchQuery } = get()
      const res = await getStaffUsersApi({
        role: roleFilter !== "all" ? roleFilter : undefined,
        search: searchQuery || undefined,
      })

      if (res.success && Array.isArray(res.data)) {
        set({ staffList: res.data, isLoading: false })
      } else {
        set({
          error: res.message || "فشل جلب قائمة الموظفين",
          isLoading: false,
        })
      }
    } catch {
      set({
        error: "حدث خطأ غير متوقع أثناء جلب الموظفين",
        isLoading: false,
      })
    }
  },

  createStaff: async (payload: CreateStaffUserPayload) => {
    set({ isSaving: true })
    try {
      const res = await createStaffUserApi(payload)
      if (res.success && res.data) {
        set((state) => ({
          staffList: [res.data!, ...state.staffList],
          isSaving: false,
        }))
        return { success: true, message: res.message || "تم إضافة الموظف بنجاح", data: res.data }
      } else {
        set({ isSaving: false })
        return {
          success: false,
          message: extractErrorMessage(res, "فشل إضافة الموظف"),
        }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  updateStaff: async (id: number, payload: UpdateStaffUserPayload) => {
    set({ isSaving: true })
    try {
      const res = await updateStaffUserApi(id, payload)
      if (res.success && res.data) {
        set((state) => ({
          staffList: state.staffList.map((item) =>
            item.id === id ? res.data! : item
          ),
          isSaving: false,
        }))
        return { success: true, message: res.message || "تم تحديث بيانات الموظف بنجاح", data: res.data }
      } else {
        set({ isSaving: false })
        return {
          success: false,
          message: extractErrorMessage(res, "فشل تحديث بيانات الموظف"),
        }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  deleteStaff: async (id: number) => {
    set({ isSaving: true })
    try {
      const res = await deleteStaffUserApi(id)
      if (res.success) {
        set((state) => ({
          staffList: state.staffList.filter((item) => item.id !== id),
          isSaving: false,
        }))
        return { success: true, message: res.message || "تم حذف الموظف بنجاح" }
      } else {
        set({ isSaving: false })
        return {
          success: false,
          message: extractErrorMessage(res, "فشل حذف الموظف"),
        }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم" }
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setRoleFilter: (filter: "all" | "admin" | "cashier" | "kitchen" | "delivery") => {
    set({ roleFilter: filter })
  },

  resetFilters: () => {
    set({ searchQuery: "", roleFilter: "all" })
  },
}))
