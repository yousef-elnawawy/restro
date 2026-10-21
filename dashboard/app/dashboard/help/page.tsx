"use client"

import * as React from "react"
import { PageContainer } from "@/components/page-container"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  LifeBuoyIcon,
  MailIcon,
  PhoneIcon,
  MessageCircleIcon,
  SearchIcon,
  BookOpenIcon,
  ReceiptIcon,
  ArmchairIcon,
  CoinsIcon,
  TruckIcon,
  UtensilsIcon,
  PrinterIcon,
  KeyboardIcon,
  CheckCircle2Icon,
  HelpCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  ServerIcon,
  DatabaseIcon,
  ClockIcon,
} from "lucide-react"

// دليل الاستخدام
const USER_GUIDES = [
  {
    id: "pos",
    title: "نقطة البيع (الكاشير)",
    icon: ReceiptIcon,
    color: "bg-primary/10 text-primary",
    summary: "تسجيل الطلبات، السداد، وطباعة الفواتير الحرارية",
    steps: [
      "اختر التصنيف من شريط الأقسام العلوي، ثم انقر على الصنف لإضافته للفاتورة.",
      "في الأصناف ذات الأحجام، حدد الحجم المطلوب (صغير/وسط/كبير) والإضافات (صوص/جبن إضافي).",
      "حدد نوع الطلب (صالة / استلام / توصيل)، وإذا كان صالة اختر رقم الطاولة الشاغرة.",
      "اضغط 'دفع الفاتورة' لاختيار الخزنة وطريقة السداد (نقدي/بطاقة)، وسيتم إصدار إيصال الطباعة الحرارية فوراً.",
    ],
  },
  {
    id: "tables",
    title: "إدارة الطاولات والصالة",
    icon: ArmchairIcon,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    summary: "متابعة إشغال الصالة والطلبات الجارية على الطاولات",
    steps: [
      "تعرض الشاشة حالة كل طاولة (شاغرة باللون الأخضر، مشغولة بالأحمر، أو محجوزة بالأصفر).",
      "عند النقر على طاولة شاغرة، يتم فتح شاشة الكاشير تلقائياً وتعيين الطاولة لبدء الطلب.",
      "عند النقر على طاولة مشغولة، تظهر نافذة تفاصيل الطلب الجاري، مع إمكانية التعديل أو التوجه للسداد الفوري.",
      "بمجرد سداد الطلب بالكامل، تتحول الطاولة تلقائياً إلى حالة 'شاغرة'.",
    ],
  },
  {
    id: "menu",
    title: "المنيو والأصناف",
    icon: UtensilsIcon,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    summary: "إضافة الأقسام وتعديل أسعار الأطباق والأحجام المتعددة",
    steps: [
      "من قسم 'الأقسام'، أنشئ التصنيفات الأساسية (برجر، بيتزا، مشروبات، مقبلات).",
      "من قسم 'المنتجات'، أضف الطبق وحدد السعر الأساسي وصورة الطبق.",
      "إذا كان الطبق يتوفر بأحجام، فعّل خيار 'أحجام متعددة' وحدد سعر كل حجم بشكل مستقل.",
      "من قسم 'الإضافات والخيارات'، يمكنك تعريف إضافات عامة (مثل جبنة إضافية +15 ج.م) وربطها بالطبق.",
    ],
  },
  {
    id: "registers",
    title: "الخزائن المالية والسندات",
    icon: CoinsIcon,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    summary: "إدارة رصيد الدرج، سندات القبض والدفع والمصروفات",
    steps: [
      "تتيح لك الشاشة فتح أكثر من خزنة نقدية (الدرج الرئيسي، فيزا، خزنة الإدارة).",
      "تسجيل 'سند قبض' عند تحصيل مبالغ من العملاء أو زيادة رصيد الخزنة.",
      "تسجيل 'سند صرف/مصروفات' عند دفع فواتير أو مشتريات للمطعم مع خصم المبلغ تلقائياً من الخزنة.",
      "تراجع تلقائي عن الأثر المالي في حال حذف أي سند مالي مسجل بالخطأ.",
    ],
  },
  {
    id: "delivery",
    title: "أسطول التوصيل (الديليفري)",
    icon: TruckIcon,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    summary: "إدارة مناديب التوصيل وتوجيه الطلبات الخارجية",
    steps: [
      "إضافة المناديب برقم الهاتف ونوع المركبة (دراجة نارية / سيارة / دراجة).",
      "عند اختيار نوع الطلب 'توصيل' في الكاشير، يمكنك تعيين المندوب المتفرغ.",
      "تتغير حالة المندوب تلقائياً إلى 'في مهمة توصيل' حتى تسليم الطلب.",
    ],
  },
]

