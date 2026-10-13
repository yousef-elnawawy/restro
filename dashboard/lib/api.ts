const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export interface User {
  id: number
  name: string
  email: string
  role: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[] | string | number>
}

export interface LoginResponseData {
  token: string
  token_type: string
  user: User
}

// التحقق من صحة التوكن كقيمة غير فارغة أو غير تالفة
export function isValidToken(token: string | null | undefined): boolean {
  if (!token) return false
  const t = token.trim()
  return t.length > 0 && t !== "undefined" && t !== "null"
}

// قراءة التوكن من الـ Cookies أو الـ localStorage
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null

  // قراءة من localStorage أولاً
  const localToken = localStorage.getItem("auth_token")
  if (isValidToken(localToken)) return localToken!

  // قراءة من الكوكيز كبديل
  const match = document.cookie.match(new RegExp("(^| )auth_token=([^;]+)"))
  const cookieToken = match ? decodeURIComponent(match[2]) : null
  if (isValidToken(cookieToken)) return cookieToken!

  return null
}

// حفظ التوكن وبيانات المستخدم في Cookies و localStorage
export function setAuthSession(token: string, user: User) {
  if (typeof window === "undefined") return

  const role = user?.role || "admin"
  localStorage.setItem("auth_token", token)
  localStorage.setItem("auth_user", JSON.stringify(user))
  localStorage.setItem("auth_role", role)

  // كوكيز لمدة 30 يوم
  const maxAge = 60 * 60 * 24 * 30
  document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`
  document.cookie = `auth_role=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

// مسح الجلسة والتوكن بصورة قطعية
export function clearAuthSession() {
  if (typeof window === "undefined") return

  localStorage.removeItem("auth_token")
  localStorage.removeItem("auth_user")
  localStorage.removeItem("auth_role")

  const pastDate = "Thu, 01 Jan 1970 00:00:00 GMT"
  document.cookie = `auth_token=; path=/; expires=${pastDate}; max-age=0; SameSite=Lax`
  document.cookie = `auth_role=; path=/; expires=${pastDate}; max-age=0; SameSite=Lax`
}

// توجيه تلقائي وفوري لصفحة تسجيل الدخول عند فقدان الجلسة
export function handleUnauthorized() {
  clearAuthSession()
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
    window.location.replace("/login")
  }
}

// جلب المستخدم المخزن محلياً
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("auth_user")
  if (!stored) return null
  try {
    return JSON.parse(stored) as User
  } catch {
    return null
  }
}

// تسجيل الدخول
export async function loginApi(email: string, password: string): Promise<ApiResponse<LoginResponseData>> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()
  return data
}

// جلب بيانات الحساب والتحقق من التوكن
export async function getMeApi(): Promise<ApiResponse<User>> {
  const token = getAuthToken()
  if (!isValidToken(token)) {
    return { success: false, message: "غير مسجل دخول." }
  }

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 401) {
      handleUnauthorized()
      return { success: false, message: "غير مسجل دخول أو انتهت صلاحية الجلسة." }
    }

    const data = await res.json()
    return data
  } catch {
    return { success: false, message: "تعذر الاتصال بالخادم للتحقق من الجلسة." }
  }
}

// تسجيل الخروج
export async function logoutApi(): Promise<ApiResponse<null>> {
  const token = getAuthToken()

  try {
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
    }
  } catch {
    // تجاهل أخطاء الشبكة أثناء تسجيل الخروج
  } finally {
    clearAuthSession()
  }

  return { success: true, message: "تم تسجيل الخروج بنجاح", data: null }
}

// تحديث بيانات الحساب و/أو كلمة المرور
export async function updateProfileApi(payload: {
  name?: string
  email?: string
  current_password?: string
  password?: string
}): Promise<ApiResponse<User>> {
  const token = getAuthToken()
  if (!token) {
    return { success: false, message: "غير مسجل دخول." }
  }

  try {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (data.success && data.data) {
      const currentToken = getAuthToken()
      if (currentToken) {
        setAuthSession(currentToken, data.data)
      }
    }
    return data
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الباك إند.",
    }
  }
}

