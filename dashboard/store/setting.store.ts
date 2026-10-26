import { create } from "zustand"
import {
  type RestaurantSettings,
  getSettingsApi,
  updateSettingsApi,
} from "@/lib/api"
import { getCachedCatalog, setCachedCatalog } from "@/lib/offline-db"

export const defaultSettings: RestaurantSettings = {
  restaurant_name: "مطعم ريسترو",
  restaurant_phone: "01000000000",
  restaurant_email: "contact@restro.com",
  restaurant_address: "الفرع الرئيسي",
  currency: "ج.م",
  tax_percentage: 14,
  tax_enabled: true,
  tax_number: "",
  delivery_fee: 20,
  delivery_base_fee: 15,
  delivery_fee_per_km: 5,
  receipt_header: "",
  receipt_footer: "شكراً لزيارتكم! نسعد بخدمتكم دائماً.",
  logo: null,
  enable_tables: true,
  enable_delivery: true,
  enable_takeaway: true,
}

interface SettingState {
  settings: RestaurantSettings
  isLoading: boolean
  isSaving: boolean
  error: string | null
  isInitialized: boolean

  fetchSettings: () => Promise<void>
  updateSettings: (
    payload: Partial<RestaurantSettings>
  ) => Promise<{ success: boolean; message: string; data?: RestaurantSettings }>
}

export const useSettingStore = create<SettingState>()((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  isSaving: false,
  error: null,
  isInitialized: false,

  fetchSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await getSettingsApi()
      if (res.success && res.data) {
        const merged = { ...defaultSettings, ...res.data }
        setCachedCatalog("settings", merged)
        set({
          settings: merged,
          isLoading: false,
          isInitialized: true,
          error: null,
        })
      } else {
        const cached = await getCachedCatalog<RestaurantSettings>("settings")
        set({
          settings: cached || defaultSettings,
          isLoading: false,
          isInitialized: true,
        })
      }
    } catch {
      const cached = await getCachedCatalog<RestaurantSettings>("settings")
      set({
        settings: cached || defaultSettings,
        isLoading: false,
        isInitialized: true,
      })
    }
  },

  updateSettings: async (payload) => {
    set({ isSaving: true, error: null })
    try {
      const res = await updateSettingsApi(payload)
      if (res.success && res.data) {
        set({
          settings: { ...get().settings, ...res.data },
          isSaving: false,
          error: null,
        })
        return {
          success: true,
          message: res.message || "تم حفظ الإعدادات بنجاح.",
          data: res.data,
        }
      } else {
        const errMsg = res.message || "فشل في حفظ الإعدادات."
        set({ isSaving: false, error: errMsg })
        return { success: false, message: errMsg }
      }
    } catch {
      const errMsg = "تعذر الاتصال بالخادم لحفظ الإعدادات."
      set({ isSaving: false, error: errMsg })
      return { success: false, message: errMsg }
    }
  },
}))