// الأسئلة الشائعة
const FAQ_ITEMS = [
  {
    question: "كيف أقوم بتعديل بنود طلب مفتوح لطاولة مشغولة طلبت المزيد؟",
    answer:
      "من شاشة 'إدارة الطاولات'، انقر على الطاولة المشغولة ثم اضغط 'تعديل الطلب في الكاشير' (أو من شاشة الطلبات اضغط على خيار التعديل)، سيفتح الطلب داخل شاشة الكاشير بكامل أصنافه، يمكنك زيادة أو حذف أي صنف، ثم اضغط 'حفظ تعديلات الطلب'.",
  },
  {
    question: "كيف أغير العملة أو نسبة الضريبة المعتمدة في الفواتير؟",
    answer:
      "توجه إلى 'الإعدادات' من القائمة الجانبية، ثم تبويب 'العملة والضرائب'. يمكنك اختيار العملة (ج.م، ر.س، $، إلخ) وتحديد نسبة الضريبة (مثلاً 14% أو 15%) والضغط على 'حفظ الإعدادات'. ستنعكس التغييرات فوراً في الكاشير والمطبوعات.",
  },
  {
    question: "كيف أطبع إيصال حراري للعميل أو أعيد طباعته؟",
    answer:
      "يتم توليد الإيصال فوراً بعد سداد الطلب من شاشة الكاشير. كما يمكنك إعادة طباعة أي إيصال في أي وقت بالذهاب إلى صفحة 'الطلبات'، والنقر على أيقونة الطابعة بجانب أي طلب.",
  },
  {
    question: "ما هي مواصفات الطابعات الحرارية المتوافقة مع النظام؟",
    answer:
      "النظام متوافق مع كافة طابعات الفواتير الحرارية القياسية (Thermal Receipt Printers) قياس 80mm أو 58mm المتصلة عبر USB أو الشبكة (LAN) وتدعم أوامر الطباعة المباشرة من المتصفح.",
  },
  {
    question: "كيف أستخرج كشف حساب تفصيلي لعميل آجل؟",
    answer:
      "من شاشة 'العملاء'، ابحث عن اسم العميل واضغط على زر 'كشف الحساب' (أيقونة الملف). ستظهر لك نافذة تفصيلية بجميع طلبات العميل وسندات القبض والدفع والرصيد المتبقي مع زر طباعة مخصص.",
  },
  {
    question: "ماذا يحدث عند إلغاء طلب صالة تم تسجيله بالخطأ؟",
    answer:
      "عند النقر على 'إلغاء الطلب' من تفاصيل الطاولة أو صفحة الطلبات، يتم وضع علامة ملغي على الطلب وتفريغ الطاولة لتصبح شاغرة فوراً لاستقبال زبائن جدد.",
  },
]

