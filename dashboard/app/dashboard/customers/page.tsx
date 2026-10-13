"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useCustomerStore } from "@/store/customer.store"
import { useSettingStore } from "@/store/setting.store"
import { type Customer, type CreateCustomerPayload } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { CustomerStatementDialog } from "@/components/customer-statement-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  ShoppingBagIcon,
  CoinsIcon,
  Edit2Icon,
  Trash2Icon,
  UserCheckIcon,
  MessageCircleIcon,
  FileTextIcon,
  Receipt as ReceiptIcon,
} from "lucide-react"

export default function CustomersPage() {
  const {
    customers,
    isLoading,
    isSaving,
    error,
    searchQuery,
    statusFilter,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    setSearchQuery,
    setStatusFilter,
  } = useCustomerStore()

  const { settings, fetchSettings } = useSettingStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    fetchCustomers()
    fetchSettings()
  }, [fetchCustomers, fetchSettings])

  const currency = settings?.currency || "ج.م"

  // نافذة الإضافة / التعديل
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null)
  const [formData, setFormData] = React.useState<CreateCustomerPayload>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    is_active: true,
  })
  const [formError, setFormError] = React.useState<string | null>(null)

  // نافذة تأكيد الحذف
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null)

  // نافذة كشف الحساب والعمليات
  const [statementDialogOpen, setStatementDialogOpen] = React.useState(false)
  const [customerForStatement, setCustomerForStatement] = React.useState<Customer | null>(null)

  const handleOpenStatement = (cust: Customer) => {
    setCustomerForStatement(cust)
    setStatementDialogOpen(true)
  }

  // إشعار العملية
  const [bannerMessage, setBannerMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMessage({ type, text })
    setTimeout(() => setBannerMessage(null), 3500)
  }

  // فلترة العملاء
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === "active" && !c.is_active) return false
      if (statusFilter === "inactive" && c.is_active) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const nameMatch = c.name?.toLowerCase().includes(q)
        const phoneMatch = c.phone?.toLowerCase().includes(q)
        const addressMatch = c.address?.toLowerCase().includes(q)
        return nameMatch || phoneMatch || addressMatch
      }
      return true
    })
  }, [customers, statusFilter, searchQuery])

  // إحصائيات سريعة
  const stats = React.useMemo(() => {
    const total = customers.length
    const active = customers.filter((c) => c.is_active).length
    const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0)
    const totalSpent = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0)
    return { total, active, totalOrders, totalSpent }
  }, [customers])

  // فتح نافذة الإضافة
  const handleOpenAdd = () => {
    setEditingCustomer(null)
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      is_active: true,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // فتح نافذة التعديل
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
      is_active: customer.is_active,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // حفظ الإضافة أو التعديل
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError("يرجى إدخال اسم العميل.")
      return
    }

    if (!formData.phone.trim()) {
      setFormError("يرجى إدخال رقم الهاتف.")
      return
    }

    if (editingCustomer) {
      const res = await updateCustomer(editingCustomer.id, formData)
      if (res.success) {
        setDialogOpen(false)
        showBanner("تم تحديث بيانات العميل بنجاح.")
      } else {
        setFormError(res.message)
      }
    } else {
      const res = await createCustomer(formData)
      if (res.success) {
        setDialogOpen(false)
        showBanner("تمت إضافة العميل الجديد بنجاح.")
      } else {
        setFormError(res.message)
      }
    }
  }

  // تأكيد الحذف
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return
    const res = await deleteCustomer(customerToDelete.id)
    setDeleteConfirmOpen(false)
    setCustomerToDelete(null)
    if (res.success) {
      showBanner("تم حذف العميل بنجاح.")
    } else {
      showBanner(res.message, "error")
    }
  }

  return (
    <PageContainer
      title="قاعدة بيانات العملاء"
      description="إدارة بيانات العملاء، أرقام الهواتف، العناوين، وسجل المشتريات"
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchCustomers()}
            disabled={isLoading}
            className="h-8.5 rounded-md text-xs gap-1.5"
            title="تحديث القائمة"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="h-8.5 px-3 rounded-md text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PlusIcon className="size-3.5" />
            <span>إضافة عميل</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* إشعار النجاح / الخطأ */}
        {bannerMessage && (
          <div
            className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-md border text-xs font-medium animate-in fade-in duration-150 ${
              bannerMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/25 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 p-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* بطاقات الإحصائيات العلوية */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UsersIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي العملاء</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                {mounted ? stats.total : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheckIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">العملاء النشطون</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {mounted ? stats.active : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <ShoppingBagIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي الطلبات</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                {mounted ? stats.totalOrders : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CoinsIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي المشتريات</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                {mounted ? Number(stats.totalSpent).toLocaleString("ar-EG") : 0}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">{currency}</span>
              </p>
            </div>
          </div>
        </div>

        {/* شريط البحث والفلترة */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="relative flex-1 w-full sm:max-w-md">
            <SearchIcon className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو رقم الهاتف أو العنوان..."
              className="ps-8 h-8.5 text-xs bg-muted/40 rounded-lg border-border/60"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground"
              }`}
            >
              الكل ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground"
              }`}
            >
              نشط ({customers.filter((c) => c.is_active).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === "inactive"
                  ? "bg-destructive text-destructive-foreground shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground"
              }`}
            >
              معطل ({customers.filter((c) => !c.is_active).length})
            </button>
          </div>
        </div>

        {/* عرض جدول العملاء */}
        {isLoading && customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-card border border-border/60 rounded-md space-y-2">
            <RefreshCwIcon className="size-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">جاري تحميل بيانات العملاء...</p>
          </div>
        ) : error && customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-card border border-destructive/30 rounded-md space-y-2 text-destructive">
            <AlertCircleIcon className="size-6" />
            <p className="text-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchCustomers()} className="h-8 text-xs">
              إعادة المحاولة
            </Button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-card border border-border/60 rounded-md space-y-2 text-muted-foreground">
            <UsersIcon className="size-8 text-muted-foreground/40" />
            <p className="text-xs">لا توجد نتائج مطابقة لبحثك.</p>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-7 text-xs">
                إلغاء البحث
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            {/* جدول للشاشات المتوسطة والكبيرة */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">رقم الهاتف</TableHead>
                    <TableHead className="text-right">العنوان والملاحظات</TableHead>
                    <TableHead className="text-center">الطلبات</TableHead>
                    <TableHead className="text-center">إجمالي الإنفاق</TableHead>
                    <TableHead className="text-center">الرصيد والحساب</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center w-36">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/30">
                      <TableCell className="p-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7.5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {customer.name.trim().charAt(0) || "ع"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground block text-xs truncate">
                              {customer.name}
                            </span>
                            {customer.email && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                                <MailIcon className="size-2.5" />
                                {customer.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${customer.phone}`}
                            className="font-mono text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1"
                            dir="ltr"
                          >
                            <PhoneIcon className="size-3 text-muted-foreground" />
                            {customer.phone}
                          </a>
                          <a
                            href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600 transition-colors"
                            title="واتساب"
                          >
                            <MessageCircleIcon className="size-3" />
                          </a>
                        </div>
                      </TableCell>

                      <TableCell className="p-2.5 max-w-xs">
                        <div className="space-y-0.5">
                          {customer.address ? (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground line-clamp-1">
                              <MapPinIcon className="size-2.5 shrink-0" />
                              <span className="truncate">{customer.address}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/40">بدون عنوان</span>
                          )}
                          {customer.notes && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 line-clamp-1">
                              <FileTextIcon className="size-2.5 shrink-0" />
                              <span className="truncate">{customer.notes}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="p-2.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono">
                          {customer.total_orders || 0}
                        </span>
                      </TableCell>

                      <TableCell className="p-2.5 text-center">
                        <span className="font-bold font-mono text-primary text-xs">
                          {Number(customer.total_spent || 0).toLocaleString("ar-EG")}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
                        </span>
                      </TableCell>

                      {/* عمود الرصيد الحالي */}
                      <TableCell className="p-2.5 text-center">
                        {Number(customer.balance || 0) < 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold font-mono text-rose-600 dark:text-rose-400 text-xs">
                              {Math.abs(Number(customer.balance)).toLocaleString("ar-EG")} {currency}
                            </span>
                            <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">عليه مديونية</span>
                          </div>
                        ) : Number(customer.balance || 0) > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                              {Number(customer.balance).toLocaleString("ar-EG")} {currency}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">له رصيد</span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground">0.00 {currency}</span>
                        )}
                      </TableCell>

                      <TableCell className="p-2.5 text-center">
                        {customer.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-muted-foreground" />
                            معطل
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleOpenStatement(customer)}
                            className="h-7 px-2 text-[11px] gap-1 font-semibold rounded-md border-primary/30 text-primary hover:bg-primary/10"
                            title="عرض كشف الحساب والعمليات"
                          >
                            <ReceiptIcon className="size-3" />
                            <span>كشف الحساب</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleOpenEdit(customer)}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="تعديل"
                          >
                            <Edit2Icon className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              setCustomerToDelete(customer)
                              setDeleteConfirmOpen(true)
                            }}
                            className="size-7 text-muted-foreground hover:text-destructive"
                            title="حذف"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* كروت مدمجة للموبايل */}
            <div className="md:hidden divide-y divide-border/40">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {customer.name.trim().charAt(0) || "ع"}
                      </div>
                      <div>
                        <span className="font-bold text-foreground text-xs block">
                          {customer.name}
                        </span>
                        <a
                          href={`tel:${customer.phone}`}
                          className="font-mono text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                          dir="ltr"
                        >
                          <PhoneIcon className="size-2.5" />
                          {customer.phone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => handleOpenStatement(customer)}
                        className="h-7 px-2 text-[10px] gap-1 font-semibold rounded-md border-primary/30 text-primary"
                        title="كشف الحساب"
                      >
                        <ReceiptIcon className="size-3" />
                        <span>كشف الحساب</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleOpenEdit(customer)}
                        className="size-7 text-muted-foreground"
                      >
                        <Edit2Icon className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setCustomerToDelete(customer)
                          setDeleteConfirmOpen(true)
                        }}
                        className="size-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {customer.address && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                      <MapPinIcon className="size-2.5 shrink-0" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-600 font-bold">
                        {customer.total_orders || 0} طلب
                      </span>
                      {Number(customer.balance || 0) < 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          مديونية: {Math.abs(Number(customer.balance)).toLocaleString("ar-EG")} {currency}
                        </span>
                      ) : Number(customer.balance || 0) > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          رصيد: {Number(customer.balance).toLocaleString("ar-EG")} {currency}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground me-1">المشتريات:</span>
                      <span className="font-mono font-bold text-primary text-xs">
                        {Number(customer.total_spent || 0).toLocaleString("ar-EG")} {currency}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* نافذة إضافة / تعديل العميل */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل بيانات الاتصال والتفاصيل الخاصة بالعميل.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3 py-1 text-xs">
            {formError && (
              <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-1.5">
                <AlertCircleIcon className="size-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                اسم العميل <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: أحمد محمود"
                className="h-8.5 text-xs rounded-md"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                رقم الهاتف <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="مثال: 01012345678"
                className="h-8.5 text-xs rounded-md"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">البريد الإلكتروني (اختياري)</label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@example.com"
                className="h-8.5 text-xs rounded-md"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">عنوان التوصيل (اختياري)</label>
              <Textarea
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="المنطقة، الشارع، رقم العقار..."
                rows={2}
                className="text-xs rounded-md resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">ملاحظات أو تفضيلات</label>
              <Input
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="مثال: بدون بصل، عميل مميز..."
                className="h-8.5 text-xs rounded-md"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/50">
              <span className="font-semibold text-foreground">حالة العميل في النظام</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors ${
                  formData.is_active
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {formData.is_active ? "نشط" : "معطل"}
              </button>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="h-8 rounded-md text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="gap-1.5 bg-primary text-primary-foreground font-bold h-8 px-3 rounded-md text-xs shadow-xs"
              >
                {isSaving && <RefreshCwIcon className="size-3 animate-spin" />}
                <span>{editingCustomer ? "حفظ التعديلات" : "إضافة العميل"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد حذف العميل */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-sm rounded-xl p-5 bg-card border border-border/60 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-destructive flex items-center gap-1.5">
              <AlertCircleIcon className="size-4" />
              <span>تأكيد حذف العميل</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              هل أنت متأكد من حذف العميل{" "}
              <strong className="text-foreground">({customerToDelete?.name})</strong>؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs rounded-md">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="h-8 text-xs rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              نعم، حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* نافذة كشف الحساب والعمليات المالية للعميل */}
      <CustomerStatementDialog
        customer={customerForStatement}
        open={statementDialogOpen}
        onOpenChange={setStatementDialogOpen}
        onBalanceUpdated={() => fetchCustomers()}
      />
    </PageContainer>
  )
}
