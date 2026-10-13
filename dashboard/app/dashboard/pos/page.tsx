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
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ComboboxSelect, type ComboboxOption } from "@/components/ui/combobox-select"
import { ThermalReceiptCard } from "@/components/thermal-receipt-card"
import { printThermalReceipt } from "@/lib/receipt-printer"
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
  SaveIcon,
  TruckIcon,
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

  // حالة فاتورة الطباعة بعد السداد
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false)
  const [completedOrder, setCompletedOrder] = React.useState<Order | null>(null)

  // التبديل بين الكتالوج والفاتورة في الشاشات الصغيرة (الموبايل والتابلت)
  const [mobileTab, setMobileTab] = React.useState<"catalog" | "invoice">("catalog")
  const [viewMode, setViewMode] = React.useState<"grid" | "compact">("grid")

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
        if (order.table_id) setSelectedTableId(order.table_id)
        if (order.customer_id) setSelectedCustomerId(order.customer_id)
        if (order.customer_name) setCustomerName(order.customer_name)
        if (order.notes) setOrderNotes(order.notes)

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
        triggerQuickToast(`تم تحميل طلب الطاولة ${order.table?.name || ""} (${order.order_number}) بنجاح وهو جاهز للدفع`)
      }
    }

    loadTargetOrder()
  }, [paramOrderId, getOrder])

  // التعامل مع تحديد طاولة شاغرة من الرابط (?tableId=...)
  React.useEffect(() => {
    if (paramTableId && !loadedOrderId) {
      const tableIdNum = Number(paramTableId)
      if (tableIdNum) {
        setSelectedTableId(tableIdNum)
        setOrderType("dinein")
      }
    }
  }, [paramTableId, loadedOrderId])

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
      if (orderType === "delivery" && found.address && !orderNotes) {
        setOrderNotes(`العنوان: ${found.address}`)
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
      if (orderType === "delivery" && res.data.address) {
        setOrderNotes(`العنوان: ${res.data.address}`)
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
    setSelectedCustomerId(null)
    setCustomerName("")
    setOrderNotes("")
    if (paramOrderId || paramTableId) {
      router.replace("/dashboard/pos")
    }
  }

  // حساب الإجماليات
  const currency = settings.currency || "ج.م"
  const taxRate = settings.tax_enabled ? (Number(settings.tax_percentage || 0) / 100) : 0
  const deliveryFee = orderType === "delivery" ? Number(settings.delivery_fee || 0) : 0
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const vatTax = Math.round(subtotal * taxRate)
  const grandTotal = subtotal + vatTax + deliveryFee
  const totalItemsCount = invoiceItems.reduce((acc, it) => acc + it.quantity, 0)

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

  // 1. إجراء: "تم الطلب" (إنشاء الطلب في قاعدة البيانات بدون دفع فوري، مثل طلب صالة أو توصيل)
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
      customer_name: customerName.trim() || (selectedTable ? selectedTable.name : undefined),
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
      total: grandTotal,
    }

    const res = await createOrder(payload)
    setIsSubmittingOrder(false)

    if (res.success && res.data) {
      fetchTables() // تحديث حالة الطاولات في المتجر
      triggerQuickToast(`تم إنشاء الطلب (${res.data.order_number}) بنجاح! الطاولة أصبحت مشغولة.`)
      handleClearInvoice()
    } else {
      alert(res.message || "فشل في حفظ الطلب.")
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
      customer_name: customerName.trim() || (selectedTable ? selectedTable.name : undefined),
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

  // 2. إجراء: فتح نافذة اختيار الخزنة للدفع
  const handleOpenPaymentDialog = () => {
    if (invoiceItems.length === 0) return

    if (orderType === "dinein" && !selectedTableId && !loadedOrderId) {
      alert("يرجى اختيار الطاولة أولاً قبل الدفع.")
      return
    }

    setPayDialogOpen(true)
  }

  // 3. إجراء: تأكيد السداد وربطه بالخزنة المختارة
  const handleConfirmPayment = async () => {
    if (!selectedRegisterId) {
      alert("يرجى اختيار الخزنة التي سيتم إيداع المبلغ بها.")
      return
    }

    setIsProcessingPayment(true)

    let targetOrderId = loadedOrderId

    // إذا كان الطلب محمل مسبقاً، نقوم بتحديث بنوده أولاً لضمان مطابقة التعديلات
    if (loadedOrderId) {
      const updatePayload: Partial<CreateOrderPayload> = {
        order_type: orderType,
        table_id: orderType === "dinein" ? selectedTableId : null,
        customer_id: selectedCustomerId || undefined,
        customer_name: customerName.trim() || (selectedTable ? selectedTable.name : undefined),
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
        customer_name: customerName.trim() || (selectedTable ? selectedTable.name : undefined),
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
        total: grandTotal,
      }

      const resCreate = await createOrder(createPayload)
      if (!resCreate.success || !resCreate.data) {
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
      complete_order: loadedOrderId && orderType === "dinein" ? true : undefined,
    })

    setIsProcessingPayment(false)

    if (payRes.success && payRes.data) {
      setPayDialogOpen(false)
      setCompletedOrder(payRes.data)
      setReceiptModalOpen(true)
      fetchTables()
      fetchRegisters()
      handleClearInvoice()
    } else {
      alert(payRes.message || "فشل في تسجيل عملية الدفع على الخزنة.")
    }
  }

  return (
    <PageContainer
      title="نقطة البيع (الكاشير)"
      description="إصدار الطلبات، حجز وسداد الطاولات، وربط التحصيل بالخزائن النقدية"
      className="p-1 sm:p-2.5 max-w-full gap-2 sm:gap-2.5"
      action={
        <div className="flex items-center gap-1.5">
          {/* شارة الخزنة النشطة الحالية */}
          {selectedRegisterId && (
            <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              <LandmarkIcon className="size-3" />
              <span>{registers.find((r) => r.id === selectedRegisterId)?.name || "الخزنة"}</span>
            </div>
          )}

          {/* تبديل طريقة العرض شبكة / مدمج */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-md border border-border/50">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض الشبكة المصورة"
            >
              <LayoutGridIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              className={`p-1 rounded text-xs transition-colors ${
                viewMode === "compact"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض القائمة المدمجة السريعة"
            >
              <ListIcon className="size-3.5" />
            </button>
          </div>
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
      <div className="grid grid-cols-1 min-[1100px]:grid-cols-12 gap-2.5 sm:gap-3 items-start pb-20 min-[1100px]:pb-0">
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

            {/* حقل البحث السريع */}
            <div className="relative pt-1 border-t border-border/40">
              <SearchIcon className="absolute start-2.5 top-[calc(50%+2px)] -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن صنف بالاسم أو الوصف..."
                className="ps-8.5 h-8.5 bg-muted/30 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* شريط الأقسام السريعة */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
        <div className={`min-[1100px]:col-span-5 2xl:col-span-4 min-[1100px]:sticky min-[1100px]:top-2 min-[1100px]:h-[calc(100vh-4.2rem)] flex flex-col rounded-md bg-card border border-border/60 shadow-xs overflow-hidden text-right ${mobileTab === "catalog" ? "hidden min-[1100px]:flex" : "flex"}`}>
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

            {invoiceItems.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleClearInvoice}
                className="text-muted-foreground hover:text-destructive size-6 rounded-md"
                title="تفريغ الفاتورة"
              >
                <RotateCcwIcon className="size-3" />
              </Button>
            )}
          </div>

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

          {/* قائمة أصناف الفاتورة (Scrollable) */}
          <div className="p-2.5 divide-y divide-border/40 flex-1 min-h-[200px] max-h-[50vh] min-[1100px]:max-h-none overflow-y-auto space-y-1.5 text-xs">
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
                      <span className="font-bold text-foreground text-xs block truncate">{item.name}</span>
                      {item.selectedSize && (
                        <span className="text-[10px] text-muted-foreground">الحجم: {item.selectedSize.name}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInvoiceItem(item.id)}
                      className="text-muted-foreground hover:text-destructive p-0.5"
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
                    <div className="flex items-center gap-1 bg-background rounded border border-border/60 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="size-4.5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
                      >
                        <MinusIcon className="size-2.5" />
                      </button>
                      <span className="w-4 text-center font-bold text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="size-4.5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
                      >
                        <PlusIcon className="size-2.5" />
                      </button>
                    </div>
                    <span className="font-bold font-mono text-foreground text-xs">{item.totalPrice} {currency}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ملخص الحساب والأزرار الإجرائية (Sticky at bottom) */}
          <div className="p-2.5 sm:p-3 bg-muted/20 border-t border-border/50 space-y-2 text-xs shrink-0">
            <div className="space-y-0.5 text-muted-foreground">
              <div className="flex justify-between text-[11px]">
                <span>المجموع الفرعي:</span>
                <span className="font-semibold text-foreground">{subtotal} {currency}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>ضريبة القيمة المضافة ({settings.tax_enabled ? `${settings.tax_percentage}%` : "معفاة"}):</span>
                <span className="font-semibold text-foreground">{vatTax} {currency}</span>
              </div>
              {orderType === "delivery" && deliveryFee > 0 && (
                <div className="flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>رسوم التوصيل (دليفري):</span>
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
                    className="w-full gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md text-xs py-2 shadow-xs"
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
                    onClick={handleOpenPaymentDialog}
                    disabled={invoiceItems.length === 0 || isSubmittingOrder}
                    className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs py-1.5 shadow-xs"
                  >
                    <BanknoteIcon className="size-3.5" />
                    <span>سداد الحساب وإخلاء الطاولة</span>
                  </Button>
                </div>
              ) : (
                /* طلبات السفري والتوصيل: يتاح الدفع الفوري كزر رئيسي أو الحفظ كمعلق */
                <>
                  <Button
                    type="button"
                    onClick={handleOpenPaymentDialog}
                    disabled={invoiceItems.length === 0}
                    className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs py-2 shadow-xs"
                  >
                    <BanknoteIcon className="size-3.5" />
                    <span>الدفع واختيار الخزنة</span>
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
                    <span>حفظ كطلب قيد الانتظار</span>
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
          نافذة اختيار الخزنة وتسجيل الدفع
          ========================================================= */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="w-[96vw] max-w-md max-h-[90vh] overflow-y-auto rounded-md p-4 sm:p-6 bg-card border text-right shadow-xl">
          <DialogHeader className="text-right space-y-1">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <LandmarkIcon className="size-5 text-emerald-600" />
              <span>تحديد الخزنة وتسجيل الدفع النقدي</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              حدد الخزنة النقدية التي سيتم تسجيل مبلغ التحصيل عليها لإغلاق الطلب.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2 text-xs">
            {/* ملخص المبلغ المستحق */}
            <div className="p-3.5 rounded-md bg-muted/30 border space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>نوع الطلب:</span>
                <span className="font-semibold text-foreground">
                  {orderType === "dinein"
                    ? `طاولة (${selectedTable?.name || "صالة"})`
                    : orderType === "takeaway"
                    ? "استلام مباشر"
                    : "توصيل دليفري"}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
                <span>المبلغ المطلوب تحصيله:</span>
                <span className="text-emerald-600 font-black font-mono text-lg">{grandTotal} {currency}</span>
              </div>
            </div>

            {/* قائمة اختيار الخزنة */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                الخزنة المالية <span className="text-destructive">*</span>
              </label>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {registers
                  .filter((r) => r.is_active)
                  .map((reg) => (
                    <label
                      key={reg.id}
                      onClick={() => setSelectedRegisterId(reg.id)}
                      className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all ${
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
                            <span className="ms-2 px-1 text-[10px] font-normal bg-muted rounded-sm">افتراضية</span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        رصيدها: {Number(reg.balance || 0).toLocaleString("ar-EG")} {currency}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:space-x-reverse pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPayDialogOpen(false)}
              className="rounded-md text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isProcessingPayment || !selectedRegisterId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs gap-1.5"
            >
              {isProcessingPayment ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2Icon className="size-3.5" />
              )}
              <span>تأكيد تسجيل الدفع بالخزنة</span>
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
            <DialogDescription className="text-xs text-muted-foreground">
              تم إيداع المبلغ بالخزنة وإغلاق الطلب وتفريغ الطاولة.
            </DialogDescription>
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
                <DialogDescription className="text-xs text-muted-foreground">
                  اختر الحجم والإضافات المطلوبة قبل الإضافة للفاتورة.
                </DialogDescription>
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
                  className="size-6 rounded flex items-center justify-center hover:bg-muted text-foreground"
                >
                  <MinusIcon className="size-3" />
                </button>
                <span className="w-6 text-center font-bold">{itemQuantity}</span>
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => q + 1)}
                  className="size-6 rounded flex items-center justify-center hover:bg-muted text-foreground"
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
            <DialogDescription className="text-xs">
              سجل بيانات العميل للارتباط بطلباته الحالية والمستقبلية.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickCreateCustomer} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                اسم العميل <span className="text-destructive">*</span>
              </label>
              <Input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="مثال: محمد علي"
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
                placeholder="مثال: 01012345678"
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
                placeholder="المنطقة أو الشارع..."
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
