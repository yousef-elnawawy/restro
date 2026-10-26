import { create } from "zustand"
import {
  type Modifier,
  type ModifierPayload,
  getModifiersApi,
  createModifierApi,
  updateModifierApi,
  deleteModifierApi,
  toggleModifierStatusApi,
} from "@/lib/api"
import { getCachedCatalog, setCachedCatalog } from "@/lib/offline-db"

interface ModifierState {
  modifiers: Modifier[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
  statusFilter: "all" | "active" | "inactive"

  // Actions
  fetchModifiers: () => Promise<void>
  createModifier: (payload: ModifierPayload) => Promise<{ success: boolean; message: string; data?: Modifier }>
  updateModifier: (
    id: number,
    payload: Partial<ModifierPayload>
  ) => Promise<{ success: boolean; message: string; data?: Modifier }>
  deleteModifier: (id: number) => Promise<{ success: boolean; message: string }>
  toggleModifierStatus: (id: number) => Promise<{ success: boolean; message: string }>
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: "all" | "active" | "inactive") => void
  resetFilters: () => void
}

export const useModifierStore = create<ModifierState>()((set, get) => ({
  modifiers: [],
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",

  fetchModifiers: async () => {
    set({ isLoading: true, error: null })
    try {
      const { searchQuery, statusFilter } = get()
      const res = await getModifiersApi({
        search: searchQuery || undefined,
        status: statusFilter,
      })

      if (res.success && res.data) {
        set({ modifiers: res.data, isLoading: false, error: null })
        setCachedCatalog("modifiers", res.data)
      } else {
        const cached = await getCachedCatalog<Modifier[]>("modifiers")
        if (cached && cached.length > 0) {
          set({ modifiers: cached, isLoading: false, error: null })
        } else {
          set({
            error: res.message || "فشل في تحميل الإضافات.",
            isLoading: false,
          })
        }
      }
    } catch {
      const cached = await getCachedCatalog<Modifier[]>("modifiers")
      if (cached && cached.length > 0) {
        set({ modifiers: cached, isLoading: false, error: null })
      } else {
        set({
          error: "تعذر الاتصال بالخادم لجلب الإضافات.",
          isLoading: false,
        })
      }
    }
  },

  createModifier: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await createModifierApi(payload)
      if (res.success && res.data) {
        const current = get().modifiers
        set({ modifiers: [res.data, ...current], isSaving: false })
        return { success: true, message: res.message || "تمت إضافة الخيار بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: res.message || "فشل في إضافة الخيار." }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لإضافة الخيار." }
    }
  },

  updateModifier: async (id, payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await updateModifierApi(id, payload)
      if (res.success && res.data) {
        const updated = get().modifiers.map((m) => (m.id === id ? res.data! : m))
        set({ modifiers: updated, isSaving: false })
        return { success: true, message: res.message || "تم تحديث الخيار بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: res.message || "فشل في تحديث الخيار." }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتحديث الخيار." }
    }
  },

  deleteModifier: async (id) => {
    set({ isSaving: true, error: null })
    try {
      const res = await deleteModifierApi(id)
      if (res.success) {
        set((state) => ({
          modifiers: state.modifiers.filter((m) => m.id !== id),
          isSaving: false,
        }))
        return { success: true, message: res.message || "تم حذف الخيار بنجاح." }
      } else {
        set({ isSaving: false })
        return { success: false, message: res.message || "فشل في حذف الخيار." }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لحذف الخيار." }
    }
  },

  toggleModifierStatus: async (id) => {
    const prev = get().modifiers
    set({
      modifiers: prev.map((m) => (m.id === id ? { ...m, is_active: !m.is_active } : m)),
    })

    try {
      const res = await toggleModifierStatusApi(id)
      if (res.success && res.data) {
        set({
          modifiers: get().modifiers.map((m) => (m.id === id ? res.data! : m)),
        })
        return { success: true, message: res.message || "تم تغيير حالة الخيار بنجاح." }
      } else {
        set({ modifiers: prev })
        return { success: false, message: res.message || "فشل في تغيير حالة الخيار." }
      }
    } catch {
      set({ modifiers: prev })
      return { success: false, message: "تعذر الاتصال بالخادم لتغيير حالة الخيار." }
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