/* =========================================================
   Categories API
   ========================================================= */

export interface Category {
  id: number
  name: string
  slug: string
  description?: string | null
  image?: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface CategoryPayload {
  name: string
  slug?: string
  description?: string
  image?: string
  is_active?: boolean
  sort_order?: number
}

// جلب كل الأقسام مع دعم البحث والفلترة
export async function getCategoriesApi(params?: {
  search?: string
  status?: string
}): Promise<ApiResponse<Category[]>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.status && params.status !== "all") query.append("status", params.status)

  const url = `${API_URL}/categories${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب الأقسام.",
    }
  }
}

// إضافة قسم جديد
export async function createCategoryApi(
  payload: CategoryPayload
): Promise<ApiResponse<Category>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لإضافة القسم.",
    }
  }
}

// تحديث قسم
export async function updateCategoryApi(
  id: number,
  payload: Partial<CategoryPayload>
): Promise<ApiResponse<Category>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/categories/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث القسم.",
    }
  }
}

// حذف قسم
export async function deleteCategoryApi(id: number): Promise<ApiResponse<null>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/categories/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحذف القسم.",
    }
  }
}

// تبديل حالة التفعيل لقسم
export async function toggleCategoryStatusApi(
  id: number
): Promise<ApiResponse<Category>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/categories/${id}/toggle-status`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتغيير حالة القسم.",
    }
  }
}

/* =========================================================
   Products API (الخطوة الثانية: المنتجات والأطباق)
   ========================================================= */

export interface ProductSize {
  name: string
  price: number
}

export interface ProductExtra {
  id?: number
  name: string
  price: number
}

export interface Product {
  id: number
  category_id: number
  category?: Category
  name: string
  description?: string | null
  price: number
  image?: string | null
  images?: string[]
  has_sizes?: boolean
  sizes?: ProductSize[]
  modifier_ids?: number[]
  modifiers?: ProductExtra[]
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ProductPayload {
  category_id: number
  name: string
  description?: string
  price: number
  image?: string
  images?: string[]
  has_sizes?: boolean
  sizes?: ProductSize[]
  modifier_ids?: number[]
  modifiers?: ProductExtra[]
  is_active?: boolean
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number | null
  to?: number | null
}

export interface ProductsCounts {
  total: number
  active: number
  inactive: number
}

export interface GetProductsParams {
  search?: string
  category_id?: number | "all"
  status?: string
  page?: number
  per_page?: number
  all?: boolean
  paginate?: boolean
}

export interface ProductsApiResponse extends ApiResponse<Product[]> {
  pagination?: PaginationMeta
  counts?: ProductsCounts
}

// جلب المنتجات مع الفلترة والبحث والترقيم (Pagination)
export async function getProductsApi(
  params?: GetProductsParams
): Promise<ProductsApiResponse> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.category_id && params.category_id !== "all") {
    query.append("category_id", String(params.category_id))
  }
  if (params?.status && params.status !== "all") query.append("status", params.status)
  if (params?.page) query.append("page", String(params.page))
  if (params?.per_page) query.append("per_page", String(params.per_page))
  if (params?.all) query.append("all", "1")
  if (params?.paginate !== undefined) query.append("paginate", String(params.paginate))

  const url = `${API_URL}/products${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب المنتجات.",
    }
  }
}

// إضافة منتج جديد
export async function createProductApi(
  payload: ProductPayload
): Promise<ApiResponse<Product>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لإضافة المنتج.",
    }
  }
}

// تحديث منتج
export async function updateProductApi(
  id: number,
  payload: Partial<ProductPayload>
): Promise<ApiResponse<Product>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث المنتج.",
    }
  }
}

// حذف منتج
export async function deleteProductApi(id: number): Promise<ApiResponse<null>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحذف المنتج.",
    }
  }
}

// تبديل حالة التفعيل لمنتج
export async function toggleProductStatusApi(
  id: number
): Promise<ApiResponse<Product>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/products/${id}/toggle-status`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتغيير حالة المنتج.",
    }
  }
}

