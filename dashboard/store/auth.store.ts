import { create } from "zustand"
import {
  type User,
  getAuthToken,
  getStoredUser,
  setAuthSession,
  clearAuthSession,
  loginApi,
  logoutApi,
  getMeApi,
  updateProfileApi,
} from "@/lib/api"

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  updateProfile: (data: {
    name?: string
    email?: string
    current_password?: string
    password?: string
  }) => Promise<{
    success: boolean
    message: string
    errors?: Record<string, string[] | string | number>
  }>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  setUser: (user) => set({ user }),

  initialize: async () => {
    if (get().isInitialized) return

    const storedUser = getStoredUser()
    const storedToken = getAuthToken()

    if (storedUser && storedToken) {
      set({ user: storedUser, token: storedToken, isInitialized: true })
      if (typeof document !== "undefined") {
        const maxAge = 60 * 60 * 24 * 30
        document.cookie = `auth_role=${encodeURIComponent(storedUser.role || "admin")}; path=/; max-age=${maxAge}; SameSite=Lax`
      }
    } else {
      set({ isInitialized: true })
    }

    // التحقق من صلاحية التوكن وجلب أحدث بيانات المستخدم من الباك إند
    if (storedToken) {
      try {
        const res = await getMeApi()
        if (res.success && res.data) {
          set({ user: res.data })
          setAuthSession(storedToken, res.data)
        } else {
          // إذا كان التوكن غير صالح أو منتهي
          clearAuthSession()
          set({ user: null, token: null })
        }
      } catch {
        // في حال تعذر الاتصال نعتمد على البيانات المخزنة محلياً
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await loginApi(email, password)
      if (res.success && res.data) {
        setAuthSession(res.data.token, res.data.user)
        set({
          user: res.data.user,
          token: res.data.token,
          isLoading: false,
          error: null,
        })
        return { success: true, message: res.message || "تم تسجيل الدخول بنجاح" }
      } else {
        const errorMsg = res.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        set({ isLoading: false, error: errorMsg })
        return { success: false, message: errorMsg }
      }
    } catch {
      const errorMsg = "تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الباك إند."
      set({ isLoading: false, error: errorMsg })
      return { success: false, message: errorMsg }
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await logoutApi()
    } finally {
      clearAuthSession()
      set({ user: null, token: null, isLoading: false, error: null })
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const res = await updateProfileApi(data)
      if (res.success && res.data) {
        set({ user: res.data, isLoading: false })
        return { success: true, message: res.message || "تم تحديث الملف الشخصي بنجاح" }
      } else {
        set({ isLoading: false, error: res.message })
        return {
          success: false,
          message: res.message || "حدث خطأ أثناء تحديث البيانات.",
          errors: res.errors,
        }
      }
    } catch {
      const errorMsg = "تعذر الاتصال بالخادم لتحديث البيانات."
      set({ isLoading: false, error: errorMsg })
      return { success: false, message: errorMsg }
    }
  },
}))
