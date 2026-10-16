"use client"

import * as React from "react"
import {
  type Order,
  type OrderStatus,
  type DeliveryDriver,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  TruckIcon,
  BikeIcon,
  PhoneIcon,
  MessageCircleIcon,
  MapPinIcon,
  CheckCircle2Icon,
  ClockIcon,
  DollarSignIcon,
  CheckIcon,
  ExternalLinkIcon,
  ShoppingBagIcon,
  ReceiptIcon,
  BanknoteIcon,
  SparklesIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertCircleIcon,
  CoffeeIcon,
  UserIcon,
} from "lucide-react"

interface DriverPortalViewProps {
  orders: Order[]
  myDriver: DeliveryDriver | null
  driverName: string
  currency: string
  isLoading: boolean
  onRefresh: () => void
  onUpdateStatus: (order: Order, newStatus: OrderStatus) => Promise<void>
  onToggleDriverDuty?: (newStatus: "available" | "off_duty") => Promise<void>
  isAdminPreview?: boolean
}

export function DriverPortalView({
  orders,
  myDriver,
  driverName,
  currency,
  isLoading,
  onRefresh,
  onUpdateStatus,
  onToggleDriverDuty,
  isAdminPreview = false,
}: DriverPortalViewProps) {
  // التبويب النشط: الطلبات الجارية أو المكتملة
  const [activeTab, setActiveTab] = React.useState<"active" | "completed">("active")

  // حالة فتح تفاصيل الأصناف لكل طلب
  const [expandedItems, setExpandedItems] = React.useState<Record<number, boolean>>({})

  // نافذة تأكيد تسليم الطلب وتحصيل الكاش
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = React.useState<Order | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // تصفية طلبات هذا السائق
  const driverOrders = React.useMemo(() => {
    return orders.filter((o) => o.order_type === "delivery")
  }, [orders])

  // الطلبات الجارية (بالمطبخ، جاهزة للاستلام، أو في الطريق)
  const activeOrders = React.useMemo(() => {
    return driverOrders.filter(
      (o) => o.status === "out_for_delivery" || o.status === "ready" || o.status === "preparing"
    )
  }, [driverOrders])

  // الطلبات المكتملة اليوم
  const completedOrders = React.useMemo(() => {
    return driverOrders.filter((o) => o.status === "completed")
  }, [driverOrders])

  // المبالغ المطلوب تحصيلها كاش للطلبات الجارية
  const cashToCollect = React.useMemo(() => {
    return activeOrders
      .filter((o) => o.payment_status !== "paid")
      .reduce((sum, o) => sum + Number(o.total || 0), 0)
  }, [activeOrders])

  // المبالغ المحصلة كاش للطلبات المكتملة اليوم
  const cashCollectedToday = React.useMemo(() => {
    return completedOrders
      .filter((o) => o.payment_method === "cash" || o.payment_status === "paid")
      .reduce((sum, o) => sum + Number(o.total || 0), 0)
  }, [completedOrders])

  // تبديل عرض محتويات الطلب
  const toggleItems = (orderId: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }))
  }

  // تنسيق الوقت النسبي
  const formatTimePassed = (dateStr?: string) => {
    if (!dateStr) return "الآن"
    const diffMin = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000)
    if (diffMin < 1) return "الآن"
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`
    const hours = Math.floor(diffMin / 60)
    return `منذ ${hours} ساعة`
  }

  // تنظيف رقم الهاتف للواتساب
  const formatPhoneForWhatsApp = (phone?: string) => {
    if (!phone) return ""
    let cleaned = phone.replace(/\D/g, "")
    // إذا كان الرقم مصري بدون كود الدولة (مثال: 010...) نضيف كود 20
    if (cleaned.startsWith("0")) {
      cleaned = "20" + cleaned.substring(1)
    }
    return cleaned
  }

  // معالجة استلام الطلب من المطعم
  const handlePickup = async (order: Order) => {
    setIsSubmitting(true)
    try {
      await onUpdateStatus(order, "out_for_delivery")
    } finally {
      setIsSubmitting(false)
    }
  }

  // معالجة تأكيد تسليم الطلب
  const handleConfirmDelivery = async () => {
    if (!confirmDeliveryOrder) return
    setIsSubmitting(true)
    try {
      await onUpdateStatus(confirmDeliveryOrder, "completed")
      setConfirmDeliveryOrder(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* =========================================================
          الترويسة الرئيسية للمندوب مع الحالة الحالية
          ========================================================= */}
      <div className="rounded-2xl bg-linear-to-r from-emerald-600 via-teal-600 to-primary p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <BikeIcon className="size-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  مرحباً يا كابتن {myDriver?.name || driverName} 🛵
                </h1>
                {isAdminPreview && (
                  <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-white/30">
                    معاينة المدير
                  </Badge>
                )}
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                لوحة مهامك المباشرة • استلم وسلم وتابع طلباتك بنقرة واحدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* زر تبديل حالة التفرغ / الاستراحة */}
            {onToggleDriverDuty && myDriver && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onToggleDriverDuty(myDriver.status === "available" ? "off_duty" : "available")
                }
                className="bg-white/10 hover:bg-white/20 text-white border-white/25 rounded-xl text-xs font-bold gap-1.5 h-9"
              >
                {myDriver.status === "available" ? (
                  <>
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>متاح للتوصيل (انقر للاستراحة)</span>
                  </>
                ) : (
                  <>
                    <CoffeeIcon className="size-3.5 text-amber-300" />
                    <span>في استراحة (انقر لتصبح متاحاً)</span>
                  </>
                )}
              </Button>
            )}

            {/* زر التحديث اللحظي */}
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              title="تحديث الطلبات"
              className="bg-white/10 hover:bg-white/20 text-white border-white/25 rounded-xl size-9 shrink-0"
            >
              <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================
          كروت المؤشرات السريعة للكابتن (KPIs)
          ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <Card className="border-border/60 shadow-xs bg-card/70 backdrop-blur-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>قيد التوصيل الآن</span>
              <TruckIcon className="size-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-purple-600 dark:text-purple-400">
              {activeOrders.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">طلبات جارية بعهدتك</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs bg-card/70 backdrop-blur-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>سلمتها اليوم</span>
              <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-emerald-600 dark:text-emerald-400">
              {completedOrders.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">تم تسليمها بنجاح</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs bg-card/70 backdrop-blur-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>كاش قيد التحصيل</span>
              <BanknoteIcon className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-amber-600 dark:text-amber-400">
              {cashToCollect} <span className="text-xs font-bold font-sans">{currency}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">تحصيل نقدي عند الباب</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs bg-card/70 backdrop-blur-xs">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>كاش بعهدتك للتوريد</span>
              <DollarSignIcon className="size-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-2xl font-black font-mono mt-1 text-teal-600 dark:text-teal-400">
              {cashCollectedToday} <span className="text-xs font-bold font-sans">{currency}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">توريد للمطعم بنهاية اليوم</p>
          </CardContent>
        </Card>
      </div>

      {/* =========================================================
          تبويبات العرض (الطلبات الجارية vs المكتملة اليوم)
          ========================================================= */}
      <div className="flex bg-muted/80 p-1.5 rounded-2xl border border-border/60 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "active"
              ? "bg-background text-foreground shadow-xs font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TruckIcon className="size-4 text-purple-600 dark:text-purple-400" />
          <span>الطلبات الجارية للتوصيل</span>
          {activeOrders.length > 0 && (
            <Badge className="bg-purple-600 text-white text-[11px] px-2 py-0.2 rounded-full">
              {activeOrders.length}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === "completed"
              ? "bg-background text-foreground shadow-xs font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>طلبات أنجزتها اليوم</span>
          {completedOrders.length > 0 && (
            <Badge variant="secondary" className="text-[11px] px-2 py-0.2 rounded-full">
              {completedOrders.length}
            </Badge>
          )}
        </button>
      </div>

      {/* =========================================================
          محتوى تبويب الطلبات الجارية (Active Tab)
          ========================================================= */}
      {activeTab === "active" && (
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-xs">
              <div className="size-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <BikeIcon className="size-8" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                أنت جاهز ومستعد يا كابتن! 🛵
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                لا توجد طلبات جارية مسندة إليك حالياً. استرح قليلاً، وسيتم تنبيهك بصوت وإشعار فوري عند خروج أي طلب جديد للتوصيل.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="mt-4 rounded-xl text-xs gap-1.5"
              >
                <RefreshCwIcon className="size-3.5" />
                <span>تحديث الحالة الآن</span>
              </Button>
            </div>
          ) : (
            activeOrders.map((order) => {
              const customerPhone = order.customer?.phone || ""
              const customerName = order.customer?.name || order.customer_name || "عميل بدون اسم"
              const customerAddress = order.customer?.address || "العنوان غير محدد"
              const whatsAppUrl = customerPhone
                ? `https://wa.me/${formatPhoneForWhatsApp(customerPhone)}?text=${encodeURIComponent(
                    `مرحباً ${customerName}، معك كابتن التوصيل من مطعم ريسترو بخصوص طلبك رقم #${order.order_number} 🛵`
                  )}`
                : ""
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                customerAddress
              )}`

              const isReady = order.status === "ready"
              const isOut = order.status === "out_for_delivery"
              const isPreparing = order.status === "preparing"
              const isPaid = order.payment_status === "paid"

              return (
                <Card
                  key={order.id}
                  className={`overflow-hidden border-2 transition-all shadow-md ${
                    isOut
                      ? "border-purple-500/40 bg-purple-500/[0.02]"
                      : isReady
                      ? "border-amber-500/50 bg-amber-500/[0.02]"
                      : "border-border/70 bg-card"
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* الترويسة العليا للبطاقة */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary font-mono font-black text-sm">
                          #{order.order_number}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ClockIcon className="size-3.5" />
                          <span>{formatTimePassed(order.created_at)}</span>
                        </div>
                      </div>

                      {/* شارة حالة الطلب */}
                      {isReady && (
                        <Badge className="bg-amber-500 text-white font-bold text-xs gap-1 px-2.5 py-1 animate-pulse">
                          <SparklesIcon className="size-3.5" />
                          <span>جاهز بالمطعم للاستلام</span>
                        </Badge>
                      )}
                      {isOut && (
                        <Badge className="bg-purple-600 text-white font-bold text-xs gap-1 px-2.5 py-1">
                          <TruckIcon className="size-3.5" />
                          <span>في الطريق معك للعميل</span>
                        </Badge>
                      )}
                      {isPreparing && (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/40 text-xs gap-1">
                          <span>جاري التحضير بالمطبخ</span>
                        </Badge>
                      )}
                    </div>

                    {/* بيانات العميل وأزرار الاتصال والواتساب */}
                    <div className="rounded-xl bg-muted/50 p-3.5 border border-border/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserIcon className="size-4 text-primary" />
                          <span className="font-bold text-sm text-foreground">{customerName}</span>
                        </div>
                        {customerPhone && (
                          <span className="font-mono text-xs text-muted-foreground font-semibold" dir="ltr">
                            {customerPhone}
                          </span>
                        )}
                      </div>

                      {/* أزرار الاتصال والواتساب المباشرة للموبايل */}
                      {customerPhone && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <a
                            href={`tel:${customerPhone}`}
                            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                          >
                            <PhoneIcon className="size-3.5" />
                            <span>اتصال هاتفي</span>
                          </a>

                          <a
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors"
                          >
                            <MessageCircleIcon className="size-3.5" />
                            <span>محادثة واتساب</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* عنوان التوصيل وزر الخرائط */}
                    <div className="rounded-xl bg-muted/50 p-3.5 border border-border/60 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <MapPinIcon className="size-4.5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground leading-relaxed">
                            {customerAddress}
                          </p>
                          {order.notes && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                              ملاحظات العميل: {order.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition-colors"
                      >
                        <ExternalLinkIcon className="size-3.5" />
                        <span>فتح العنوان على خرائط جوجل (Google Maps) 🗺️</span>
                      </a>
                    </div>

                    {/* صندوق الحساب المالي وطريقة الدفع */}
                    <div
                      className={`rounded-xl p-3.5 border flex items-center justify-between ${
                        isPaid
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-extrabold flex items-center gap-1.5">
                          {isPaid ? (
                            <>
                              <CheckCircle2Icon className="size-4 text-emerald-600" />
                              <span>الطلب مدفوع مسبقاً (إلكتروني)</span>
                            </>
                          ) : (
                            <>
                              <BanknoteIcon className="size-4 text-amber-600" />
                              <span>تحصيل نقدي عند الباب (كاش)</span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] mt-0.5 opacity-80">
                          {isPaid ? "لا تقم بتحصيل أي مبالغ من العميل" : "يرجى تحصيل المبلغ كاملاً نقداً من العميل"}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-black font-mono">
                          {order.total} <span className="text-xs font-bold font-sans">{currency}</span>
                        </div>
                      </div>
                    </div>

                    {/* ملخص محتويات الوجبة (الأصناف) */}
                    <div className="border-t border-border/60 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleItems(order.id)}
                        className="flex items-center justify-between w-full py-1 text-xs text-muted-foreground hover:text-foreground font-semibold"
                      >
                        <div className="flex items-center gap-1.5">
                          <ShoppingBagIcon className="size-3.5 text-primary" />
                          <span>محتويات الطلب ({order.items?.length || 0} أصناف)</span>
                        </div>
                        {expandedItems[order.id] ? (
                          <ChevronUpIcon className="size-4" />
                        ) : (
                          <ChevronDownIcon className="size-4" />
                        )}
                      </button>

                      {expandedItems[order.id] && (
                        <div className="mt-2 space-y-1.5 bg-muted/40 p-2.5 rounded-xl border border-border/50 text-xs">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-foreground">
                              <span>
                                <strong className="font-mono text-primary font-bold">{item.quantity}x</strong>{" "}
                                {item.product_name}
                              </span>
                              <span className="font-mono text-muted-foreground">
                                {item.total_price} {currency}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* زر الإجراء السريع الرئيسي (Big Action Button) */}
                    <div className="pt-2">
                      {isReady && (
                        <Button
                          onClick={() => handlePickup(order)}
                          disabled={isSubmitting}
                          className="w-full h-12 rounded-xl bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-sm gap-2 shadow-md cursor-pointer"
                        >
                          <BikeIcon className="size-5" />
                          <span>استلام الطلب من المطعم والإنطلاق للتوصيل 🛵</span>
                        </Button>
                      )}

                      {isOut && (
                        <Button
                          onClick={() => setConfirmDeliveryOrder(order)}
                          disabled={isSubmitting}
                          className="w-full h-12 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm gap-2 shadow-md cursor-pointer"
                        >
                          <CheckIcon className="size-5" />
                          <span>تم تسليم الطلب للعميل بنجاح ✅</span>
                        </Button>
                      )}

                      {isPreparing && (
                        <div className="w-full py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-center text-xs font-bold flex items-center justify-center gap-2">
                          <ClockIcon className="size-4 animate-spin" />
                          <span>الأطباق قيد الطهي والتجهيز في المطبخ الآن...</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* =========================================================
          محتوى تبويب الطلبات المكتملة اليوم (Completed Tab)
          ========================================================= */}
      {activeTab === "completed" && (
        <div className="space-y-3">
          {completedOrders.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-xs">
              <CheckCircle2Icon className="size-12 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-bold text-foreground text-sm">لا توجد طلبات مكتملة بعد اليوم</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                أي طلب تقوم بتسليمه سيظهر هنا في سجلك مع قيمة التحصيل.
              </p>
            </div>
          ) : (
            completedOrders.map((order) => {
              const customerName = order.customer?.name || order.customer_name || "عميل"
              return (
                <Card key={order.id} className="border-border/60 bg-card/60 shadow-xs">
                  <CardContent className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            #{order.order_number}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">• {customerName}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {order.customer?.address || "توصيل منزل"}
                        </p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="font-mono font-black text-sm text-foreground">
                        {order.total} {currency}
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0 px-1.5 mt-0.5">
                        تم التسليم
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* =========================================================
          نافذة تأكيد تسليم الطلب للعميل بنجاح
          ========================================================= */}
      <Dialog open={!!confirmDeliveryOrder} onOpenChange={(open) => !open && setConfirmDeliveryOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-foreground">
              <CheckCircle2Icon className="size-5 text-emerald-600" />
              <span>تأكيد تسليم الطلب #{confirmDeliveryOrder?.order_number}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              يرجى التأكد من تسليم الوجبة للعميل واستلام المبلغ المطلوب إن كان نقداً.
            </DialogDescription>
          </DialogHeader>

          {confirmDeliveryOrder && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/60 border border-border/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">العميل:</span>
                  <span className="font-bold text-foreground">
                    {confirmDeliveryOrder.customer?.name || confirmDeliveryOrder.customer_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">العنوان:</span>
                  <span className="font-medium text-foreground truncate max-w-[200px]">
                    {confirmDeliveryOrder.customer?.address || "توصيل منزل"}
                  </span>
                </div>
              </div>

              {confirmDeliveryOrder.payment_status !== "paid" ? (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">المطلوب تحصيله كاش الآن:</span>
                    <span className="text-lg font-black font-mono">
                      {confirmDeliveryOrder.total} {currency}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    تأكد من استلام المبلغ نقداً قبل الضغط على تأكيد التسليم.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                  <span>الطلب مسدد مسبقاً بالكامل، لا داعي لأي تحصيل مالي.</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeliveryOrder(null)}
              className="rounded-xl text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelivery}
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              <CheckIcon className="size-4" />
              <span>{isSubmitting ? "جاري التأكيد..." : "تأكيد التسليم بنجاح"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
