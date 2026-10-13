"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

type NavItem = {
  title: string
  url: string
  icon: React.ReactNode
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}

function NavMainCollapsibleItem({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const isItemActive = pathname === item.url
  const hasActiveChild = item.items?.some((sub) => sub.url === pathname)
  const [open, setOpen] = React.useState(
    Boolean(item.isActive || isItemActive || hasActiveChild)
  )

  // فتح القائمة المنسدلة تلقائياً عند زيارة صفحة فرعية تابعة لها
  React.useEffect(() => {
    if (hasActiveChild || isItemActive) {
      setOpen(true)
    }
  }, [hasActiveChild, isItemActive])

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<SidebarMenuItem />}
    >
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isItemActive}
        render={<Link href={item.url} />}
      >
        {item.icon}
        <span>{item.title}</span>
      </SidebarMenuButton>

      <CollapsibleTrigger
        render={
          <SidebarMenuAction className="transition-transform duration-200 aria-expanded:rotate-90 rtl:aria-expanded:-rotate-90" />
        }
      >
        <ChevronRightIcon className="rtl:rotate-180 transition-transform duration-200" />
        <span className="sr-only">تبديل القائمة</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.items?.map((subItem) => {
            const isSubActive = pathname === subItem.url
            return (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  isActive={isSubActive}
                  render={<Link href={subItem.url} />}
                >
                  <span>{subItem.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

function NavMainSimpleItem({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const isItemActive = pathname === item.url

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isItemActive}
        render={<Link href={item.url} />}
      >
        {item.icon}
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>القائمة الرئيسية</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <NavMainCollapsibleItem
              key={item.title}
              item={item}
              pathname={pathname}
            />
          ) : (
            <NavMainSimpleItem
              key={item.title}
              item={item}
              pathname={pathname}
            />
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
