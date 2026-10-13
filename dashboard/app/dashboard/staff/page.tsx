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
    return { total, admins, cashiers, kitchen }
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
      description="إدارة حسابات طاقم العمل، تحديد الأدوار (مدير، كاشير، مطبخ)، وتعيين كلمات المرور."
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2Icon className="w-5 h-5" />
          ) : (
            <AlertCircleIcon className="w-5 h-5" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* بطاقات الإحصائيات العلوية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">إجمالي طاقم العمل</CardTitle>
            <UsersIcon className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">حسابات نشطة في النظام</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">المدراء (Admin)</CardTitle>
            <ShieldCheckIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.admins}</div>
            <p className="text-xs text-muted-foreground mt-1">صلاحية إدارية كاملة</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">الكاشير (Cashier)</CardTitle>
            <ReceiptIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.cashiers}</div>
            <p className="text-xs text-muted-foreground mt-1">نقطة البيع والتحصيل</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">المطبخ (Kitchen)</CardTitle>
            <ChefHatIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.kitchen}</div>
            <p className="text-xs text-muted-foreground mt-1">شاشة المطبخ KDS</p>
          </CardContent>
        </Card>
      </div>

      {/* شريط الإجراءات والبحث */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="البحث بالاسم أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-10"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchStaff()}
            disabled={isLoading}
            title="تحديث البيانات"
            className="h-10 w-10 shrink-0"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* تبويبات الفلترة حسب الدور */}
          <div className="flex bg-muted p-1 rounded-lg border border-border/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-md transition-all ${
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
              className={`px-3 py-1.5 rounded-md transition-all ${
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
              className={`px-3 py-1.5 rounded-md transition-all ${
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
              className={`px-3 py-1.5 rounded-md transition-all ${
                roleFilter === "kitchen"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المطبخ ({stats.kitchen})
            </button>
          </div>

          <Button
            onClick={() => {
              setNewStaffData({ name: "", email: "", password: "", role: "cashier" })
              setAddDialogOpen(true)
            }}
            className="h-10 gap-2 shrink-0"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>إضافة موظف</span>
          </Button>
        </div>
      </div>

      {/* جدول الموظفين */}
      <Card className="border-border/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(staff)}
                            title="تعديل الموظف وكلمة المرور"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2Icon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedStaff(staff)
                              setDeleteConfirmOpen(true)
                            }}
                            title="حذف الموظف"
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2Icon className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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
                {(["admin", "cashier", "kitchen"] as const).map((r) => {
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
                {(["admin", "cashier", "kitchen"] as const).map((r) => {
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
