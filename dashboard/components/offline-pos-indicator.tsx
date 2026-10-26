"use client"

import * as React from "react"
import { useOfflineStore } from "@/store/offline.store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  WifiIcon,
  WifiOffIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  ClockIcon,
  Trash2Icon,
} from "lucide-react"

export function OfflinePosIndicator() {
  const {
    isOnline,
    pendingOrders,
    isSyncing,
    syncError,
    initNetworkListener,
    syncAllPendingOrders,
    removePendingOrder,
    clearSynced,
  } = useOfflineStore()

  const [openModal, setOpenModal] = React.useState(false)

  React.useEffect(() => {
    const cleanup = initNetworkListener()
    return cleanup
  }, [initNetworkListener])

  const unsyncedOrders = pendingOrders.filter((o) => o.status !== "synced")
  const syncedOrders = pendingOrders.filter((o) => o.status === "synced")

  const handleSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await syncAllPendingOrders()
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Network Status Badge */}
        {isOnline ? (
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-colors hover:bg-emerald-500/20 cursor-pointer shadow-2xs"
            title="انقر لعرض طابور المزامنة"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
            <WifiIcon className="size-3.5" />
            <span className="hidden sm:inline">متصل</span>
            {unsyncedOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono text-[10px] font-black">
                {unsyncedOrders.length}
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors hover:bg-amber-500/25 cursor-pointer shadow-2xs animate-pulse"
            title="انقر لعرض طابور المزامنة بدون اتصال"
          >
            <WifiOffIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>وضع عدم الاتصال</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white font-mono text-[10px] font-black">
              {unsyncedOrders.length}
            </span>
          </button>
        )}

        {/* Sync Button if there are unsynced orders and we are online */}
        {unsyncedOrders.length > 0 && isOnline && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSyncing}
            onClick={handleSyncClick}
            className="h-8 px-2.5 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10 rounded-lg shadow-2xs"
          >
            <RefreshCwIcon className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden md:inline">{isSyncing ? "جاري المزامنة..." : "مزامنة"}</span>
          </Button>
        )}
      </div>

      {/* Sync Queue Dialog */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-md sm:max-w-lg p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {isOnline ? (
                <WifiIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <WifiOffIcon className="size-5 text-amber-600 dark:text-amber-400" />
              )}
              <span>إدارة وضع عدم الاتصال (Offline POS)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {isOnline
                ? "أنت متصل بالإنترنت حالياً. يتم إرسال الطلبات للسيرفر مباشرة وتزامن الطلبات المحلية تلقائياً."
                : "الإنترنت منقطع حالياً. يمكنك الاستمرار في إنشاء الطلبات، وتجهيز الفواتير، وطباعتها بأمان محلياً."}
            </DialogDescription>
          </DialogHeader>

          {syncError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs flex items-center gap-2">
              <AlertTriangleIcon className="size-4 shrink-0" />
              <span>{syncError}</span>
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>طابور الطلبات المحلية</span>
                <span className="px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono text-[11px]">
                  {pendingOrders.length}
                </span>
              </h4>

              <div className="flex items-center gap-2">
                {syncedOrders.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSynced}
                    className="h-7 text-[11px] text-muted-foreground hover:text-rose-600"
                  >
                    مسح المتزامن
                  </Button>
                )}
                {unsyncedOrders.length > 0 && isOnline && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSyncing}
                    onClick={() => syncAllPendingOrders()}
                    className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground"
                  >
                    <RefreshCwIcon className={`size-3 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>مزامنة الكل الآن</span>
                  </Button>
                )}
              </div>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground border border-dashed rounded-xl flex flex-col items-center justify-center gap-2">
                <CheckCircle2Icon className="size-8 text-emerald-500 opacity-60" />
                <p className="text-xs font-semibold">لا توجد طلبات معلقة بدون اتصال. جميع العمليات متزامنة بالكامل!</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pe-1">
                {pendingOrders.map((order) => {
                  const isSynced = order.status === "synced"
                  const isSyncFailed = order.status === "failed"
                  const isSyncProcessing = order.status === "syncing"

                  return (
                    <div
                      key={order.id}
                      className="p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/20 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isSynced
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : isSyncFailed
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                : isSyncProcessing
                                ? "bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse"
                                : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            }`}
                          >
                            {isSynced
                              ? "تمت المزامنة"
                              : isSyncFailed
                              ? "فشلت المزامنة"
                              : isSyncProcessing
                              ? "جاري الرفع..."
                              : "بانتظار الاتصال"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>الإجمالي: <b className="text-foreground">{order.payload.total} ج.م</b></span>
                          <span>الأصناف: {order.payload.items?.length || 0}</span>
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <ClockIcon className="size-3" />
                            {new Date(order.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {order.lastError && (
                          <p className="text-[10px] text-rose-500 truncate max-w-xs">
                            {order.lastError}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isSynced && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePendingOrder(order.id)}
                            className="size-7 text-muted-foreground hover:text-rose-600"
                            title="حذف الطلب المحلي"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