/* =========================================================
   Modifiers / Add-ons API (الخطوة الثالثة: الإضافات والخيارات)
   ========================================================= */

export interface Modifier {
  id: number
  name: string
  price: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ModifierPayload {
  name: string
  price: number
  is_active?: boolean
}

// جلب الإضافات والخيارات
export async function getModifiersApi(params?: {
  search?: string
  status?: string
}): Promise<ApiResponse<Modifier[]>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.status && params.status !== "all") query.append("status", params.status)

  const url = `${API_URL}/modifiers${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب الإضافات.",
    }
  }
}

// إضافة خيار / إضافة جديدة
export async function createModifierApi(
  payload: ModifierPayload
): Promise<ApiResponse<Modifier>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/modifiers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحفظ الإضافة.",
    }
  }
}

// تحديث خيار / إضافة
export async function updateModifierApi(
  id: number,
  payload: Partial<ModifierPayload>
): Promise<ApiResponse<Modifier>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/modifiers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث الإضافة.",
    }
  }
}

// حذف خيار / إضافة
export async function deleteModifierApi(id: number): Promise<ApiResponse<null>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/modifiers/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحذف الإضافة.",
    }
  }
}

// تبديل حالة التفعيل للإضافة
export async function toggleModifierStatusApi(
  id: number
): Promise<ApiResponse<Modifier>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/modifiers/${id}/toggle-status`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتغيير حالة الإضافة.",
    }
  }
}

/* =========================================================
   Restaurant Tables API
   ========================================================= */

export type TableStatus = "available" | "occupied" | "reserved"

export interface RestaurantTable {
  id: number
  name: string
  capacity: number
  location?: string | null
  status: TableStatus
  is_active: boolean
  notes?: string | null
  created_at?: string
  updated_at?: string
  current_order?: Order | null
}

export interface TablePayload {
  name: string
  capacity: number
  location?: string | null
  status?: TableStatus
  is_active?: boolean
  notes?: string | null
}

// جلب كل الطاولات مع الفلترة والبحث
export async function getTablesApi(params?: {
  search?: string
  status?: string
  location?: string
  active_status?: string
}): Promise<ApiResponse<RestaurantTable[]>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.status && params.status !== "all") query.append("status", params.status)
  if (params?.location && params.location !== "all") query.append("location", params.location)
  if (params?.active_status && params.active_status !== "all") query.append("active_status", params.active_status)

  const url = `${API_URL}/tables${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب بيانات الطاولات.",
    }
  }
}

// جلب تفاصيل طاولة واحدة
export async function getTableApi(id: number): Promise<ApiResponse<RestaurantTable>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/tables/${id}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب بيانات الطاولة.",
    }
  }
}

// جلب الطلب النشط على الطاولة
export async function getTableActiveOrderApi(tableId: number): Promise<ApiResponse<Order>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/tables/${tableId}/active-order`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب طلب الطاولة.",
    }
  }
}

