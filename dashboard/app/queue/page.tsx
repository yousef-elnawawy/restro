"use client"

import * as React from "react"
import Link from "next/link"
import { getQueueOrdersApi, type QueueOrder } from "@/lib/api"
import { useSettingStore } from "@/store/setting.store"
import { useTheme } from "@/components/theme-provider"
import { getEcho } from "@/lib/echo"
import { cn } from "cn"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
  ChefHatIcon,
  BellRingIcon,
  Maximize2Icon,
  Minimize2Icon,
  Volume2Icon,
  VolumeXIcon,
  UtensilsCrossedIcon,
  UtensilsIcon,
  ClockIcon,
  ArrowRightIcon,
  SparklesIcon,
  CheckCircle2Icon,
  ShoppingBagIcon,
  BikeIcon,
  TvIcon,
  SunIcon,
  MoonIcon,
  FlameIcon,
} from "lucide-react"

export default function QueueDisplayPage() {
  const { settings, fetchSettings } = useSettingStore()
  const { setTheme, resolvedTheme } = useTheme()
  const [preparingOrders, setPreparingOrders] = React.useState<QueueOrder[]>([])
  const [readyOrders, setReadyOrders] = React.useState<QueueOrder[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState<string>("")
  const [newlyReadyId, setNewlyReadyId] = React.useState<number | null>(null)
  const [mounted, setMounted] = React.useState(false)

  const previousReadyIdsRef = React.useRef<Set<number>>(new Set())

  // ضمان توافق الـ Hydration للعميل
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // تحديث الساعة الرقمية الحالية
  React.useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      )
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  // نطق وتنبيه صوتي للطلب الجاهز
  const announceOrder = React.useCallback(
    (orderNumber: string) => {
      if (!soundEnabled) return

      try {
        // نغمة تنبيه إلكترونية سريعة (Chime)
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.type = "sine"
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15) // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6)
        osc.start(audioCtx.currentTime)
        osc.stop(audioCtx.currentTime + 0.6)

        // نطق صوتي باللغة العربية عبر Web Speech API
        if ("speechSynthesis" in window) {
          const cleanNum = orderNumber.replace(/\D/g, "") || orderNumber
          const utterance = new SpeechSynthesisUtterance(`طلب رقم ${cleanNum}، جاهز للاستلام`)
          utterance.lang = "ar"
          utterance.rate = 0.95
          window.speechSynthesis.speak(utterance)
        }
      } catch {
        // Audio policy or unsupported
      }
    },
    [soundEnabled]
  )

  // جلب الطلبات النشطة
  const fetchQueue = React.useCallback(async () => {
    try {
      const res = await getQueueOrdersApi()
      if (res.success && res.data) {
        const nextReady = res.data.ready || []
        const nextPreparing = res.data.preparing || []

        // فحص إذا كان هناك طلب جديد أصبح جاهزاً
        const nextReadyIds = new Set(nextReady.map((o) => o.id))
        nextReady.forEach((order) => {
          if (!previousReadyIdsRef.current.has(order.id) && previousReadyIdsRef.current.size > 0) {
            setNewlyReadyId(order.id)
            announceOrder(order.order_number)
            setTimeout(() => setNewlyReadyId(null), 8000)
          }
        })

        previousReadyIdsRef.current = nextReadyIds
        setReadyOrders(nextReady)
        setPreparingOrders(nextPreparing)
      }
    } finally {
      setIsLoading(false)
    }
  }, [announceOrder])

  // التحميل الأولي والاستماع عبر WebSockets مع Polling احتياطي
  React.useEffect(() => {
    fetchSettings()
    fetchQueue()

    // Polling دوري كل 5 ثوانٍ
    const pollInterval = setInterval(fetchQueue, 5000)

    // الاستماع الفوري عبر Reverb WebSockets
    const echo = getEcho()
    if (echo) {
      const channel = echo.channel("orders")
      channel.listen(".OrderStatusUpdated", () => {
        fetchQueue()
      })
      channel.listen(".OrderCreated", () => {
        fetchQueue()
      })
    }

    return () => clearInterval(pollInterval)
  }, [fetchQueue, fetchSettings])

  // التبديل إلى ملء الشاشة للـ TV
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const restaurantName = settings?.restaurant_name || "ريسترو"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none overflow-x-hidden antialiased transition-colors duration-200">
      {/* الشريط العلوي المتناسق تماماً مع هوية وتصميم ريسترو */}
      <header className="px-4 sm:px-6 py-3 border-b border-border/70 bg-card/85 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4 shadow-xs">
        {/* هوية المطعم والشاشة (يمين في RTL) */}
        <div className="flex items-center gap-3">
          <div className="size-10 sm:size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <UtensilsCrossedIcon className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-heading">
                {restaurantName}
              </h1>
              <Badge variant="outline" className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/25 font-bold gap-1 px-2.5 py-0.5 text-xs">
                <TvIcon className="size-3" />
                <span>شاشة نداء العملاء</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium">متابعة تجهيز واستلام الطلبات لحظياً بالصالة</p>
          </div>
        </div>

        {/* أدوات التحكم والساعة (يسار في RTL) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* الساعة الرقمية */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/70 border border-border/60 text-xs sm:text-sm font-bold font-mono text-foreground">
            <ClockIcon className="size-3.5 text-primary" />
            <span dir="ltr" suppressHydrationWarning>{currentTime || "00:00:00"}</span>
          </div>

          {/* تبديل المظهر (فاتح / داكن) لمطابقة ثيم المستخدم */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title={mounted && resolvedTheme === "dark" ? "تفعيل المظهر الفاتح" : "تفعيل المظهر الداكن"}
            className="cursor-pointer"
          >
            {mounted && resolvedTheme === "dark" ? (
              <SunIcon className="size-4 text-amber-400" />
            ) : (
              <MoonIcon className="size-4 text-muted-foreground" />
            )}
          </Button>

          {/* تبديل الصوت والنداء الآلي */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`cursor-pointer transition-colors ${
              soundEnabled
                ? "hover:bg-muted text-foreground"
                : "border-destructive/40 text-destructive bg-destructive/10 hover:bg-destructive/20"
            }`}
            title={soundEnabled ? "كتم صوت النداء" : "تفعيل صوت النداء"}
          >
            {soundEnabled ? <Volume2Icon className="size-4 text-primary" /> : <VolumeXIcon className="size-4" />}
          </Button>

          {/* وضع ملء الشاشة TV */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? "إنهاء وضع ملء الشاشة" : "وضع ملء الشاشة (TV)"}
            className="cursor-pointer"
          >
            {isFullscreen ? <Minimize2Icon className="size-4" /> : <Maximize2Icon className="size-4" />}
          </Button>

          {/* العودة للوحة التحكم */}
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden sm:inline-flex gap-1.5 font-medium cursor-pointer"
            )}
          >
            <span>لوحة التحكم</span>
            <ArrowRightIcon className="size-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </header>

      {/* الجسم الرئيسي المقسم لعمودين متناسقين وواضحين على شاشات التلفاز والموبايل */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-h-0">
        {/* العمود الأول: جاهز للاستلام (Ready to Pick Up) - يمين في RTL لأنه الأهم للعميل المنتظر */}
        <Card className="flex flex-col h-full border border-emerald-500/30 bg-card/95 shadow-sm rounded-2xl overflow-hidden">
          {/* ترويسة بطاقة الطلبات الجاهزة */}
          <div className="p-4 sm:p-5 border-b border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-xs">
                <BellRingIcon className="size-5.5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black font-heading text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <span>جاهز للاستلام تفضل للكاونتر</span>
                </h2>
                <p className="text-xs text-muted-foreground font-medium">يرجى التوجه إلى كاونتر التسليم واستلام وجبتك</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hidden sm:inline">الطلبات الجاهزة:</span>
              <span className="min-w-10 px-3 py-1 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/25 border border-emerald-500/35 text-center font-mono font-black text-xl text-emerald-700 dark:text-emerald-300">
                {readyOrders.length}
              </span>
            </div>
          </div>

          {/* قائمة الطلبات الجاهزة */}
          <CardContent className="flex-1 p-4 sm:p-5 overflow-y-auto min-h-[350px]">
            {readyOrders.length === 0 ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 gap-3">
                <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <SparklesIcon className="size-8 opacity-70" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-foreground font-heading">
                    بانتظار اكتمال تجهيز الوجبات
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                    لا توجد طلبات جاهزة للاستلام حالياً، ستظهر أرقام الوجبات هنا فور خروجها من المطبخ
                  </p>
                </div>
                <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground text-xs mt-2">
                  المطبخ يعمل على تحضير باقي الطلبات
                </Badge>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {readyOrders.map((order) => {
                  const isNewlyReady = newlyReadyId === order.id
                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden text-center ${
                        isNewlyReady
                          ? "bg-emerald-600 text-white border-2 border-emerald-300 shadow-xl shadow-emerald-500/30 scale-105 animate-bounce"
                          : "bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-500/50 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all shadow-xs"
                      }`}
                    >
                      {isNewlyReady && (
                        <span className="absolute top-1.5 end-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-emerald-900 shadow-xs uppercase">
                          جاهز الآن!
                        </span>
                      )}

                      <span
                        className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                          isNewlyReady ? "text-white" : "text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        #{order.order_number}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {order.order_type === "dinein" ? (
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-semibold gap-1 ${
                              isNewlyReady
                                ? "bg-white/20 border-white/40 text-white"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            <UtensilsIcon className="size-3" />
                            <span>طاولة {order.table?.name || ""}</span>
                          </Badge>
                        ) : order.order_type === "takeaway" ? (
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-semibold gap-1 ${
                              isNewlyReady
                                ? "bg-white/20 border-white/40 text-white"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            <ShoppingBagIcon className="size-3" />
                            <span>سفري / كاونتر</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-semibold gap-1 ${
                              isNewlyReady
                                ? "bg-white/20 border-white/40 text-white"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            }`}
                          >
                            <BikeIcon className="size-3" />
                            <span>توصيل</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* العمود الثاني: جاري التجهيز بالمطبخ (Preparing in Kitchen) */}
        <Card className="flex flex-col h-full border border-amber-500/30 bg-card/95 shadow-sm rounded-2xl overflow-hidden">
          {/* ترويسة بطاقة الطلبات قيد التجهيز */}
          <div className="p-4 sm:p-5 border-b border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-xs">
                <ChefHatIcon className="size-5.5 animate-bounce" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black font-heading text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <span>جاري التجهيز بالمطبخ</span>
                </h2>
                <p className="text-xs text-muted-foreground font-medium">الطلبات قيد الطهي والإعداد بواسطة فريق المطبخ</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 hidden sm:inline">قيد الإعداد:</span>
              <span className="min-w-10 px-3 py-1 rounded-xl bg-amber-500/20 dark:bg-amber-500/25 border border-amber-500/35 text-center font-mono font-black text-xl text-amber-700 dark:text-amber-300">
                {preparingOrders.length}
              </span>
            </div>
          </div>

          {/* قائمة الطلبات قيد الإعداد */}
          <CardContent className="flex-1 p-4 sm:p-5 overflow-y-auto min-h-[350px]">
            {preparingOrders.length === 0 ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 gap-3">
                <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <CheckCircle2Icon className="size-8 opacity-70" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-foreground font-heading">
                    لا توجد طلبات قيد التحضير حالياً
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                    المطبخ انتهى من كافة تذاكر الطهي وبانتظار تسجيل طلبات جديدة من الكاشير أو الأونلاين
                  </p>
                </div>
                <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground text-xs mt-2">
                  جاهزون لاستقبال طلباتكم
                </Badge>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {preparingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/80 hover:border-amber-500/40 flex flex-col items-center justify-center gap-2 transition-all shadow-xs group text-center"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-bold">
                      <FlameIcon className="size-3.5 animate-pulse" />
                      <span>قيد الطهي</span>
                    </div>

                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      #{order.order_number}
                    </span>

                    <div className="flex items-center gap-1">
                      {order.order_type === "dinein" ? (
                        <Badge variant="secondary" className="text-[11px] font-medium gap-1">
                          <UtensilsIcon className="size-3" />
                          <span>صالة {order.table?.name ? `(${order.table.name})` : ""}</span>
                        </Badge>
                      ) : order.order_type === "takeaway" ? (
                        <Badge variant="secondary" className="text-[11px] font-medium gap-1">
                          <ShoppingBagIcon className="size-3" />
                          <span>سفري</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px] font-medium gap-1">
                          <BikeIcon className="size-3" />
                          <span>توصيل</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* شريط الإرشادات السفلي المتناسق والراقي */}
      <footer className="px-4 sm:px-6 py-3 border-t border-border/70 bg-card/75 backdrop-blur-md flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-foreground font-medium">الشاشة متصلة وتحدث تلقائياً بالثواني الحقيقية (Reverb)</span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-foreground/80 font-medium font-heading">
          <UtensilsIcon className="size-3.5 text-primary" />
          <span>نتمنى لكم أشهى وأطيب الوجبات في {restaurantName}!</span>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground text-[11px]">
          <span>الصوت: {soundEnabled ? "مُفعّل 🔔" : "مكتوم 🔕"}</span>
          <span className="hidden sm:inline">اضغط F11 لوضع ملء الشاشة</span>
        </div>
      </footer>
    </div>
  )
}

