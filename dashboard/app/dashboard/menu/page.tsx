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
              className="h-8.5 px-3 rounded-lg text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <PlusIcon className="size-3.5" />
              <span>إضافة طبق جديد</span>
            </Button>
          </Link>
        </div>
      }
    >
      {/* بطاقات أقسام المنيو */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* الأقسام */}
        <Link href="/dashboard/menu/categories" className="block">
          <div className="flex items-center justify-between p-4 rounded-xl bg-card shadow-xs border border-border/60 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LayersIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">أقسام المنيو</h3>
                <span className="text-xs text-muted-foreground font-mono font-medium">
                  {mounted ? categories.length : 0} قسم
                </span>
              </div>
            </div>
            <ArrowLeftIcon className="size-4 text-muted-foreground" />
          </div>
        </Link>

        {/* المنتجات والأطباق */}
        <Link href="/dashboard/menu/products" className="block">
          <div className="flex items-center justify-between p-4 rounded-xl bg-card shadow-xs border border-border/60 hover:border-amber-500/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <UtensilsCrossedIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">المنتجات والأطباق</h3>
                <span className="text-xs text-muted-foreground font-mono font-medium">
                  {mounted ? (counts?.total ?? pagination?.total ?? products.length) : 0} طبق
                </span>
              </div>
            </div>
            <ArrowLeftIcon className="size-4 text-muted-foreground" />
          </div>
        </Link>

        {/* خيارات وإضافات الأطباق */}
        <Link href="/dashboard/menu/options" className="block">
          <div className="flex items-center justify-between p-4 rounded-xl bg-card shadow-xs border border-border/60 hover:border-indigo-500/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <SlidersHorizontalIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">خيارات وإضافات الأطباق</h3>
                <span className="text-xs text-muted-foreground font-mono font-medium">
                  {mounted ? modifiers.length : 0} خيار
                </span>
              </div>
            </div>
            <ArrowLeftIcon className="size-4 text-muted-foreground" />
          </div>
        </Link>
      </div>
    </PageContainer>
  )
}