// إضافة طاولة جديدة
export async function createTableApi(
  payload: TablePayload
): Promise<ApiResponse<RestaurantTable>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/tables`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لإضافة الطاولة.",
    }
  }
}

// تحديث طاولة
export async function updateTableApi(
  id: number,
  payload: Partial<TablePayload>
): Promise<ApiResponse<RestaurantTable>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/tables/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث الطاولة.",
    }
  }
}

// حذف طاولة
export async function deleteTableApi(id: number): Promise<ApiResponse<null>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/tables/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحذف الطاولة.",
    }
  }
}

// تحديث حالة إشغال الطاولة (متاحة، مشغولة، محجوزة)
export async function updateTableStatusApi(
  id: number,
  status: TableStatus
): Promise<ApiResponse<RestaurantTable>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/tables/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث حالة الطاولة.",
    }
  }
}

// تبديل تفعيل الطاولة
export async function toggleTableActiveApi(
  id: number
): Promise<ApiResponse<RestaurantTable>> {
  const token = getAuthToken()

  try {
    const res = await fetch(`${API_URL}/tables/${id}/toggle-status`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتغيير حالة تفعيل الطاولة.",
    }
  }
}

/* =========================================================
   Cash Registers API (الخزائن المالية)
   ========================================================= */

export interface CashRegister {
  id: number
  name: string
  opening_balance: number
  balance: number
  is_active: boolean
  is_default: boolean
  notes?: string | null
  payments_count?: number
  orders_count?: number
  created_at?: string
  updated_at?: string
}

export interface CashRegisterPayload {
  name: string
  opening_balance?: number
  balance?: number
  is_active?: boolean
  is_default?: boolean
  notes?: string | null
}

export interface StatementEntry {
  id: string | number
  date: string
  raw_date?: number
  type: "opening_balance" | "pos_payment" | "receipt" | "payment" | "expense"
  type_label: string
  reference: string
  description: string
  debit: number
  credit: number
  running_balance: number
  payment_method?: string
  user_name?: string
  notes?: string | null
}

export interface CashRegisterStatementResponse {
  register: CashRegister
  summary: {
    opening_balance: number
    total_income: number
    total_expenses: number
    net_flow: number
    current_balance: number
  }
  entries: StatementEntry[]
}

export async function getCashRegisterStatementApi(
  id: number,
  params?: { date_from?: string; date_to?: string; type?: string }
): Promise<ApiResponse<CashRegisterStatementResponse>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.date_from) query.append("date_from", params.date_from)
  if (params?.date_to) query.append("date_to", params.date_to)
  if (params?.type && params.type !== "all") query.append("type", params.type)

  const url = `${API_URL}/cash-registers/${id}/statement${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب كشف حساب الخزنة.",
    }
  }
}

export async function getCashRegistersApi(params?: {
  search?: string
  status?: string
}): Promise<ApiResponse<CashRegister[]>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.status && params.status !== "all") query.append("status", params.status)

  const url = `${API_URL}/cash-registers${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب بيانات الخزائن.",
    }
  }
}

export async function getCashRegisterApi(id: number): Promise<ApiResponse<CashRegister>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/cash-registers/${id}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب تفاصيل الخزنة.",
    }
  }
}

export async function createCashRegisterApi(
  payload: CashRegisterPayload
): Promise<ApiResponse<CashRegister>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/cash-registers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لإضافة الخزنة.",
    }
  }
}

export async function updateCashRegisterApi(
  id: number,
  payload: Partial<CashRegisterPayload>
): Promise<ApiResponse<CashRegister>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/cash-registers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث الخزنة.",
    }
  }
}

export async function deleteCashRegisterApi(id: number): Promise<ApiResponse<null>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/cash-registers/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحذف الخزنة.",
    }
  }
}

export async function toggleCashRegisterActiveApi(
  id: number
): Promise<ApiResponse<CashRegister>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/cash-registers/${id}/toggle-status`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتغيير حالة الخزنة.",
    }
  }
}

/* =========================================================
   Orders & Payments API (الطلبات والدفع)
   ========================================================= */

export interface OrderItem {
  id: number
  order_id: number
  product_id?: number | null
  product_name: string
  size_name?: string | null
  unit_price: number
  quantity: number
  total_price: number
  selected_extras?: { id?: number; name: string; price: number }[] | null
  notes?: string | null
}

export interface Payment {
  id: number
  order_id: number
  cash_register_id: number
  amount: number
  payment_method: string
  notes?: string | null
  paid_at: string
  cash_register?: CashRegister
}

