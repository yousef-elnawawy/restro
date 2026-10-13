import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground select-none">
      <div className="flex items-center gap-4 sm:gap-6">
        <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          404
        </h1>
        <div className="h-8 w-[1px] bg-border" />
        <h2 className="text-sm font-normal text-muted-foreground sm:text-base">
          لم يتم العثور على هذه الصفحة.
        </h2>
      </div>

      <div className="mt-6">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
        >
          العودة إلى لوحة التحكم
        </Link>
      </div>
    </div>
  )
}
