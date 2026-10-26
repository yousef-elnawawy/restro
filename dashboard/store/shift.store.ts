import { create } from "zustand"
import {
  type Shift,
  type ZReportData,
  getCurrentShiftApi,
  openShiftApi,
  closeShiftApi,
  getShiftsApi,
  getShiftDetailsApi,
} from "@/lib/api"

interface ShiftState {
  currentShift: Shift | null
  isLoading: boolean
  isActionLoading: boolean
  error: string | null
  shifts: Shift[]
  activeZReport: ZReportData | null
  activeZReportShift: Shift | null

  // Actions
  fetchCurrentShift: (registerId?: number) => Promise<Shift | null>
  openShift: (payload: {
    cash_register_id: number
    starting_cash: number
    opening_notes?: string
  }) => Promise<{ success: boolean; message: string; shift?: Shift }>
  closeShift: (
    shiftId: number,
    payload: {
      actual_cash: number
      closing_notes?: string
    }
  ) => Promise<{ success: boolean; message: string; z_report?: ZReportData; shift?: Shift }>
  fetchShifts: (params?: {
    cash_register_id?: number | "all"
    status?: string
    date_from?: string
    date_to?: string
  }) => Promise<void>
  loadZReport: (shiftId: number) => Promise<{ success: boolean; z_report?: ZReportData; shift?: Shift }>
  setActiveZReport: (report: ZReportData | null, shift?: Shift | null) => void
}

export const useShiftStore = create<ShiftState>()((set, get) => ({
  currentShift: null,
  isLoading: false,
  isActionLoading: false,
  error: null,
  shifts: [],
  activeZReport: null,
  activeZReportShift: null,

  fetchCurrentShift: async (registerId) => {
    set({ isLoading: true, error: null })
    try {
      const res = await getCurrentShiftApi(registerId)
      if (res.success) {
        set({ currentShift: res.data ?? null, isLoading: false })
        return res.data ?? null
      }
      set({ currentShift: null, isLoading: false })
      return null
    } catch {
      set({ currentShift: null, isLoading: false, error: "تعذر الاتصال بالخادم." })
      return null
    }
  },

  openShift: async (payload) => {
    set({ isActionLoading: true })
    try {
      const res = await openShiftApi(payload)
      if (res.success && res.data) {
        set({ currentShift: res.data, isActionLoading: false })
        return { success: true, message: res.message, shift: res.data }
      }
      set({ isActionLoading: false })
      return { success: false, message: res.message || "فشل فتح الوردية." }
    } catch {
      set({ isActionLoading: false })
      return { success: false, message: "تعذر الاتصال بالخادم لفتح الوردية." }
    }
  },

  closeShift: async (shiftId, payload) => {
    set({ isActionLoading: true })
    try {
      const res = await closeShiftApi(shiftId, payload)
      if (res.success && res.data) {
        set({
          currentShift: null,
          activeZReport: res.data.z_report,
          activeZReportShift: res.data.shift,
          isActionLoading: false,
        })
        return {
          success: true,
          message: res.message,
          z_report: res.data.z_report,
          shift: res.data.shift,
        }
      }
      set({ isActionLoading: false })
      return { success: false, message: res.message || "فشل إغلاق الوردية." }
    } catch {
      set({ isActionLoading: false })
      return { success: false, message: "تعذر الاتصال بالخادم لتقفيل الوردية." }
    }
  },

  fetchShifts: async (params) => {
    set({ isLoading: true })
    try {
      const res = await getShiftsApi(params)
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any).data || []
        set({ shifts: list, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  loadZReport: async (shiftId) => {
    set({ isActionLoading: true })
    try {
      const res = await getShiftDetailsApi(shiftId)
      if (res.success && res.data) {
        set({
          activeZReport: res.data.z_report,
          activeZReportShift: res.data.shift,
          isActionLoading: false,
        })
        return { success: true, z_report: res.data.z_report, shift: res.data.shift }
      }
      set({ isActionLoading: false })
      return { success: false }
    } catch {
      set({ isActionLoading: false })
      return { success: false }
    }
  },

  setActiveZReport: (report, shift = null) => {
    set({ activeZReport: report, activeZReportShift: shift })
  },
}))