export interface Customer {
  id: number
  name: string
  phone: string
  email?: string | null
  address?: string | null
  notes?: string | null
  total_orders: number
  total_spent: number
  balance: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface DeliveryDriver {
  id: number
  name: string
  phone: string
  vehicle_type: "motorcycle" | "car" | "bicycle" | "scooter"
  license_plate?: string | null
  status: "available" | "on_delivery" | "off_duty"
  is_active: boolean
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "out_for_delivery"
  | "completed"
  | "cancelled"

export type PaymentStatus = "unpaid" | "partially_paid" | "paid"

export interface Order {
  id: number
  order_number: string
  order_type: "dinein" | "takeaway" | "delivery"
  table_id?: number | null
  customer_id?: number | null
  delivery_driver_id?: number | null
  customer_name?: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method?: string | null
  cash_register_id?: number | null
  subtotal: number
  tax: number
  delivery_fee?: number
  total: number
  notes?: string | null
  paid_at?: string | null
  created_at?: string
  updated_at?: string
  table?: RestaurantTable
  customer?: Customer
  deliveryDriver?: DeliveryDriver
  cash_register?: CashRegister
  items: OrderItem[]
  payments?: Payment[]
}

export interface CreateOrderPayload {
  order_type: "dinein" | "takeaway" | "delivery"
  table_id?: number | null
  customer_id?: number | null
  delivery_driver_id?: number | null
  customer_name?: string
  notes?: string
  items: {
    product_id?: number
    product_name: string
    size_name?: string
    unit_price: number
    quantity: number
    total_price: number
    selected_extras?: { id?: number; name: string; price: number }[]
    notes?: string
  }[]
  subtotal?: number
  tax?: number
  delivery_fee?: number
  total?: number
}

export interface PayOrderPayload {
  cash_register_id: number
  amount?: number
  payment_method?: string
  notes?: string
  complete_order?: boolean
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus
  delivery_driver_id?: number | null
  notes?: string
}

export async function getOrdersApi(params?: {
  search?: string
  status?: string
  payment_status?: string
  order_type?: string
  table_id?: number
}): Promise<ApiResponse<Order[]>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.status && params.status !== "all") query.append("status", params.status)
  if (params?.payment_status && params.payment_status !== "all") query.append("payment_status", params.payment_status)
  if (params?.order_type && params.order_type !== "all") query.append("order_type", params.order_type)
  if (params?.table_id) query.append("table_id", String(params.table_id))

  const url = `${API_URL}/orders${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب الطلبات.",
    }
  }
}

export async function getOrderApi(id: number): Promise<ApiResponse<Order>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/orders/${id}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب تفاصيل الطلب.",
    }
  }
}

export async function createOrderApi(
  payload: CreateOrderPayload
): Promise<ApiResponse<Order>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لإنشاء الطلب.",
    }
  }
}

export async function updateOrderApi(
  id: number,
  payload: Partial<CreateOrderPayload>
): Promise<ApiResponse<Order>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/orders/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث بيانات الطلب.",
    }
  }
}

export async function payOrderApi(
  id: number,
  payload: PayOrderPayload
): Promise<ApiResponse<Order>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/orders/${id}/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتسجيل دفع الطلب.",
    }
  }
}

export async function cancelOrderApi(id: number): Promise<ApiResponse<null>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/orders/${id}/cancel`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لإلغاء الطلب.",
    }
  }
}

export async function updateOrderStatusApi(
  id: number,
  payload: UpdateOrderStatusPayload
): Promise<ApiResponse<Order>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/orders/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث حالة الطلب.",
    }
  }
}

export async function assignOrderDriverApi(
  id: number,
  driverId: number
): Promise<ApiResponse<Order>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/orders/${id}/driver`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ delivery_driver_id: driverId }),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتعيين سائق التوصيل.",
    }
  }
}

/* =========================================================
   Customers API (إدارة العملاء)
   ========================================================= */

export interface CreateCustomerPayload {
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  is_active?: boolean
}

export interface UpdateCustomerPayload {
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
  is_active?: boolean
}

export async function getCustomersApi(params?: {
  search?: string
  is_active?: boolean
}): Promise<ApiResponse<Customer[]>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.is_active !== undefined) query.append("is_active", String(params.is_active))

  const url = `${API_URL}/customers${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب قائمة العملاء.",
    }
  }
}

