"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/components/theme-provider"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth.store"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  ChevronsUpDownIcon,
  UserIcon,
  SettingsIcon,
  ExternalLinkIcon,
  BellIcon,
  LogOutIcon,
  SunIcon,
} from "lucide-react"

export function NavUser({
  user: defaultUser,
}: {
  user?: {
    name: string
    email: string
    avatar: string
  }
}) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const authUser = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const initializeAuth = useAuthStore((state) => state.initialize)

  useEffect(() => {
    setMounted(true)
    initializeAuth()
  }, [initializeAuth])

  const displayName = authUser?.name || defaultUser?.name || "مدير المطعم"
  const displayEmail = authUser?.email || defaultUser?.email || "admin@restro.com"
  const displayAvatar = defaultUser?.avatar || "/avatars/admin.jpg"

  const handleLogout = async () => {
    await logout()
    window.location.replace("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-muted"
              />
            }
          >
            <Avatar>
              <AvatarImage
                src={displayAvatar}
                alt={displayName}
              />
              <AvatarFallback>{displayName.slice(0, 2)}</AvatarFallback>
            </Avatar>

            <div className="grid flex-1 text-right text-sm leading-tight">
              <span className="truncate font-medium">
                {displayName}
              </span>

              <span className="truncate text-xs text-muted-foreground">
                {displayEmail}
              </span>
            </div>

            <ChevronsUpDownIcon className="ms-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "left"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-right text-sm">
                  <Avatar>
                    <AvatarImage
                      src={displayAvatar}
                      alt={displayName}
                    />
                    <AvatarFallback>{displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-right text-sm leading-tight">
                    <span className="truncate font-medium">
                      {displayName}
                    </span>

                    <span className="truncate text-xs text-muted-foreground">
                      {displayEmail}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                render={
                  <Link href="/dashboard/profile" />
                }
              >
                <UserIcon />
                <span>الملف الشخصي</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                render={
                  <Link href="/dashboard/settings" />
                }
              >
                <SettingsIcon />
                <span>إعدادات النظام</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                render={
                  <Link
                    href={process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001"}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLinkIcon />
                <span>الموقع الإلكتروني</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                render={
                  <Link href="/dashboard/notifications" />
                }
              >
                <BellIcon />
                <span>الإشعارات</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem
  onSelect={(event) => event.preventDefault()}
  className="cursor-default"
>
  <SunIcon />

  <span className="flex-1">
    المظهر الداكن
  </span>

  {mounted && (
    <Switch
      checked={theme === "dark"}
      onCheckedChange={(checked) => {
        setTheme(checked ? "dark" : "light")
      }}
      onClick={(event) => event.stopPropagation()}
    />
  )}
</DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOutIcon />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
