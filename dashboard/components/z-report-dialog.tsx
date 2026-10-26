"use client"

import * as React from "react"
import { type ZReportData, type Shift } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PrinterIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  DollarSignIcon,
  FileTextIcon,
  LandmarkIcon,
  UserIcon,
} from "lucide-react"

interface ZReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  zReport: ZReportData | null
  shift?: Shift | null
}

export function ZReportDialog({ open, onOpenChange, zReport, shift }: ZReportDialogProps) {
  if (!zReport) return null

  const currency = zReport.currency || "ج.م"
  const diff = zReport.cash_drawer?.difference ?? 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2 border-b border-border/50">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            <LandmarkIcon className="size-3.5 text-primary" />
            <span>{zReport.restaurant_name}</span>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            تقرير تقفيل الوردية اليومي (Z-Report)
          </DialogTitle>
          <DialogDescription className="text-xs font-mono text-muted-foreground">
            رقم التقرير: <span className="font-bold text-foreground">{zReport.z_report_number}</span>
          </DialogDescription>
        </DialogHeader>

        {/* جسم التقرير بتنسيق الإيصال الحراري الرسمي */}
        <div id="z-report-printable" className="space-y-3.5 text-xs pt-1">
          {/* معلومات الوردية والمسؤول */}
          <div className="bg-muted/40 p-2.5 rounded-xl border border-border/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <UserIcon className="size-3" />
                الكاشير المسؤول:
              </span>
              <span className="font-semibold text-foreground">{zReport.cashier_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <LandmarkIcon className="size-3" />
                الخزينة / الدرج:
              </span>
              <span className="font-medium text-foreground">{zReport.register_name}</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] pt-0.5 border-t border-border/40">
              <span className="text-muted-foreground">وقت الفتح:</span>
              <span>{zReport.opened_at || "—"}</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">وقت الإغلاق:</span>
              <span>{zReport.closed_at || "مفتوحة الآن"}</span>
            </div>
          </div>

          {/* مبيعات الوردية الإجمالية */}
          <div className="space-y-1.5 p-2.5 rounded-xl border border-border/60 bg-background">
            <div className="flex items-center justify-between font-bold text-xs pb-1 border-b border-border/50">
              <span>إجمالي المبيعات المحصلة</span>
              <span className="text-primary text-sm font-mono font-bold">
                {zReport.sales?.total?.toFixed(2)} {currency}
              </span>
            </div>
            <div className="space-y-1 text-muted-foreground text-[11px] pt-0.5">
              <div className="flex items-center justify-between">
                <span>• مبيعات نقداً (Cash):</span>
                <span className="font-mono text-foreground">{zReport.sales?.cash?.toFixed(2)} {currency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• مبيعات بطاقة وشبكة (Card):</span>
                <span className="font-mono text-foreground">{zReport.sales?.card?.toFixed(2)} {currency}</span>
              </div>
              {zReport.sales?.transfer > 0 && (
                <div className="flex items-center justify-between">
                  <span>• تحويلات بنكية ومحافظ:</span>
                  <span className="font-mono text-foreground">{zReport.sales?.transfer?.toFixed(2)} {currency}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-border/40 font-medium">
                <span>عدد الطلبات المكتملة:</span>
                <span className="font-mono text-foreground">{zReport.sales?.orders_count || 0} طلب</span>
              </div>
            </div>
          </div>

          {/* حركات السندات النقدية */}
          {(zReport.movements?.cash_receipts > 0 || zReport.movements?.cash_expenses > 0) && (
            <div className="space-y-1 p-2.5 rounded-xl border border-border/60 bg-muted/20 text-[11px]">
              <div className="font-semibold text-foreground text-xs pb-1 border-b border-border/40">
                حركات السندات أثناء الوردية
              </div>
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span>+ سندات قبض نقدية:</span>
                <span className="font-mono font-bold">+{zReport.movements.cash_receipts?.toFixed(2)} {currency}</span>
              </div>
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                <span>- سندات صرف ومصاريف:</span>
                <span className="font-mono font-bold">-{zReport.movements.cash_expenses?.toFixed(2)} {currency}</span>
              </div>
            </div>
          )}

          {/* مطابقة الدرج وحساب العجز أو الفائض */}
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="font-bold text-xs text-foreground flex items-center justify-between pb-1 border-b border-primary/10">
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-4 text-primary" />
                مطابقة درج النقدية (Cash Drawer)
              </span>
              {diff === 0 ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold">
                  مطابقة تامة
                </Badge>
              ) : diff > 0 ? (
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold">
                  فائض (+{diff.toFixed(2)})
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30 font-bold">
                  عجز ({diff.toFixed(2)})
                </Badge>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>العهدة النقدية الافتتاحية:</span>
                <span className="font-mono text-foreground">{zReport.cash_drawer?.starting?.toFixed(2)} {currency}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>النقدية المتوقعة بالدرج:</span>
                <span className="font-mono">{zReport.cash_drawer?.expected?.toFixed(2)} {currency}</span>
              </div>
              {zReport.cash_drawer?.actual !== null && zReport.cash_drawer?.actual !== undefined && (
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span>النقدية الفعلية المحصية:</span>
                  <span className="font-mono text-sm">{zReport.cash_drawer.actual.toFixed(2)} {currency}</span>
                </div>
              )}
              {zReport.cash_drawer?.difference !== null && zReport.cash_drawer?.difference !== undefined && (
                <div
                  className={`flex items-center justify-between font-bold text-xs pt-1 border-t border-primary/20 ${
                    diff === 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : diff > 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <span>الفارق (العجز / الزيادة):</span>
                  <span className="font-mono text-sm">
                    {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {currency}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ملاحظات الإغلاق */}
          {zReport.notes?.closing && (
            <div className="text-[11px] bg-muted/30 p-2 rounded-lg border border-border/50 text-muted-foreground">
              <span className="font-semibold text-foreground">ملاحظات الكاشير: </span>
              {zReport.notes.closing}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs rounded-lg"
          >
            <PrinterIcon className="size-3.5" />
            <span>طباعة الإيصال (Print)</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-lg font-bold"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