// اختصارات لوحة المفاتيح
const SHORTCUTS = [
  { key: "F2", action: "البحث السريع عن صنف في الكاشير" },
  { key: "F4", action: "فتح نافذة الدفع واختيار الخزنة" },
  { key: "Ctrl + P", action: "طباعة الفاتورة الحرارية الحالية" },
  { key: "Esc", action: "إغلاق النوافذ المنبثقة والرجوع" },
  { key: "Ctrl + Enter", action: "تأكيد الدفع والسداد السريع" },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [openFaq, setOpenFaq] = React.useState<number | null>(0)

  const filteredFaqs = React.useMemo(() => {
    if (!searchQuery.trim()) return FAQ_ITEMS
    const q = searchQuery.toLowerCase()
    return FAQ_ITEMS.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    )
  }, [searchQuery])

  return (
    <PageContainer
      title="مركز المساعدة والدعم الفني"
      description="دليل الاستخدام الكامل لمنصة ريسترو، الأسئلة الشائعة، واختصارات لوحة المفاتيح"
    >
      <div className="space-y-3 sm:space-y-3.5">
        {/* كروت الإحصائيات العلوية الموحدة */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpenIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">أدلة النظام</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                {USER_GUIDES.length} أدلة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <HelpCircleIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">الأسئلة الشائعة</p>
              <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground font-mono">
                {FAQ_ITEMS.length} أسئلة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ServerIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">حالة النظام</p>
              <p className="text-sm sm:text-base font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                متصل 100%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-card border border-border/60 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <LifeBuoyIcon className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">الدعم الفني</p>
              <p className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                متاح 24/7
              </p>
            </div>
          </div>
        </div>

        {/* شريط البحث الموحد */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="relative flex-1 w-full sm:max-w-md">
            <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن سؤال أو دليل، مثل: تعديل طلب، نسبة الضريبة، الطابعات..."
              className="ps-9 h-8.5 text-xs bg-muted/40 rounded-lg border-border/60"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            مركز التوثيق والمساعدة الذكي
          </span>
        </div>

        {/* 1. أدلة الاستخدام التفاعلية للموديولات */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpenIcon className="size-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">أدلة الاستخدام السريعة لأقسام النظام</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USER_GUIDES.map((guide) => {
              const Icon = guide.icon
              return (
                <Card key={guide.id} className="border border-border/60 shadow-xs rounded-xl flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex size-9 items-center justify-center rounded-lg ${guide.color}`}>
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">{guide.title}</CardTitle>
                        <CardDescription className="text-xs line-clamp-1">{guide.summary}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 flex-1">
                    <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside pr-1">
                      {guide.steps.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">
                          <span className="text-foreground font-medium">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* 2. الأسئلة الشائعة (FAQ) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircleIcon className="size-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">الأسئلة الأكثر شيوعاً (FAQ)</h3>
          </div>

          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground rounded-2xl border border-dashed border-border">
                لا توجد نتائج مطابقة لبحثك. يرجى تجربة كلمات أخرى أو التواصل مع الدعم الفني.
              </div>
            ) : (
              filteredFaqs.map((faq, index) => {
                const isOpen = openFaq === index
                return (
                  <div
                    key={index}
                    className="border border-border/70 rounded-xl bg-card overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full p-4 flex items-center justify-between text-right gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {faq.question}
                      </span>
                      {isOpen ? (
                        <ChevronUpIcon className="size-4 text-primary shrink-0" />
                      ) : (
                        <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-muted/10">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 3. اختصارات لوحة المفاتيح وحالة النظام */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* اختصارات لوحة المفاتيح */}
          <Card className="border border-border/60 shadow-xs rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8.5 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <KeyboardIcon className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">اختصارات لوحة المفاتيح للكاشير</CardTitle>
                  <CardDescription className="text-xs">لزيادة سرعة تسجيل ومحاسبة الطلبات</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/50 text-xs">
                {SHORTCUTS.map((s, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">{s.action}</span>
                    <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5 rounded-md font-bold bg-muted/50">
                      {s.key}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* فحص وحالة النظام */}
          <Card className="border border-border/60 shadow-xs rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">حالة النظام والاتصال المباشر</CardTitle>
                  <CardDescription className="text-xs">مؤشرات الأداء وصحة الخوادم</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ServerIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">خادم الواجهة البرمجية (API)</span>
                </div>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px]">متصل ويعمل بكفاءة</Badge>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <DatabaseIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">قاعدة البيانات (Database)</span>
                </div>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px]">متصلة ومحدثة</Badge>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <PrinterIcon className="size-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">طابعات الإيصالات الحرارية</span>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-500/30 text-[10px]">جاهزة عبر المتصفح</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. قنوات الدعم الفني المباشر */}
        <Card className="border border-border/60 shadow-xs rounded-xl bg-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LifeBuoyIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">فريق الدعم الفني وخدمة العملاء</CardTitle>
                <CardDescription>نحن متواجدون لمساعدتك في أي استفسار أو مشكلة تقنية تواجهك</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="https://wa.me/201000000000"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center gap-3 group"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 group-hover:scale-105 transition-transform">
                <MessageCircleIcon className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">واتساب الدعم المباشر</h4>
                <p className="text-[11px] text-muted-foreground" dir="ltr">+20 100 000 0000</p>
              </div>
            </a>

            <a
              href="tel:+201000000000"
              className="p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-colors flex items-center gap-3 group"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                <PhoneIcon className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">الاتصال الهاتفي</h4>
                <p className="text-[11px] text-muted-foreground" dir="ltr">+20 100 000 0000</p>
              </div>
            </a>

            <a
              href="mailto:support@restro.com"
              className="p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-colors flex items-center gap-3 group"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-105 transition-transform">
                <MailIcon className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">البريد الإلكتروني</h4>
                <p className="text-[11px] text-muted-foreground">support@restro.com</p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
