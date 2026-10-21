"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import { useStaffStore } from "@/store/staff.store"
import { type StaffUser, type CreateStaffUserPayload, type UpdateStaffUserPayload } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  UsersIcon,
  UserPlusIcon,
  SearchIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ReceiptIcon,
  ChefHatIcon,
  KeyRoundIcon,
  Edit2Icon,
  Trash2Icon,
  MailIcon,
  UserIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Loader2Icon,
  EyeIcon,
  EyeOffIcon,
  DicesIcon,
  ClockIcon,
  TruckIcon,
} from "lucide-react"

// بيانات توضيحية للأدوار
const ROLES_INFO = {
  admin: {
    label: "مدير النظام",
    sublabel: "صلاحيات كاملة على كافة المبيعات والإعدادات والتقارير",
    icon: ShieldCheckIcon,
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    borderActive: "border-purple-500 bg-purple-500/5",
  },
  cashier: {
    label: "كاشير الصالة",
    sublabel: "إدارة الفواتير والطلبات، نقطة البيع POS، وسندات القبض",
    icon: ReceiptIcon,
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    borderActive: "border-blue-500 bg-blue-500/5",
  },
  kitchen: {
    label: "رئيس / طاقم المطبخ",
    sublabel: "شاشة المطبخ (KDS) لتحديث ومتابعة تذاكر تحضير الأطباق",
    icon: ChefHatIcon,
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    borderActive: "border-amber-500 bg-amber-500/5",
  },
  delivery: {
    label: "مسؤول التوصيل والديليفري",
    sublabel: "شاشة توجيه ومتابعة طلبات التوصيل وأسطول المناديب والتوريد",
    icon: TruckIcon,
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    borderActive: "border-emerald-500 bg-emerald-500/5",
  },
} as const

