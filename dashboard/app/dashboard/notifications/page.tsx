"use client"

import * as React from "react"
import Link from "next/link"
import { PageContainer } from "@/components/page-container"
import { useOrderStore } from "@/store/order.store"
import { useTableStore } from "@/store/table.store"
import { useRegisterStore } from "@/store/register.store"
import { useDeliveryDriverStore } from "@/store/delivery-driver.store"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "cn"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BellIcon,
  ShoppingBagIcon,
  ArmchairIcon,
  LandmarkIcon,
  TruckIcon,
  CheckCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  Trash2Icon,
  SparklesIcon,
  RefreshCwIcon,
} from "lucide-react"

interface SystemNotification {
  id: string
  title: string
  description: string
  type: "order" | "table" | "register" | "delivery" | "system"
  time: string
  unread: boolean
  link?: string
  linkText?: string
}

export default function NotificationsPage() {
  const { orders, fetchOrders } = useOrderStore()
  const { tables, fetchTables } = useTableStore()
  const { registers, fetchRegisters } = useRegisterStore()
  const { drivers, fetchDrivers } = useDeliveryDriverStore()

  const [activeTab, setActiveTab] = React.useState<string>("all")
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    fetchOrders()
    fetchTables()
    fetchRegisters()
    fetchDrivers()
  }, [fetchOrders, fetchTables, fetchRegisters, fetchDrivers])

  // بناء الإشعارات اللحظية من واقع بيانات النظام
  const notifications = React.useMemo<SystemNotification[]>(() => {
    const list: SystemNotification[] = []

    // 1. إشعارات الطلبات الجديدة وقيد التجهيز
    orders
      .filter((o) => ["pending", "preparing"].includes(o.status))
      .slice(0, 5)
      .forEach((ord) => {
        list.push({
          id: `order-${ord.id}`,
          title: ord.status === "pending" ? `طلب جديد بحاجة للتأكيد (#${ord.order_number})` : `طلب قيد التحضير (#${ord.order_number})`,
          description: `النوع: ${ord.order_type === "dinein" ? "صالة" : ord.order_type === "delivery" ? "توصيل" : "استلام"} • الإجمالي: ${ord.total} • العميل: ${ord.customer_name || "زبون عادي"}`,
          type: "order",
          time: new Date(ord.created_at || Date.now()).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          unread: !readIds.has(`order-${ord.id}`),
          link: `/dashboard/orders`,
          linkText: "معاينة الطلب",
        })
      })

    // 2. إشعارات الطاولات المشغولة
    tables
      .filter((t) => t.status === "occupied")
      .slice(0, 4)
      .forEach((tbl) => {
        list.push({
          id: `table-${tbl.id}`,
          title: `طاولة مشغولة بالصالة: ${tbl.name}`,
          description: `سعة الطاولة ${tbl.capacity} أفراد • مسجلة كطاولة نشطة في الصالة`,
          type: "table",
          time: "الآن",
          unread: !readIds.has(`table-${tbl.id}`),
          link: `/dashboard/pos?tableId=${tbl.id}`,
          linkText: "فتح الفاتورة",
        })
      })

    // 3. إشعارات المناديب قيد التوصيل
    drivers
      .filter((d) => d.status === "on_delivery")
      .forEach((drv) => {
        list.push({
          id: `driver-${drv.id}`,
          title: `المندوب ${drv.name} خرج لتسليم طلب`,
          description: `المركبة: ${drv.vehicle_type} • هاتف: ${drv.phone}`,
          type: "delivery",
          time: "جارٍ التوصيل",
          unread: !readIds.has(`driver-${drv.id}`),
          link: `/dashboard/delivery`,
          linkText: "حالة المناديب",
        })
      })

    // 4. إشعارات الخزائن
    registers.forEach((reg) => {
      list.push({
        id: `reg-${reg.id}`,
        title: `حالة الخزنة: ${reg.name}`,
        description: `الرصيد الفعلي الحالي: ${Number(reg.balance).toLocaleString()} • ${reg.is_default ? "خزنة افتراضية" : "خزنة فرعية"}`,
        type: "register",
        time: "تحديث لحظي",
        unread: !readIds.has(`reg-${reg.id}`),
        link: `/dashboard/registers`,
        linkText: "عرض الخزنة",
      })
    })

    return list
  }, [orders, tables, drivers, registers, readIds])

  const filteredNotifications = React.useMemo(() => {
    if (activeTab === "all") return notifications
    return notifications.filter((n) => n.type === activeTab)
  }, [notifications, activeTab])

  const markAllAsRead = () => {
    const all = new Set<string>(notifications.map((n) => n.id))
    setReadIds(all)
  }

  const markSingleAsRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]))
  }

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <PageContainer
      title="مركز الإشعارات والتنبيهات"
      description="متابعة فورية لتنبيهات الطلبات، إشغال الطاولات، أسطول التوصيل، وحركة الخزائن المالية"
      action={
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="h-8.5 rounded-lg text-xs gap-1.5 border-border/60"
            >
              <CheckCheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>تحديد الكل كمقروء</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOrders()
              fetchTables()
              fetchRegisters()
              fetchDrivers()
            }}
            className="h-8.5 rounded-lg text-xs gap-1.5"
            title="تحديث الإشعارات"
          >
            <RefreshCwIcon className="size-3.5 text-muted-foreground" />
            <span>تحديث</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* بطاقات الإحصائيات العلوية */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BellIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">إجمالي التنبيهات</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                {notifications.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertCircleIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">غير مقروءة</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
                {unreadCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShoppingBagIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">تنبيهات الطلبات</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                {notifications.filter((n) => n.type === "order").length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TruckIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">التوصيل والصالة</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                {notifications.filter((n) => n.type === "delivery" || n.type === "table").length}
              </p>
            </div>
          </div>
        </div>

        {/* شريط فلترة الإشعارات */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-muted/50 p-1 rounded-lg h-8.5 flex-wrap sm:flex-nowrap border border-border/60">
              <TabsTrigger value="all" className="rounded-md gap-1.5 text-xs font-semibold h-6.5 px-2.5">
                <BellIcon className="size-3" />
                <span>الكل ({notifications.length})</span>
              </TabsTrigger>
              <TabsTrigger value="order" className="rounded-md gap-1.5 text-xs font-semibold h-6.5 px-2.5">
                <ShoppingBagIcon className="size-3 text-primary" />
                <span>الطلبات</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="rounded-md gap-1.5 text-xs font-semibold h-6.5 px-2.5">
                <ArmchairIcon className="size-3 text-blue-500" />
                <span>الصالة</span>
              </TabsTrigger>
              <TabsTrigger value="delivery" className="rounded-md gap-1.5 text-xs font-semibold h-6.5 px-2.5">
                <TruckIcon className="size-3 text-emerald-500" />
                <span>التوصيل</span>
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-md gap-1.5 text-xs font-semibold h-6.5 px-2.5">
                <LandmarkIcon className="size-3 text-amber-500" />
                <span>الخزائن</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-xs font-medium px-1">
            {unreadCount > 0 ? (
              <span className="text-primary font-bold">{unreadCount} إشعار جديد بحاجة للمتابعة</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">جميع التنبيهات مقروءة ومحدثة ✓</span>
            )}
          </div>
        </div>

      {/* قائمة الإشعارات */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => {
            const Icon =
              notif.type === "order"
                ? ShoppingBagIcon
                : notif.type === "table"
                ? ArmchairIcon
                : notif.type === "delivery"
                ? TruckIcon
                : notif.type === "register"
                ? LandmarkIcon
                : BellIcon

            const colorBg =
              notif.type === "order"
                ? "bg-primary/10 text-primary"
                : notif.type === "table"
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : notif.type === "delivery"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"

            return (
              <Card
                key={notif.id}
                className={`p-3.5 sm:p-4 rounded-xl transition-all border ${
                  notif.unread
                    ? "bg-card border-primary/30 shadow-xs"
                    : "bg-card/50 border-border/40 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${colorBg}`}>
                      <Icon className="size-4.5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{notif.title}</span>
                        {notif.unread && (
                          <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px] px-1.5 py-0 border-0">
                            جديد
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{notif.description}</p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground/80 font-mono">
                        <ClockIcon className="size-3" />
                        <span>{notif.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {notif.link && (
                      <Link
                        href={notif.link}
                        onClick={() => markSingleAsRead(notif.id)}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "h-8 text-xs rounded-lg gap-1 border-border/60 hover:bg-primary/10 hover:text-primary"
                        )}
                      >
                        <span>{notif.linkText || "عرض"}</span>
                        <ArrowRightIcon className="size-3.5" />
                      </Link>
                    )}
                    {notif.unread && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => markSingleAsRead(notif.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="تعليم كمقروء"
                      >
                        <CheckCheckIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        ) : (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center">
            <CheckCircle2Icon className="size-12 text-emerald-500 mb-2 stroke-[1.5]" />
            <p className="font-bold text-base">لا توجد تنبيهات في هذا التصنيف</p>
            <p className="text-xs text-muted-foreground mt-1">النظام هادئ وجميع العمليات تسير بسلاسة</p>
          </div>
        )}
      </div>
      </div>
    </PageContainer>
  )
}
