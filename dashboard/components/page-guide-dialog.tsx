"use client"

import * as React from "react"
import { type PageGuide } from "@/lib/page-guides"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SparklesIcon,
  HelpCircleIcon,
  CheckCircle2Icon,
  LightbulbIcon,
  ListOrderedIcon,
  LayersIcon,
  ArrowRightIcon,
  BookOpenIcon,
} from "lucide-react"

interface PageGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guide: PageGuide | null
}

export function PageGuideDialog({
  open,
  onOpenChange,
  guide,
}: PageGuideDialogProps) {
  if (!guide) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl border border-border/80 bg-card">
        {/* رأس النافذة */}
        <DialogHeader className="p-4 sm:p-5 pb-3.5 border-b border-border/40 shrink-0 bg-muted/20 text-right">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ring-4 ring-primary/5">
                <BookOpenIcon className="size-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    دليل استخدام: {guide.title}
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                    {guide.badge}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {guide.subtitle}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* جسم الدليل التفاعلي */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4 text-xs text-right">
          {/* نبذة عن الصفحة */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 text-foreground leading-relaxed flex items-start gap-2.5">
            <SparklesIcon className="size-4.5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">{guide.summary}</p>
          </div>

          {/* تبويبات الشرح */}
          <Tabs defaultValue="steps" className="space-y-3.5">
            <TabsList className="grid grid-cols-3 p-1 rounded-xl bg-muted/60 h-10 border border-border/50">
              <TabsTrigger value="steps" className="gap-1.5 rounded-lg text-xs font-bold">
                <ListOrderedIcon className="size-3.5 text-primary" />
                <span>خطوات الاستخدام</span>
              </TabsTrigger>
              <TabsTrigger value="features" className="gap-1.5 rounded-lg text-xs font-bold">
                <LayersIcon className="size-3.5 text-primary" />
                <span>أهم الوظائف</span>
              </TabsTrigger>
              <TabsTrigger value="tips" className="gap-1.5 rounded-lg text-xs font-bold">
                <LightbulbIcon className="size-3.5 text-amber-500" />
                <span>نصائح وتوجيهات</span>
              </TabsTrigger>
            </TabsList>

            {/* 1. خطوات الاستخدام خطوة بخطوة */}
            <TabsContent value="steps" className="space-y-2.5 mt-0">
              {guide.quickSteps.map((s) => (
                <div
                  key={s.step}
                  className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-colors shadow-xs"
                >
                  <span className="flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-xs">
                    {s.step}
                  </span>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-xs text-foreground">{s.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* 2. أهم المزايا والوظائف */}
            <TabsContent value="features" className="space-y-2.5 mt-0">
              {guide.keyFeatures.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div className="flex size-5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2Icon className="size-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-xs text-foreground">{f.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* 3. نصائح تشغيلية للمطعم */}
            <TabsContent value="tips" className="space-y-2.5 mt-0">
              {guide.proTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-foreground shadow-xs"
                >
                  <div className="flex size-5 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <LightbulbIcon className="size-3.5" />
                  </div>
                  <p className="text-xs font-medium leading-relaxed">{tip}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* شريط الإجراء السفلي */}
        <DialogFooter className="p-4 sm:p-5 pt-3 border-t border-border/40 bg-muted/20 shrink-0 flex items-center justify-between sm:justify-between gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
            <HelpCircleIcon className="size-3.5 text-primary" />
            <span>يمكنك فتح هذا الدليل مجدداً في أي وقت عبر علامة (i).</span>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs gap-1.5 font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <CheckCircle2Icon className="size-3.5" />
            <span>فهمت ذلك، استمرار العمل</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
