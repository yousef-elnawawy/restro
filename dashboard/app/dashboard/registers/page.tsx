"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useRegisterStore } from "@/store/register.store"
import { useFinancialStore } from "@/store/financial.store"
import { useSettingStore } from "@/store/setting.store"
import { useAuthStore } from "@/store/auth.store"
import { type CashRegister, type CashRegisterPayload, type FinancialTransaction } from "@/lib/api"
import { VoucherDialog } from "@/components/voucher-dialog"
import { RegisterStatementDialog } from "@/components/register-statement-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ComboboxSelect } from "@/components/ui/combobox-select"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
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
  LandmarkIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  CoinsIcon,
  Edit2Icon,
  Trash2Icon,
  ShieldCheckIcon,
  ReceiptIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ShoppingBagIcon,
  CalendarIcon,
  CreditCardIcon,
  FilterIcon,
  XIcon,
} from "lucide-react"

export default function RegistersPage() {
  const {
    registers,
    isLoading: isRegisterLoading,
    isSaving,
    error: registerError,
    searchQuery: registerSearch,
    statusFilter,
    fetchRegisters,
    createRegister,
    updateRegister,
    deleteRegister,
    toggleRegisterActive,
    setSearchQuery: setRegisterSearch,
    setStatusFilter,
  } = useRegisterStore()

  const {
    transactions,
    summary: financialSummary,
    isLoading: isFinancialLoading,
    typeFilter,
    registerFilter,
    searchQuery: financialSearch,
    fetchTransactions,
    deleteTransaction,
    setTypeFilter,
    setRegisterFilter,
    setSearchQuery: setFinancialSearch,
  } = useFinancialStore()

  const { settings, fetchSettings } = useSettingStore()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === "admin"
  const [mounted, setMounted] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"registers" | "vouchers">("registers")

  React.useEffect(() => {
    setMounted(true)
    fetchRegisters()
    fetchTransactions()
    fetchSettings()
  }, [fetchRegisters, fetchTransactions, fetchSettings])

  const currency = settings?.currency || "ج.م"

  // نافذة إضافة / تعديل الخزنة
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingRegister, setEditingRegister] = React.useState<CashRegister | null>(null)
  const [formData, setFormData] = React.useState<CashRegisterPayload>({
    name: "",
    opening_balance: 0,
    notes: "",
    is_active: true,
  })
  const [formError, setFormError] = React.useState<string | null>(null)

  // نافذة كشف حساب الخزنة
  const [statementOpen, setStatementOpen] = React.useState(false)
  const [statementRegisterId, setStatementRegisterId] = React.useState<number | null>(null)

  const handleOpenStatement = (regId: number) => {
    setStatementRegisterId(regId)
    setStatementOpen(true)
  }

  // نافذة تأكيد حذف الخزنة
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [registerToDelete, setRegisterToDelete] = React.useState<CashRegister | null>(null)

  // نافذة إصدار السندات (قبض / دفع / مصاريف)
  const [voucherDialogOpen, setVoucherDialogOpen] = React.useState(false)
  const [voucherInitialType, setVoucherInitialType] = React.useState<"receipt" | "payment" | "expense">("expense")

  // نافذة تأكيد حذف سند مالي
  const [voucherDeleteOpen, setVoucherDeleteOpen] = React.useState(false)
  const [voucherToDelete, setVoucherToDelete] = React.useState<FinancialTransaction | null>(null)
  const [isDeletingVoucher, setIsDeletingVoucher] = React.useState(false)

  // إشعار العملية
  const [bannerMessage, setBannerMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMessage({ type, text })
    setTimeout(() => setBannerMessage(null), 4000)
  }

  const handleOpenVoucher = (type: "receipt" | "payment" | "expense") => {
    setVoucherInitialType(type)
    setVoucherDialogOpen(true)
  }

  // فلترة الخزائن
  const filteredRegisters = React.useMemo(() => {
    return registers.filter((r) => {
      if (statusFilter === "active" && !r.is_active) return false
      if (statusFilter === "inactive" && r.is_active) return false
      if (registerSearch.trim()) {
        const q = registerSearch.trim().toLowerCase()
        const matchName = r.name.toLowerCase().includes(q)
        const matchNotes = r.notes?.toLowerCase().includes(q)
        if (!matchName && !matchNotes) return false
      }
      return true
    })
  }, [registers, statusFilter, registerSearch])

  // حساب إجمالي أرصدة الخزائن
  const totalBalance = registers.reduce((sum, r) => sum + Number(r.balance || 0), 0)
  const activeCount = registers.filter((r) => r.is_active).length

  // فتح نافذة إضافة خزنة
  const handleOpenCreateRegister = () => {
    if (!isAdmin) {
      showBanner("عفواً، إضافة الخزائن المالية مخصصة لمدير النظام فقط.", "error")
      return
    }
    setEditingRegister(null)
    setFormData({
      name: "",
      opening_balance: 0,
      notes: "",
      is_active: true,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // فتح نافذة تعديل خزنة
  const handleOpenEditRegister = (reg: CashRegister) => {
    if (!isAdmin) {
      showBanner("عفواً، تعديل بيانات الخزائن مخصص لمدير النظام فقط.", "error")
      return
    }
    setEditingRegister(reg)
    setFormData({
      name: reg.name,
      opening_balance: Number(reg.opening_balance || 0),
      notes: reg.notes || "",
      is_active: reg.is_active,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  // حفظ الخزنة
  const handleSaveRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!isAdmin) {
      setFormError("ليس لديك صلاحية لتنفيذ هذا الإجراء. إدارة الخزائن مخصصة لمدير النظام فقط.")
      return
    }

    if (!formData.name.trim()) {
      setFormError("يرجى إدخال اسم الخزنة.")
      return
    }

    if (editingRegister) {
      const res = await updateRegister(editingRegister.id, formData)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    } else {
      const res = await createRegister(formData)
      if (res.success) {
        setDialogOpen(false)
        showBanner(res.message, "success")
      } else {
        setFormError(res.message)
      }
    }
  }

  // حذف خزنة
  const handleOpenDeleteRegister = (reg: CashRegister) => {
    if (!isAdmin) {
      showBanner("عفواً، حذف الخزائن مخصص لمدير النظام فقط.", "error")
      return
    }
    if (reg.is_default) {
      showBanner("لا يمكن حذف الخزنة الرئيسية الافتراضية للنظام.", "error")
      return
    }
    setRegisterToDelete(reg)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDeleteRegister = async () => {
    if (!isAdmin) {
      showBanner("عفواً، حذف الخزائن مخصص لمدير النظام فقط.", "error")
      return
    }
    if (!registerToDelete) return
    const res = await deleteRegister(registerToDelete.id)
    setDeleteConfirmOpen(false)
    setRegisterToDelete(null)
    if (res.success) {
      showBanner(res.message, "success")
    } else {
      showBanner(res.message, "error")
    }
  }

  // تبديل تفعيل الخزنة
  const handleToggleRegister = async (reg: CashRegister) => {
    if (!isAdmin) {
      showBanner("عفواً، تغيير حالة الخزنة مخصص لمدير النظام فقط.", "error")
      return
    }
    const res = await toggleRegisterActive(reg.id)
    if (res.success) {
      showBanner(res.message, "success")
    } else {
      showBanner(res.message, "error")
    }
  }

  // حذف سند مالي
  const handleConfirmDeleteVoucher = async () => {
    if (!voucherToDelete) return
    setIsDeletingVoucher(true)
    const res = await deleteTransaction(voucherToDelete.id)
    setIsDeletingVoucher(false)
    setVoucherDeleteOpen(false)
    setVoucherToDelete(null)

    if (res.success) {
      fetchRegisters()
      showBanner(res.message, "success")
    } else {
      showBanner(res.message, "error")
    }
  }

  return (
    <PageContainer
      title="الخزائن المالية والسندات"
      description="متابعة الخزائن النقدية، إصدار سندات القبض والدفع، وتسجيل المصروفات التشغيلية"
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenVoucher("receipt")}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            title="إصدار سند قبض نقدية"
          >
            <ArrowDownLeftIcon className="size-3.5" />
            <span>سند قبض</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenVoucher("payment")}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-sky-600 hover:bg-sky-700 text-white"
            title="إصدار سند صرف / دفع نقدية"
          >
            <ArrowUpRightIcon className="size-3.5" />
            <span>سند صرف</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenVoucher("expense")}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-amber-600 hover:bg-amber-700 text-white"
            title="تسجيل سند مصاريف تشغيلية"
          >
            <ShoppingBagIcon className="size-3.5" />
            <span>سند مصاريف</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchRegisters()
              fetchTransactions()
            }}
            disabled={isRegisterLoading || isFinancialLoading}
            className="h-8.5 rounded-lg text-xs gap-1.5"
            title="تحديث البيانات"
          >
            <RefreshCwIcon className={`size-3.5 ${isRegisterLoading || isFinancialLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              onClick={handleOpenCreateRegister}
              className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <PlusIcon className="size-3.5" />
              <span>خزنة جديدة</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* إشعار العملية المنبثق */}
        {bannerMessage && (
          <div
            className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-lg border text-xs font-medium animate-in fade-in duration-150 ${
              bannerMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/25 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0 text-destructive" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )}

        {/* شريط التبويبات الرئيسي الموحد */}
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border/60 text-xs font-medium w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("registers")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer font-semibold ${
              activeTab === "registers"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LandmarkIcon className="size-3.5" />
            <span>الخزائن المالية ({registers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("vouchers")
              fetchTransactions()
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer font-semibold ${
              activeTab === "vouchers"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ReceiptIcon className="size-3.5" />
            <span>السندات والمصاريف ({transactions.length})</span>
          </button>
        </div>

        {/* =====================================================================
            التبويب الأول: الخزائن المالية (الأرصدة)
            ===================================================================== */}
        {activeTab === "registers" && (
          <div className="space-y-3 sm:space-y-3.5">
            {/* كروت الإحصائيات العلوية */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LandmarkIcon className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate font-medium">إجمالي السيولة النقدية</p>
                  <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                    {totalBalance.toLocaleString("ar-EG")}{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">{currency}</span>
                  </p>
                </div>
              </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CoinsIcon className="size-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">الخزائن النشطة</p>
                <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {activeCount} <span className="text-xs font-normal text-muted-foreground">خزنة تعمل</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
              <div className="flex size-9 sm:size-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <ShieldCheckIcon className="size-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">الخزنة الافتراضية</p>
                <p className="text-sm font-bold tracking-tight text-foreground truncate max-w-[180px]">
                  {registers.find((r) => r.is_default)?.name || "غير محددة"}
                </p>
              </div>
            </div>
          </div>

          {/* شريط الفلترة والبحث */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={registerSearch}
                onChange={(e) => setRegisterSearch(e.target.value)}
                placeholder="البحث باسم الخزنة أو الملاحظات..."
                className="h-8.5 pr-8 pl-3 text-xs rounded-md bg-card"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="xs"
                onClick={() => setStatusFilter("all")}
                className="text-xs"
              >
                الكل ({registers.length})
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="xs"
                onClick={() => setStatusFilter("active")}
                className="text-xs"
              >
                النشطة ({registers.filter((r) => r.is_active).length})
              </Button>
              <Button
                variant={statusFilter === "inactive" ? "default" : "outline"}
                size="xs"
                onClick={() => setStatusFilter("inactive")}
                className="text-xs"
              >
                المعطلة ({registers.filter((r) => !r.is_active).length})
              </Button>
            </div>
          </div>

          {/* شبكة كروت الخزائن */}
          {isRegisterLoading && registers.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              <RefreshCwIcon className="size-6 animate-spin mx-auto mb-2 text-primary" />
              <span>جارٍ تحميل بيانات الخزائن...</span>
            </div>
          ) : filteredRegisters.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground bg-card border border-border/60 rounded-lg">
              لا توجد خزائن مطابقة لبحثك.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredRegisters.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-xl border border-border/60 bg-card p-3.5 flex flex-col justify-between space-y-2.5 shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-foreground">{reg.name}</span>
                        {reg.is_default && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                            افتراضية
                          </span>
                        )}
                      </div>
                      {reg.notes && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{reg.notes}</p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleOpenEditRegister(reg)}
                          className="size-7 text-muted-foreground hover:text-foreground"
                          title="تعديل"
                        >
                          <Edit2Icon className="size-3.5" />
                        </Button>
                        {!reg.is_default && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleOpenDeleteRegister(reg)}
                            className="size-7 text-muted-foreground hover:text-destructive"
                            title="حذف"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* تفاصيل الأرصدة (رصيد أول المدة + الرصيد الفعلي الحالي) */}
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground pb-1 border-b border-border/40">
                      <span className="text-[11px] font-medium">رصيد أول المدة (افتتاحي):</span>
                      <span className="font-mono font-bold text-foreground">
                        {Number(reg.opening_balance || 0).toLocaleString("ar-EG")}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">{currency}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs font-bold text-primary">الرصيد الفعلي الحالي:</span>
                      <span className="font-mono font-black text-base text-primary">
                        {Number(reg.balance).toLocaleString("ar-EG")}{" "}
                        <span className="text-xs font-normal text-primary/80">{currency}</span>
                      </span>
                    </div>
                  </div>

                  {/* زر عرض كشف الحساب التفصيلي */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenStatement(reg.id)}
                    className="w-full h-8.5 rounded-lg text-xs gap-1.5 font-bold border-border/70 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <ReceiptIcon className="size-3.5 text-primary" />
                    <span>عرض كشف حساب الخزنة</span>
                  </Button>

                  {/* أزرار الإجراءات السريعة للخزنة */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleToggleRegister(reg)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                        title="تغيير حالة تفعيل الخزنة"
                      >
                        {reg.is_active ? (
                          <>
                            <ToggleRightIcon className="size-4 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">نشطة</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeftIcon className="size-4 text-muted-foreground" />
                            <span>معطلة</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px]">
                        {reg.is_active ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            نشطة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-muted-foreground" />
                            معطلة
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setVoucherInitialType("receipt")
                          setVoucherDialogOpen(true)
                        }}
                        className="h-7 text-[11px] px-2 gap-1 font-bold text-emerald-600 dark:text-emerald-400 rounded-lg"
                        title="قبض بالخزنة"
                      >
                        + قبض
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setVoucherInitialType("expense")
                          setVoucherDialogOpen(true)
                        }}
                        className="h-7 text-[11px] px-2 gap-1 font-bold text-amber-600 dark:text-amber-400 rounded-lg"
                        title="مصروفات من الخزنة"
                      >
                        - صرف
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          التبويب الثاني: السندات والمصاريف (سجل المعاملات)
          ===================================================================== */}
      {activeTab === "vouchers" && (
        <div className="space-y-4">
          {/* كروت ملخص السندات والمصاريف */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* إجمالي المقبوضات */}
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex flex-col justify-between">
              <div className="text-[11px] font-medium flex items-center justify-between">
                <span>سندات القبض</span>
                <ArrowDownLeftIcon className="size-3.5" />
              </div>
              <div className="mt-1 font-mono font-bold text-base sm:text-lg">
                {Number(financialSummary.total_receipts || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[11px] font-normal">{currency}</span>
              </div>
              <div className="text-[10px] font-semibold mt-0.5 opacity-80">إيداعات وتحصيلات</div>
            </div>

            {/* إجمالي سندات الصرف */}
            <div className="p-3 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400 flex flex-col justify-between">
              <div className="text-[11px] font-medium flex items-center justify-between">
                <span>سندات الصرف</span>
                <ArrowUpRightIcon className="size-3.5" />
              </div>
              <div className="mt-1 font-mono font-bold text-base sm:text-lg">
                {Number(financialSummary.total_payments || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[11px] font-normal">{currency}</span>
              </div>
              <div className="text-[10px] font-semibold mt-0.5 opacity-80">صرف ورد مبالغ للعملاء</div>
            </div>

            {/* إجمالي المصروفات */}
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex flex-col justify-between">
              <div className="text-[11px] font-medium flex items-center justify-between">
                <span>المصاريف التشغيلية</span>
                <ShoppingBagIcon className="size-3.5" />
              </div>
              <div className="mt-1 font-mono font-bold text-base sm:text-lg">
                {Number(financialSummary.total_expenses || 0).toLocaleString("ar-EG")}{" "}
                <span className="text-[11px] font-normal">{currency}</span>
              </div>
              <div className="text-[10px] font-semibold mt-0.5 opacity-80">كهرباء، رواتب، خامات...</div>
            </div>

            {/* صافي الحركة */}
            <div className={`p-3 rounded-lg border flex flex-col justify-between ${
              financialSummary.net_flow >= 0
                ? "bg-card border-border/60 text-foreground"
                : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
            }`}>
              <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                <span>صافي التدفق</span>
                <CoinsIcon className="size-3.5 text-primary" />
              </div>
              <div className="mt-1 font-mono font-bold text-base sm:text-lg text-foreground">
                {financialSummary.net_flow.toLocaleString("ar-EG")}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">{currency}</span>
              </div>
              <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                {financialSummary.net_flow >= 0 ? "فائض نقدية موجب" : "عجز نقدي"}
              </div>
            </div>
          </div>

          {/* شريط الفلاتر والإجراءات السريعة */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-card p-3 rounded-lg border border-border/60">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                size="xs"
                onClick={() => setTypeFilter("all")}
                className="text-xs"
              >
                الكل
              </Button>
              <Button
                variant={typeFilter === "receipt" ? "default" : "outline"}
                size="xs"
                onClick={() => setTypeFilter("receipt")}
                className="text-xs text-emerald-600 dark:text-emerald-400"
              >
                سندات قبض
              </Button>
              <Button
                variant={typeFilter === "payment" ? "default" : "outline"}
                size="xs"
                onClick={() => setTypeFilter("payment")}
                className="text-xs text-sky-600 dark:text-sky-400"
              >
                سندات صرف
              </Button>
              <Button
                variant={typeFilter === "expense" ? "default" : "outline"}
                size="xs"
                onClick={() => setTypeFilter("expense")}
                className="text-xs text-amber-600 dark:text-amber-400"
              >
                مصاريف
              </Button>

              <div className="w-52">
                <ComboboxSelect
                  options={[
                    { value: "all", label: "كل الخزائن" },
                    ...registers.map((r) => ({
                      value: String(r.id),
                      label: r.name,
                      badge: `${Number(r.balance || 0).toLocaleString("ar-EG")} ${currency}`,
                      badgeVariant: r.is_active ? ("outline" as const) : ("secondary" as const),
                    })),
                  ]}
                  value={String(registerFilter)}
                  onValueChange={(val) => setRegisterFilter(val === "all" ? "all" : Number(val))}
                  placeholder="اختر الخزينة..."
                  searchPlaceholder="بحث في الخزائن..."
                />
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={financialSearch}
                onChange={(e) => setFinancialSearch(e.target.value)}
                placeholder="بحث برقم السند، البيان، المستلم..."
                className="h-8 pr-8 pl-3 text-xs rounded-md"
              />
            </div>
          </div>

          {/* جدول السندات والمعاملات المالية */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            {isFinancialLoading && transactions.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                <RefreshCwIcon className="size-6 animate-spin mx-auto mb-2 text-primary" />
                <span>جارٍ تحميل السندات المالية...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                لا توجد سندات مالية مسجلة حالياً. استخدم الأزرار أعلاه لإصدار سند قبض أو دفع أو مصاريف.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-start w-28">رقم السند</TableHead>
                      <TableHead className="text-start">النوع</TableHead>
                      <TableHead className="text-start">الخزنة</TableHead>
                      <TableHead className="text-center font-bold">المبلغ</TableHead>
                      <TableHead className="text-center">طريقة الدفع</TableHead>
                      <TableHead className="text-start">البيان والتصنيف</TableHead>
                      <TableHead className="text-start">العميل المستفيد</TableHead>
                      <TableHead className="text-center w-24">التاريخ</TableHead>
                      <TableHead className="text-center w-16">{isAdmin ? "إجراء" : ""}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="text-xs hover:bg-muted/30 transition-colors">
                        <TableCell className="p-2.5 font-mono font-bold">
                          {tx.voucher_number}
                        </TableCell>

                        <TableCell className="p-2.5">
                          {tx.transaction_type === "receipt" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <ArrowDownLeftIcon className="size-2.5" />
                              قبض
                            </span>
                          ) : tx.transaction_type === "payment" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                              <ArrowUpRightIcon className="size-2.5" />
                              صرف
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              <ShoppingBagIcon className="size-2.5" />
                              مصاريف
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="p-2.5 font-medium text-foreground">
                          {tx.cash_register?.name || "خزنة محذوفة"}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono font-bold">
                          <span
                            className={
                              tx.transaction_type === "receipt"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {tx.transaction_type === "receipt" ? "+" : "-"}
                            {Number(tx.amount).toLocaleString("ar-EG")} {currency}
                          </span>
                        </TableCell>

                        <TableCell className="p-2.5 text-center">
                          {tx.transaction_type === "expense" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted/60 text-foreground">
                              {tx.payment_method === "cash"
                                ? "كاش"
                                : tx.payment_method === "card"
                                ? "بطاقة"
                                : "تحويل"}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="p-2.5 max-w-xs">
                          <div className="space-y-0.5">
                            {tx.category && (
                              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded block w-fit">
                                {tx.category}
                              </span>
                            )}
                            <div className="text-foreground truncate">{tx.description || "بدون بيان"}</div>
                          </div>
                        </TableCell>

                        <TableCell className="p-2.5 text-muted-foreground truncate max-w-xs">
                          {tx.transaction_type === "expense" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : tx.customer ? (
                            <span className="font-semibold text-primary">{tx.customer.name}</span>
                          ) : (
                            tx.recipient_or_payer || "-"
                          )}
                        </TableCell>

                        <TableCell className="p-2.5 text-center font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {tx.date}
                        </TableCell>

                        <TableCell className="p-2.5 text-center">
                          {isAdmin ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => {
                                setVoucherToDelete(tx)
                                setVoucherDeleteOpen(true)
                              }}
                              className="size-7 text-muted-foreground hover:text-destructive"
                              title="حذف السند وإلغاء أثره المالي"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground/30 text-[11px]">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* نافذة إضافة / تعديل الخزنة */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingRegister ? "تعديل بيانات الخزنة" : "إضافة خزنة مالية جديدة"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل اسم الخزنة ورصيدها الأولي للبدء في تتبع عمليات الصندوق.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRegister} className="space-y-3 py-1 text-xs">
            {formError && (
              <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-1.5">
                <AlertCircleIcon className="size-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* تنبيه رصيد الخزنة الفعلي عند التعديل */}
            {editingRegister && (
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs flex items-center justify-between">
                <span className="text-muted-foreground font-medium">الرصيد الفعلي المتوفر حالياً:</span>
                <span className="font-mono font-black text-sm text-primary">
                  {Number(editingRegister.balance).toLocaleString("ar-EG")} {currency}
                </span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                اسم الخزنة <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: الخزنة الرئيسية، خزنة الكاشير 1..."
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>رصيد أول المدة (الافتتاحي) ({currency})</span>
                <span className="text-[10px] text-muted-foreground font-normal">قيمة ابتدائية ثابتة</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.opening_balance ?? 0}
                onChange={(e) => setFormData({ ...formData, opening_balance: Number(e.target.value) })}
                className="h-9 text-xs rounded-xl font-mono font-bold"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed pt-0.5">
                💡 رصيد أول المدة لا يتغير مع عمليات البيع والمصروفات. في حال تعديله، يُضاف الفارق أو يُخصم من الرصيد الحالي مع الحفاظ على جميع السندات المسجلة.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">ملاحظات</label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="موقع الخزنة، المسؤول عنها، أو تفاصيل أخرى..."
                className="text-xs min-h-[60px] resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:space-x-reverse pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="rounded-md text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary text-primary-foreground font-semibold rounded-md text-xs"
              >
                {isSaving ? "جاري الحفظ..." : editingRegister ? "تحديث الخزنة" : "إضافة الخزنة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد حذف الخزنة */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 text-right shadow-xl">
          <AlertDialogHeader className="text-right space-y-1">
            <AlertDialogTitle className="text-base font-bold text-destructive">
              هل أنت متأكد من حذف هذه الخزنة؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              سيتم حذف بيانات ({registerToDelete?.name}) نهائياً إذا لم تكن مرتبطة بعمليات سابقة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-reverse pt-3">
            <AlertDialogCancel className="rounded-md text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteRegister}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md text-xs font-semibold"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* نافذة إصدار سند مالي (قبض / دفع / مصاريف) */}
      <VoucherDialog
        open={voucherDialogOpen}
        onOpenChange={setVoucherDialogOpen}
        initialType={voucherInitialType}
        registers={registers}
        onSuccess={(msg) => {
          showBanner(msg, "success")
          fetchRegisters()
          fetchTransactions()
        }}
      />

      {/* نافذة تأكيد حذف سند مالي */}
      <AlertDialog open={voucherDeleteOpen} onOpenChange={setVoucherDeleteOpen}>
        <AlertDialogContent className="max-w-md rounded-xl p-5 bg-card border border-border/60 text-right shadow-xl">
          <AlertDialogHeader className="text-right space-y-1">
            <AlertDialogTitle className="text-base font-bold text-destructive">
              تأكيد حذف السند المالي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              هل أنت متأكد من حذف السند ({voucherToDelete?.voucher_number}) بمبلغ{" "}
              {voucherToDelete?.amount} {currency}؟ سيتم التراجع عن أثره المالي وإرجاع رصيد الخزنة وحساب العميل تلقائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-reverse pt-3">
            <AlertDialogCancel className="rounded-md text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteVoucher}
              disabled={isDeletingVoucher}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md text-xs font-semibold"
            >
              {isDeletingVoucher ? "جارٍ الحذف..." : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* نافذة كشف حساب الخزنة التفصيلي */}
      <RegisterStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        registerId={statementRegisterId}
      />
    </PageContainer>
  )
}
