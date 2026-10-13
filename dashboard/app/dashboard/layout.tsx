import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { RealtimeListener } from "@/components/realtime-listener"
import { RouteGuard } from "@/components/route-guard"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  if (!token) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 max-w-full overflow-x-hidden">
        <RealtimeListener />
        <DashboardHeader />
        <RouteGuard>
          <div className="flex flex-1 flex-col gap-3 p-2 sm:p-3 pt-2.5 sm:pt-3 min-w-0 max-w-full overflow-x-hidden">
            {children}
          </div>
        </RouteGuard>
      </SidebarInset>
    </SidebarProvider>
  )
}