export async function getCustomerApi(id: number): Promise<ApiResponse<Customer>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب بيانات العميل.",
    }
  }
}

export async function createCustomerApi(
  payload: CreateCustomerPayload
): Promise<ApiResponse<Customer>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لإضافة العميل.",
    }
  }
}

export async function updateCustomerApi(
  id: number,
  payload: UpdateCustomerPayload
): Promise<ApiResponse<Customer>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث بيانات العميل.",
    }
  }
}

export async function deleteCustomerApi(id: number): Promise<ApiResponse<null>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/customers/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحذف العميل.",
    }
  }
}

/* =========================================================
   Delivery Drivers API (إدارة مندوبي التوصيل)
   ========================================================= */

export interface CreateDeliveryDriverPayload {
  name: string
  phone: string
  vehicle_type: "motorcycle" | "car" | "bicycle" | "scooter"
  license_plate?: string
  status?: "available" | "on_delivery" | "off_duty"
  is_active?: boolean
  notes?: string
}

export interface UpdateDeliveryDriverPayload {
  name: string
  phone: string
  vehicle_type: "motorcycle" | "car" | "bicycle" | "scooter"
  license_plate?: string
  status?: "available" | "on_delivery" | "off_duty"
  is_active?: boolean
  notes?: string
}

export async function getDeliveryDriversApi(params?: {
  search?: string
  status?: string
  is_active?: boolean
}): Promise<ApiResponse<DeliveryDriver[]>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.status && params.status !== "all") query.append("status", params.status)
  if (params?.is_active !== undefined) query.append("is_active", String(params.is_active))

  const url = `${API_URL}/delivery-drivers${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب قائمة المندوبين.",
    }
  }
}

export async function getDeliveryDriverApi(id: number): Promise<ApiResponse<DeliveryDriver>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/delivery-drivers/${id}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب بيانات المندوب.",
    }
  }
}

export async function createDeliveryDriverApi(
  payload: CreateDeliveryDriverPayload
): Promise<ApiResponse<DeliveryDriver>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/delivery-drivers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لإضافة المندوب.",
    }
  }
}

export async function updateDeliveryDriverApi(
  id: number,
  payload: UpdateDeliveryDriverPayload
): Promise<ApiResponse<DeliveryDriver>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/delivery-drivers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث بيانات المندوب.",
    }
  }
}

export async function deleteDeliveryDriverApi(id: number): Promise<ApiResponse<null>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/delivery-drivers/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحذف المندوب.",
    }
  }
}

export async function updateDeliveryDriverStatusApi(
  id: number,
  status: "available" | "on_delivery" | "off_duty"
): Promise<ApiResponse<DeliveryDriver>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/delivery-drivers/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث حالة المندوب.",
    }
  }
}

// =============================================================================
// FINANCIAL TRANSACTIONS & VOUCHERS (سندات القبض والدفع والمصاريف)
// =============================================================================

export type FinancialTransactionType = "receipt" | "payment" | "expense"

export interface FinancialTransaction {
  id: number
  transaction_type: FinancialTransactionType
  voucher_number: string
  cash_register_id: number
  customer_id?: number | null
  order_id?: number | null
  amount: number
  payment_method: "cash" | "card" | "transfer"
  category?: string | null
  recipient_or_payer?: string | null
  description?: string | null
  date: string
  notes?: string | null
  cash_register?: CashRegister
  customer?: Customer
  order?: Order
  created_at?: string
  updated_at?: string
}

export interface FinancialTransactionPayload {
  transaction_type: FinancialTransactionType
  cash_register_id: number
  customer_id?: number | null
  order_id?: number | null
  amount: number
  payment_method: "cash" | "card" | "transfer"
  category?: string | null
  recipient_or_payer?: string | null
  description?: string | null
  date: string
  notes?: string | null
}

export interface FinancialSummary {
  total_receipts: number
  total_payments: number
  total_expenses: number
  net_flow: number
}

export interface FinancialTransactionsData {
  transactions: FinancialTransaction[]
  summary: FinancialSummary
}

export interface CustomerLedgerEntry {
  id: string
  type: "order" | "voucher"
  voucher_type?: FinancialTransactionType
  title: string
  reference: string
  date: string
  debit: number
  credit: number
  running_balance: number
  payment_status?: string
  payment_method?: string
  register_name?: string
  status?: string
  description?: string
  notes?: string
}

export interface CustomerStatementData {
  customer: Customer
  summary: {
    current_balance: number
    total_orders_count: number
    total_orders_amount: number
    total_payments_amount: number
  }
  orders: Order[]
  transactions: FinancialTransaction[]
  ledger: CustomerLedgerEntry[]
}

export async function getFinancialTransactionsApi(params?: {
  type?: string
  cash_register_id?: number
  customer_id?: number
  search?: string
  date_from?: string
  date_to?: string
}): Promise<ApiResponse<FinancialTransactionsData>> {
  const token = getAuthToken()
  const searchParams = new URLSearchParams()
  if (params?.type) searchParams.append("type", params.type)
  if (params?.cash_register_id) searchParams.append("cash_register_id", String(params.cash_register_id))
  if (params?.customer_id) searchParams.append("customer_id", String(params.customer_id))
  if (params?.search) searchParams.append("search", params.search)
  if (params?.date_from) searchParams.append("date_from", params.date_from)
  if (params?.date_to) searchParams.append("date_to", params.date_to)

  const url = `${API_URL}/financial-transactions?${searchParams.toString()}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب السندات والمعاملات المالية.",
    }
  }
}

