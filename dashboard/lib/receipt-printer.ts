import { type FinancialTransaction, type ZReportData } from "@/lib/api"

export interface ReceiptPrintData {
  order_number: string
  order_type: "dinein" | "takeaway" | "delivery"
  table?: { name: string; location?: string | null } | null
  customer_name?: string | null
  cash_register?: { name: string } | null
  items: {
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
    size_name?: string | null
    selected_extras?: { name: string; price: number }[] | null
    notes?: string | null
  }[]
  subtotal: number
  tax: number
  delivery_fee?: number
  delivery_address?: string | null
  delivery_distance?: number | null
  discount_amount?: number
  discount_type?: "none" | "percentage" | "fixed" | "complimentary"
  discount_value?: number
  discount_reason?: string | null
  service_charge?: number
  service_charge_percentage?: number
  total: number
  payment_status: "paid" | "partially_paid" | "unpaid"
  payment_method?: string | null
  tendered_amount?: number | null
  change_amount?: number | null
  created_at?: string
  paid_at?: string | null
  notes?: string | null
}

export interface ReceiptConfig {
  restaurantName?: string | null
  restaurantSubtitle?: string | null
  address?: string | null
  phone?: string | null
  taxNumber?: string | null
  footerNote?: string | null
  currency?: string | null
  taxLabel?: string | null
}

const DEFAULT_CONFIG: ReceiptConfig = {
  restaurantName: "مطعم وكافيه ريسترو",
  restaurantSubtitle: "RESTRO RESTAURANT & POS",
  address: "الفرع الرئيسي - الصالة والمطعم",
  phone: "01000000000 / 01100000000",
  taxNumber: "301-482-991",
  footerNote: "شكراً لزيارتكم ونتمنى لكم يوماً سعيداً!",
  currency: "ج.م",
  taxLabel: "ضريبة القيمة المضافة",
}

/**
 * المحرك الأساسي للطباعة المعزولة تماماً (طابعات الفواتير الحرارية 80 مم)
 * يمنع نهائياً طباعة عناصر لوحة التحكم أو واجهة المتصفح الأم
 */
export function printHtmlIsolated(html: string): void {
  if (typeof window === "undefined") return

  // إزالة أي إطار قديم لضمان عدم تراكم العناصر
  const existing = document.getElementById("restro-print-frame")
  if (existing) {
    existing.remove()
  }

  const iframe = document.createElement("iframe")
  iframe.id = "restro-print-frame"
  // أبعاد حقيقية ولكن خارج مجال رؤية المستخدم (لا تستخدم visibility:hidden لمنع Chrome من طباعة الصفحة الأم)
  iframe.style.position = "fixed"
  iframe.style.left = "-9999px"
  iframe.style.top = "-9999px"
  iframe.style.width = "80mm"
  iframe.style.height = "100vh"
  iframe.style.border = "none"
  iframe.style.opacity = "0"
  iframe.style.pointerEvents = "none"
  iframe.style.zIndex = "-9999"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    // بديل نافذة منبثقة معزولة خاصة بالفاتورة فقط
    const popup = window.open("", "_blank", "width=380,height=600")
    if (popup) {
      popup.document.write(html)
      popup.document.close()
      popup.focus()
      setTimeout(() => {
        popup.print()
        popup.close()
      }, 250)
    }
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  const executePrint = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (err) {
      console.warn("Direct iframe print failed, trying popup fallback:", err)
      const popup = window.open("", "_blank", "width=380,height=600")
      if (popup) {
        popup.document.write(html)
        popup.document.close()
        popup.focus()
        setTimeout(() => {
          popup.print()
          popup.close()
        }, 250)
      }
    }
  }

  if (iframe.contentWindow?.document.readyState === "complete") {
    setTimeout(executePrint, 150)
  } else {
    iframe.onload = () => setTimeout(executePrint, 150)
    setTimeout(executePrint, 350)
  }
}

