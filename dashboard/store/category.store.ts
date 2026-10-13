import { create } from "zustand"
import {
  type Category,
  type CategoryPayload,
  getCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
  toggleCategoryStatusApi,
} from "@/lib/api"

interface CategoryState {
  categories: Category[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
  statusFilter: "all" | "active" | "inactive"

  // Actions
  fetchCategories: () => Promise<void>
  createCategory: (payload: CategoryPayload) => Promise<{ success: boolean; message: string; data?: Category }>
  updateCategory: (
    id: number,
    payload: Partial<CategoryPayload>
  ) => Promise<{ success: boolean; message: string; data?: Category }>
  deleteCategory: (id: number) => Promise<{ success: boolean; message: string }>
  toggleCategoryStatus: (id: number) => Promise<{ success: boolean; message: string }>
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: "all" | "active" | "inactive") => void
  resetFilters: () => void
}

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

export const useCategoryStore = create<CategoryState>()((set, get) => ({
  categories: [],
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",

  fetchCategories: async () => {
    set({ isLoading: true, error: null })
    try {
      const { searchQuery, statusFilter } = get()
      const res = await getCategoriesApi({
        search: searchQuery || undefined,
        status: statusFilter,
      })

      if (res.success && res.data) {
        set({ categories: res.data, isLoading: false, error: null })
      } else {
        set({
          error: extractErrorMessage(res, "فشل في تحميل الأقسام."),
          isLoading: false,
        })
      }
    } catch {
      set({
        error: "تعذر الاتصال بالخادم لجلب الأقسام.",
        isLoading: false,
      })
    }
  },

  createCategory: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await createCategoryApi(payload)
      if (res.success && res.data) {
        const current = get().categories
        const updated = [...current, res.data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        set({ categories: updated, isSaving: false })
        return { success: true, message: res.message || "تمت إضافة القسم بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في إضافة القسم.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لإضافة القسم." }
    }
  },

  updateCategory: async (id, payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await updateCategoryApi(id, payload)
      if (res.success && res.data) {
        const updated = get().categories.map((c) => (c.id === id ? res.data! : c))
        updated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        set({ categories: updated, isSaving: false })
        return { success: true, message: res.message || "تم تحديث القسم بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في تحديث القسم.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتحديث القسم." }
    }
  },

  deleteCategory: async (id) => {
    set({ isSaving: true, error: null })
    try {
      const res = await deleteCategoryApi(id)
      if (res.success) {
        const updated = get().categories.filter((c) => c.id !== id)
        set({ categories: updated, isSaving: false })
        return { success: true, message: res.message || "تم حذف القسم بنجاح." }
      } else {
        set({ isSaving: false })
        return { success: false, message: res.message || "فشل في حذف القسم." }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لحذف القسم." }
    }
  },

  toggleCategoryStatus: async (id) => {
    const prev = get().categories
    set({
      categories: prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c)),
    })

    try {
      const res = await toggleCategoryStatusApi(id)
      if (res.success && res.data) {
        set({
          categories: get().categories.map((c) => (c.id === id ? res.data! : c)),
        })
        return { success: true, message: res.message || "تم تغيير حالة القسم بنجاح." }
      } else {
        set({ categories: prev })
        return { success: false, message: res.message || "فشل في تغيير حالة القسم." }
      }
    } catch {
      set({ categories: prev })
      return { success: false, message: "تعذر الاتصال بالخادم لتغيير حالة القسم." }
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter })
  },

  resetFilters: () => {
    set({ searchQuery: "", statusFilter: "all" })
  },
}))