export async function createFinancialTransactionApi(
  payload: FinancialTransactionPayload
): Promise<ApiResponse<FinancialTransaction>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/financial-transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتسجيل السند المالي.",
    }
  }
}

export async function deleteFinancialTransactionApi(id: number): Promise<ApiResponse<null>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/financial-transactions/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحذف السند المالي.",
    }
  }
}

export async function getCustomerStatementApi(customerId: number): Promise<ApiResponse<CustomerStatementData>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/customers/${customerId}/statement`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب كشف حساب العميل.",
    }
  }
}

// =============================================================================
// RESTAURANT SETTINGS (إعدادات المطعم والنظام)
// =============================================================================

export interface RestaurantSettings {
  id?: number
  restaurant_name: string
  restaurant_phone?: string | null
  restaurant_email?: string | null
  restaurant_address?: string | null
  currency: string
  tax_percentage: number
  tax_enabled: boolean
  tax_number?: string | null
  delivery_fee: number
  receipt_header?: string | null
  receipt_footer?: string | null
  logo?: string | null
  enable_tables: boolean
  enable_delivery: boolean
  enable_takeaway: boolean
}

export async function getSettingsApi(): Promise<ApiResponse<RestaurantSettings>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/settings`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب إعدادات المطعم.",
    }
  }
}

export async function updateSettingsApi(
  payload: Partial<RestaurantSettings>
): Promise<ApiResponse<RestaurantSettings>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث إعدادات المطعم.",
    }
  }
}

// =============================================================================
// DASHBOARD STATS & REPORTS API
// =============================================================================

export interface DashboardSummary {
  today_sales: number
  today_orders_count: number
  today_dinein_count: number
  today_delivery_count: number
  today_takeaway_count: number
  all_time_sales: number
  all_time_orders: number
  total_customers: number
  new_customers_30d: number
  tables: {
    total: number
    occupied: number
    reserved: number
    available: number
  }
  drivers: {
    total: number
    on_delivery: number
    available: number
    off_duty: number
  }
  currency: string
}

export interface HourlySalesPoint {
  time: string
  sales: number
  orders: number
}

export interface WeeklyFinancePoint {
  day: string
  date: string
  sales: number
  expenses: number
}

export interface ActiveOrderCardItem {
  id: string
  order_id: number
  customer: string
  type: string
  raw_type: string
  place: string
  items: string
  total: string
  raw_total: number
  time: string
  status: OrderStatus
}