export default function StaffPage() {
  const {
    staffList,
    isLoading,
    isSaving,
    error,
    searchQuery,
    roleFilter,
    fetchStaff,
    createStaff,
    updateStaff,
    deleteStaff,
    setSearchQuery,
    setRoleFilter,
  } = useStaffStore()

  // حالة النوافذ
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [selectedStaff, setSelectedStaff] = React.useState<StaffUser | null>(null)

  // نموذج الإضافة
  const [newStaffData, setNewStaffData] = React.useState<CreateStaffUserPayload>({
    name: "",
    email: "",
    password: "",
    role: "cashier",
  })
  const [showNewPassword, setShowNewPassword] = React.useState(false)

  // نموذج التعديل
  const [editStaffData, setEditStaffData] = React.useState<UpdateStaffUserPayload>({
    name: "",
    email: "",
    password: "",
    role: "cashier",
  })
  const [showEditPassword, setShowEditPassword] = React.useState(false)

  // التنبيهات
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null)

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  React.useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  // فلترة الموظفين
  const filteredStaff = React.useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch =
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = roleFilter === "all" || staff.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [staffList, searchQuery, roleFilter])

  // إحصائيات سريعة
  const stats = React.useMemo(() => {
    const total = staffList.length
    const admins = staffList.filter((s) => s.role === "admin").length
    const cashiers = staffList.filter((s) => s.role === "cashier").length
    const kitchen = staffList.filter((s) => s.role === "kitchen").length
    const delivery = staffList.filter((s) => s.role === "delivery").length
    return { total, admins, cashiers, kitchen, delivery }
  }, [staffList])

  // توليد كلمة مرور عشوائية قوية
  const generateRandomPassword = (forEdit = false) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
    let pass = ""
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    if (forEdit) {
      setEditStaffData((prev) => ({ ...prev, password: pass }))
      setShowEditPassword(true)
    } else {
      setNewStaffData((prev) => ({ ...prev, password: pass }))
      setShowNewPassword(true)
    }
  }

  // فتح نافذة التعديل
  const openEditModal = (staff: StaffUser) => {
    if (staff.role === "admin") {
      showToast("حساب المدير العام محمي بالكامل ولا يمكن تعديل بياناته من قائمة الموظفين.", "error")
      return
    }
    setSelectedStaff(staff)
    setEditStaffData({
      name: staff.name,
      email: staff.email,
      password: "",
      role: staff.role,
    })
    setShowEditPassword(false)
    setEditDialogOpen(true)
  }

  // معالجة الإضافة
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStaffData.name.trim() || !newStaffData.email.trim() || !newStaffData.password) {
      showToast("يرجى ملء جميع الحقول المطلوبة.", "error")
      return
    }

    const res = await createStaff(newStaffData)
    if (res.success) {
      showToast(res.message, "success")
      setAddDialogOpen(false)
      setNewStaffData({ name: "", email: "", password: "", role: "cashier" })
      setShowNewPassword(false)
    } else {
      showToast(res.message, "error")
    }
  }

  // معالجة التعديل
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return
    if (!editStaffData.name.trim() || !editStaffData.email.trim()) {
      showToast("يرجى ملء اسم الموظف وبريده الإلكتروني.", "error")
      return
    }

    const payload: UpdateStaffUserPayload = {
      name: editStaffData.name,
      email: editStaffData.email,
      role: editStaffData.role,
    }
    if (editStaffData.password && editStaffData.password.trim().length > 0) {
      payload.password = editStaffData.password.trim()
    }

    const res = await updateStaff(selectedStaff.id, payload)
    if (res.success) {
      showToast(res.message, "success")
      setEditDialogOpen(false)
      setSelectedStaff(null)
    } else {
      showToast(res.message, "error")
    }
  }

  // معالجة الحذف
  const handleDeleteConfirm = async () => {
    if (!selectedStaff) return
    if (selectedStaff.role === "admin") {
      showToast("حساب المدير العام محمي بالكامل ولا يمكن حذفه نهائياً.", "error")
      setDeleteConfirmOpen(false)
      setSelectedStaff(null)
      return
    }
    const res = await deleteStaff(selectedStaff.id)
    if (res.success) {
      showToast(res.message, "success")
      setDeleteConfirmOpen(false)
      setSelectedStaff(null)
    } else {
      showToast(res.message, "error")
    }
  }

  return (
    <PageContainer
      title="الموظفون والصلاحيات"
      description="إدارة حسابات طاقم العمل، تحديد الأدوار (مدير، كاشير، مطبخ، دليفري)، وتعيين كلمات المرور"
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchStaff()}
            disabled={isLoading}
            className="h-8.5 rounded-lg text-xs gap-1.5"
            title="تحديث البيانات"
          >
            <RefreshCwIcon className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setNewStaffData({ name: "", email: "", password: "", role: "cashier" })
              setAddDialogOpen(true)
            }}
            className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlusIcon className="size-3.5" />
            <span>إضافة موظف</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* إشعار العملية المنبثق الموحد */}
        {toastMessage && (
          <div
            className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-lg border text-xs font-medium animate-in fade-in duration-150 ${
              toastMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/25 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 p-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* بطاقات الإحصائيات العلوية الموحدة */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UsersIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي طاقم العمل</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">{stats.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheckIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">المدراء (Admin)</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono">{stats.admins}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ReceiptIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">الكاشير (Cashier)</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">{stats.cashiers}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ChefHatIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">المطبخ (Kitchen)</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">{stats.kitchen}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs col-span-2 md:col-span-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TruckIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">التوصيل (Delivery)</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">{stats.delivery}</p>
            </div>
          </div>
        </div>

        {/* شريط البحث والفلترة الموحد */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="relative flex-1 w-full sm:max-w-md">
            <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="البحث بالاسم أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 bg-muted/40 rounded-lg text-xs h-8.5 border-border/60"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* تبويبات الفلترة حسب الدور */}
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/60 text-xs font-medium">
              <button
                type="button"
                onClick={() => setRoleFilter("all")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  roleFilter === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الكل ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("admin")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  roleFilter === "admin"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                المدراء ({stats.admins})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("cashier")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  roleFilter === "cashier"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الكاشير ({stats.cashiers})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("kitchen")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  roleFilter === "kitchen"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                المطبخ ({stats.kitchen})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("delivery")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  roleFilter === "delivery"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                التوصيل ({stats.delivery})
              </button>
            </div>
          </div>
        </div>

        {/* جدول الموظفين الموحد */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-right w-12">#</TableHead>
                <TableHead className="text-right">الموظف</TableHead>
                <TableHead className="text-right">البريد الإلكتروني</TableHead>
                <TableHead className="text-right">الدور / الصلاحية</TableHead>
                <TableHead className="text-right">تاريخ الإضافة</TableHead>
                <TableHead className="text-left w-28">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && staffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
                      <span>جاري تحميل بيانات الموظفين...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UsersIcon className="w-8 h-8 opacity-40" />
                      <p className="font-medium text-foreground">لا يوجد موظفون مطابقون</p>
                      <p className="text-xs">جرب البحث بكلمات أخرى أو اختر تبويباً مختلفاً.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((staff, index) => {
                  const roleConfig = ROLES_INFO[staff.role as keyof typeof ROLES_INFO] || {
                    label: staff.role,
                    badgeClass: "bg-muted text-muted-foreground",
                    icon: UserIcon,
                  }
                  const RoleIcon = roleConfig.icon

                  return (
                    <TableRow key={staff.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm">{staff.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">ID: #{staff.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <MailIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
                          <span>{staff.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1.5 px-2.5 py-1 text-xs font-medium border ${roleConfig.badgeClass}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          <span>{roleConfig.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
                          <span>
                            {staff.created_at
                              ? new Date(staff.created_at).toLocaleDateString("ar-EG", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "مسجل مسبقاً"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        {staff.role === "admin" ? (
                          <div
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-semibold select-none"
                            title="حساب المدير العام محمي بالكامل ولا يمكن تعديله أو حذفه من قائمة الموظفين"
                          >
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                            <span>حساب محمي</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(staff)}
                              title="تعديل الموظف وكلمة المرور"
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2Icon className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedStaff(staff)
                                setDeleteConfirmOpen(true)
                              }}
                              title="حذف الموظف"
                              className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* نافذة إضافة موظف جديد */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserPlusIcon className="w-5 h-5 text-primary" />
              <span>إضافة موظف جديد</span>
            </DialogTitle>
            <DialogDescription>
              أنشئ حساباً جديداً لطاقم العمل مع تحديد الصلاحيات المناسبة لدوره.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">اسم الموظف الكامل *</label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  placeholder="مثال: أحمد عبد الله"
                  value={newStaffData.name}
                  onChange={(e) => setNewStaffData({ ...newStaffData, name: e.target.value })}
                  className="pr-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">البريد الإلكتروني (لتسجيل الدخول) *</label>
              <div className="relative">
                <MailIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  placeholder="name@restro.com"
                  value={newStaffData.email}
                  onChange={(e) => setNewStaffData({ ...newStaffData, email: e.target.value })}
                  className="pr-9 font-mono text-sm"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">كلمة المرور *</label>
                <button
                  type="button"
                  onClick={() => generateRandomPassword(false)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <DicesIcon className="w-3.5 h-3.5" />
                  <span>توليد تلقائي</span>
                </button>
              </div>
              <div className="relative">
                <KeyRoundIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  type={showNewPassword ? "text" : "password"}
                  placeholder="أدخل كلمة مرور (6 أحرف فأكثر)"
                  value={newStaffData.password}
                  onChange={(e) => setNewStaffData({ ...newStaffData, password: e.target.value })}
                  className="pr-9 pl-9 font-mono text-sm"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">الدور / الصلاحية *</label>
              <div className="grid grid-cols-1 gap-2">
                {(["cashier", "kitchen", "delivery"] as const).map((r) => {
                  const roleConfig = ROLES_INFO[r]
                  const RoleIcon = roleConfig.icon
                  const isSelected = newStaffData.role === r
                  return (
                    <div
                      key={r}
                      onClick={() => setNewStaffData({ ...newStaffData, role: r })}
                      className={`cursor-pointer rounded-xl border p-3 flex items-start gap-3 transition-all ${
                        isSelected ? roleConfig.borderActive : "border-border/60 hover:border-border"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${roleConfig.badgeClass}`}>
                        <RoleIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{roleConfig.label}</span>
                          {isSelected && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">محدد</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{roleConfig.sublabel}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2Icon className="w-4 h-4 animate-spin ml-2" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ الموظف</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة تعديل موظف */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit2Icon className="w-5 h-5 text-primary" />
              <span>تعديل بيانات الموظف</span>
            </DialogTitle>
            <DialogDescription>
              تعديل الاسم، البريد، أو إعادة تعيين كلمة المرور للدور المحدد.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">اسم الموظف *</label>
              <div className="relative">
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  value={editStaffData.name}
                  onChange={(e) => setEditStaffData({ ...editStaffData, name: e.target.value })}
                  className="pr-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">البريد الإلكتروني *</label>
              <div className="relative">
                <MailIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  value={editStaffData.email}
                  onChange={(e) => setEditStaffData({ ...editStaffData, email: e.target.value })}
                  className="pr-9 font-mono text-sm"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  كلمة المرور الجديدة <span className="text-muted-foreground font-normal">(اتركها فارغة للإبقاء على الحالية)</span>
                </label>
                <button
                  type="button"
                  onClick={() => generateRandomPassword(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <DicesIcon className="w-3.5 h-3.5" />
                  <span>توليد تلقائي</span>
                </button>
              </div>
              <div className="relative">
                <KeyRoundIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showEditPassword ? "text" : "password"}
                  placeholder="أدخل كلمة مرور جديدة إذا أردت تغييرها"
                  value={editStaffData.password || ""}
                  onChange={(e) => setEditStaffData({ ...editStaffData, password: e.target.value })}
                  className="pr-9 pl-9 font-mono text-sm"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showEditPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">الدور / الصلاحية *</label>
              <div className="grid grid-cols-1 gap-2">
                {(["cashier", "kitchen", "delivery"] as const).map((r) => {
                  const roleConfig = ROLES_INFO[r]
                  const RoleIcon = roleConfig.icon
                  const isSelected = editStaffData.role === r
                  return (
                    <div
                      key={r}
                      onClick={() => setEditStaffData({ ...editStaffData, role: r })}
                      className={`cursor-pointer rounded-xl border p-3 flex items-start gap-3 transition-all ${
                        isSelected ? roleConfig.borderActive : "border-border/60 hover:border-border"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${roleConfig.badgeClass}`}>
                        <RoleIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{roleConfig.label}</span>
                          {isSelected && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">محدد</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{roleConfig.sublabel}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2Icon className="w-4 h-4 animate-spin ml-2" />
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <span>تحديث البيانات</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircleIcon className="w-5 h-5" />
              <span>تأكيد حذف الموظف</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف حساب الموظف{" "}
              <strong className="text-foreground">({selectedStaff?.name})</strong>؟ لن يتمكن من تسجيل الدخول إلى لوحة التحكم بعد الحذف.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={isSaving}
            >
              {isSaving ? "جاري الحذف..." : "نعم، حذف الحساب"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
