"use client"

import * as React from "react"
import { type ReceiptPrintData } from "@/lib/receipt-printer"
import { cn } from "cn"

import { useSettingStore } from "@/store/setting.store"

interface ThermalReceiptCardProps {
  data: ReceiptPrintData
  className?: string
  restaurantName?: string
  phone?: string
  address?: string
  taxNumber?: string
  currency?: string
  taxRate?: number
  footerNote?: string
}

export function ThermalReceiptCard({
  data,
  className,
  restaurantName,
  phone,
  address,
  taxNumber,
  currency,
  taxRate,
  footerNote,
}: ThermalReceiptCardProps) {
  const settings = useSettingStore((state) => state.settings)

  const activeName = restaurantName ?? settings?.restaurant_name ?? "مطعم وكافيه ريسترو"
  const activePhone = phone ?? settings?.restaurant_phone ?? "01000000000 / 01100000000"
  const activeAddress = address ?? settings?.restaurant_address ?? "الفرع الرئيسي - الصالة والمطعم"
  const activeTaxNumber = taxNumber ?? settings?.tax_number ?? "301-482-991"
  const activeCurrency = currency ?? settings?.currency ?? "ج.م"
  const activeTaxRate = taxRate !== undefined ? taxRate : (settings?.tax_percentage ?? 14)
  const activeFooter = footerNote ?? settings?.receipt_footer ?? "شكراً لزيارتكم ونتمنى لكم يوماً سعيداً!"

  const formattedDate = data.created_at
    ? new Date(data.created_at).toLocaleDateString("ar-EG")
    : new Date().toLocaleDateString("ar-EG")

  const formattedTime = data.created_at
    ? new Date(data.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })

  const orderTypeArabic =
    data.order_type === "dinein"
      ? `طاولة: ${data.table?.name || "صالة"}${data.table?.location ? ` (${data.table.location})` : ""}`
      : data.order_type === "takeaway"
      ? "سفري مباشر"
      : `توصيل${data.customer_name ? ` (${data.customer_name})` : ""}`

  const paymentMethodText =
    data.payment_method === "card"
      ? "بطاقة بنكية / فيزا"
      : data.payment_method === "transfer"
      ? "تحويل بنكي"
      : "نقدي (كاش)"

  return (
    <div
      className={cn(
        "bg-white text-black font-mono text-xs p-4 rounded-sm border border-neutral-300 shadow-sm max-w-[340px] mx-auto select-none text-right transition-all",
        className
      )}
      dir="rtl"
    >
      {/* ترويسة الفاتورة */}
      <div className="text-center space-y-0.5 pb-2">
        <h3 className="font-extrabold text-base tracking-wide text-black">{activeName}</h3>
        <p className="text-[10px] font-bold text-neutral-800">RESTRO RESTAURANT & POS</p>
        <p className="text-[10px] text-neutral-700">{activeAddress}</p>
        <p className="text-[10px] text-neutral-700">هاتف: {activePhone}</p>
        <p className="text-[10px] text-neutral-700">الرقم الضريبي: {activeTaxNumber}</p>
        <p className="text-[11px] font-bold text-black pt-1">فاتورة ضريبية مبسطة</p>
      </div>

      {/* فاصل مزدوج منقط */}
      <div className="border-t-2 border-dashed border-black my-2" />

      {/* بيانات الفاتورة */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="font-bold">رقم الفاتورة:</span>
          <span className="font-bold text-black tracking-wider">{data.order_number}</span>
        </div>
        <div className="flex justify-between items-center text-neutral-800">
          <span>التاريخ والوقت:</span>
          <span>{formattedDate} {formattedTime}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold">نوع الطلب:</span>
          <span className="font-bold text-black">{orderTypeArabic}</span>
        </div>
        {data.customer_name && (
          <div className="flex justify-between items-center text-neutral-800">
            <span>العميل:</span>
            <span>{data.customer_name}</span>
          </div>
        )}
        {data.order_type === "delivery" && data.delivery_address && (
          <div className="flex justify-between items-center text-neutral-800">
            <span className="font-bold">العنوان:</span>
            <span className="font-semibold text-black">{data.delivery_address}</span>
          </div>
        )}
        {data.order_type === "delivery" && data.delivery_distance && (
          <div className="flex justify-between items-center text-neutral-800">
            <span>المسافة:</span>
            <span className="font-mono">{data.delivery_distance} كم</span>
          </div>
        )}
        {data.cash_register && (
          <div className="flex justify-between items-center text-neutral-800">
            <span>الخزينة:</span>
            <span>{data.cash_register.name}</span>
          </div>
        )}
      </div>

      {/* فاصل منقط */}
      <div className="border-t border-dashed border-black my-2" />

      {/* ترويسة جدول الأصناف */}
      <div className="grid grid-cols-12 text-[11px] font-bold pb-1 border-b border-dashed border-black">
        <span className="col-span-6 text-right">الصنف</span>
        <span className="col-span-3 text-center">الكمية</span>
        <span className="col-span-3 text-left">الإجمالي</span>
      </div>

      {/* قائمة الأصناف */}
      <div className="divide-y divide-dashed divide-neutral-300 py-1">
        {data.items.map((item, idx) => (
          <div key={idx} className="py-1.5 space-y-0.5">
            <div className="grid grid-cols-12 items-start text-[11.5px]">
              <div className="col-span-6 font-bold text-black">
                {item.product_name}
              </div>
              <div className="col-span-3 text-center font-mono text-neutral-800">
                {item.quantity} x {Number(item.unit_price).toFixed(2)}
              </div>
              <div className="col-span-3 text-left font-bold font-mono text-black">
                {Number(item.total_price).toFixed(2)}
              </div>
            </div>

            {/* الحجم */}
            {item.size_name && (
              <p className="text-[10px] text-neutral-700 pe-2">
                حجم: {item.size_name}
              </p>
            )}

            {/* الإضافات */}
            {item.selected_extras && item.selected_extras.length > 0 && (
              <p className="text-[10px] text-neutral-700 pe-2">
                + {item.selected_extras.map((e) => `${e.name} (${e.price} ${activeCurrency})`).join("، ")}
              </p>
            )}

            {/* الملاحظات */}
            {item.notes && (
              <p className="text-[10px] italic text-neutral-700 pe-2">
                ملاحظة: {item.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* فاصل منقط */}
      <div className="border-t border-dashed border-black my-2" />

      {/* الحسابات الفرعية */}
      <div className="space-y-1 text-[11.5px]">
        <div className="flex justify-between">
          <span>عدد الأصناف:</span>
          <span className="font-bold">{data.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
        </div>
        <div className="flex justify-between text-neutral-800">
          <span>المجموع الفرعي:</span>
          <span>{Number(data.subtotal).toFixed(2)} {activeCurrency}</span>
        </div>
        <div className="flex justify-between text-neutral-800">
          <span>ضريبة القيمة المضافة ({activeTaxRate}%):</span>
          <span>{Number(data.tax).toFixed(2)} {activeCurrency}</span>
        </div>
        {data.order_type === "delivery" && Number(data.delivery_fee || 0) > 0 && (
          <div className="flex justify-between text-neutral-900 font-bold">
            <span>رسوم التوصيل{data.delivery_distance ? ` (${data.delivery_distance} كم)` : ""}:</span>
            <span className="font-mono">+{Number(data.delivery_fee).toFixed(2)} {activeCurrency}</span>
          </div>
        )}
      </div>

      {/* فاصل مزدوج */}
      <div className="border-t-2 border-dashed border-black my-2" />

      {/* الإجمالي النهائي البارز */}
      <div className="flex justify-between items-center text-sm font-extrabold py-0.5 text-black">
        <span>الإجمالي النهائي:</span>
        <span className="text-base font-mono">{Number(data.total).toFixed(2)} {activeCurrency}</span>
      </div>

      {/* فاصل مزدوج */}
      <div className="border-t-2 border-dashed border-black my-2" />

      {/* تفاصيل السداد */}
      <div className="space-y-1 text-[11px] text-neutral-900">
        <div className="flex justify-between">
          <span>حالة السداد:</span>
          <span className="font-bold">
            {data.payment_status === "paid"
              ? "مدفوع بالكامل ✓"
              : data.payment_status === "partially_paid"
              ? "مدفوع جزئياً ⏳"
              : "غير مدفوع ✕"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>طريقة الدفع:</span>
          <span className="font-bold">{paymentMethodText}</span>
        </div>
        {data.paid_at && (
          <div className="flex justify-between text-neutral-700">
            <span>تاريخ السداد:</span>
            <span>{new Date(data.paid_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}
      </div>

      {/* فاصل منقط */}
      <div className="border-t border-dashed border-black my-2" />

      {/* باركود رمزي ورسالة الشكر */}
      <div className="text-center pt-1 space-y-1">
        <div className="tracking-[3px] font-mono font-bold text-lg select-none text-black">
          ||||| | |||| ||| |||||| |||| |||
        </div>
        <div className="text-[10px] text-neutral-800 font-mono">*{data.order_number}*</div>
        <p className="text-[10.5px] font-medium pt-1 text-black">{activeFooter}</p>
        <p className="text-[9.5px] text-neutral-600">الأسعار تشمل {activeTaxRate}% ضريبة القيمة المضافة</p>
      </div>
    </div>
  )
}
