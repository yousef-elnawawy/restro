"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import {
  LayoutDashboardIcon,
  ClipboardListIcon,
  ReceiptIcon,
  BookOpenIcon,
  Settings2Icon,
  LifeBuoyIcon,
  ExternalLinkIcon,
  UtensilsIcon,
  ArmchairIcon,
  LandmarkIcon,
  UsersIcon,
  TruckIcon,
  ChefHatIcon,
  BarChart3Icon,
  BellIcon,
  ShieldCheckIcon,
} from "lucide-react"

const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001"

const data = {
  user: {
    name: "مدير المطعم",
    email: "المدير العام",
    avatar: "/avatars/admin.jpg",
  },

  navMain: [
    {
      title: "الرئيسية",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },

    {
      title: "نقطة البيع (الكاشير)",
      url: "/dashboard/pos",
      icon: <ReceiptIcon />,
    },

    {
      title: "شاشة المطبخ (KDS)",
      url: "/dashboard/kitchen",
      icon: <ChefHatIcon />,
    },

    {
      title: "إدارة الطاولات",
      url: "/dashboard/tables",
      icon: <ArmchairIcon />,
    },

    {
      title: "الخزائن المالية",
      url: "/dashboard/registers",
      icon: <LandmarkIcon />,
    },

    {
      title: "الطلبات",
      url: "/dashboard/orders",
      icon: <ClipboardListIcon />,
    },

    {
      title: "تقارير المبيعات",
      url: "/dashboard/reports",
      icon: <BarChart3Icon />,
    },

    {
      title: "العملاء",
      url: "/dashboard/customers",
      icon: <UsersIcon />,
    },

    {
      title: "التوصيل والديليفري",
      url: "/dashboard/delivery",
      icon: <TruckIcon />,
    },

    {
      title: "المنيو",
      url: "/dashboard/menu",
      icon: <BookOpenIcon />,
      items: [
        {
          title: "نظرة عامة",
          url: "/dashboard/menu",
        },
        {
          title: "الأقسام",
          url: "/dashboard/menu/categories",
        },
        {
          title: "المنتجات والأطباق",
          url: "/dashboard/menu/products",
        },
        {
          title: "الإضافات والخيارات",
          url: "/dashboard/menu/options",
        },
      ],
    },

    {
      title: "الموظفون والصلاحيات",
      url: "/dashboard/staff",
      icon: <ShieldCheckIcon />,
    },

    {
      title: "الإعدادات",
      url: "/dashboard/settings",
      icon: <Settings2Icon />,
    },
  ],

  navSecondary: [
    {
      title: "الإشعارات",
      url: "/dashboard/notifications",
      icon: <BellIcon />,
    },

    {
      title: "المساعدة",
      url: "/dashboard/help",
      icon: <LifeBuoyIcon />,
    },

    {
      title: "الموقع الإلكتروني للمطعم",
      url: frontendUrl,
      icon: <ExternalLinkIcon />,
      external: true,
    },
  ],
}

import { useAuthStore } from "@/store/auth.store"

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((state) => state.user)
  const role = user?.role || "admin"

  const filteredNavMain = React.useMemo(() => {
    if (role === "kitchen") {
      return data.navMain.filter((item) =>
        ["/dashboard/kitchen", "/dashboard/orders"].includes(item.url)
      )
    }

    if (role === "cashier") {
      return data.navMain.filter((item) =>
        [
          "/dashboard/pos",
          "/dashboard/tables",
          "/dashboard/orders",
          "/dashboard/delivery",
          "/dashboard/customers",
          "/dashboard/registers",
        ].includes(item.url)
      )
    }

    if (role === "delivery") {
      return data.navMain.filter((item) =>
        ["/dashboard/delivery"].includes(item.url)
      )
    }

    // Admin has everything
    return data.navMain
  }, [role])

  const defaultHomeUrl =
    role === "kitchen"
      ? "/dashboard/kitchen"
      : role === "cashier"
      ? "/dashboard/pos"
      : role === "delivery"
      ? "/dashboard/delivery"
      : "/dashboard"

  const roleLabel =
    role === "kitchen"
      ? "رئيس المطبخ (KDS)"
      : role === "cashier"
      ? "كاشير الصالة"
      : role === "delivery"
      ? "كابتن التوصيل (Driver)"
      : "إدارة المطعم"

  return (
    <Sidebar
      side="right"
      dir="rtl"
      variant="inset"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href={defaultHomeUrl} />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <UtensilsIcon className="size-4" />
              </div>

              <div className="grid flex-1 text-right text-sm leading-tight">
                <span className="truncate font-medium">
                  ريسترو
                </span>

                <span className="truncate text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={filteredNavMain} />

        <NavSecondary
          items={data.navSecondary}
          className="mt-auto"
        />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name || (role === "kitchen" ? "رئيس المطبخ" : role === "cashier" ? "كاشير الصالة" : "مدير المطعم"),
            email: user?.email || (role === "kitchen" ? "chef@restro.com" : role === "cashier" ? "cashier@restro.com" : "admin@restro.com"),
            avatar: "/avatars/admin.jpg",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
