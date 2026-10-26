import { create } from "zustand"
import {
  type Product,
  type ProductPayload,
  type PaginationMeta,
  type ProductsCounts,
  getProductsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
  toggleProductStatusApi,
} from "@/lib/api"
import { getCachedCatalog, setCachedCatalog } from "@/lib/offline-db"

interface ProductState {
  products: Product[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
  statusFilter: "all" | "active" | "inactive"
  selectedCategory: number | "all"
  page: number
  perPage: number
  pagination: PaginationMeta | null
  counts: ProductsCounts

  // Actions
  fetchProducts: (options?: {
    page?: number
    per_page?: number
    all?: boolean
    search?: string
    category_id?: number | "all"
    status?: "all" | "active" | "inactive"
  }) => Promise<void>
  createProduct: (payload: ProductPayload) => Promise<{ success: boolean; message: string; data?: Product }>
  updateProduct: (
    id: number,
    payload: Partial<ProductPayload>
  ) => Promise<{ success: boolean; message: string; data?: Product }>
  deleteProduct: (id: number) => Promise<{ success: boolean; message: string }>
  toggleProductStatus: (id: number) => Promise<{ success: boolean; message: string }>
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: "all" | "active" | "inactive") => void
  setSelectedCategory: (categoryId: number | "all") => void
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
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

export const useProductStore = create<ProductState>()((set, get) => ({
  products: [],
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",
  selectedCategory: "all",
  page: 1,
  perPage: 12,
  pagination: null,
  counts: {
    total: 0,
    active: 0,
    inactive: 0,
  },

  fetchProducts: async (options) => {
    set({ isLoading: true, error: null })
    try {
      const state = get()
      const search = options?.search !== undefined ? options.search : state.searchQuery
      const category_id = options?.category_id !== undefined ? options.category_id : state.selectedCategory
      const status = options?.status !== undefined ? options.status : state.statusFilter
      const page = options?.page !== undefined ? options.page : state.page
      const per_page = options?.per_page !== undefined ? options.per_page : state.perPage
      const all = options?.all ?? false

      const res = await getProductsApi({
        search: search || undefined,
        category_id,
        status,
        page,
        per_page,
        all,
      })

      if (res.success && res.data) {
        const productsList = Array.isArray(res.data) ? res.data : []
        const pagination = res.pagination || (all ? null : {
          current_page: page,
          last_page: 1,
          per_page,
          total: productsList.length,
          from: productsList.length > 0 ? 1 : null,
          to: productsList.length,
        })
        const counts = res.counts || {
          total: pagination?.total ?? productsList.length,
          active: productsList.filter((p) => p.is_active).length,
          inactive: (pagination?.total ?? productsList.length) - productsList.filter((p) => p.is_active).length,
        }

        // Save products to offline cache
        setCachedCatalog("products", productsList)

        set({
          products: productsList,
          pagination,
          counts,
          page: pagination?.current_page ?? page,
          isLoading: false,
          error: null,
        })
      } else {
        const cached = await getCachedCatalog<Product[]>("products")
        if (cached && cached.length > 0) {
          set({ products: cached, isLoading: false, error: null })
        } else {
          set({
            error: extractErrorMessage(res, "فشل في تحميل المنتجات."),
            isLoading: false,
          })
        }
      }
    } catch {
      const cached = await getCachedCatalog<Product[]>("products")
      if (cached && cached.length > 0) {
        set({ products: cached, isLoading: false, error: null })
      } else {
        set({
          error: "تعذر الاتصال بالخادم لجلب المنتجات.",
          isLoading: false,
        })
      }
    }
  },

  createProduct: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await createProductApi(payload)
      if (res.success && res.data) {
        // Refresh products and counts
        await get().fetchProducts({ page: 1 })
        set({ isSaving: false })
        return { success: true, message: res.message || "تمت إضافة المنتج بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في إضافة المنتج.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لإضافة المنتج." }
    }
  },

  updateProduct: async (id, payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await updateProductApi(id, payload)
      if (res.success && res.data) {
        const updated = get().products.map((p) => (p.id === id ? res.data! : p))
        set({ products: updated, isSaving: false })
        return { success: true, message: res.message || "تم تحديث بيانات المنتج بنجاح.", data: res.data }
      } else {
        set({ isSaving: false })
        return { success: false, message: extractErrorMessage(res, "فشل في تحديث المنتج.") }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتحديث المنتج." }
    }
  },

  deleteProduct: async (id) => {
    set({ isSaving: true, error: null })
    try {
      const res = await deleteProductApi(id)
      if (res.success) {
        const { page, products } = get()
        const newPage = products.length === 1 && page > 1 ? page - 1 : page
        await get().fetchProducts({ page: newPage })
        set({ isSaving: false })
        return { success: true, message: res.message || "تم حذف المنتج بنجاح." }
      } else {
        set({ isSaving: false })
        return { success: false, message: res.message || "فشل في حذف المنتج." }
      }
    } catch {
      set({ isSaving: false })
      return { success: false, message: "تعذر الاتصال بالخادم لحذف المنتج." }
    }
  },

  toggleProductStatus: async (id) => {
    const prev = get().products
    set({
      products: prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)),
    })

    try {
      const res = await toggleProductStatusApi(id)
      if (res.success && res.data) {
        set({
          products: get().products.map((p) => (p.id === id ? res.data! : p)),
        })
        const currentCounts = get().counts
        const isNowActive = res.data.is_active
        set({
          counts: {
            ...currentCounts,
            active: Math.max(0, currentCounts.active + (isNowActive ? 1 : -1)),
            inactive: Math.max(0, currentCounts.inactive + (isNowActive ? -1 : 1)),
          },
        })
        return { success: true, message: res.message || "تم تغيير حالة المنتج بنجاح." }
      } else {
        set({ products: prev })
        return { success: false, message: res.message || "فشل في تغيير حالة المنتج." }
      }
    } catch {
      set({ products: prev })
      return { success: false, message: "تعذر الاتصال بالخادم لتغيير حالة المنتج." }
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, page: 1 })
  },

  setStatusFilter: (filter) => {
    set({ statusFilter: filter, page: 1 })
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategory: categoryId, page: 1 })
  },

  setPage: (page) => {
    set({ page })
    get().fetchProducts({ page })
  },

  setPerPage: (perPage) => {
    set({ perPage, page: 1 })
    get().fetchProducts({ page: 1, per_page: perPage })
  },

  resetFilters: () => {
    set({ searchQuery: "", statusFilter: "all", selectedCategory: "all", page: 1 })
    get().fetchProducts({ page: 1, search: "", category_id: "all", status: "all" })
  },
}))
