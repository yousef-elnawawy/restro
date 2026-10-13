import { create } from "zustand"
import {
  type FinancialTransaction,
  type FinancialTransactionPayload,
  type FinancialSummary,
  getFinancialTransactionsApi,
  createFinancialTransactionApi,
  deleteFinancialTransactionApi,
} from "@/lib/api"

interface FinancialStore {
  transactions: FinancialTransaction[]
  summary: FinancialSummary
  isLoading: boolean
  isSaving: boolean
  error: string | null

  // Filters
  typeFilter: "all" | "receipt" | "payment" | "expense"
  registerFilter: number | "all"
  searchQuery: string
  dateFrom: string
  dateTo: string

  // Actions
  fetchTransactions: () => Promise<void>
  createTransaction: (payload: FinancialTransactionPayload) => Promise<{ success: boolean; message: string; data?: FinancialTransaction }>
  deleteTransaction: (id: number) => Promise<{ success: boolean; message: string }>
  setTypeFilter: (type: "all" | "receipt" | "payment" | "expense") => void
  setRegisterFilter: (id: number | "all") => void
  setSearchQuery: (query: string) => void
  setDateFrom: (date: string) => void
  setDateTo: (date: string) => void
}

export const useFinancialStore = create<FinancialStore>((set, get) => ({
  transactions: [],
  summary: {
    total_receipts: 0,
    total_payments: 0,
    total_expenses: 0,
    net_flow: 0,
  },
  isLoading: false,
  isSaving: false,
  error: null,

  typeFilter: "all",
  registerFilter: "all",
  searchQuery: "",
  dateFrom: "",
  dateTo: "",

  fetchTransactions: async () => {
    set({ isLoading: true, error: null })
    const { typeFilter, registerFilter, searchQuery, dateFrom, dateTo } = get()

    const params: {
      type?: string
      cash_register_id?: number
      search?: string
      date_from?: string
      date_to?: string
    } = {}

    if (typeFilter !== "all") params.type = typeFilter
    if (registerFilter !== "all") params.cash_register_id = registerFilter
    if (searchQuery.trim()) params.search = searchQuery.trim()
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo

    const res = await getFinancialTransactionsApi(params)

    if (res.success && res.data) {
      set({
        transactions: res.data.transactions || [],
        summary: res.data.summary || {
          total_receipts: 0,
          total_payments: 0,
          total_expenses: 0,
          net_flow: 0,
        },
        isLoading: false,
      })
    } else {
      set({
        error: res.message || "حدث خطأ أثناء جلب السندات المالية.",
        isLoading: false,
      })
    }
  },

  createTransaction: async (payload: FinancialTransactionPayload) => {
    set({ isSaving: true, error: null })
    const res = await createFinancialTransactionApi(payload)

    if (res.success && res.data) {
      // Re-fetch transactions and update state
      await get().fetchTransactions()
      set({ isSaving: false })
      return { success: true, message: res.message, data: res.data }
    } else {
      set({ isSaving: false })
      return { success: false, message: res.message || "فشل تسجيل السند المالي." }
    }
  },

  deleteTransaction: async (id: number) => {
    set({ isSaving: true })
    const res = await deleteFinancialTransactionApi(id)

    if (res.success) {
      await get().fetchTransactions()
      set({ isSaving: false })
      return { success: true, message: res.message }
    } else {
      set({ isSaving: false })
      return { success: false, message: res.message || "فشل حذف السند المالي." }
    }
  },

  setTypeFilter: (type) => {
    set({ typeFilter: type })
    get().fetchTransactions()
  },

  setRegisterFilter: (id) => {
    set({ registerFilter: id })
    get().fetchTransactions()
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
    get().fetchTransactions()
  },

  setDateFrom: (date) => {
    set({ dateFrom: date })
    get().fetchTransactions()
  },

  setDateTo: (date) => {
    set({ dateTo: date })
    get().fetchTransactions()
  },
}))