export interface TopDishItem {
  name: string
  category: string
  orders: number
  revenue: string
  raw_revenue: number
  percent: number
  growth: string
}

export interface DashboardTableItem {
  id: string
  table_id: number
  seats: number
  status: TableStatus
  orderId: string
  bill: string
  raw_bill: number
  time: string
}

export interface DashboardDriverItem {
  driver_id: number
  driver: string
  phone: string
  vehicle: string
  status: string
  raw_status: string
  time: string
  order: string
  destination: string
}

export interface DashboardStatsData {
  summary: DashboardSummary
  hourly_sales: HourlySalesPoint[]
  weekly_finance: WeeklyFinancePoint[]
  active_orders: ActiveOrderCardItem[]
  top_dishes: TopDishItem[]
  tables: DashboardTableItem[]
  delivery_fleet: DashboardDriverItem[]
}

export async function getDashboardStatsApi(): Promise<ApiResponse<DashboardStatsData>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/dashboard/stats`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب إحصائيات لوحة التحكم.",
    }
  }
}

export interface ReportsData {
  summary: {
    total_sales: number
    total_subtotal: number
    total_tax: number
    total_delivery_fees: number
    orders_count: number
    cancelled_orders_count: number
    currency: string
    date_from: string
    date_to: string
  }
  by_order_type: {
    dinein: { count: number; total: number }
    takeaway: { count: number; total: number }
    delivery: { count: number; total: number }
  }
  by_payment_method: {
    cash: { count: number; total: number }
    card: { count: number; total: number }
    transfer: { count: number; total: number }
  }
  registers: {
    id: number
    name: string
    current_balance: number
    period_order_payments: number
    period_receipt_vouchers: number
    period_expenses: number
    net_period_flow: number
  }[]
  top_dishes: {
    name: string
    quantity: number
    revenue: number
  }[]
  orders: Order[]
}

export async function getReportsApi(params?: {
  date_from?: string
  date_to?: string
  cash_register_id?: number | "all"
}): Promise<ApiResponse<ReportsData>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.date_from) query.append("date_from", params.date_from)
  if (params?.date_to) query.append("date_to", params.date_to)
  if (params?.cash_register_id && params.cash_register_id !== "all") {
    query.append("cash_register_id", String(params.cash_register_id))
  }

  const url = `${API_URL}/reports${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب تقارير المبيعات.",
    }
  }
}

/* =========================================================
   Staff Users API (إدارة الموظفين والصلاحيات)
   ========================================================= */

export interface StaffUser {
  id: number
  name: string
  email: string
  role: "admin" | "cashier" | "kitchen"
  created_at?: string
  updated_at?: string
}

export interface CreateStaffUserPayload {
  name: string
  email: string
  password: string
  role: "admin" | "cashier" | "kitchen"
}

export interface UpdateStaffUserPayload {
  name: string
  email: string
  password?: string
  role: "admin" | "cashier" | "kitchen"
}

export async function getStaffUsersApi(params?: {
  role?: string
  search?: string
}): Promise<ApiResponse<StaffUser[]>> {
  const token = getAuthToken()
  const query = new URLSearchParams()
  if (params?.role && params.role !== "all") query.append("role", params.role)
  if (params?.search) query.append("search", params.search)

  const url = `${API_URL}/users${query.toString() ? `?${query.toString()}` : ""}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لجلب قائمة الموظفين.",
    }
  }
}

export async function createStaffUserApi(
  payload: CreateStaffUserPayload
): Promise<ApiResponse<StaffUser>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لإضافة الموظف.",
    }
  }
}

export async function updateStaffUserApi(
  id: number,
  payload: UpdateStaffUserPayload
): Promise<ApiResponse<StaffUser>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لتحديث بيانات الموظف.",
    }
  }
}

export async function deleteStaffUserApi(
  id: number
): Promise<ApiResponse<null>> {
  const token = getAuthToken()
  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    return await res.json()
  } catch {
    return {
      success: false,
      message: "تعذر الاتصال بالخادم لحذف الموظف.",
    }
  }
}



