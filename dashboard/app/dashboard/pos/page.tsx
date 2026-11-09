"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PageContainer } from "@/components/page-container"
import { useProductStore } from "@/store/product.store"
import { useCategoryStore } from "@/store/category.store"
import { useModifierStore } from "@/store/modifier.store"
import { useTableStore } from "@/store/table.store"
import { useRegisterStore } from "@/store/register.store"
import { useOrderStore } from "@/store/order.store"
import { useSettingStore } from "@/store/setting.store"
import { useShiftStore } from "@/store/shift.store"
import { useOfflineStore } from "@/store/offline.store"
import { OfflinePosIndicator } from "@/components/offline-pos-indicator"
import { ZReportDialog } from "@/components/z-report-dialog"
import {
  type Product,
  type ProductSize,
  type RestaurantTable,
  type CashRegister,
  type Order,
  type OrderStatus,
  type CreateOrderPayload,
  type Customer,
  getCustomersApi,
  createCustomerApi,
  getTableActiveOrderApi,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/combobox-select"
import { ThermalReceiptCard } from "@/components/thermal-receipt-card"
import { printThermalReceipt, printKotSlip, openCashDrawer } from "@/lib/receipt-printer"
import { SplitBillDialog } from "@/components/split-bill-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  UtensilsCrossedIcon,
  SearchIcon,
  PlusIcon,
  MinusIcon,
  Trash2Icon,
  ReceiptIcon,
  CreditCardIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  PrinterIcon,
  CheckIcon,
  RotateCcwIcon,
  ShoppingBagIcon,
  ClockIcon,
  Loader2Icon,
  ArmchairIcon,
  LandmarkIcon,
  AlertCircleIcon,
  SparklesIcon,
  UsersIcon,
  UserPlusIcon,
  UserIcon,
  LayoutGridIcon,
  ListIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SaveIcon,
  TruckIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ChefHatIcon,
  SplitIcon,
  TagIcon,
  PercentIcon,
  GiftIcon,
  XIcon,
} from "lucide-react"

// نوع الصنف داخل الفاتورة
interface InvoiceItem {
  id: string
  productId: number
  name: string
  image?: string | null
  selectedSize?: ProductSize | null
  selectedExtras: { id?: number; name: string; price: number }[]
  notes?: string
  unitPrice: number
  quantity: number
  totalPrice: number
}

// نوع الطلب المعلق (Hold / Park Order)
interface HeldOrder {
  id: string
  label: string
  createdAt: string
  items: InvoiceItem[]
  orderType: "dinein" | "takeaway" | "delivery"
  selectedTableId: number | null
  selectedCustomerId: number | null
  customerName: string
  deliveryAddress: string
  distanceKm: number
  orderNotes: string
  grandTotal: number
}

// مكوّن حقل إدخال الكمية المباشر (بالكتابة والأزرار)
interface ItemQuantityInputProps {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  className?: string
  title?: string
}

function ItemQuantityInput({
  value,
  onChange,
  min = 1,
  max = 9999,
  className = "",
  title = "اضغط لتعديل الكمية بالكتابة مباشرة",
}: ItemQuantityInputProps) {
  const [localVal, setLocalVal] = React.useState(String(value))

  React.useEffect(() => {
    setLocalVal(String(value))
  }, [value])

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={localVal}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value
        setLocalVal(raw)
        const parsed = parseInt(raw, 10)
        if (!isNaN(parsed) && parsed >= min) {
          onChange(Math.min(max, parsed))
        }
      }}
      onBlur={() => {
        const parsed = parseInt(localVal, 10)
        if (isNaN(parsed) || parsed < min) {
          setLocalVal(String(min))
          onChange(min)
        } else {
          const bounded = Math.min(max, parsed)
          setLocalVal(String(bounded))
          onChange(bounded)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur()
        }
      }}
      className={`w-9 h-5 text-center font-bold font-mono text-xs bg-muted/40 hover:bg-muted/70 focus:bg-background focus:ring-1 focus:ring-primary border border-transparent focus:border-primary/50 rounded px-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors cursor-text ${className}`}
      title={title}
    />
  )
}

function PosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramOrderId = searchParams.get("orderId")
  const paramTableId = searchParams.get("tableId")

  // Stores
  const { products, fetchProducts } = useProductStore()
  const { categories, fetchCategories } = useCategoryStore()
  const { modifiers, fetchModifiers } = useModifierStore()
  const { tables, fetchTables } = useTableStore()
  const { registers, fetchRegisters } = useRegisterStore()
  const { createOrder, updateOrder, payOrder, getOrder } = useOrderStore()
  const { settings, fetchSettings } = useSettingStore()
  const { isOnline, saveOrderLocally } = useOfflineStore()
  const currency = settings.currency || "ج.م"

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    fetchCategories()
    fetchProducts({ all: true })
    fetchModifiers()
    fetchTables()
    fetchRegisters()
    fetchSettings()
  }, [fetchCategories, fetchProducts, fetchModifiers, fetchTables, fetchRegisters, fetchSettings])

  // حالة الفلترة والتصنيف
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<number | "all">("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  // حالة نوع الطلب وبياناته
  const [orderType, setOrderType] = React.useState<"dinein" | "takeaway" | "delivery">("dinein")
  const [selectedTableId, setSelectedTableId] = React.useState<number | null>(null)
  const [customerName, setCustomerName] = React.useState("")
  const [deliveryAddress, setDeliveryAddress] = React.useState("")
  const [deliveryDistance, setDeliveryDistance] = React.useState("")
  const [customDeliveryFee, setCustomDeliveryFee] = React.useState<number | null>(null)
  const [orderNotes, setOrderNotes] = React.useState("")

  // العملاء (Customers)
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<number | null>(null)
  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = React.useState(false)
  const [newCustomerName, setNewCustomerName] = React.useState("")
  const [newCustomerPhone, setNewCustomerPhone] = React.useState("")
  const [newCustomerAddress, setNewCustomerAddress] = React.useState("")
  const [isSavingCustomer, setIsSavingCustomer] = React.useState(false)

  const loadCustomers = React.useCallback(async () => {
    const res = await getCustomersApi({ is_active: true })
    if (res.success && res.data) {
      setCustomers(res.data)
    }
  }, [])

  React.useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // إذا تم فتح طلب موجود مسبقاً (من شاشة الطاولات مثلاً)
  const [loadedOrderId, setLoadedOrderId] = React.useState<number | null>(null)
  const [loadedOrderNumber, setLoadedOrderNumber] = React.useState<string | null>(null)
  const [loadedOrderStatus, setLoadedOrderStatus] = React.useState<OrderStatus | null>(null)

  // حالة بنود الفاتورة الحالية
  const [invoiceItems, setInvoiceItems] = React.useState<InvoiceItem[]>([])

  // إشعار الإضافة السريعة
  const [quickToast, setQuickToast] = React.useState<string | null>(null)
  const triggerQuickToast = (msg: string) => {
    setQuickToast(msg)
    setTimeout(() => setQuickToast(null), 3500)
  }

  // حالة نافذة تخصيص الطبق
  const [customizingProduct, setCustomizingProduct] = React.useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = React.useState<ProductSize | null>(null)
  const [selectedExtras, setSelectedExtras] = React.useState<{ id?: number; name: string; price: number }[]>([])
  const [itemNotes, setItemNotes] = React.useState("")
  const [itemQuantity, setItemQuantity] = React.useState(1)

  // حالة الدفع واختيار الخزنة
  const [payDialogOpen, setPayDialogOpen] = React.useState(false)
  const [selectedRegisterId, setSelectedRegisterId] = React.useState<number | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = React.useState(false)
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "card">("cash")
  const [tenderedAmount, setTenderedAmount] = React.useState<string>("")

  // حالة الخصومات والضيافة وخدمة الصالة
  const [discountType, setDiscountType] = React.useState<"none" | "percentage" | "fixed" | "complimentary">("none")
  const [discountValue, setDiscountValue] = React.useState<number>(0)
  const [discountReason, setDiscountReason] = React.useState<string>("")
  const [discountDialogOpen, setDiscountDialogOpen] = React.useState(false)
  const [serviceChargeEnabled, setServiceChargeEnabled] = React.useState(true)

  // نافذة تقسيم الفاتورة (Split Bill)
  const [splitBillOpen, setSplitBillOpen] = React.useState(false)

  // حالة الطلبات المعلقة (Hold / Park Orders)
  const [heldOrders, setHeldOrders] = React.useState<HeldOrder[]>([])

  // مرجع حقل البحث للتركيز الفوري بالأزرار والباركود
  const searchInputRef = React.useRef<HTMLInputElement | null>(null)

  // حالة فاتورة الطباعة بعد السداد
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false)
  const [completedOrder, setCompletedOrder] = React.useState<Order | null>(null)

  // التبديل بين الكتالوج والفاتورة في الشاشات الصغيرة (الموبايل والتابلت)
  const [mobileTab, setMobileTab] = React.useState<"catalog" | "invoice">("catalog")
  const [viewMode, setViewModeState] = React.useState<"grid" | "compact">("grid")

  // استرجاع نمط عرض الكاشير من التخزين المحلي
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("restro_pos_view_mode")
      if (saved === "grid" || saved === "compact") {
        setViewModeState(saved)
      }
    } catch {}
  }, [])

  const setViewMode = (mode: "grid" | "compact") => {
    setViewModeState(mode)
    try {
      localStorage.setItem("restro_pos_view_mode", mode)
    } catch {}
  }

  // حالة الورديات والـ Z-Report
  const {
    currentShift,
    fetchCurrentShift,
    openShift,
    closeShift,
    activeZReport,
    setActiveZReport,
    isActionLoading: isShiftActionLoading,
  } = useShiftStore()
  const [openShiftModalOpen, setOpenShiftModalOpen] = React.useState(false)
  const [closeShiftModalOpen, setCloseShiftModalOpen] = React.useState(false)
  const [shiftStartingCash, setShiftStartingCash] = React.useState("0")
  const [shiftOpeningNotes, setShiftOpeningNotes] = React.useState("")
  const [shiftActualCash, setShiftActualCash] = React.useState("")
  const [shiftClosingNotes, setShiftClosingNotes] = React.useState("")

  React.useEffect(() => {
    if (selectedRegisterId) {
      fetchCurrentShift(selectedRegisterId)
    }
  }, [selectedRegisterId, fetchCurrentShift])

  // مرجع شريط تمرير الأقسام للتمرير السلس بالأزرار وبكرة الماوس
  const categoriesScrollRef = React.useRef<HTMLDivElement>(null)

  const scrollCategories = (direction: "forward" | "backward") => {
    if (!categoriesScrollRef.current) return
    const el = categoriesScrollRef.current
    // في واجهة RTL: التمرير لليسار (forward) يكون بسالب، والعودة لليمين (backward) يكون بموجب
    const amount = 240
    el.scrollBy({
      left: direction === "forward" ? -amount : amount,
      behavior: "smooth",
    })
  }

  React.useEffect(() => {
    const el = categoriesScrollRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const maxScroll = el.scrollWidth - el.clientWidth
        if (maxScroll > 0) {
          e.preventDefault()
          el.scrollBy({ left: -e.deltaY, behavior: "auto" })
        }
      }
    }

    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [])

  // تعيين الخزنة الافتراضية عند تحميل الخزائن
  React.useEffect(() => {
    if (registers.length > 0 && selectedRegisterId === null) {
      const defaultReg = registers.find((r) => r.is_default && r.is_active) || registers.find((r) => r.is_active)
      if (defaultReg) {
        setSelectedRegisterId(defaultReg.id)
      }
    }
  }, [registers, selectedRegisterId])

  // التعامل مع فتح طلب موجود مسبقاً من الرابط (?orderId=...)
  React.useEffect(() => {
    if (!paramOrderId) return
    const orderIdNum = Number(paramOrderId)
    if (!orderIdNum) return

    async function loadTargetOrder() {
      const order = await getOrder(orderIdNum)
      if (order) {
        setLoadedOrderId(order.id)
        setLoadedOrderNumber(order.order_number)
        setLoadedOrderStatus(order.status)
        setOrderType(order.order_type)
        setSelectedTableId(order.order_type === "dinein" ? (order.table_id || null) : null)
        if (order.customer_id) setSelectedCustomerId(order.customer_id)
        if (order.customer_name) setCustomerName(order.customer_name)
        if (order.delivery_address) {
          setDeliveryAddress(order.delivery_address)
        } else if (order.customer?.address) {
          setDeliveryAddress(order.customer.address)
        }
        if (order.delivery_distance) {
          setDeliveryDistance(String(order.delivery_distance))
        }
        if (order.delivery_fee !== undefined && order.delivery_fee !== null) {
          setCustomDeliveryFee(Number(order.delivery_fee))
        }
        if (order.notes) setOrderNotes(order.notes)
        if (order.discount_type) setDiscountType(order.discount_type as any)
        if (order.discount_value !== undefined && order.discount_value !== null) setDiscountValue(Number(order.discount_value))
        if (order.discount_reason) setDiscountReason(order.discount_reason)
        if (order.service_charge !== undefined && order.service_charge !== null) {
          setServiceChargeEnabled(Number(order.service_charge) > 0)
        }

        const items: InvoiceItem[] = order.items.map((it) => ({
          id: `loaded-${it.id}`,
          productId: it.product_id || 0,
          name: it.product_name,
          selectedSize: it.size_name ? { name: it.size_name, price: Number(it.unit_price) } : null,
          selectedExtras: it.selected_extras || [],
          notes: it.notes || undefined,
          unitPrice: Number(it.unit_price),
          quantity: it.quantity,
          totalPrice: Number(it.total_price),
        }))
        setInvoiceItems(items)
        triggerQuickToast(
          order.order_type === "dinein"
            ? `تم تحميل طلب الطاولة ${order.table?.name || ""} (${order.order_number}) بنجاح وهو جاهز للدفع`
            : order.order_type === "takeaway"
            ? `تم تحميل طلب السفري (${order.order_number}) بنجاح وهو جاهز للتعديل أو السداد`
            : `تم تحميل طلب التوصيل (${order.order_number}) بنجاح وهو جاهز للتعديل أو السداد`
        )
      }
    }

    loadTargetOrder()
  }, [paramOrderId, getOrder])

  // التعامل مع تحديد طاولة أو فتح فاتورتها من الرابط (?tableId=...)
  React.useEffect(() => {
    if (!paramTableId) return
    const tableIdNum = Number(paramTableId)
    if (!tableIdNum) return

    setSelectedTableId(tableIdNum)
    setOrderType("dinein")

    // إذا لم يكن هناك orderId محدد بالرابط، نفحص تلقائياً هل الطاولة عليها طلب نشط لفتح فاتورته
    if (!paramOrderId && !loadedOrderId) {
      async function loadActiveTableOrder() {
        try {
          const res = await getTableActiveOrderApi(tableIdNum)
          if (res.success && res.data) {
            const order = res.data
            setLoadedOrderId(order.id)
            setLoadedOrderNumber(order.order_number)
            setLoadedOrderStatus(order.status)
            setOrderType(order.order_type)
            if (order.table_id) setSelectedTableId(order.table_id)
            if (order.customer_id) setSelectedCustomerId(order.customer_id)
            if (order.customer_name) setCustomerName(order.customer_name)
            if (order.delivery_address) {
              setDeliveryAddress(order.delivery_address)
            } else if (order.customer?.address) {
              setDeliveryAddress(order.customer.address)
            }
            if (order.notes) setOrderNotes(order.notes)
        if (order.discount_type) setDiscountType(order.discount_type as any)
        if (order.discount_value !== undefined && order.discount_value !== null) setDiscountValue(Number(order.discount_value))
        if (order.discount_reason) setDiscountReason(order.discount_reason)
        if (order.service_charge !== undefined && order.service_charge !== null) {
          setServiceChargeEnabled(Number(order.service_charge) > 0)
        }

            const items: InvoiceItem[] = (order.items || []).map((it) => ({
              id: `loaded-${it.id}`,
              productId: it.product_id || 0,
              name: it.product_name,
              selectedSize: it.size_name ? { name: it.size_name, price: Number(it.unit_price) } : null,
              selectedExtras: it.selected_extras || [],
              notes: it.notes || undefined,
              unitPrice: Number(it.unit_price),
              quantity: it.quantity,
              totalPrice: Number(it.total_price),
            }))
            setInvoiceItems(items)
            triggerQuickToast(`تم فتح فاتورة الطاولة (${order.order_number}) بنجاح`)
          }
        } catch {
          // الطاولة شاغرة ولا يوجد طلب نشط
        }
      }

      loadActiveTableOrder()
    }
  }, [paramTableId, paramOrderId, loadedOrderId])

  const tableOptions: ComboboxOption[] = React.useMemo(() => {
    return [
      { value: "", label: "-- حدد طاولة شاغرة --" },
      ...tables.map((tbl) => {
        const isOccupied = tbl.status === "occupied"
        const isThisOrderTable = loadedOrderId && tbl.id === selectedTableId
        const disabled = isOccupied && !isThisOrderTable
        return {
          value: String(tbl.id),
          label: `${tbl.name} - ${tbl.location || "الصالة"}`,
          badge: isOccupied ? "مشغولة ✕" : "شاغرة ✓",
          badgeVariant: isOccupied ? ("destructive" as const) : ("success" as const),
          disabled: !!disabled,
        }
      }),
    ]
  }, [tables, loadedOrderId, selectedTableId])

  // خيارات العملاء
  const customerOptions: ComboboxOption[] = React.useMemo(() => {
    return [
      { value: "", label: "-- اختر عميل أو زبون عام --" },
      ...customers.map((c) => ({
        value: String(c.id),
        label: `${c.name} (${c.phone})${c.address ? ` - ${c.address}` : ""}`,
      })),
    ]
  }, [customers])

  // خيارات الخزائن المالية للتحصيل (نمط shadcn الموحد)
  const registerOptions: ComboboxOption[] = React.useMemo(() => {
    return registers
      .filter((r) => r.is_active)
      .map((r) => ({
        value: String(r.id),
        label: `${r.name} ${r.is_default ? "(الافتراضية)" : ""}`,
        badge: `${Number(r.balance || 0).toLocaleString("ar-EG")} ${currency}`,
        badgeVariant: "success" as const,
      }))
  }, [registers, currency])

  const handleSelectCustomer = (val: string) => {
    if (!val) {
      setSelectedCustomerId(null)
      setCustomerName("")
      return
    }
    const cid = Number(val)
    setSelectedCustomerId(cid)
    const found = customers.find((c) => c.id === cid)
    if (found) {
      setCustomerName(found.name)
      if (found.address) {
        setDeliveryAddress(found.address)
      }
    }
  }

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return
    setIsSavingCustomer(true)
    const res = await createCustomerApi({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      address: newCustomerAddress.trim() || undefined,
    })
    setIsSavingCustomer(false)
    if (res.success && res.data) {
      setCustomers((prev) => [res.data!, ...prev])
      setSelectedCustomerId(res.data.id)
      setCustomerName(res.data.name)
      if (res.data.address) {
        setDeliveryAddress(res.data.address)
      }
      setQuickAddCustomerOpen(false)
      setNewCustomerName("")
      setNewCustomerPhone("")
      setNewCustomerAddress("")
      triggerQuickToast(`تم إضافة العميل (${res.data.name}) واختياره بنجاح!`)
    } else {
      alert(res.message || "فشل في تسجيل العميل.")
    }
  }

  // فلترة المنتجات حسب القسم والبحث
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      if (!p.is_active) return false
      if (selectedCategoryId !== "all" && p.category_id !== selectedCategoryId) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchName = p.name.toLowerCase().includes(q)
        const matchDesc = p.description?.toLowerCase().includes(q)
        if (!matchName && !matchDesc) return false
      }
      return true
    })
  }, [products, selectedCategoryId, searchQuery])

  // إضافة سريعة للمنتج إلى الفاتورة
  const handleQuickAdd = (product: Product) => {
    const hasSizes = Boolean(product.has_sizes && product.sizes && product.sizes.length > 0)
    const hasModifiers = Boolean(
      (product.modifiers && product.modifiers.length > 0) ||
      (product.modifier_ids && product.modifier_ids.length > 0)
    )

    if (hasSizes || hasModifiers) {
      setCustomizingProduct(product)
      setSelectedSize(product.sizes?.[0] || null)
      setSelectedExtras([])
      setItemNotes("")
      setItemQuantity(1)
      return
    }

    const price = Number(product.price)
    setInvoiceItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.productId === product.id && !it.selectedSize && it.selectedExtras.length === 0 && !it.notes
      )

      if (existingIdx >= 0) {
        const updated = [...prev]
        const curr = updated[existingIdx]
        const newQty = curr.quantity + 1
        updated[existingIdx] = {
          ...curr,
          quantity: newQty,
          totalPrice: curr.unitPrice * newQty,
        }
        return updated
      }

      return [
        ...prev,
        {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          image: product.image,
          selectedSize: null,
          selectedExtras: [],
          notes: undefined,
          unitPrice: price,
          quantity: 1,
          totalPrice: price,
        },
      ]
    })

    triggerQuickToast(`تمت إضافة "${product.name}" إلى الفاتورة`)
  }

  // تأكيد تخصيص الصنف وإضافته للفاتورة
  const handleConfirmCustomization = () => {
    if (!customizingProduct) return

    const basePrice = selectedSize ? Number(selectedSize.price) : Number(customizingProduct.price)
    const extrasTotal = selectedExtras.reduce((sum, e) => sum + Number(e.price), 0)
    const unitPrice = basePrice + extrasTotal
    const totalPrice = unitPrice * itemQuantity

    const newItem: InvoiceItem = {
      id: `${customizingProduct.id}-${Date.now()}`,
      productId: customizingProduct.id,
      name: customizingProduct.name,
      image: customizingProduct.image,
      selectedSize,
      selectedExtras: [...selectedExtras],
      notes: itemNotes.trim() || undefined,
      unitPrice,
      quantity: itemQuantity,
      totalPrice,
    }

    setInvoiceItems((prev) => [...prev, newItem])
    setCustomizingProduct(null)
    triggerQuickToast(`تمت إضافة "${customizingProduct.name}" بنجاح`)
  }

  // تعديل كمية صنف بالفاتورة
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setInvoiceItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta
            if (newQty <= 0) return null
            return {
              ...item,
              quantity: newQty,
              totalPrice: item.unitPrice * newQty,
            }
          }
          return item
        })
        .filter(Boolean) as InvoiceItem[]
    })
  }

  // تعديل كمية صنف بالفاتورة بالكتابة المباشرة
  const handleSetItemQuantity = (itemId: string, targetQuantity: number) => {
    const validQty = Math.max(1, Math.min(9999, Math.floor(targetQuantity) || 1))
    setInvoiceItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: validQty,
            totalPrice: item.unitPrice * validQty,
          }
        }
        return item
      })
    )
  }

  // حذف صنف من الفاتورة
  const handleRemoveInvoiceItem = (itemId: string) => {
    setInvoiceItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  // تفريغ الفاتورة
  const handleClearInvoice = () => {
    setInvoiceItems([])
    setLoadedOrderId(null)
    setLoadedOrderNumber(null)
    setLoadedOrderStatus(null)
    setSelectedTableId(null)
    setSelectedCustomerId(null)
    setCustomerName("")
    setDeliveryAddress("")
    setDeliveryDistance("")
    setCustomDeliveryFee(null)
    setOrderNotes("")
    setDiscountType("none")
    setDiscountValue(0)
    setDiscountReason("")
    setServiceChargeEnabled(true)
    if (paramOrderId || paramTableId) {
      router.replace("/dashboard/pos")
    }
  }

  // حساب الإجماليات
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0)

  // حساب الخصومات
  const discountAmount = React.useMemo(() => {
    if (discountType === "complimentary") return subtotal
    if (discountType === "percentage") return Math.round(subtotal * (discountValue / 100) * 100) / 100
    if (discountType === "fixed") return Math.min(subtotal, discountValue)
    return 0
  }, [discountType, discountValue, subtotal])

  const netSubtotal = Math.max(0, subtotal - discountAmount)

  // حساب ضريبة القيمة المضافة على الصافي بعد الخصم
  const taxRate = settings.tax_enabled ? (Number(settings.tax_percentage || 0) / 100) : 0
  const vatTax = Math.round(netSubtotal * taxRate * 100) / 100

  // حساب رسوم التوصيل
  const baseDeliveryFee = Number(settings.delivery_base_fee ?? settings.delivery_fee ?? 15)
  const deliveryFeePerKm = Number(settings.delivery_fee_per_km ?? 5)
  const distanceKm = parseFloat(deliveryDistance) || 0
  const calculatedDeliveryFee = distanceKm > 0
    ? Math.round(baseDeliveryFee + (distanceKm * deliveryFeePerKm))
    : baseDeliveryFee
  const deliveryFee = orderType === "delivery"
    ? (customDeliveryFee !== null ? customDeliveryFee : calculatedDeliveryFee)
    : 0

  // حساب خدمة الصالة (Dine-in فقط عند تفعيلها)
  const isDineInServiceActive = orderType === "dinein" && (settings.service_charge_enabled ?? true) && serviceChargeEnabled
  const serviceChargePercentage = isDineInServiceActive ? Number(settings.service_charge_percentage || 12) : 0
  const serviceChargeAmount = Math.round(netSubtotal * (serviceChargePercentage / 100) * 100) / 100

  // الإجمالي النهائي
  const grandTotal = Math.round((netSubtotal + vatTax + serviceChargeAmount + deliveryFee) * 100) / 100
  const totalItemsCount = invoiceItems.reduce((acc, it) => acc + it.quantity, 0)

  // استرجاع الطلبات المعلقة من التخزين المحلي
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("restro_held_orders")
      if (saved) {
        setHeldOrders(JSON.parse(saved))
      }
    } catch {}
  }, [])

  const saveHeldOrdersToStorage = (orders: HeldOrder[]) => {
    setHeldOrders(orders)
    try {
      localStorage.setItem("restro_held_orders", JSON.stringify(orders))
    } catch {}
  }

  const handleHoldOrder = () => {
    if (invoiceItems.length === 0) return
    const newHeld: HeldOrder = {
      id: String(Date.now()),
      label: `معلق #${heldOrders.length + 1} (${orderType === "dinein" ? (selectedTable?.name || "صالة") : orderType === "takeaway" ? "سفري" : "توصيل"})`,
      createdAt: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      items: [...invoiceItems],
      orderType,
      selectedTableId,
      selectedCustomerId,
      customerName,
      deliveryAddress,
      distanceKm,
      orderNotes,
      grandTotal,
    }
    saveHeldOrdersToStorage([...heldOrders, newHeld])
    handleClearInvoice()
    triggerQuickToast(`تم تعليق الطلب (${newHeld.label}) بنجاح`)
  }

  const handleResumeHeldOrder = (held: HeldOrder) => {
    if (invoiceItems.length > 0) {
      if (!window.confirm("هناك طلب مفتوح حالياً في الفاتورة. هل تريد استبداله بالطلب المعلق؟")) {
        return
      }
    }
    setInvoiceItems(held.items)
    setOrderType(held.orderType)
    setSelectedTableId(held.selectedTableId)
    setSelectedCustomerId(held.selectedCustomerId)
    setCustomerName(held.customerName)
    setDeliveryAddress(held.deliveryAddress)
    setDeliveryDistance(held.distanceKm ? String(held.distanceKm) : "")
    setOrderNotes(held.orderNotes)
    setLoadedOrderId(null)
    setLoadedOrderNumber(null)
    setLoadedOrderStatus(null)

    saveHeldOrdersToStorage(heldOrders.filter((h) => h.id !== held.id))
    triggerQuickToast(`تم استرجاع الطلب (${held.label}) إلى الفاتورة`)
  }

  const handleDeleteHeldOrder = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    saveHeldOrdersToStorage(heldOrders.filter((h) => h.id !== id))
  }

  // الإضافات المتاحة للمنتج الجاري تخصيصه
  const currentProductAvailableExtras = React.useMemo(() => {
    if (!customizingProduct) return []
    if (customizingProduct.modifiers && customizingProduct.modifiers.length > 0) {
      return customizingProduct.modifiers
    }
    if (customizingProduct.modifier_ids && customizingProduct.modifier_ids.length > 0) {
      return modifiers.filter((m) => customizingProduct.modifier_ids?.includes(m.id))
    }
    return []
  }, [customizingProduct, modifiers])

  const handleToggleExtra = (extra: { id?: number; name: string; price: number }) => {
    setSelectedExtras((prev) => {
      const exists = prev.some((e) => e.name === extra.name)
      if (exists) {
        return prev.filter((e) => e.name !== extra.name)
      } else {
        return [...prev, extra]
      }
    })
  }

  // الطاولة المختارة حالياً
  const selectedTable = tables.find((t) => t.id === selectedTableId)

  // 1. إجراء: "تم الطلب" (إنشاء الطلب في قاعدة البيانات بدون دفع فوري، مثل طلب صالة أو سفري أو توصيل)
  const handleSubmitOrderOnly = async () => {
    if (invoiceItems.length === 0) return

    if (orderType === "dinein" && !selectedTableId) {
      alert("يرجى اختيار طاولة شاغرة للطلب داخل الصالة.")
      return
    }

    setIsSubmittingOrder(true)
    const payload: CreateOrderPayload = {
      order_type: orderType,
      table_id: orderType === "dinein" ? selectedTableId : null,
      customer_id: selectedCustomerId || undefined,
      customer_name: customerName.trim() || (orderType === "dinein" && selectedTable ? selectedTable.name : undefined),
      notes: orderNotes.trim() || undefined,
      items: invoiceItems.map((it) => ({
        product_id: it.productId || undefined,
        product_name: it.name,
        size_name: it.selectedSize?.name,
        unit_price: it.unitPrice,
        quantity: it.quantity,
        total_price: it.totalPrice,
        selected_extras: it.selectedExtras.length > 0 ? it.selectedExtras : undefined,
        notes: it.notes,
      })),
      subtotal,
      tax: vatTax,
      delivery_fee: deliveryFee,
      delivery_address: orderType === "delivery" ? (deliveryAddress.trim() || undefined) : undefined,
      delivery_distance: orderType === "delivery" && distanceKm > 0 ? distanceKm : undefined,
      discount_type: discountType !== "none" ? discountType : undefined,
      discount_value: discountValue > 0 ? discountValue : undefined,
      discount_amount: discountAmount > 0 ? discountAmount : undefined,
      discount_reason: discountReason.trim() || undefined,
      service_charge: serviceChargeAmount > 0 ? serviceChargeAmount : undefined,
      service_charge_percentage: serviceChargePercentage > 0 ? serviceChargePercentage : undefined,
      total: grandTotal,
    }

    let orderSuccess = false
    let orderNumber = ""
    let isOfflineSaved = false

    if (isOnline) {
      const res = await createOrder(payload)
      if (res.success && res.data) {
        orderSuccess = true
        orderNumber = res.data.order_number
        fetchTables()
      } else if (res.message && (res.message.includes("تعذر الاتصال") || res.message.includes("Network") || res.message.includes("Failed to fetch"))) {
        // Fallback to offline save
        const offRes = await saveOrderLocally(payload)
        orderSuccess = true
        orderNumber = offRes.order.order_number
        isOfflineSaved = true
      } else {
        setIsSubmittingOrder(false)
        alert(res.message || "فشل في حفظ الطلب.")
        return
      }
    } else {
      const offRes = await saveOrderLocally(payload)
      orderSuccess = true
      orderNumber = offRes.order.order_number
      isOfflineSaved = true
    }

    setIsSubmittingOrder(false)

    if (orderSuccess) {
      triggerQuickToast(
        isOfflineSaved
          ? `تم حفظ الطلب محلياً (${orderNumber}) بنجاح! سيتم مزامنته عند عودة الاتصال.`
          : orderType === "dinein"
          ? `تم إنشاء طلب الصالة (${orderNumber}) بنجاح! الطاولة أصبحت مشغولة.`
          : orderType === "takeaway"
          ? `تم إنشاء طلب السفري (${orderNumber}) وإرساله للمطبخ بنجاح!`
          : `تم إنشاء طلب التوصيل (${orderNumber}) وإرساله للمطبخ بنجاح!`
      )
      handleClearInvoice()
    }
  }

  // إجراء: "حفظ تعديلات الطلب المفتوح" (تحكم كامل في الأصناف دون إخلاء الطاولة)
  const handleUpdateOrderOnly = async () => {
    if (!loadedOrderId) return
    if (invoiceItems.length === 0) {
      alert("لا يمكن حفظ طلب بدون أصناف. يرجى إضافة أصناف أو إلغاء الطلب من شاشة الطلبات.")
      return
    }

    setIsSubmittingOrder(true)
    const payload: Partial<CreateOrderPayload> = {
      order_type: orderType,
      table_id: orderType === "dinein" ? selectedTableId : null,
      customer_id: selectedCustomerId || undefined,
      customer_name: customerName.trim() || (orderType === "dinein" && selectedTable ? selectedTable.name : undefined),
      notes: orderNotes.trim() || undefined,
      items: invoiceItems.map((it) => ({
        product_id: it.productId || undefined,
        product_name: it.name,
        size_name: it.selectedSize?.name,
        unit_price: it.unitPrice,
        quantity: it.quantity,
        total_price: it.totalPrice,
        selected_extras: it.selectedExtras.length > 0 ? it.selectedExtras : undefined,
        notes: it.notes,
      })),
      subtotal,
      tax: vatTax,
      delivery_fee: deliveryFee,
      delivery_address: orderType === "delivery" ? (deliveryAddress.trim() || undefined) : undefined,
      delivery_distance: orderType === "delivery" && distanceKm > 0 ? distanceKm : undefined,
      discount_type: discountType !== "none" ? discountType : undefined,
      discount_value: discountValue > 0 ? discountValue : undefined,
      discount_amount: discountAmount > 0 ? discountAmount : undefined,
      discount_reason: discountReason.trim() || undefined,
      service_charge: serviceChargeAmount > 0 ? serviceChargeAmount : undefined,
      service_charge_percentage: serviceChargePercentage > 0 ? serviceChargePercentage : undefined,
      total: grandTotal,
    }

    const res = await updateOrder(loadedOrderId, payload)
    setIsSubmittingOrder(false)

    if (res.success && res.data) {
      fetchTables()
      triggerQuickToast(`تم تحديث وحفظ أصناف الطلب (${res.data.order_number}) بنجاح!`)
    } else {
      alert(res.message || "فشل في حفظ تعديلات الطلب.")
    }
  }

  // 2. إجراء: فتح نافذة اختيار الخزنة وتأكيد الدفع
  const handleOpenPaymentDialog = (method: "cash" | "card" = "cash") => {
    if (invoiceItems.length === 0) return

    if (orderType === "dinein" && !selectedTableId && !loadedOrderId) {
      alert("يرجى اختيار الطاولة أولاً قبل الدفع.")
      return
    }

    setPaymentMethod("cash")
    setTenderedAmount(String(grandTotal))
    setPayDialogOpen(true)
  }

  // 3. إجراء: تأكيد السداد وربطه بالخزنة المختارة
  const handleConfirmPayment = async () => {
    if (!selectedRegisterId) {
      alert("يرجى اختيار الخزنة التي سيتم إيداع المبلغ بها.")
      return
    }

    const tenderedNum = paymentMethod === "cash" ? (Number(tenderedAmount) || grandTotal) : grandTotal
    const changeDue = Math.max(0, tenderedNum - grandTotal)

    setIsProcessingPayment(true)

    let targetOrderId = loadedOrderId

    // إذا كان الطلب محمل مسبقاً، نقوم بتحديث بنوده أولاً لضمان مطابقة التعديلات
    if (loadedOrderId) {
      const updatePayload: Partial<CreateOrderPayload> = {
        order_type: orderType,
        table_id: orderType === "dinein" ? selectedTableId : null,
        customer_id: selectedCustomerId || undefined,
        customer_name: customerName.trim() || (orderType === "dinein" && selectedTable ? selectedTable.name : undefined),
        notes: orderNotes.trim() || undefined,
        items: invoiceItems.map((it) => ({
          product_id: it.productId || undefined,
          product_name: it.name,
          size_name: it.selectedSize?.name,
          unit_price: it.unitPrice,
          quantity: it.quantity,
          total_price: it.totalPrice,
          selected_extras: it.selectedExtras.length > 0 ? it.selectedExtras : undefined,
          notes: it.notes,
        })),
        subtotal,
        tax: vatTax,
        delivery_fee: deliveryFee,
        delivery_address: orderType === "delivery" ? (deliveryAddress.trim() || undefined) : undefined,
        delivery_distance: orderType === "delivery" && distanceKm > 0 ? distanceKm : undefined,
        discount_type: discountType !== "none" ? discountType : undefined,
        discount_value: discountValue > 0 ? discountValue : undefined,
        discount_amount: discountAmount > 0 ? discountAmount : undefined,
        discount_reason: discountReason.trim() || undefined,
        service_charge: serviceChargeAmount > 0 ? serviceChargeAmount : undefined,
        service_charge_percentage: serviceChargePercentage > 0 ? serviceChargePercentage : undefined,
        total: grandTotal,
      }

      await updateOrder(loadedOrderId, updatePayload)
    }

    // إذا لم يكن الطلب محفوظاً مسبقاً، نقوم بإنشائه أولاً
    if (!targetOrderId) {
      const createPayload: CreateOrderPayload = {
        order_type: orderType,
        table_id: orderType === "dinein" ? selectedTableId : null,
        customer_id: selectedCustomerId || undefined,
        customer_name: customerName.trim() || (orderType === "dinein" && selectedTable ? selectedTable.name : undefined),
        notes: orderNotes.trim() || undefined,
        items: invoiceItems.map((it) => ({
          product_id: it.productId || undefined,
          product_name: it.name,
          size_name: it.selectedSize?.name,
          unit_price: it.unitPrice,
          quantity: it.quantity,
          total_price: it.totalPrice,
          selected_extras: it.selectedExtras.length > 0 ? it.selectedExtras : undefined,
          notes: it.notes,
        })),
        subtotal,
        tax: vatTax,
        delivery_fee: deliveryFee,
        delivery_address: orderType === "delivery" ? (deliveryAddress.trim() || undefined) : undefined,
        delivery_distance: orderType === "delivery" && distanceKm > 0 ? distanceKm : undefined,
        discount_type: discountType !== "none" ? discountType : undefined,
        discount_value: discountValue > 0 ? discountValue : undefined,
        discount_amount: discountAmount > 0 ? discountAmount : undefined,
        discount_reason: discountReason.trim() || undefined,
        service_charge: serviceChargeAmount > 0 ? serviceChargeAmount : undefined,
        service_charge_percentage: serviceChargePercentage > 0 ? serviceChargePercentage : undefined,
        total: grandTotal,
      }

      if (!isOnline) {
        // Completely offline - save order and payment locally
        const offRes = await saveOrderLocally(createPayload, {
          cash_register_id: selectedRegisterId,
          amount: grandTotal,
          payment_method: paymentMethod,
          complete_order: true,
        })
        setIsProcessingPayment(false)
        setPayDialogOpen(false)
        const completedData: Order = {
          ...offRes.order,
          payment_method: paymentMethod,
          tendered_amount: tenderedNum,
          change_amount: changeDue,
        }
        setCompletedOrder(completedData)
        setReceiptModalOpen(true)
        if (paymentMethod === "cash") {
          openCashDrawer().catch(() => {})
        }
        handleClearInvoice()
        triggerQuickToast(`تم تحصيل وسداد الطلب محلياً (${offRes.order.order_number}) - وضع عدم الاتصال`)
        return
      }

      const resCreate = await createOrder(createPayload)
      if (!resCreate.success || !resCreate.data) {
        if (resCreate.message && (resCreate.message.includes("تعذر الاتصال") || resCreate.message.includes("Network") || resCreate.message.includes("Failed to fetch"))) {
          // Fallback to offline on connection drop
          const offRes = await saveOrderLocally(createPayload, {
            cash_register_id: selectedRegisterId,
            amount: grandTotal,
            payment_method: paymentMethod,
            complete_order: true,
          })
          setIsProcessingPayment(false)
          setPayDialogOpen(false)
          const completedData: Order = {
            ...offRes.order,
            payment_method: paymentMethod,
            tendered_amount: tenderedNum,
            change_amount: changeDue,
          }
          setCompletedOrder(completedData)
          setReceiptModalOpen(true)
          if (paymentMethod === "cash") {
            openCashDrawer().catch(() => {})
          }
          handleClearInvoice()
          triggerQuickToast(`تم تحصيل وسداد الطلب محلياً (${offRes.order.order_number}) - انقطع الاتصال`)
          return
        }

        setIsProcessingPayment(false)
        alert(resCreate.message || "تعذر حفظ الطلب قبل الدفع.")
        return
      }
      targetOrderId = resCreate.data.id
    }

    // الآن نسجل الدفع ونربطه بالخزنة المحددة
    const payRes = await payOrder(targetOrderId, {
      cash_register_id: selectedRegisterId,
      amount: grandTotal,
      payment_method: paymentMethod,
      complete_order: loadedOrderId && (orderType === "dinein" || loadedOrderStatus === "ready") ? true : undefined,
    })

    setIsProcessingPayment(false)

    if (payRes.success && payRes.data) {
      setPayDialogOpen(false)
      const completedData: Order = {
        ...payRes.data,
        payment_method: paymentMethod,
        tendered_amount: tenderedNum,
        change_amount: changeDue,
      }
      setCompletedOrder(completedData)
      setReceiptModalOpen(true)
      if (paymentMethod === "cash") {
        openCashDrawer().catch(() => {})
      }
      fetchTables()
      fetchRegisters()
      handleClearInvoice()
    } else {
      alert(payRes.message || "فشل في تسجيل عملية الدفع على الخزنة.")
    }
  }

  // طباعة بون المطبخ (KOT) للأصناف الحالية
  const handlePrintCurrentKot = () => {
    if (invoiceItems.length === 0) return
    printKotSlip({
      order_number: loadedOrderNumber || `بون-${new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`,
      order_type: orderType,
      table: orderType === "dinein" && selectedTable ? { name: selectedTable.name, location: selectedTable.location } : undefined,
      customer_name: customerName.trim() || undefined,
      items: invoiceItems.map((it) => ({
        product_name: it.name,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        total_price: it.totalPrice,
        size_name: it.selectedSize?.name,
        selected_extras: it.selectedExtras,
        notes: it.notes,
      })),
      subtotal,
      tax: vatTax,
      total: grandTotal,
      payment_status: "unpaid",
      notes: orderNotes.trim() || undefined,
      created_at: new Date().toISOString(),
    }, {
      restaurantName: settings?.restaurant_name,
      currency,
    })
    triggerQuickToast("تم إرسال بون المطبخ للطابعة بنجاح!")
  }

  // اختصارات لوحة المفاتيح والتركيز التلقائي على البحث
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. F1 أو F2: فتح نافذة السداد والدفع
      if (e.key === "F1" || e.key === "F2") {
        e.preventDefault()
        if (invoiceItems.length > 0 && !payDialogOpen && !receiptModalOpen) {
          handleOpenPaymentDialog()
        }
        return
      }

      // 3. F6: تعليق الطلب الحالي
      if (e.key === "F6") {
        e.preventDefault()
        if (invoiceItems.length > 0 && !payDialogOpen && !receiptModalOpen) {
          handleHoldOrder()
        }
        return
      }

      // 4. Escape: إغلاق النوافذ المفتوحة
      if (e.key === "Escape") {
        if (payDialogOpen) {
          e.preventDefault()
          setPayDialogOpen(false)
          return
        }
        if (receiptModalOpen) {
          e.preventDefault()
          setReceiptModalOpen(false)
          setCompletedOrder(null)
          return
        }
        if (customizingProduct) {
          e.preventDefault()
          setCustomizingProduct(null)
          return
        }
        return
      }

      // 5. Space: طباعة عند فتح الإيصال أو تأكيد الدفع في نافذة الدفع
      if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        if (receiptModalOpen && completedOrder) {
          e.preventDefault()
          printThermalReceipt(completedOrder)
          return
        }
        if (payDialogOpen && !isProcessingPayment) {
          e.preventDefault()
          handleConfirmPayment()
          return
        }
      }

      // 6. توجيه الكتابة المباشرة إلى خانة البحث (لأجهزة الباركود والبحث الفوري)
      if (
        !payDialogOpen &&
        !receiptModalOpen &&
        !customizingProduct &&
        !openShiftModalOpen &&
        !closeShiftModalOpen &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          searchInputRef.current?.focus()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    invoiceItems,
    payDialogOpen,
    receiptModalOpen,
    customizingProduct,
    completedOrder,
    isProcessingPayment,
    heldOrders,
    grandTotal,
    selectedTableId,
    loadedOrderId,
    orderType,
    openShiftModalOpen,
    closeShiftModalOpen,
  ])

  return (
    <PageContainer
      title="نقطة البيع (الكاشير)"
      description="إصدار الطلبات، حجز وسداد الطاولات، وربط التحصيل بالخزائن النقدية"
      className="p-1 sm:p-2.5 max-w-full gap-2 sm:gap-2.5"
      action={
        <div className="flex items-center gap-2">
          {/* مؤشر وحالة المزامنة ووضع عدم الاتصال */}
          <OfflinePosIndicator />

          {/* محدد الخزنة النقدية للتحصيل بنمط shadcn الموحد */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-card border border-border/60 shadow-xs">
            <span className="text-xs text-muted-foreground font-semibold shrink-0 flex items-center gap-1 ps-1.5">
              <LandmarkIcon className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>الخزنة:</span>
            </span>
            <div className="w-48 sm:w-56">
              <ComboboxSelect
                value={selectedRegisterId ? String(selectedRegisterId) : ""}
                onValueChange={(val) => setSelectedRegisterId(val ? Number(val) : null)}
                options={registerOptions}
                placeholder="اختر الخزنة..."
                emptyText="لا توجد خزائن"
                className="h-8 text-xs bg-muted/30 hover:bg-muted/50 border-0 rounded-md font-bold"
              />
            </div>
          </div>

          {/* أزرار ومؤشرات الوردية والـ Z-Report */}
          {currentShift ? (
            <div className="flex items-center gap-1.5">
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>#{currentShift.shift_number}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShiftActualCash("")
                  setShiftClosingNotes("")
                  setCloseShiftModalOpen(true)
                }}
                className="h-8 text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 gap-1 rounded-lg"
              >
                <ShieldCheckIcon className="size-3.5" />
                <span>تقفيل الوردية</span>
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShiftStartingCash("0")
                setShiftOpeningNotes("")
                setOpenShiftModalOpen(true)
              }}
              className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs rounded-lg"
            >
              <PlusIcon className="size-3.5" />
              <span>فتح وردية</span>
            </Button>
          )}
        </div>
      }
    >
      {/* إشعار سريع عائم */}
      {quickToast && (
        <div className="fixed bottom-6 end-6 z-50 flex items-center gap-2 p-2.5 px-3.5 rounded-md bg-primary text-primary-foreground shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2Icon className="size-3.5 shrink-0" />
          <span>{quickToast}</span>
        </div>
      )}

      {/* تبديل الكتالوج / الفاتورة للشاشات الصغيرة والمتوسطة (أقل من 1100px) */}
      <div className="min-[1100px]:hidden grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/50 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab("catalog")}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileTab === "catalog"
              ? "bg-card text-primary shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <UtensilsCrossedIcon className="size-3.5" />
          <span>قائمة الأطباق</span>
          <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-mono">
            {filteredProducts.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("invoice")}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileTab === "invoice"
              ? "bg-card text-primary shadow-xs border border-border/40"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <ReceiptIcon className="size-3.5" />
          <span>الفاتورة والحساب</span>
          {invoiceItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black font-mono shadow-xs">
              {totalItemsCount} • {grandTotal} {currency}
            </span>
          )}
        </button>
      </div>

      {/* المخطط العام المتجاوب: كتالوج الأصناف + الفاتورة */}
      <div className="grid grid-cols-1 min-[1100px]:grid-cols-12 gap-2.5 sm:gap-3 pb-20 min-[1100px]:pb-0">
        {/* قسم كتالوج المنتجات والأصناف (7 أعمدة في الشاشات العريضة) */}
        <div className={`min-[1100px]:col-span-7 2xl:col-span-8 flex flex-col gap-2.5 ${mobileTab === "invoice" ? "hidden min-[1100px]:flex" : "flex"}`}>
          {/* شريط التحكم السريع: نوع الطلب + الطاولة + العميل */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-card border border-border/60 shadow-xs space-y-2">
            {/* الصف 1: نوع الطلب */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 text-xs w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setOrderType("dinein")}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    orderType === "dinein"
                      ? "bg-card shadow-xs text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArmchairIcon className="size-3.5" />
                  <span>طاولة</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("takeaway")
                    setSelectedTableId(null)
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    orderType === "takeaway"
                      ? "bg-card shadow-xs text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShoppingBagIcon className="size-3.5" />
                  <span>سفري</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("delivery")
                    setSelectedTableId(null)
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    orderType === "delivery"
                      ? "bg-card shadow-xs text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TruckIcon className="size-3.5" />
                  <span>توصيل</span>
                </button>
              </div>
            </div>

            {/* الصف 2: اختيار الطاولة والعميل */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40">
              {orderType === "dinein" ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-semibold shrink-0">الطاولة:</span>
                  <ComboboxSelect
                    value={selectedTableId ? String(selectedTableId) : ""}
                    onValueChange={(val) => setSelectedTableId(val ? Number(val) : null)}
                    options={tableOptions}
                    placeholder="-- اختر طاولة --"
                    emptyText="لا توجد طاولات"
                    className="w-full text-xs bg-muted/30 rounded-lg h-9"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-semibold shrink-0">ملاحظة:</span>
                  <input
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="ملاحظات الطلب السريعة..."
                    className="w-full h-9 px-2.5 bg-muted/30 border border-border/40 rounded-lg text-foreground outline-none text-xs"
                  />
                </div>
              )}

              {/* العميل */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-semibold shrink-0">العميل:</span>
                <div className="flex items-center gap-1 w-full">
                  <ComboboxSelect
                    value={selectedCustomerId ? String(selectedCustomerId) : ""}
                    onValueChange={handleSelectCustomer}
                    options={customerOptions}
                    placeholder="-- اختر عميل --"
                    emptyText="لا يوجد عميل"
                    className="flex-1 text-xs bg-muted/30 rounded-lg h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickAddCustomerOpen(true)}
                    className="h-9 px-2.5 rounded-lg text-xs font-bold gap-1 shrink-0 hover:bg-muted"
                    title="تسجيل عميل جديد"
                  >
                    <UserPlusIcon className="size-3.5 text-primary" />
                    <span className="hidden xs:inline">جديد</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* الصف 3 المخصص للديليفري: العنوان والمسافة ورسوم التوصيل المحسوبة */}
            {orderType === "delivery" && (
              <div className="p-2 sm:p-2.5 rounded-lg bg-primary/5 border border-primary/20 space-y-2 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* عنوان التوصيل */}
                  <div className="sm:col-span-6 flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1 shrink-0">
                      <MapPinIcon className="size-3.5 text-rose-500 shrink-0" />
                      <span>العنوان:</span>
                    </span>
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="عنوان التوصيل بالتفصيل (المنطقة، الشارع، رقم المبنى)..."
                      className="h-8 text-xs bg-background rounded-md"
                    />
                  </div>

                  {/* المسافة بالكيلومتر */}
                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground shrink-0 whitespace-nowrap">
                      المسافة (كم):
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={deliveryDistance}
                      onChange={(e) => {
                        setDeliveryDistance(e.target.value)
                        setCustomDeliveryFee(null)
                      }}
                      placeholder="مثال: 3"
                      className="h-8 text-xs font-mono font-bold text-center bg-background rounded-md"
                    />
                  </div>

                  {/* رسوم التوصيل المحسوبة + إمكانية التعديل */}
                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground shrink-0 whitespace-nowrap">
                      رسوم التوصيل:
                    </span>
                    <div className="relative flex-1 flex items-center">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={deliveryFee}
                        onChange={(e) => setCustomDeliveryFee(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs font-mono font-bold text-center bg-background rounded-md text-primary pe-7"
                        title={
                          customDeliveryFee !== null
                            ? "تم تعديل الرسوم يدوياً"
                            : `محسوبة تلقائياً: ${baseDeliveryFee} + (${distanceKm} × ${deliveryFeePerKm})`
                        }
                      />
                      <span className="absolute end-2 text-[10px] text-muted-foreground pointer-events-none font-bold">
                        {currency}
                      </span>
                    </div>
                    {customDeliveryFee !== null && (
                      <button
                        type="button"
                        onClick={() => setCustomDeliveryFee(null)}
                        className="text-[10px] text-primary hover:underline shrink-0 p-0.5"
                        title="إعادة الحساب التلقائي حسب المسافة"
                      >
                        تلقائي
                      </button>
                    )}
                  </div>
                </div>

                {/* شريط توضيحي لطيف لطريقة الحساب */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-0.5 border-t border-primary/10">
                  <div className="flex items-center gap-1.5">
                    <SparklesIcon className="size-3 text-primary shrink-0" />
                    <span>
                      فتحة العداد: <b className="text-foreground font-mono">{baseDeliveryFee} {currency}</b>
                      {deliveryFeePerKm > 0 && (
                        <span> + (<b className="text-foreground font-mono">{deliveryFeePerKm} {currency}</b> لكل كم)</span>
                      )}
                    </span>
                  </div>
                  {distanceKm > 0 && (
                    <span className="text-primary font-semibold font-mono">
                      {baseDeliveryFee} + ({distanceKm} × {deliveryFeePerKm}) = {calculatedDeliveryFee} {currency}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* حقل البحث السريع + زرار نمط العرض (كروت / صفوف) للأصناف */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
              <div className="relative flex-1">
                <SearchIcon className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن صنف بالاسم أو الوصف (أو امسح الباركود)..."
                  className="ps-8.5 h-8.5 bg-muted/30 rounded-lg text-xs"
                />
              </div>

              {/* تبديل نمط عرض المنتجات (كروت / صفوف) */}
              <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="عرض كروت مصورة"
                >
                  <LayoutGridIcon className="size-3.5" />
                  <span className="text-[11px]">كروت</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("compact")}
                  className={`px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "compact"
                      ? "bg-card text-primary shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="عرض صفوف قائمة"
                >
                  <ListIcon className="size-3.5" />
                  <span className="text-[11px]">صفوف</span>
                </button>
              </div>
            </div>
          </div>

          {/* شريط الأقسام السريعة مع شريط تمرير أنيق وأزرار تنقل */}
          <div className="relative flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={() => scrollCategories("backward")}
              className="size-7 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition-colors"
              title="التمرير للأقسام السابقة (اليمين)"
            >
              <ChevronRightIcon className="size-4" />
            </button>

            <div
              ref={categoriesScrollRef}
              className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-2 pt-0.5 custom-scrollbar scroll-smooth"
            >
              <button
                type="button"
                onClick={() => setSelectedCategoryId("all")}
                className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedCategoryId === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card hover:bg-muted text-muted-foreground border border-border/60"
                }`}
              >
                كل الأصناف {mounted ? `(${products.filter((p) => p.is_active).length})` : ""}
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    selectedCategoryId === cat.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card hover:bg-muted text-muted-foreground border border-border/60"
                  }`}
                >
                  {cat.image && (cat.image.startsWith("http") || cat.image.startsWith("data:")) && (
                    <img src={cat.image} alt="" className="size-3.5 rounded-sm object-cover" />
                  )}
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollCategories("forward")}
              className="size-7 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition-colors"
              title="التمرير للأقسام التالية (اليسار)"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
          </div>

          {/* شبكة الأطباق للطلب المباشر */}
          {viewMode === "grid" ? (
            /* نمط البطاقات المصورة (Compact Photo Cards) */
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 sm:gap-2.5">
              {filteredProducts.map((product) => {
                const mainImg = product.image && (product.image.startsWith("http") || product.image.startsWith("data:"))
                  ? product.image
                  : (product.images?.[0] || null)

                const hasSizes = Boolean(product.has_sizes && product.sizes && product.sizes.length > 0)

                return (
                  <div
                    key={product.id}
                    onClick={() => handleQuickAdd(product)}
                    className="group relative flex flex-col justify-between p-2 sm:p-2.5 rounded-md bg-card border border-border/60 hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer text-right"
                  >
                    <div className="space-y-1.5">
                      <div className="relative h-20 sm:h-22 w-full overflow-hidden rounded bg-muted/40 flex items-center justify-center">
                        {mainImg ? (
                          <img
                            src={mainImg}
                            alt={product.name}
                            className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-200"
                          />
                        ) : (
                          <UtensilsCrossedIcon className="size-6 text-muted-foreground/30" />
                        )}
                        {hasSizes && (
                          <span className="absolute top-1 end-1 px-1 py-0.2 rounded bg-background/90 backdrop-blur-xs text-[9px] font-bold text-foreground">
                            أحجام
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {product.name}
                        </h4>
                        {product.category && (
                          <span className="text-[10px] text-muted-foreground block line-clamp-1">
                            {product.category.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-border/40">
                      <span className="font-black text-xs text-primary font-mono">
                        {product.price} {currency}
                      </span>
                      <button
                        type="button"
                        className="size-5.5 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-colors"
                      >
                        <PlusIcon className="size-3" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full p-6 text-center bg-card rounded-md border border-border/60">
                  <UtensilsCrossedIcon className="size-7 mx-auto text-muted-foreground/40 mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">لا توجد أطباق متاحة في هذا القسم</p>
                </div>
              )}
            </div>
          ) : (
            /* نمط القائمة المدمجة فائقة الكثافة (Ultra-compact Quick Buttons) */
            <div className="grid grid-cols-1 sm:grid-cols-2 min-[1100px]:grid-cols-2 xl:grid-cols-3 gap-1.5">
              {filteredProducts.map((product) => {
                const hasSizes = Boolean(product.has_sizes && product.sizes && product.sizes.length > 0)
                return (
                  <div
                    key={product.id}
                    onClick={() => handleQuickAdd(product)}
                    className="group flex items-center justify-between p-2 rounded-md bg-card border border-border/60 hover:border-primary/60 hover:shadow-xs transition-all cursor-pointer text-right gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                          {product.name}
                        </span>
                        {hasSizes && (
                          <span className="px-1 rounded bg-muted text-[9px] font-semibold text-muted-foreground shrink-0">
                            أحجام
                          </span>
                        )}
                      </div>
                      {product.category && (
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {product.category.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-xs text-primary font-mono whitespace-nowrap">
                        {product.price} {currency}
                      </span>
                      <button
                        type="button"
                        className="size-6 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-colors"
                      >
                        <PlusIcon className="size-3" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full p-6 text-center bg-card rounded-md border border-border/60">
                  <UtensilsCrossedIcon className="size-7 mx-auto text-muted-foreground/40 mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">لا توجد أطباق متاحة</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================
            سلايد الفاتورة والحساب (5 أعمدة في الشاشات العريضة)
            ========================================================= */}
        <div className={`min-[1100px]:col-span-5 2xl:col-span-4 min-[1100px]:self-start min-[1100px]:sticky min-[1100px]:top-3 min-[1100px]:z-20 min-[1100px]:h-[calc(100vh-6.5rem)] h-[calc(100dvh-8.5rem)] flex flex-col rounded-xl bg-card border border-border/60 shadow-xs overflow-hidden text-right ${mobileTab === "catalog" ? "hidden min-[1100px]:flex" : "flex"}`}>
          {/* زر العودة للأصناف على الشاشات الصغيرة */}
          <div className="min-[1100px]:hidden p-2 bg-muted/40 border-b border-border/60 flex items-center justify-between">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setMobileTab("catalog")}
              className="gap-1 text-xs font-bold h-7.5"
            >
              <span>← العودة لقائمة الأصناف</span>
            </Button>
            <span className="text-xs font-bold text-muted-foreground">{totalItemsCount} أصناف</span>
          </div>

          {/* رأس الفاتورة */}
          <div className="p-2.5 sm:p-3 bg-muted/20 border-b border-border/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ReceiptIcon className="size-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-foreground">
                  {loadedOrderNumber ? `الطلب ${loadedOrderNumber}` : "فاتورة جديدة"}
                </h3>
                <span className="text-[10px] text-muted-foreground block">
                  {orderType === "dinein"
                    ? `داخل الصالة ${selectedTable ? `(${selectedTable.name})` : ""}`
                    : orderType === "takeaway"
                    ? "استلام مباشر (سفري)"
                    : "توصيل دليفري"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {invoiceItems.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handlePrintCurrentKot}
                    className="h-6 px-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/30 rounded-md gap-1 cursor-pointer"
                    title="طباعة بون المطبخ والبار (KOT) للأصناف الحالية"
                  >
                    <ChefHatIcon className="size-3" />
                    <span className="hidden sm:inline">بون المطبخ</span>
                  </Button>

                  {loadedOrderId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setSplitBillOpen(true)}
                      className="h-6 px-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/30 rounded-md gap-1 cursor-pointer"
                      title="تقسيم الفاتورة (Split Bill)"
                    >
                      <SplitIcon className="size-3" />
                      <span className="hidden sm:inline">تقسيم</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleHoldOrder}
                    className="h-6 px-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/30 rounded-md gap-1 cursor-pointer"
                    title="تعليق الطلب لخدمة عميل آخر (F6)"
                  >
                    <ClockIcon className="size-3" />
                    <span>تعليق (F6)</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleClearInvoice}
                    className="text-muted-foreground hover:text-destructive size-6 rounded-md cursor-pointer"
                    title="تفريغ الفاتورة"
                  >
                    <RotateCcwIcon className="size-3" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* شريط الطلبات المعلقة إن وجدت */}
          {heldOrders.length > 0 && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 shrink-0 flex items-center gap-1">
                <ClockIcon className="size-3" />
                <span>معلقة ({heldOrders.length}):</span>
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {heldOrders.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-1 bg-card border border-amber-500/30 rounded-md px-2 py-0.5 text-[10px] shadow-xs shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => handleResumeHeldOrder(h)}
                      className="font-bold hover:text-primary flex items-center gap-1 cursor-pointer"
                      title="اضغط لاسترجاع الطلب المعلق للسلة فوراً"
                    >
                      <span>{h.label}</span>
                      <span className="font-mono text-muted-foreground">({h.grandTotal} {currency})</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteHeldOrder(h.id, e)}
                      className="text-muted-foreground hover:text-destructive ms-1 cursor-pointer text-xs leading-none"
                      title="حذف هذا الطلب المعلق"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* تفاصيل العميل في الفاتورة */}
          {(customerName || selectedCustomerId) && (
            <div className="px-3 py-1 bg-muted/40 border-b border-border/40 text-[10px] flex items-center justify-between text-muted-foreground shrink-0">
              <span className="flex items-center gap-1 font-medium">
                <UsersIcon className="size-2.5 text-primary" />
                <span>العميل:</span>
              </span>
              <span className="font-bold text-foreground">
                {customerName}
                {selectedCustomerId && customers.find((c) => c.id === selectedCustomerId)?.phone && (
                  <span className="text-[9px] text-muted-foreground font-mono ms-1" dir="ltr">
                    ({customers.find((c) => c.id === selectedCustomerId)?.phone})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* تنبيه إذا كان الطلب محمل للتعديل */}
          {loadedOrderId && (
            <div className="p-2.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2 font-medium shrink-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <ClockIcon className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">طلب مفتوح ({loadedOrderNumber || `#${loadedOrderId}`})</span>
                {loadedOrderStatus && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    loadedOrderStatus === "pending"
                      ? "bg-sky-500/20 text-sky-800 dark:text-sky-300"
                      : loadedOrderStatus === "preparing"
                      ? "bg-amber-500/25 text-amber-800 dark:text-amber-300"
                      : loadedOrderStatus === "ready"
                      ? "bg-purple-500/25 text-purple-800 dark:text-purple-300 animate-pulse"
                      : loadedOrderStatus === "served"
                      ? "bg-teal-500/25 text-teal-800 dark:text-teal-300"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {loadedOrderStatus === "pending" && "⏳ انتظار المطبخ"}
                    {loadedOrderStatus === "preparing" && "🔥 قيد التحضير"}
                    {loadedOrderStatus === "ready" && "🛎️ جاهز للتقديم!"}
                    {loadedOrderStatus === "served" && "🍽️ تم التقديم بالصالة"}
                    {loadedOrderStatus === "completed" && "✓ مكتمل"}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearInvoice}
                className="h-6 px-2 text-[10px] text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 rounded shrink-0 font-bold"
              >
                إنهاء التعديل ✕
              </Button>
            </div>
          )}

          {/* قائمة أصناف الفاتورة (تتحرك بسكرول داخلي فقط والباقي ثابت) */}
          <div className="p-2.5 divide-y divide-border/40 flex-1 min-h-0 overflow-y-auto space-y-1.5 text-xs">
            {invoiceItems.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground space-y-1.5">
                <ShoppingBagIcon className="size-8 mx-auto text-muted-foreground/30 stroke-1" />
                <p className="text-xs">الفاتورة فارغة حالياً</p>
                <p className="text-[10px] text-muted-foreground/80">انقر على أي صنف من القائمة لإضافته</p>
              </div>
            ) : (
              invoiceItems.map((item) => (
                <div key={item.id} className="pt-1.5 first:pt-0 space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-foreground text-xs truncate">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono font-medium">
                          {item.unitPrice} {currency}
                        </span>
                      </div>
                      {item.selectedSize && (
                        <span className="text-[10px] text-muted-foreground block">الحجم: {item.selectedSize.name}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInvoiceItem(item.id)}
                      className="text-muted-foreground hover:text-destructive p-0.5 cursor-pointer"
                      title="حذف الصنف"
                    >
                      <Trash2Icon className="size-3" />
                    </button>
                  </div>

                  {item.selectedExtras.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.selectedExtras.map((ex, i) => (
                        <span key={i} className="text-[9px] bg-muted px-1 py-0.2 rounded text-muted-foreground">
                          +{ex.name} ({ex.price} {currency})
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-[9px] text-amber-600">ملاحظة: {item.notes}</p>
                  )}

                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 bg-background rounded border border-border/60 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="size-4.5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground cursor-pointer shrink-0"
                          title="إنقاص الكمية"
                        >
                          <MinusIcon className="size-2.5" />
                        </button>
                        <ItemQuantityInput
                          value={item.quantity}
                          onChange={(val) => handleSetItemQuantity(item.id, val)}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="size-4.5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground cursor-pointer shrink-0"
                          title="زيادة الكمية"
                        >
                          <PlusIcon className="size-2.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono font-medium" title="سعر الصنف الفردي">
                        × {item.unitPrice} {currency}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-primary text-xs" title="إجمالي هذا الصنف">
                      {item.totalPrice} {currency}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ملخص الحساب والأزرار الإجرائية (ثابتة تماماً في الأسفل) */}
          <div className="p-2.5 sm:p-3 bg-muted/20 border-t border-border/50 space-y-2 text-xs shrink-0 mt-auto">
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between text-[11px]">
                <span>المجموع الفرعي:</span>
                <span className="font-semibold text-foreground">{subtotal} {currency}</span>
              </div>

              {/* سطر الخصم أو الضيافة التفاعلي */}
              {discountType !== "none" && discountAmount > 0 ? (
                <div className="flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 font-medium bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">
                  <div className="flex items-center gap-1.5 truncate">
                    <TagIcon className="size-3 shrink-0" />
                    <span className="truncate">
                      {discountType === "complimentary"
                        ? "ضيافة 100% (على حساب المحل)"
                        : discountType === "percentage"
                        ? `خصم ${discountValue}%`
                        : `خصم مبلغ`}
                      {discountReason ? ` (${discountReason})` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDiscountDialogOpen(true)}
                      className="text-[10px] text-foreground underline hover:text-primary cursor-pointer shrink-0 ms-1"
                    >
                      تعديل
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono font-bold shrink-0">
                    <span>-{discountAmount.toFixed(2)} {currency}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("none")
                        setDiscountValue(0)
                        setDiscountReason("")
                      }}
                      className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5 rounded hover:bg-rose-500/20"
                      title="إلغاء الخصم"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-[11px] py-0.5">
                  <span className="text-muted-foreground">الخصومات والضيافة:</span>
                  <button
                    type="button"
                    onClick={() => setDiscountDialogOpen(true)}
                    disabled={invoiceItems.length === 0}
                    className="text-primary hover:text-primary/80 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 text-[11px]"
                  >
                    <PlusIcon className="size-3" />
                    <span>إضافة خصم / ضيافة</span>
                  </button>
                </div>
              )}

              {/* الصافي بعد الخصم إن وجد */}
              {discountType !== "none" && discountAmount > 0 && (
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>الصافي بعد الخصم:</span>
                  <span className="font-semibold text-foreground">{netSubtotal.toFixed(2)} {currency}</span>
                </div>
              )}

              {/* خدمة الصالة لطلبات الطاولات فقط */}
              {orderType === "dinein" && (settings.service_charge_enabled ?? true) && (
                <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={serviceChargeEnabled}
                      onChange={(e) => setServiceChargeEnabled(e.target.checked)}
                      className="size-3 accent-amber-600 rounded cursor-pointer"
                    />
                    <span>خدمة الصالة ({settings.service_charge_percentage || 12}%):</span>
                  </label>
                  <span className="font-bold font-mono">
                    {serviceChargeEnabled ? `+${serviceChargeAmount.toFixed(2)} ${currency}` : `0 ${currency}`}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-[11px]">
                <span>ضريبة القيمة المضافة ({settings.tax_enabled ? `${settings.tax_percentage}%` : "معفاة"}):</span>
                <span className="font-semibold text-foreground">{vatTax} {currency}</span>
              </div>
              {orderType === "delivery" && (
                <div className="flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <div className="flex items-center gap-1">
                    <span>رسوم التوصيل (دليفري):</span>
                    {distanceKm > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">({distanceKm} كم)</span>
                    )}
                  </div>
                  <span className="font-bold font-mono">+{deliveryFee} {currency}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-border/40 text-xs font-bold text-foreground">
                <span>الإجمالي النهائي:</span>
                <span className="text-primary font-black font-mono text-sm sm:text-base">{grandTotal} {currency}</span>
              </div>
            </div>

            {/* الأزرار التنفيذية للـ POS */}
            <div className="space-y-1.5 pt-0.5">
              {/* في حالة طلب طاولة جديد: لا يظهر زر الدفع الفوري إطلاقاً، بل تأكيد وحجز الطاولة وإرسال للمطبخ */}
              {orderType === "dinein" && !loadedOrderId ? (
                <Button
                  type="button"
                  onClick={handleSubmitOrderOnly}
                  disabled={invoiceItems.length === 0 || isSubmittingOrder}
                  className="w-full gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md text-xs py-2 shadow-xs"
                >
                  {isSubmittingOrder ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <UtensilsCrossedIcon className="size-3.5" />
                  )}
                  <span>تأكيد وحجز الطاولة (إرسال للمطبخ)</span>
                </Button>
              ) : loadedOrderId ? (
                /* في حالة طلب مفتوح يجري تعديله: يتاح حفظ التعديلات وإبقائه مفتوحاً، أو السداد الفوري */
                <div className="space-y-1.5 w-full">
                  <Button
                    type="button"
                    onClick={handleUpdateOrderOnly}
                    disabled={invoiceItems.length === 0 || isSubmittingOrder}
                    className="w-full gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md text-xs py-2 shadow-xs cursor-pointer"
                  >
                    {isSubmittingOrder ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <SaveIcon className="size-3.5" />
                    )}
                    <span>حفظ وتحديث أصناف الطلب</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleOpenPaymentDialog()}
                    disabled={invoiceItems.length === 0 || isSubmittingOrder}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm py-2.5 shadow-sm cursor-pointer"
                    title="سداد الحساب وإتمام الطلب (F1 / Space)"
                  >
                    <CheckCircle2Icon className="size-4" />
                    <span>سداد وإتمام الطلب (F1)</span>
                  </Button>
                </div>
              ) : (
                /* طلبات السفري والتوصيل: يتاح الدفع الفوري كزر رئيسي أو الإرسال للمطبخ بدون دفع فوري */
                <>
                  <Button
                    type="button"
                    onClick={() => handleOpenPaymentDialog()}
                    disabled={invoiceItems.length === 0}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm py-2.5 shadow-sm cursor-pointer"
                    title="دفع وسداد الحساب (F1)"
                  >
                    <CheckCircle2Icon className="size-4" />
                    <span>دفع وسداد الحساب (F1)</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSubmitOrderOnly}
                    disabled={invoiceItems.length === 0 || isSubmittingOrder}
                    className="w-full gap-1.5 border-border/70 hover:bg-muted font-bold rounded-md text-xs py-1.5"
                  >
                    {isSubmittingOrder ? (
                      <Loader2Icon className="size-3 animate-spin" />
                    ) : (
                      <CheckCircle2Icon className="size-3 text-primary" />
                    )}
                    <span>
                      {orderType === "takeaway"
                        ? "إرسال طلب السفري للمطبخ (الدفع عند الاستلام)"
                        : "إرسال طلب التوصيل للمطبخ (الدفع عند الاستلام)"}
                    </span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* شريط عائم على الشاشات الصغيرة يعرض إجمالي الفاتورة وزر الانتقال للحساب */}
      {invoiceItems.length > 0 && mobileTab === "catalog" && (
        <div className="min-[1100px]:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 p-2.5 px-4 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div>
            <span className="text-[11px] text-muted-foreground block font-medium">{totalItemsCount} أصناف محددة</span>
            <span className="text-sm font-black text-primary font-mono">{grandTotal} {currency}</span>
          </div>
          <Button
            type="button"
            onClick={() => setMobileTab("invoice")}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-4 h-8.5 rounded-lg shadow-xs cursor-pointer"
          >
            <ReceiptIcon className="size-3.5" />
            <span>عرض الفاتورة ({invoiceItems.length})</span>
            <ArrowLeftIcon className="size-3" />
          </Button>
        </div>
      )}

      {/* =========================================================
          نافذة اختيار الخزنة وتسجيل الدفع مع أزرار الكاش السريع
          ========================================================= */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="w-[96vw] max-w-lg max-h-[92vh] overflow-y-auto rounded-xl p-4 sm:p-6 bg-card border text-right shadow-2xl">
          <DialogHeader className="text-right space-y-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <LandmarkIcon className="size-5 text-emerald-600" />
                <span>سداد الفاتورة وتحصيل النقدية</span>
              </DialogTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {orderType === "dinein"
                  ? `طاولة (${selectedTable?.name || "صالة"})`
                  : orderType === "takeaway"
                  ? "استلام مباشر (سفري)"
                  : "توصيل دليفري"}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-2 text-xs">
            {/* بطاقة المبلغ المطلوب تحصيله */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">المبلغ المطلوب تحصيله:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono text-xl">
                {grandTotal} {currency}
              </span>
            </div>

            {/* قسم الدفع مع أزرار الكاش السريع وحساب الباقي */}
            <div className="space-y-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground">
                    المبلغ المستلم من العميل:
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    اكتب أو اضغط الأزرار السريعة
                  </span>
                </div>

                {/* حقل إدخال المبلغ المستلم */}
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    placeholder={String(grandTotal)}
                    className="h-10 text-base font-bold font-mono text-center rounded-lg bg-background border-border"
                  />
                </div>

                {/* أزرار المبالغ الشائعة */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground block font-medium">أزرار نقدية شائعة:</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTenderedAmount(String(grandTotal))}
                      className="p-1.5 rounded-md bg-card border border-border/80 hover:bg-muted font-bold text-[11px] text-primary transition-all cursor-pointer"
                      title="المبلغ المطلوب بالضبط"
                    >
                      بالضبط
                    </button>
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTenderedAmount(String(amt))}
                        className={`p-1.5 rounded-md border font-mono font-bold text-[11px] transition-all cursor-pointer ${
                          Number(tenderedAmount) === amt
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-card border-border/80 hover:bg-muted text-foreground"
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>

                  {/* أزرار الإضافة السريعة */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[10, 20, 50, 100].map((plusAmt) => (
                      <button
                        key={plusAmt}
                        type="button"
                        onClick={() => {
                          const current = Number(tenderedAmount) || 0
                          setTenderedAmount(String(current + plusAmt))
                        }}
                        className="p-1 rounded-md bg-muted/60 hover:bg-muted font-mono font-semibold text-[10.5px] text-muted-foreground hover:text-foreground border border-border/50 transition-all cursor-pointer"
                      >
                        +{plusAmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* كارت حساب الباقي أو المتبقي */}
                {(() => {
                  const tendered = Number(tenderedAmount) || 0
                  const change = Math.max(0, tendered - grandTotal)
                  const remaining = Math.max(0, grandTotal - tendered)

                  if (tendered >= grandTotal) {
                    return (
                      <div className="p-2.5 rounded-lg bg-emerald-600 text-white flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <CheckCircle2Icon className="size-4" />
                          <span>الباقي للعميل:</span>
                        </span>
                        <span className="font-black font-mono text-lg">
                          {change.toFixed(2)} {currency}
                        </span>
                      </div>
                    )
                  } else if (tendered > 0) {
                    return (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          <AlertCircleIcon className="size-4 text-amber-600" />
                          <span>المتبقي المطلوب:</span>
                        </span>
                        <span className="font-black font-mono text-base">
                          {remaining.toFixed(2)} {currency}
                        </span>
                      </div>
                    )
                  }
                  return null
                })()}
            </div>

            {/* قائمة اختيار الخزنة */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                الخزنة المالية <span className="text-destructive">*</span>
              </label>

              <div className="space-y-1 max-h-36 overflow-y-auto">
                {registers
                  .filter((r) => r.is_active)
                  .map((reg) => (
                    <label
                      key={reg.id}
                      onClick={() => setSelectedRegisterId(reg.id)}
                      className={`flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-all ${
                        selectedRegisterId === reg.id
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold"
                          : "bg-card border-border/70 hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`size-4 rounded-sm flex items-center justify-center border ${
                            selectedRegisterId === reg.id
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {selectedRegisterId === reg.id && <CheckIcon className="size-3 stroke-[3]" />}
                        </div>
                        <div>
                          <span>{reg.name}</span>
                          {reg.is_default && (
                            <span className="ms-1.5 px-1 text-[9px] font-normal bg-muted rounded-sm">افتراضية</span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {Number(reg.balance || 0).toLocaleString("ar-EG")} {currency}
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            {loadedOrderId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPayDialogOpen(false)
                  setSplitBillOpen(true)
                }}
                className="w-full gap-2 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-bold rounded-lg text-xs py-2 cursor-pointer"
              >
                <SplitIcon className="size-3.5" />
                <span>تقسيم الفاتورة (Split Bill) بين الأفراد أو حسب الأصناف</span>
              </Button>
            )}
          </div>

          <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPayDialogOpen(false)}
              className="rounded-lg text-xs"
            >
              إلغاء (Esc)
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isProcessingPayment || !selectedRegisterId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs gap-1.5 px-5 shadow-xs cursor-pointer"
            >
              {isProcessingPayment ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2Icon className="size-3.5" />
              )}
              <span>تأكيد وسداد الفاتورة (Space)</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          نافذة الفاتورة والطباعة (Thermal Receipt)
          ========================================================= */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="w-[96vw] max-w-md max-h-[90vh] overflow-y-auto rounded-md p-4 sm:p-6 bg-card border text-right shadow-2xl">
          <DialogHeader className="text-center space-y-1">
            <div className="size-10 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-1">
              <CheckCircle2Icon className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              تم سداد الطلب بنجاح!
            </DialogTitle>
          </DialogHeader>

          {/* إيصال الفاتورة الحرارية القابلة للطباعة (أبيض وأسود عادية) */}
          {completedOrder && (
            <div className="max-h-[62vh] overflow-y-auto p-2 bg-neutral-200/50 dark:bg-muted/30 rounded-md border border-neutral-300 dark:border-border">
              <ThermalReceiptCard
                data={completedOrder}
                className="printable-thermal-receipt"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => completedOrder && printThermalReceipt(completedOrder)}
              className="gap-1.5 rounded-md text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 shadow-sm"
            >
              <PrinterIcon className="size-3.5" />
              <span>طباعة ريسيت حراري</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => completedOrder && printKotSlip(completedOrder)}
              className="gap-1.5 rounded-md text-xs font-bold border-amber-600/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
            >
              <ChefHatIcon className="size-3.5" />
              <span>طباعة بون المطبخ (KOT)</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                setReceiptModalOpen(false)
                setCompletedOrder(null)
              }}
              className="bg-primary text-primary-foreground font-bold rounded-md text-xs"
            >
              طلب جديد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تخصيص الطبق (اختيار الأحجام والإضافات) */}
      <Dialog open={Boolean(customizingProduct)} onOpenChange={(open) => !open && setCustomizingProduct(null)}>
        <DialogContent className="w-[96vw] sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-md p-4 sm:p-6 bg-card border text-right shadow-xl">
          <DialogHeader className="text-right space-y-1">
            <div className="flex items-center gap-3">
              {customizingProduct?.image && (
                <img
                  src={customizingProduct.image}
                  alt=""
                  className="size-12 rounded-md object-cover border"
                />
              )}
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {customizingProduct?.name}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 mt-1 text-xs">
            {/* الأحجام إن وجدت */}
            {customizingProduct?.has_sizes && customizingProduct.sizes && customizingProduct.sizes.length > 0 && (
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">اختيار الحجم:</label>
                <div className="grid grid-cols-3 gap-2">
                  {customizingProduct.sizes.map((sz, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`p-2 rounded-md border text-center transition-all ${
                        selectedSize?.name === sz.name
                          ? "bg-primary/10 border-primary text-primary font-bold"
                          : "bg-muted/30 border-border/50 hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="font-semibold">{sz.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{sz.price} {currency}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* الإضافات إن وجدت */}
            {currentProductAvailableExtras.length > 0 && (
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">إضافات اختيارية:</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {currentProductAvailableExtras.map((extra, idx) => {
                    const isChecked = selectedExtras.some((e) => e.name === extra.name)
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleExtra(extra)}
                        className={`flex items-center justify-between p-2 rounded-md border text-right transition-all ${
                          isChecked
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "bg-muted/30 border-border/50 hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`size-3.5 rounded-sm flex items-center justify-center border ${
                              isChecked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                            }`}
                          >
                            {isChecked && <CheckIcon className="size-2.5 stroke-[3]" />}
                          </div>
                          <span>{extra.name}</span>
                        </div>
                        <span className="font-mono text-[11px]">+{extra.price} {currency}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ملاحظات المطبخ */}
            <div className="space-y-1">
              <label className="font-bold text-foreground block">ملاحظات التحضير (اختياري):</label>
              <Input
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="مثال: بدون بصل، صوص خارجي..."
                className="bg-muted/30 text-xs rounded-md"
              />
            </div>

            {/* الكمية */}
            <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/20 border border-border/50">
              <span className="font-bold text-foreground">الكمية:</span>
              <div className="flex items-center gap-2 bg-background p-1 rounded-md border border-border/60">
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                  className="size-6 rounded flex items-center justify-center hover:bg-muted text-foreground cursor-pointer shrink-0"
                  title="إنقاص الكمية"
                >
                  <MinusIcon className="size-3" />
                </button>
                <ItemQuantityInput
                  value={itemQuantity}
                  onChange={(val) => setItemQuantity(val)}
                  className="w-12 h-6 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => q + 1)}
                  className="size-6 rounded flex items-center justify-center hover:bg-muted text-foreground cursor-pointer shrink-0"
                  title="زيادة الكمية"
                >
                  <PlusIcon className="size-3" />
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCustomizingProduct(null)}
              className="rounded-md text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCustomization}
              className="gap-1.5 rounded-md bg-primary text-primary-foreground font-bold text-xs"
            >
              <PlusIcon className="size-4" />
              <span>
                إضافة إلى الفاتورة (المجموع:{" "}
                {((selectedSize?.price || customizingProduct?.price || 0) +
                  selectedExtras.reduce((sum, e) => sum + e.price, 0)) *
                  itemQuantity}{" "}
                {currency})
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تسجيل عميل جديد سريعاً في نقطة البيع */}
      <Dialog open={quickAddCustomerOpen} onOpenChange={setQuickAddCustomerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlusIcon className="size-5 text-primary" />
              <span>تسجيل عميل جديد</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleQuickCreateCustomer} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                اسم العميل <span className="text-destructive">*</span>
              </label>
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="اسم العميل"
                className="h-9 text-xs rounded-md"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                رقم الهاتف <span className="text-destructive">*</span>
              </label>
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="رقم الهاتف"
                className="h-9 text-xs rounded-md"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">العنوان (اختياري)</label>
              <Input
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                placeholder="العنوان (اختياري)..."
                className="h-9 text-xs rounded-md"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAddCustomerOpen(false)}
                className="h-8.5 rounded-md text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingCustomer}
                className="gap-1.5 bg-primary text-primary-foreground font-bold h-8.5 px-3 rounded-md text-xs shadow-xs"
              >
                {isSavingCustomer && <Loader2Icon className="size-3.5 animate-spin" />}
                <span>حفظ واختيار العميل</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة فتح وردية جديدة */}
      <Dialog open={openShiftModalOpen} onOpenChange={setOpenShiftModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <PlusIcon className="size-4 text-primary" />
              <span>بدء وردية جديدة (فتح الدرج)</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!selectedRegisterId) {
                triggerQuickToast("يرجى اختيار الخزنة أولاً.")
                return
              }
              const res = await openShift({
                cash_register_id: selectedRegisterId,
                starting_cash: Number(shiftStartingCash || 0),
                opening_notes: shiftOpeningNotes,
              })
              if (res.success) {
                triggerQuickToast(res.message)
                setOpenShiftModalOpen(false)
              } else {
                triggerQuickToast(res.message)
              }
            }}
            className="space-y-3 pt-1 text-xs"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">العهدة النقدية الافتتاحية بالدرج *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={shiftStartingCash}
                onChange={(e) => setShiftStartingCash(e.target.value)}
                placeholder="0.00"
                className="h-9 text-sm font-bold font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">ملاحظات الفتح (اختياري)</label>
              <Input
                value={shiftOpeningNotes}
                onChange={(e) => setShiftOpeningNotes(e.target.value)}
                placeholder="ملاحظات (اختياري)..."
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenShiftModalOpen(false)}
                className="h-8.5 rounded-md text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isShiftActionLoading}
                className="gap-1.5 bg-primary text-primary-foreground font-bold h-8.5 px-3 rounded-md text-xs shadow-xs"
              >
                {isShiftActionLoading && <Loader2Icon className="size-3.5 animate-spin" />}
                <span>فتح الوردية</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة تقفيل الوردية وإصدار تقرير الـ Z-Report */}
      <Dialog open={closeShiftModalOpen} onOpenChange={setCloseShiftModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-rose-600 dark:text-rose-400">
              <ShieldCheckIcon className="size-4" />
              <span>تقفيل الوردية الحالية وإصدار تقرير الإغلاق</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!currentShift) return
              const res = await closeShift(currentShift.id, {
                actual_cash: Number(shiftActualCash || 0),
                closing_notes: shiftClosingNotes,
              })
              if (res.success) {
                triggerQuickToast(res.message)
                setCloseShiftModalOpen(false)
                if (res.z_report) {
                  setActiveZReport(res.z_report, res.shift)
                }
              } else {
                triggerQuickToast(res.message)
              }
            }}
            className="space-y-3 pt-1 text-xs"
          >
            {currentShift?.live_metrics && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between font-sans text-muted-foreground">
                  <span>العهدة الافتتاحية:</span>
                  <span className="font-mono text-foreground">{currentShift.live_metrics.starting_cash.toFixed(2)} {currency}</span>
                </div>
                <div className="flex items-center justify-between font-sans text-muted-foreground">
                  <span>مبيعات نقدية محصلة:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{currentShift.live_metrics.cash_sales.toFixed(2)} {currency}</span>
                </div>
                <div className="flex items-center justify-between font-sans font-bold border-t border-border/50 pt-1 text-foreground">
                  <span>النقدية المتوقعة بالدرج:</span>
                  <span className="font-mono text-primary text-sm font-bold">{currentShift.live_metrics.expected_cash.toFixed(2)} {currency}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">النقدية الفعلية المحصية بالدرج *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={shiftActualCash}
                onChange={(e) => setShiftActualCash(e.target.value)}
                placeholder="0.00"
                className="h-9 text-sm font-bold font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">ملاحظات التقفيل (اختياري)</label>
              <Input
                value={shiftClosingNotes}
                onChange={(e) => setShiftClosingNotes(e.target.value)}
                placeholder="أي أسباب للعجز أو الزيادة..."
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCloseShiftModalOpen(false)}
                className="h-8.5 rounded-md text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isShiftActionLoading}
                className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold h-8.5 px-3 rounded-md text-xs shadow-xs"
              >
                {isShiftActionLoading && <Loader2Icon className="size-3.5 animate-spin" />}
                <span>تقفيل وإصدار تقرير الإغلاق</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض وطباعة تقرير Z-Report */}
      <ZReportDialog
        open={!!activeZReport}
        onOpenChange={(open) => !open && setActiveZReport(null)}
        zReport={activeZReport}
      />

      {/* نافذة تطبيق الخصم والضيافة */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="w-[96vw] max-w-md rounded-xl p-4 sm:p-5 bg-card border border-border/70 text-right shadow-2xl">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <TagIcon className="size-4 text-rose-600" />
              <span>تطبيق خصم أو ضيافة</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              حدد نوع الخصم المطلوب تطبيقه على إجمالي أصناف الفاتورة ({subtotal} {currency})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 mt-2 text-xs">
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-lg border border-border/50 text-center font-bold">
              <button
                type="button"
                onClick={() => setDiscountType("percentage")}
                className={`py-1.5 rounded-md transition-all cursor-pointer ${
                  discountType === "percentage"
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                نسبة مئوية %
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("fixed")}
                className={`py-1.5 rounded-md transition-all cursor-pointer ${
                  discountType === "fixed"
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                مبلغ ثابت ({currency})
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountType("complimentary")
                  setDiscountValue(100)
                  if (!discountReason) setDiscountReason("ضيافة إدارة")
                }}
                className={`py-1.5 rounded-md transition-all cursor-pointer ${
                  discountType === "complimentary"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-600 hover:bg-rose-500/10"
                }`}
              >
                ضيافة 100%
              </button>
            </div>

            {discountType === "percentage" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[5, 10, 15, 20, 25, 50].map((pct) => (
                    <Button
                      key={pct}
                      type="button"
                      variant={discountValue === pct ? "default" : "outline"}
                      size="xs"
                      onClick={() => setDiscountValue(pct)}
                      className="h-7 text-xs rounded-md font-mono font-bold"
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">نسبة مخصصة (%):</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    placeholder="اكتب النسبة المئوية"
                    className="h-8.5 rounded-lg text-xs font-mono font-bold text-center"
                  />
                </div>
              </div>
            )}

            {discountType === "fixed" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[10, 20, 50, 100, 200].map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant={discountValue === amt ? "default" : "outline"}
                      size="xs"
                      onClick={() => setDiscountValue(amt)}
                      className="h-7 text-xs rounded-md font-mono font-bold"
                    >
                      {amt} {currency}
                    </Button>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">مبلغ مخصص ({currency}):</label>
                  <Input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                    placeholder="اكتب المبلغ المراد خصمه"
                    className="h-8.5 rounded-lg text-xs font-mono font-bold text-center"
                  />
                </div>
              </div>
            )}

            {discountType === "complimentary" && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold">
                  <GiftIcon className="size-4 shrink-0" />
                  <span>ضيافة كاملة (On the House) - خصم 100% من أصناف الفاتورة</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  سيتم تصفير قيمة أصناف الطلب بالكامل، وتوثيق سبب الضيافة في سجلات المطعم والتقارير المالية.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["ضيافة إدارة", "VIP", "وجبة موظف (Staff Meal)", "اعتذار للعميل"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDiscountReason(r)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        discountReason === r
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-card border-border/70 text-foreground hover:bg-muted"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-semibold text-foreground">
                سبب الخصم / الضيافة (اختياري للتوثيق):
              </label>
              <Input
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="مثال: عرض خاص، خصم موظف، اعتذار للعميل..."
                className="h-8.5 rounded-lg text-xs"
              />
            </div>

            {discountType !== "none" && (
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">قيمة الخصم المحسوم:</span>
                <span className="font-bold font-mono text-rose-600">
                  -{discountAmount.toFixed(2)} {currency}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDiscountType("none")
                setDiscountValue(0)
                setDiscountReason("")
                setDiscountDialogOpen(false)
              }}
              className="rounded-lg text-xs text-destructive hover:bg-destructive/10"
            >
              إلغاء الخصم
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setDiscountDialogOpen(false)}
              className="bg-primary text-primary-foreground font-bold rounded-lg text-xs px-4"
            >
              تطبيق الخصم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تقسيم الفاتورة (Split Bill) */}
      <SplitBillDialog
        open={splitBillOpen}
        onOpenChange={setSplitBillOpen}
        order={
          loadedOrderId
            ? ({
                id: loadedOrderId,
                order_number: loadedOrderNumber || `طلب-${loadedOrderId}`,
                order_type: orderType,
                table: selectedTable ? { id: selectedTable.id, name: selectedTable.name, location: selectedTable.location } : undefined,
                customer_name: customerName || undefined,
                items: invoiceItems.map((it) => ({
                  id: Number(it.id.replace("loaded-", "")) || 0,
                  order_id: loadedOrderId,
                  product_id: it.productId,
                  product_name: it.name,
                  unit_price: it.unitPrice,
                  quantity: it.quantity,
                  total_price: it.totalPrice,
                  size_name: it.selectedSize?.name,
                })),
                subtotal,
                tax: vatTax,
                total: grandTotal,
                payment_status: "unpaid",
                payments: [],
              } as any)
            : null
        }
        onSuccess={() => {
          fetchTables()
          fetchRegisters()
          handleClearInvoice()
        }}
      />
    </PageContainer>
  )
}

export default function PosPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageContainer>
      }
    >
      <PosContent />
    </React.Suspense>
  )
}