export function generateReceiptHtml(data: ReceiptPrintData, customConfig?: ReceiptConfig): string {
  const config = { ...DEFAULT_CONFIG, ...customConfig }

  const formattedDate = data.created_at
    ? new Date(data.created_at).toLocaleDateString("ar-EG")
    : new Date().toLocaleDateString("ar-EG")

  const formattedTime = data.created_at
    ? new Date(data.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })

  const orderTypeArabic =
    data.order_type === "dinein"
      ? `صالة - طاولة: ${data.table?.name || "غير محددة"}${data.table?.location ? ` (${data.table.location})` : ""}`
      : data.order_type === "takeaway"
      ? "سفري (استلام مباشر)"
      : `توصيل (دليفري)${data.customer_name ? ` - العميل: ${data.customer_name}` : ""}`

  const itemsHtml = data.items
    .map((item) => {
      const extrasHtml =
        item.selected_extras && item.selected_extras.length > 0
          ? `<div class="item-sub">+ ${item.selected_extras.map((e) => `${e.name} (${e.price} ${config.currency})`).join("، ")}</div>`
          : ""

      const sizeHtml = item.size_name ? `<div class="item-sub">حجم: ${item.size_name}</div>` : ""
      const notesHtml = item.notes ? `<div class="item-sub item-notes">ملاحظة: ${item.notes}</div>` : ""

      return `
        <tr>
          <td class="text-right" style="width: 55%;">
            <div class="font-bold">${item.product_name}</div>
            ${sizeHtml}
            ${extrasHtml}
            ${notesHtml}
          </td>
          <td class="text-center font-mono" style="width: 20%;">
            ${item.quantity} x ${Number(item.unit_price).toFixed(2)}
          </td>
          <td class="text-left font-bold font-mono" style="width: 25%;">
            ${Number(item.total_price).toFixed(2)}
          </td>
        </tr>
      `
    })
    .join("")

  const paymentMethodText =
    data.payment_method === "card"
      ? "بطاقة بنكية / فيزا"
      : data.payment_method === "transfer"
      ? "تحويل بنكي / محفظة"
      : "نقدي (كاش)"

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>فاتورة ${data.order_number}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace, Tahoma, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      direction: rtl;
    }
    .receipt-container {
      width: 76mm;
      max-width: 76mm;
      margin: 0 auto;
      padding: 3mm 2mm 8mm 2mm;
      background: #ffffff;
      color: #000000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }

    .header-title {
      font-size: 17px;
      font-weight: 900;
      margin: 0 0 2px 0;
      letter-spacing: 0.5px;
    }
    .header-sub {
      font-size: 10px;
      margin: 0 0 2px 0;
      font-weight: bold;
    }
    .header-info {
      font-size: 10.5px;
      margin: 1px 0;
    }

    .dashed-double {
      border-top: 2px dashed #000000;
      margin: 6px 0;
    }
    .dashed-single {
      border-top: 1px dashed #000000;
      margin: 5px 0;
    }

    .meta-table {
      width: 100%;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .meta-table td {
      padding: 1px 0;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .items-table th {
      border-bottom: 1px dashed #000000;
      padding: 4px 0;
      font-size: 11px;
      font-weight: bold;
    }
    .items-table td {
      padding: 4px 0 3px 0;
      vertical-align: top;
      font-size: 11.5px;
    }
    .item-sub {
      font-size: 10px;
      padding-right: 6px;
      color: #222222;
    }
    .item-notes {
      font-style: italic;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      padding: 1.5px 0;
    }
    .total-highlight {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: 900;
      padding: 5px 0;
      letter-spacing: 0.5px;
    }

    .barcode-section {
      text-align: center;
      margin-top: 8px;
      font-size: 11px;
    }
    .barcode-bars {
      font-family: 'Libre Barcode 39', 'Courier New', monospace;
      font-size: 22px;
      letter-spacing: 2px;
      font-weight: bold;
      user-select: none;
      line-height: 1;
    }

    .footer {
      text-align: center;
      margin-top: 8px;
      font-size: 10.5px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- رأس الفاتورة -->
    <div class="text-center">
      <div class="header-title">${config.restaurantName}</div>
      <div class="header-sub">${config.restaurantSubtitle}</div>
      <div class="header-info">${config.address}</div>
      <div class="header-info">هاتف: ${config.phone}</div>
      <div class="header-info">الرقم الضريبي: ${config.taxNumber}</div>
      <div class="font-bold" style="font-size: 11px; margin-top: 3px;">فاتورة ضريبية مبسطة</div>
    </div>

    <div class="dashed-double"></div>

    <!-- بيانات الفاتورة -->
    <table class="meta-table">
      <tr>
        <td class="font-bold">رقم الفاتورة:</td>
        <td class="text-left font-bold font-mono">${data.order_number}</td>
      </tr>
      <tr>
        <td>التاريخ والوقت:</td>
        <td class="text-left font-mono">${formattedDate} ${formattedTime}</td>
      </tr>
      <tr>
        <td class="font-bold">نوع الطلب:</td>
        <td class="text-left font-bold">${orderTypeArabic}</td>
      </tr>
      ${
        data.customer_name
          ? `<tr>
              <td>اسم العميل:</td>
              <td class="text-left">${data.customer_name}</td>
            </tr>`
          : ""
      }
      ${
        data.cash_register
          ? `<tr>
              <td>الخزينة:</td>
              <td class="text-left">${data.cash_register.name}</td>
            </tr>`
          : ""
      }
      ${
        data.order_type === "delivery" && data.delivery_address
          ? `<tr>
              <td class="font-bold">عنوان التوصيل:</td>
              <td class="text-left">${data.delivery_address}</td>
            </tr>`
          : ""
      }
      ${
        data.order_type === "delivery" && data.delivery_distance
          ? `<tr>
              <td>مسافة التوصيل:</td>
              <td class="text-left font-mono">${data.delivery_distance} كم</td>
            </tr>`
          : ""
      }
    </table>

    <div class="dashed-single"></div>

    <!-- جدول البنود -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-right">الصنف</th>
          <th class="text-center">الكمية</th>
          <th class="text-left">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="dashed-single"></div>

    <!-- الإجماليات -->
    <div>
      <div class="summary-row">
        <span>عدد الأصناف:</span>
        <span class="font-bold font-mono">${data.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
      </div>
      <div class="summary-row">
        <span>المجموع الفرعي:</span>
        <span class="font-mono">${Number(data.subtotal).toFixed(2)} ${config.currency}</span>
      </div>
      ${
        data.discount_amount && Number(data.discount_amount) > 0
          ? `<div class="summary-row font-bold">
              <span>الخصم${data.discount_reason ? ` (${data.discount_reason})` : data.discount_type === "percentage" ? ` (${data.discount_value}%)` : data.discount_type === "complimentary" ? " (ضيافة 100%)" : ""}:</span>
              <span class="font-mono">-${Number(data.discount_amount).toFixed(2)} ${config.currency}</span>
            </div>`
          : ""
      }
      <div class="summary-row">
        <span>${config.taxLabel || "ضريبة القيمة المضافة"}:</span>
        <span class="font-mono">${Number(data.tax).toFixed(2)} ${config.currency}</span>
      </div>
      ${
        data.service_charge && Number(data.service_charge) > 0
          ? `<div class="summary-row font-bold">
              <span>خدمة الصالة${data.service_charge_percentage ? ` (${data.service_charge_percentage}%)` : ""}:</span>
              <span class="font-mono">+${Number(data.service_charge).toFixed(2)} ${config.currency}</span>
            </div>`
          : ""
      }
      ${
        data.order_type === "delivery" && Number(data.delivery_fee || 0) > 0
          ? `<div class="summary-row font-bold">
              <span>رسوم التوصيل${data.delivery_distance ? ` (${data.delivery_distance} كم)` : ""}:</span>
              <span class="font-mono">+${Number(data.delivery_fee).toFixed(2)} ${config.currency}</span>
            </div>`
          : ""
      }
    </div>

    <div class="dashed-double"></div>

    <div class="total-highlight">
      <span>الإجمالي النهائي:</span>
      <span class="font-mono">${Number(data.total).toFixed(2)} ${config.currency}</span>
    </div>

    <div class="dashed-double"></div>

    <!-- تفاصيل الدفع -->
    <table class="meta-table">
      <tr>
        <td>حالة السداد:</td>
        <td class="text-left font-bold">${
          data.payment_status === "paid"
            ? "مدفوع بالكامل ✓"
            : data.payment_status === "partially_paid"
            ? "مدفوع جزئياً ⏳"
            : "غير مدفوع ✕"
        }</td>
      </tr>
      ${
        data.tendered_amount != null && Number(data.tendered_amount) > 0
          ? `<tr>
              <td>المبلغ المستلم:</td>
              <td class="text-left font-mono font-bold">${Number(data.tendered_amount).toFixed(2)} ${config.currency}</td>
            </tr>
            <tr>
              <td>الباقي للعميل:</td>
              <td class="text-left font-mono font-bold" style="color: #059669;">${Number(data.change_amount || 0).toFixed(2)} ${config.currency}</td>
            </tr>`
          : ""
      }
      ${
        data.paid_at
          ? `<tr>
              <td>تاريخ السداد:</td>
              <td class="text-left font-mono">${new Date(data.paid_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</td>
            </tr>`
          : ""
      }
    </table>

    <div class="dashed-single"></div>

    <!-- باركود الفاتورة وكلمة الشكر -->
    <div class="barcode-section">
      <div class="barcode-bars">||||| | |||| ||| |||||| |||| |||</div>
      <div class="font-mono" style="font-size: 10px; margin-top: 2px;">*${data.order_number}*</div>
    </div>

    <div class="footer">
      <div>${config.footerNote}</div>
      <div style="font-size: 9.5px; margin-top: 2px;">الأسعار تشمل 14% ضريبة القيمة المضافة</div>
    </div>
  </div>
</body>
</html>`
}

export function printThermalReceipt(
  data: ReceiptPrintData,
  config?: ReceiptConfig,
  options?: { kickDrawer?: boolean }
): void {
  if (typeof window === "undefined") return

  // إذا تم طلب فتح درج الكاش (مثلاً مع الدفع النقدي)
  if (options?.kickDrawer || data.payment_method === "cash") {
    openCashDrawer().catch(() => {})
  }

  const html = generateReceiptHtml(data, config)
  printHtmlIsolated(html)
}

/**
 * إنشاء كود HTML لبون تحضير المطبخ والبار (KOT - Kitchen Order Ticket) بمقاس 80 مم
 * مخصص للشيف وطاقم الطهي: لا يحتوي على أسعار إطلاقاً، تركيز كامل على الكميات والتعديلات والملاحظات
 */
export function generateKotHtml(data: ReceiptPrintData, customConfig?: ReceiptConfig): string {
  const config = { ...DEFAULT_CONFIG, ...customConfig }

  const formattedDate = data.created_at
    ? new Date(data.created_at).toLocaleDateString("ar-EG")
    : new Date().toLocaleDateString("ar-EG")

  const formattedTime = data.created_at
    ? new Date(data.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })

  const destTitle =
    data.order_type === "dinein"
      ? `طاولة: ${data.table?.name || "صالة"}${data.table?.location ? ` (${data.table.location})` : ""}`
      : data.order_type === "takeaway"
      ? "طلب سفري (استلام)"
      : `طلب توصيل دليفري${data.customer_name ? ` (${data.customer_name})` : ""}`

  const orderTypeBadge =
    data.order_type === "dinein"
      ? "صالة (طاولة)"
      : data.order_type === "takeaway"
      ? "سفري (تيك أواي)"
      : "توصيل (دليفري)"

  const totalQuantity = data.items.reduce((sum, it) => sum + it.quantity, 0)

  const itemsRows = data.items
    .map((item) => {
      const extrasHtml =
        item.selected_extras && item.selected_extras.length > 0
          ? `<div class="kot-sub">+ ${item.selected_extras.map((e) => e.name).join("، ")}</div>`
          : ""

      const sizeHtml = item.size_name ? `<div class="kot-sub">حجم: <b>${item.size_name}</b></div>` : ""
      const noteHtml = item.notes ? `<div class="kot-note">*** ${item.notes} ***</div>` : ""

      return `
        <tr>
          <td class="kot-qty font-mono">[ x${item.quantity} ]</td>
          <td class="kot-name">
            <div class="font-bold">${item.product_name}</div>
            ${sizeHtml}
            ${extrasHtml}
            ${noteHtml}
          </td>
        </tr>
      `
    })
    .join("")

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>بون تحضير المطبخ - ${data.order_number}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body {
      margin: 0; padding: 0;
      background: #ffffff !important; color: #000000 !important;
      font-family: 'Courier New', Courier, Tahoma, sans-serif;
      font-size: 13px; line-height: 1.35; direction: rtl;
    }
    .kot-container {
      width: 76mm; max-width: 76mm; margin: 0 auto;
      padding: 4mm 2mm 8mm 2mm; background: #ffffff; color: #000000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }

    .kot-badge {
      border: 3px solid #000000; padding: 4px 6px; font-size: 17px; font-weight: 900;
      letter-spacing: 0.5px; text-align: center; margin-bottom: 5px;
    }
    .kot-dest-box {
      font-size: 20px; font-weight: 900; text-align: center; padding: 5px;
      border: 2px dashed #000000; margin: 5px 0 6px 0; background: #fafafa;
    }
    .dashed-double { border-top: 2px dashed #000000; margin: 6px 0; }
    .dashed-single { border-top: 1px dashed #000000; margin: 5px 0; }
    .meta-table { width: 100%; font-size: 11.5px; margin-bottom: 4px; }
    .meta-table td { padding: 2px 0; vertical-align: top; }

    .items-table { width: 100%; border-collapse: collapse; margin: 5px 0; }
    .items-table th {
      border-bottom: 2px solid #000000; padding: 4px 0; font-size: 13px; font-weight: 900;
    }
    .items-table td {
      padding: 6px 0 5px 0; vertical-align: top; border-bottom: 1px dashed #000000;
    }
    .kot-qty {
      font-size: 20px; font-weight: 900; text-align: center; width: 25%;
    }
    .kot-name {
      font-size: 14.5px; width: 75%;
    }
    .kot-sub {
      font-size: 11.5px; font-weight: bold; padding-right: 4px; margin-top: 1px;
    }
    .kot-note {
      font-size: 12px; font-weight: 900; padding: 3px 6px; margin-top: 3px;
      border: 1.5px solid #000000; display: inline-block;
    }
    .kot-footer {
      text-align: center; margin-top: 10px; font-size: 13px; font-weight: 900;
    }
  </style>
</head>
<body>
  <div class="kot-container">
    <div class="kot-badge">*** بون تشغيل المطبخ (KOT) ***</div>
    <div class="kot-dest-box">${destTitle}</div>
    <table class="meta-table">
      <tr>
        <td class="font-bold">رقم الطلب:</td>
        <td class="text-left font-mono font-bold">${data.order_number}</td>
      </tr>
      <tr>
        <td>التاريخ والوقت:</td>
        <td class="text-left font-mono">${formattedDate} ${formattedTime}</td>
      </tr>
      <tr>
        <td class="font-bold">القسم / النوع:</td>
        <td class="text-left font-bold">${orderTypeBadge}</td>
      </tr>
      ${data.customer_name ? `<tr><td>العميل:</td><td class="text-left font-bold">${data.customer_name}</td></tr>` : ""}
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 25%;">الكمية</th>
          <th class="text-right" style="width: 75%;">الصنف والمواصفات</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="kot-footer">
      <div>إجمالي بنود التحضير: ${totalQuantity} قطعة</div>
      ${data.notes ? `<div style="margin-top:6px; border:1.5px solid #000; padding:4px; font-size:11.5px;">ملاحظات خاصة: ${data.notes}</div>` : ""}
    </div>
  </div>
</body>
</html>`
}

/**
 * طباعة بون المطبخ (KOT) فورياً دون أسعار
 */
export function printKotSlip(data: ReceiptPrintData, config?: ReceiptConfig): void {
  const html = generateKotHtml(data, config)
  printHtmlIsolated(html)
}

/**
 * إنشاء كود HTML لإيصال سند مالي حراري (قبض أو صرف) بمقاس 80 مم
 */
export function generateVoucherHtml(tx: FinancialTransaction, customConfig?: ReceiptConfig): string {
  const config = { ...DEFAULT_CONFIG, ...customConfig }
  const isReceipt = tx.transaction_type === "receipt"
  const title = isReceipt ? "سند قبض / إيداع نقدي" : "سند صرف ومصروفات"
  const amount = Number(tx.amount || 0).toFixed(2)

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${title} - ${tx.voucher_number || `VOU-${tx.id}`}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body {
      margin: 0; padding: 0;
      background: #ffffff !important; color: #000000 !important;
      font-family: 'Courier New', Courier, Tahoma, sans-serif;
      font-size: 12px; line-height: 1.35; direction: rtl;
    }
    .receipt-container {
      width: 76mm; max-width: 76mm; margin: 0 auto;
      padding: 4mm 2mm 8mm 2mm; background: #ffffff; color: #000000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }
    .header-title { font-size: 16px; font-weight: 900; margin: 0 0 2px 0; }
    .header-sub { font-size: 10px; font-weight: bold; margin: 0 0 2px 0; }
    .voucher-badge {
      display: inline-block; padding: 3px 10px; margin: 4px 0;
      border: 1.5px solid #000000; font-weight: 900; font-size: 12.5px;
    }
    .dashed-double { border-top: 2px dashed #000000; margin: 6px 0; }
    .dashed-single { border-top: 1px dashed #000000; margin: 5px 0; }
    .meta-table { width: 100%; font-size: 11px; margin-bottom: 4px; }
    .meta-table td { padding: 2px 0; vertical-align: top; }
    .amount-box {
      border: 2px solid #000000; padding: 6px; text-align: center;
      margin: 8px 0; font-size: 18px; font-weight: 900;
    }
    .signatures {
      display: flex; justify-content: space-between; margin-top: 22px;
      font-size: 11px; padding-top: 6px; border-top: 1px dashed #000000;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="text-center">
      <div class="header-title">${config.restaurantName}</div>
      <div class="header-sub">${config.address || ""}</div>
      <div class="voucher-badge">${title}</div>
    </div>
    <div class="dashed-double"></div>
    <table class="meta-table">
      <tr>
        <td class="font-bold">رقم السند:</td>
        <td class="text-left font-mono font-bold">${tx.voucher_number || `VOU-${tx.id}`}</td>
      </tr>
      <tr>
        <td>التاريخ:</td>
        <td class="text-left font-mono">${tx.date}</td>
      </tr>
      <tr>
        <td>الخزينة:</td>
        <td class="text-left font-bold">${tx.cash_register?.name || "الخزينة الرئيسية"}</td>
      </tr>
      <tr>
        <td class="font-bold">${isReceipt ? "الدافع / العميل:" : "المستفيد / المصروف إليه:"}</td>
        <td class="text-left font-bold">${tx.recipient_or_payer || tx.customer?.name || "—"}</td>
      </tr>
      ${tx.category ? `<tr><td>التصنيف:</td><td class="text-left">${tx.category}</td></tr>` : ""}
      ${tx.description ? `<tr><td>البيان:</td><td class="text-left">${tx.description}</td></tr>` : ""}
    </table>
    <div class="amount-box">
      <span>${isReceipt ? "+" : "-"} ${amount} ${config.currency}</span>
    </div>
    <div class="signatures">
      <div class="text-center">
        <div>المستلم / الدافع</div>
        <div style="margin-top: 24px;">..................</div>
      </div>
      <div class="text-center">
        <div>أمين الخزينة</div>
        <div style="margin-top: 24px;">..................</div>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * طباعة سند مالي (قبض / صرف) بإيصال حراري معزول تماماً
 */
export function printVoucherSlip(tx: FinancialTransaction, config?: ReceiptConfig): void {
  const html = generateVoucherHtml(tx, config)
  printHtmlIsolated(html)
}

/**
 * إنشاء كود HTML لتقرير تقفيل الوردية (Z-Report) بمقاس 80 مم
 */
export function generateZReportHtml(zReport: ZReportData, customConfig?: ReceiptConfig): string {
  const config = { ...DEFAULT_CONFIG, ...customConfig }
  const currency = zReport.currency || config.currency || "ج.م"
  const diff = zReport.cash_drawer?.difference ?? 0

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>تقرير تقفيل الوردية Z-Report - ${zReport.z_report_number}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body {
      margin: 0; padding: 0;
      background: #ffffff !important; color: #000000 !important;
      font-family: 'Courier New', Courier, Tahoma, sans-serif;
      font-size: 11.5px; line-height: 1.35; direction: rtl;
    }
    .receipt-container {
      width: 76mm; max-width: 76mm; margin: 0 auto;
      padding: 4mm 2mm 8mm 2mm; background: #ffffff; color: #000000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }
    .header-title { font-size: 16px; font-weight: 900; margin: 0 0 2px 0; }
    .dashed-double { border-top: 2px dashed #000000; margin: 6px 0; }
    .dashed-single { border-top: 1px dashed #000000; margin: 5px 0; }
    .meta-table { width: 100%; font-size: 11px; margin-bottom: 4px; }
    .meta-table td { padding: 2px 0; vertical-align: top; }
    .summary-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11.5px; }
    .total-box {
      border: 2px solid #000000; padding: 5px; text-align: center;
      margin: 6px 0; font-size: 15px; font-weight: 900;
    }
    .diff-box {
      padding: 4px; margin: 4px 0; border: 1.5px solid #000000; text-align: center; font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="text-center">
      <div class="header-title">${zReport.restaurant_name || config.restaurantName}</div>
      <div class="font-bold" style="font-size: 13px; margin: 3px 0;">تقرير تقفيل الوردية اليومي (Z-Report)</div>
      <div class="font-mono" style="font-size: 10px;">رقم التقرير: ${zReport.z_report_number}</div>
    </div>
    <div class="dashed-double"></div>
    <table class="meta-table">
      <tr><td>الكاشير:</td><td class="text-left font-bold">${zReport.cashier_name}</td></tr>
      <tr><td>الخزينة:</td><td class="text-left font-bold">${zReport.register_name}</td></tr>
      <tr><td>الوردية:</td><td class="text-left font-mono">${zReport.shift_number}</td></tr>
      <tr><td>وقت الفتح:</td><td class="text-left font-mono">${zReport.opened_at || "—"}</td></tr>
      <tr><td>وقت الإغلاق:</td><td class="text-left font-mono">${zReport.closed_at || "مفتوحة"}</td></tr>
    </table>
    <div class="dashed-single"></div>
    <div class="summary-row"><span>عدد الطلبات المكتملة:</span><span class="font-bold font-mono">${zReport.sales?.orders_count || 0}</span></div>
    <div class="total-box">
      <span>إجمالي المبيعات: ${Number(zReport.sales?.total || 0).toFixed(2)} ${currency}</span>
    </div>
    <div class="dashed-single"></div>
    <div class="summary-row"><span>رصيد أول المدة (الافتتاحي):</span><span class="font-mono">${Number(zReport.starting_cash || 0).toFixed(2)} ${currency}</span></div>
    <div class="summary-row"><span>+ إجمالي المقبوضات:</span><span class="font-mono">+${Number(zReport.movements?.cash_receipts || 0).toFixed(2)} ${currency}</span></div>
    <div class="summary-row"><span>- إجمالي المصروفات:</span><span class="font-mono">-${Number(zReport.movements?.cash_expenses || 0).toFixed(2)} ${currency}</span></div>
    <div class="dashed-single"></div>
    <div class="summary-row font-bold"><span>النقدية المتوقعة بالدرج:</span><span class="font-mono">${Number(zReport.cash_drawer?.expected || 0).toFixed(2)} ${currency}</span></div>
    <div class="summary-row font-bold"><span>النقدية الفعلية المحصية:</span><span class="font-mono">${Number(zReport.cash_drawer?.actual || 0).toFixed(2)} ${currency}</span></div>
    <div class="diff-box">
      ${diff === 0 ? "مطابق تماماً بدون عجز أو زيادة ✓" : diff < 0 ? `عجز بالدرج: ${Math.abs(diff).toFixed(2)} ${currency}` : `زيادة بالدرج: +${diff.toFixed(2)} ${currency}`}
    </div>
    <div class="dashed-double"></div>
    <div style="display:flex; justify-content:space-between; margin-top:20px; font-size:10.5px;">
      <div class="text-center"><div>توقيع الكاشير</div><div style="margin-top:20px;">..................</div></div>
      <div class="text-center"><div>توقيع المشرف</div><div style="margin-top:20px;">..................</div></div>
    </div>
  </div>
</body>
</html>`
}

/**
 * طباعة تقرير تقفيل الوردية Z-Report بإيصال حراري معزول تماماً
 */
export function printZReportSlip(zReport: ZReportData, config?: ReceiptConfig): void {
  const html = generateZReportHtml(zReport, config)
  printHtmlIsolated(html)
}

/**
 * إرسال نبضة لفتح درج النقدية المربوط بالطابعة الحرارية (ESC/POS)
 * الأمر القياسي لدرج الكاش: ESC p 0 25 250
 */
export async function openCashDrawer(): Promise<boolean> {
  if (typeof window === "undefined") return false

  // محاولة الإرسال المباشر عبر Web Serial API لطابعات USB/Serial
  if ("serial" in navigator) {
    try {
      const ports = await (navigator as any).serial.getPorts()
      if (ports && ports.length > 0) {
        const port = ports[0]
        if (!port.readable) {
          await port.open({ baudRate: 9600 })
        }
        const writer = port.writable.getWriter()
        const pulse = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa])
        await writer.write(pulse)
        writer.releaseLock()
        return true
      }
    } catch (err) {
      console.warn("Could not send raw serial pulse to cash drawer:", err)
    }
  }

  return false
}
