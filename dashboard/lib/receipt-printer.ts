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
  total: number
  payment_status: "paid" | "partially_paid" | "unpaid"
  payment_method?: string | null
  created_at?: string
  paid_at?: string | null
  notes?: string | null
}

export interface ReceiptConfig {
  restaurantName?: string
  restaurantSubtitle?: string
  address?: string
  phone?: string
  taxNumber?: string
  footerNote?: string
  currency?: string
  taxLabel?: string
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
      <div class="summary-row">
        <span>${config.taxLabel || "ضريبة القيمة المضافة"}:</span>
        <span class="font-mono">${Number(data.tax).toFixed(2)} ${config.currency}</span>
      </div>
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
      <tr>
        <td>طريقة الدفع:</td>
        <td class="text-left font-bold">${paymentMethodText}</td>
      </tr>
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

export function printThermalReceipt(data: ReceiptPrintData, config?: ReceiptConfig): void {
  if (typeof window === "undefined") return

  const html = generateReceiptHtml(data, config)

  // البحث عن iframe موجود أو إنشاء واحد جديد
  let iframe = document.getElementById("receipt-print-iframe") as HTMLIFrameElement | null

  if (!iframe) {
    iframe = document.createElement("iframe")
    iframe.id = "receipt-print-iframe"
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    iframe.style.visibility = "hidden"
    iframe.style.zIndex = "-9999"
    document.body.appendChild(iframe)
  }

  const doc = iframe.contentWindow?.document
  if (!doc) {
    // في حال عدم توفر الـ iframe نلجأ للنافذة المنبثقة
    const printWindow = window.open("", "_blank", "width=400,height=600")
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 300)
    } else {
      window.print()
    }
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  // تشغيل الطباعة بعد تحميل الخطوط والمحتوى
  setTimeout(() => {
    try {
      iframe?.contentWindow?.focus()
      iframe?.contentWindow?.print()
    } catch {
      window.print()
    }
  }, 250)
}
