"use client"

import * as React from "react"
import Link from "next/link"
import { PageContainer } from "@/components/page-container"
import { Button } from "@/components/ui/button"
import { useCategoryStore } from "@/store/category.store"
import { useProductStore } from "@/store/product.store"
import { useModifierStore } from "@/store/modifier.store"
import {
  LayersIcon,
  UtensilsCrossedIcon,
  SlidersHorizontalIcon,
  ArrowLeftIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react"

export default function MenuOverviewPage() {
  const [mounted, setMounted] = React.useState(false)
  const { categories, fetchCategories } = useCategoryStore()
  const { products, counts, pagination, fetchProducts } = useProductStore()
  const { modifiers, fetchModifiers } = useModifierStore()

  React.useEffect(() => {
    setMounted(true)
    if (categories.length === 0) fetchCategories()
    if (products.length === 0) fetchProducts({ page: 1, per_page: 12 })
    if (modifiers.length === 0) fetchModifiers()
  }, [categories.length, products.length, modifiers.length, fetchCategories, fetchProducts, fetchModifiers])

  return (
    <PageContainer
      title="إدارة المنيو"
      description="نظام إدارة قائمة الطعام المتكامل: الأقسام، المنتجات والأطباق، وخيارات الإضافات"
      action={
        <div className="flex items-center gap-2">
          <Link href="/dashboard/menu/products">
            <Button
              size="sm"
              className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
            >
              <PlusIcon className="size-4" />
              <span>إضافة طبق جديد</span>
            </Button>
          </Link>
        </div>
      }
    >
      {/* بطاقات خطوات المنيو الثلاث الموحدة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* الخطوة الأولى: الأقسام */}
        <Link href="/dashboard/menu/categories" className="group block">
          <div className="flex flex-col justify-between h-full p-4 sm:p-4.5 rounded-xl bg-card shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/60 hover:border-primary/40 overflow-hidden">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                  <LayersIcon className="size-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/15 text-primary">
                  الخطوة 1 • {mounted ? categories.length : 0} أقسام
                </span>
              </div>

              <div className="mt-3.5 space-y-1 text-right">
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <span>أقسام المنيو</span>
                  <ArrowLeftIcon className="size-3.5 group-hover:-translate-x-1 transition-transform text-muted-foreground group-hover:text-primary" />
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  تنظيم قائمة المطعم إلى تصنيفات (برجر، بيتزا، مقبلات، مشروبات...)
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/20 -mx-4.5 -mb-4.5 px-4.5 py-2.5 border-t border-border/40">
              <span className="font-medium text-emerald-600 dark:text-emerald-400 text-[11px]">الحالة: مهيأة</span>
              <span className="text-primary font-bold group-hover:underline text-[11px]">إدارة الأقسام ←</span>
            </div>
          </div>
        </Link>

        {/* الخطوة الثانية: المنتجات والأطباق */}
        <Link href="/dashboard/menu/products" className="group block">
          <div className="flex flex-col justify-between h-full p-4 sm:p-4.5 rounded-xl bg-card shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/60 hover:border-amber-500/40 overflow-hidden">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <UtensilsCrossedIcon className="size-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  الخطوة 2 • {mounted ? (counts?.total ?? pagination?.total ?? products.length) : 0} أطباق
                </span>
              </div>

              <div className="mt-3.5 space-y-1 text-right">
                <h3 className="text-sm font-bold text-foreground group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                  <span>المنتجات والأطباق</span>
                  <ArrowLeftIcon className="size-3.5 group-hover:-translate-x-1 transition-transform text-muted-foreground group-hover:text-amber-600" />
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  إضافة الأطباق والوجبات وتحديد أسعارها والصور المتعددة والأحجام.
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/20 -mx-4.5 -mb-4.5 px-4.5 py-2.5 border-t border-border/40">
              <span className="text-[11px]">الأطباق والأسعار</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold group-hover:underline text-[11px]">إدارة الأطباق ←</span>
            </div>
          </div>
        </Link>

        {/* الخطوة الثالثة: إضافات وخيارات الأطباق */}
        <Link href="/dashboard/menu/options" className="group block">
          <div className="flex flex-col justify-between h-full p-4 sm:p-4.5 rounded-xl bg-card shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/60 hover:border-indigo-500/40 overflow-hidden">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                  <SlidersHorizontalIcon className="size-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  الخطوة 3 • {mounted ? modifiers.length : 0} خيارات
                </span>
              </div>

              <div className="mt-3.5 space-y-1 text-right">
                <h3 className="text-sm font-bold text-foreground group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                  <span>خيارات وإضافات الأطباق</span>
                  <ArrowLeftIcon className="size-3.5 group-hover:-translate-x-1 transition-transform text-muted-foreground group-hover:text-indigo-600" />
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  تحديد الإضافات الاختيارية (مثل: جبن إضافي، أحجام، صلصات) وتكلفتها.
                </p>
              </div>
            </div>

            <div className="pt-3 mt-3.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/20 -mx-4.5 -mb-4.5 px-4.5 py-2.5 border-t border-border/40">
              <span className="text-[11px]">التخصيص والإضافات</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline text-[11px]">إدارة الخيارات ←</span>
            </div>
          </div>
        </Link>
      </div>
    </PageContainer>
  )
}

