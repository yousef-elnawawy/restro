"use client"

import * as React from "react"
import QRCode from "qrcode"
import { type RestaurantTable } from "@/lib/api"
import { useSettingStore } from "@/store/setting.store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  QrCodeIcon,
  PrinterIcon,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  ArmchairIcon,
  SparklesIcon,
  LayersIcon,
  UtensilsCrossedIcon,
  Loader2Icon,
} from "lucide-react"

interface TableQrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tables: RestaurantTable[]
  initialTable?: RestaurantTable | null
}

export function TableQrDialog({
  open,
  onOpenChange,
  tables,
  initialTable,
}: TableQrDialogProps) {
  const { settings } = useSettingStore()

  // رابط الموقع الأساسي للزبائن
  const defaultBaseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : "http://localhost:3001"

  const [baseUrl, setBaseUrl] = React.useState<string>(defaultBaseUrl)
  const [activeTab, setActiveTab] = React.useState<"single" | "bulk">("single")
  const [selectedTableId, setSelectedTableId] = React.useState<number | null>(
    initialTable?.id || (tables.length > 0 ? tables[0].id : null)
  )

  // خريطة رموز الـ QR المولدة كـ Data URLs
  const [qrMap, setQrMap] = React.useState<Record<number, string>>({})
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  // مزامنة الطاولة المحددة عند فتح النافذة
  React.useEffect(() => {
    if (initialTable) {
      setSelectedTableId(initialTable.id)
      setActiveTab("single")
    } else if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id)
    }
  }, [initialTable, tables, selectedTableId])

  // الطاولة الحالية في وضع المفرد
  const currentTable = React.useMemo(() => {
    return tables.find((t) => t.id === selectedTableId) || tables[0] || null
  }, [tables, selectedTableId])

  // دالة تكوين رابط الطاولة للعميل
  const getTableUrl = React.useCallback(
    (tableId: number) => {
      const cleanBase = baseUrl.replace(/\/+$/, "")
      return `${cleanBase}/table/${tableId}`
    },
    [baseUrl]
  )

  // توليد كود الـ QR
  React.useEffect(() => {
    if (!open || tables.length === 0) return

    let isMounted = true
    setIsGenerating(true)

    async function generateAllQrs() {
      const generated: Record<number, string> = {}
      for (const table of tables) {
        try {
          const url = getTableUrl(table.id)
          const dataUrl = await QRCode.toDataURL(url, {
            width: 400,
            margin: 2,
            errorCorrectionLevel: "H",
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          })
          generated[table.id] = dataUrl
        } catch (err) {
          console.error("Failed to generate QR for table", table.id, err)
        }
      }

      if (isMounted) {
        setQrMap(generated)
        setIsGenerating(false)
      }
    }

    generateAllQrs()

    return () => {
      isMounted = false
    }
  }, [open, tables, baseUrl, getTableUrl])

  // نسخ الرابط
  const handleCopyLink = () => {
    if (!currentTable) return
    const url = getTableUrl(currentTable.id)
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // تحميل صورة الـ QR الفردية
  const handleDownloadPng = () => {
    if (!currentTable || !qrMap[currentTable.id]) return
    const dataUrl = qrMap[currentTable.id]
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `table-${currentTable.name.replace(/\s+/g, "_")}-qr.png`
    link.click()
  }

  // طباعة طاولة فردية أو جميع الطاولات
  const handlePrint = (mode: "single" | "bulk") => {
    const restaurantName = settings?.restaurant_name || "مطعم ريسترو"
    const tablesToPrint = mode === "single" && currentTable ? [currentTable] : tables

    const printHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>ملصقات باركود الطاولات - ${restaurantName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800;900&display=swap');
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Rubik', sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            background: #fff;
            color: #0f172a;
            padding: 20px;
          }

          .print-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            page-break-inside: auto;
          }

          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
            .page-break {
              page-break-after: always;
            }
          }

          .sticker-card {
            border: 2px solid #e2e8f0;
            border-radius: 20px;
            padding: 24px;
            text-align: center;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
            position: relative;
            overflow: hidden;
          }

          .sticker-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 8px;
            background: linear-gradient(90deg, #f97316, #ea580c, #c2410c);
          }

          .brand-badge {
            font-size: 13px;
            font-weight: 700;
            color: #ea580c;
            background: #fff7ed;
            padding: 4px 14px;
            border-radius: 9999px;
            margin-bottom: 8px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          .table-title {
            font-size: 26px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 2px;
          }

          .table-location {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 14px;
            font-weight: 500;
          }

          .qr-wrapper {
            background: #ffffff;
            padding: 12px;
            border-radius: 16px;
            border: 1.5px solid #cbd5e1;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            margin-bottom: 14px;
          }

          .qr-img {
            width: 190px;
            height: 190px;
            display: block;
          }

          .action-badge {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 4px;
          }

          .action-sub {
            font-size: 11px;
            color: #64748b;
            line-height: 1.4;
          }

          .footer-url {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 10px;
            direction: ltr;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="print-grid">
          ${tablesToPrint
            .map((t) => {
              const qrSrc = qrMap[t.id] || ""
              const tableUrl = getTableUrl(t.id)
              return `
              <div class="sticker-card">
                <div class="brand-badge">🍽️ ${restaurantName}</div>
                <div class="table-title">${t.name}</div>
                <div class="table-location">${t.location || "الصالة الرئيسية"} • سعة ${t.capacity} أفراد</div>
                
                <div class="qr-wrapper">
                  <img class="qr-img" src="${qrSrc}" alt="QR Code" />
                </div>

                <div class="action-badge">امسح الباركود لطلب وجبتك 📱</div>
                <div class="action-sub">تصفح قائمة الطعام واطلب مباشرة من طاولتك دون انتظار</div>
                <div class="footer-url">${tableUrl}</div>
              </div>
            `
            })
            .join("")}
        </div>
      </body>
      </html>
    `

    const printFrame = document.createElement("iframe")
    printFrame.style.position = "fixed"
    printFrame.style.right = "0"
    printFrame.style.bottom = "0"
    printFrame.style.width = "0"
    printFrame.style.height = "0"
    printFrame.style.border = "none"
    document.body.appendChild(printFrame)

    const doc = printFrame.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(printHtml)
      doc.close()

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus()
          printFrame.contentWindow?.print()
        } catch {
          window.print()
        } finally {
          setTimeout(() => document.body.removeChild(printFrame), 2000)
        }
      }, 300)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-3 border-b bg-muted/20">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <QrCodeIcon className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">ملصقات باركود الطاولات (QR Code)</DialogTitle>
                  <DialogDescription className="text-xs">
                    توليد وطباعة ملصقات الـ QR ليقوم الزبائن بمسحها وطلب الطعام مباشرة من الصالة.
                  </DialogDescription>
                </div>
              </div>

              {/* اختيار النمط: طاولة فردية أو جماعي */}
              <div className="flex bg-muted p-0.5 rounded-lg border text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("single")}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === "single"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArmchairIcon className="w-3.5 h-3.5" />
                  <span>طاولة محددة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("bulk")}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    activeTab === "bulk"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayersIcon className="w-3.5 h-3.5" />
                  <span>جميع الطاولات ({tables.length})</span>
                </button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* إعداد رابط الموقع الأساسي */}
          <div className="rounded-xl border bg-muted/30 p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-foreground block mb-1">رابط متجر العملاء الأساسي:</span>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:3001"
                className="h-8 text-xs font-mono"
                dir="ltr"
              />
            </div>
            <div className="text-muted-foreground text-[11px] sm:max-w-xs leading-relaxed">
              يتم دمج هذا الرابط تلقائياً مع معرّف كل طاولة ليصبح: <br />
              <code className="text-primary font-mono text-[10px]" dir="ltr">
                {currentTable ? getTableUrl(currentTable.id) : `${baseUrl}/table/ID`}
              </code>
            </div>
          </div>

          {/* تبويب طاولة محددة */}
          {activeTab === "single" && (
            <div className="space-y-4">
              {/* قائمة اختيار الطاولة */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-semibold text-muted-foreground shrink-0">اختر الطاولة:</span>
                {tables.map((t) => {
                  const isSelected = t.id === selectedTableId
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTableId(t.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0 transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                          : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                      }`}
                    >
                      {t.name}
                    </button>
                  )
                })}
              </div>

              {/* بطاقة المعاينة للملصق */}
              {currentTable && (
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-6 rounded-2xl border-2 border-dashed border-border/80 bg-muted/10">
                  {/* ملصق الطاولة الواقعي كما سيظهر بالطباعة */}
                  <div className="w-64 rounded-2xl border-2 border-border/80 bg-card p-5 text-center shadow-lg relative overflow-hidden flex flex-col items-center">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
                    
                    <Badge variant="outline" className="mb-2 bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5">
                      🍽️ {settings?.restaurant_name || "مطعم ريسترو"}
                    </Badge>

                    <h3 className="text-2xl font-black text-foreground">{currentTable.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 font-medium">
                      {currentTable.location || "الصالة"} • سعة {currentTable.capacity} أفراد
                    </p>

                    {/* صورة الباركود */}
                    <div className="p-2.5 rounded-xl border bg-white shadow-xs mb-3">
                      {isGenerating || !qrMap[currentTable.id] ? (
                        <div className="w-40 h-40 flex items-center justify-center">
                          <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <img
                          src={qrMap[currentTable.id]}
                          alt={`QR ${currentTable.name}`}
                          className="w-40 h-40 object-contain block"
                        />
                      )}
                    </div>

                    <div className="text-xs font-bold text-foreground mb-0.5">امسح الباركود لطلب وجبتك 📱</div>
                    <div className="text-[10px] text-muted-foreground">تصفح المنيو واطلب من طاولتك فوراً</div>
                  </div>

                  {/* إجراءات سريعة للطاولة */}
                  <div className="space-y-3 w-full max-w-xs">
                    <div className="p-3.5 rounded-xl border bg-card text-xs space-y-2">
                      <div className="flex items-center justify-between font-semibold">
                        <span>معلومات الطاولة:</span>
                        <Badge variant="secondary" className="text-[10px]">{currentTable.location}</Badge>
                      </div>
                      <div className="text-muted-foreground leading-relaxed">
                        الباركود مرتبط مباشرة بقاعدة البيانات. بمجرد قيام الزبون بالمسح والطلب، يظهر الطلب في شاشة الكاشير والمطبخ مع اسم هذه الطاولة.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handlePrint("single")}
                        className="w-full gap-2 h-9.5 text-xs font-semibold"
                      >
                        <PrinterIcon className="w-4 h-4" />
                        <span>طباعة ملصق {currentTable.name}</span>
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={handleDownloadPng}
                          className="gap-1.5 h-9 text-xs"
                        >
                          <DownloadIcon className="w-3.5 h-3.5" />
                          <span>تحميل PNG</span>
                        </Button>

                        <Button
                          variant="outline"
                          onClick={handleCopyLink}
                          className="gap-1.5 h-9 text-xs"
                        >
                          {copied ? (
                            <>
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <CopyIcon className="w-3.5 h-3.5" />
                              <span>نسخ الرابط</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تبويب جميع الطاولات دفعة واحدة */}
          {activeTab === "bulk" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-card">
                <div>
                  <h4 className="text-sm font-bold">طباعة ورقة ملصقات لجميع الطاولات</h4>
                  <p className="text-xs text-muted-foreground">
                    سيتم تنسيق ملصقات كافة الطاولات ({tables.length} طاولة) جنباً إلى جنب في شبكة طباعة جاهزة للقص واللصق على الطاولات.
                  </p>
                </div>
                <Button
                  onClick={() => handlePrint("bulk")}
                  className="gap-2 shrink-0 font-semibold text-xs"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>طباعة الكل دفعة واحدة</span>
                </Button>
              </div>

              {/* معاينة شبكة الطاولات */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border bg-card text-center flex flex-col items-center shadow-2xs hover:border-primary/50 transition-all"
                  >
                    <div className="text-xs font-bold text-foreground mb-1">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground mb-2">{t.location}</div>
                    <div className="w-24 h-24 p-1.5 rounded-lg border bg-white mb-2 flex items-center justify-center">
                      {qrMap[t.id] ? (
                        <img src={qrMap[t.id]} alt={t.name} className="w-full h-full object-contain" />
                      ) : (
                        <Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-[9px] text-muted-foreground">امسح للطلب 📱</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>يمكن طباعة الملصقات على ورق لاصق مقاس A4 أو طابعات الباركود الحرارية.</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
