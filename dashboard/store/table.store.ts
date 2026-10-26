import { create } from "zustand"
import {
  type RestaurantTable,
  type TablePayload,
  type TableStatus,
  type Order,
  getTablesApi,
  getTableApi,
  getTableActiveOrderApi,
  createTableApi,
  updateTableApi,
  deleteTableApi,
  updateTableStatusApi,
  toggleTableActiveApi,
} from "@/lib/api"
import { getCachedCatalog, setCachedCatalog } from "@/lib/offline-db"

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

interface TableState {
  tables: RestaurantTable[]
  selectedTable: RestaurantTable | null
  activeTableOrder: Order | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
  statusFilter: "all" | TableStatus
  locationFilter: "all" | string
  activeFilter: "all" | "active" | "inactive"

  // Actions
  fetchTables: () => Promise<void>
  fetchTableActiveOrder: (tableId: number) => Promise<Order | null>
  setSelectedTable: (table: RestaurantTable | null) => void
  setActiveTableOrder: (order: Order | null) => void
  createTable: (payload: TablePayload) => Promise<{ success: boolean; message: string; data?: RestaurantTable }>
  updateTable: (
    id: number,
    payload: Partial<TablePayload>
  ) => Promise<{ success: boolean; message: string; data?: RestaurantTable }>
  deleteTable: (id: number) => Promise<{ success: boolean; message: string }>
  updateTableStatus: (id: number, status: TableStatus) => Promise<{ success: boolean; message: string }>
  toggleTableActive: (id: number) => Promise<{ success: boolean; message: string }>
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: "all" | TableStatus) => void
  setLocationFilter: (location: "all" | string) => void
  setActiveFilter: (filter: "all" | "active" | "inactive") => void
  resetFilters: () => void
}

export const useTableStore = create<TableState>()((set, get) => ({
  tables: [],
  selectedTable: null,
  activeTableOrder: null,
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",
  locationFilter: "all",
  activeFilter: "all",

  fetchTables: async () => {
    set({ isLoading: true, error: null })
    try {
      const { searchQuery, statusFilter, locationFilter, activeFilter } = get()
      const res = await getTablesApi({
        search: searchQuery || undefined,
        status: statusFilter,
        location: locationFilter,
        active_status: activeFilter,
      })

      if (res.success && res.data) {
        set({ tables: res.data, isLoading: false, error: null })
        setCachedCatalog("tables", res.data)
      } else {
        const cached = await getCachedCatalog<RestaurantTable[]>("tables")
        if (cached && cached.length > 0) {
          set({ tables: cached, isLoading: false, error: null })
        } else {
          set({
            error: extractErrorMessage(res, "فشل في تحميل بيانات الطاولات."),
            isLoading: false,
          })
        }
      }
    } catch {
      const cached = await getCachedCatalog<RestaurantTable[]>("tables")
      if (cached && cached.length > 0) {
        set({ tables: cached, isLoading: false, error: null })
      } else {
        set({
          error: "تعذر الاتصال بالخادم لجلب بيانات الطاولات.",
          isLoading: false,
        })
      }
    }
  },

  fetchTableActiveOrder: async (tableId: number) => {
    try {
      const res = await getTableActiveOrderApi(tableId)
      if (res.success && res.data) {
        set({ activeTableOrder: res.data })
        return res.data
      }
      set({ activeTableOrder: null })
      return null
    } catch {
      set({ activeTableOrder: null })
      return null
    }
  },

  setSelectedTable: (table) => {
    set({ selectedTable: table })
  },

  setActiveTableOrder: (order) => {
    set({ activeTableOrder: order })
  },

  createTable: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await createTableApi(payload)
      if (res.success && res.data) {
        const current = get().tables
        set({ tables: [...current, res.data], isSaving: false })
        return { success: true, message: res.message || "تمت إضافة الطاولة بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في إضافة الطاولة.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لإضافة الطاولة." }
    }
  },

  updateTable: async (id, payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await updateTableApi(id, payload)
      if (res.success && res.data) {
        const updated = get().tables.map((t) => (t.id === id ? res.data! : t))
        set({ tables: updated, isSaving: false })
        return { success: true, message: res.message || "تم تحديث الطاولة بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في تحديث بيانات الطاولة.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتحديث الطاولة." }
    }
  },

  deleteTable: async (id) => {
    set({ isSaving: true, error: null })
    try {
      const res = await deleteTableApi(id)
      if (res.success) {
        const filtered = get().tables.filter((t) => t.id !== id)
        set({ tables: filtered, isSaving: false })
        return { success: true, message: res.message || "تم حذف الطاولة بنجاح." }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في حذف الطاولة.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لحذف الطاولة." }
    }
  },

  updateTableStatus: async (id, status) => {
    try {
      const res = await updateTableStatusApi(id, status)
      if (res.success && res.data) {
        const updated = get().tables.map((t) => (t.id === id ? res.data! : t))
        set({ tables: updated })
        return { success: true, message: res.message || "تم تغيير حالة الطاولة." }
      } else {
        return { success: false, message: extractErrorMessage(res, "فشل في تغيير حالة الطاولة.") }
      }
    } catch {
      return { success: false, message: "تعذر الاتصال بالخادم لتغيير حالة الطاولة." }
    }
  },

  toggleTableActive: async (id) => {
    try {
      const res = await toggleTableActiveApi(id)
      if (res.success && res.data) {
        const updated = get().tables.map((t) => (t.id === id ? res.data! : t))
        set({ tables: updated })
        return { success: true, message: res.message || "تم تغيير حالة تفعيل الطاولة." }
      } else {
        return { success: false, message: extractErrorMessage(res, "فشل في تغيير حالة تفعيل الطاولة.") }
      }
    } catch {
      return { success: false, message: "تعذر الاتصال بالخادم لتغيير حالة الطاولة." }
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter })
  },

  setLocationFilter: (location) => {
    set({ locationFilter: location })
  },

  setActiveFilter: (filter) => {
    set({ activeFilter: filter })
  },

  resetFilters: () => {
    set({
      searchQuery: "",
      statusFilter: "all",
      locationFilter: "all",
      activeFilter: "all",
    })
  },
}))
