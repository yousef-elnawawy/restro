<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\Customer;
use App\Models\DeliveryDriver;
use App\Models\FinancialTransaction;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RestaurantTable;
use App\Models\Setting;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use ApiResponse;

    /**
     * Get live dashboard statistics and aggregations.
     */
    public function stats(Request $request): JsonResponse
    {
        $tz = config('app.timezone', 'Africa/Cairo');
        $dateParam = $request->query('date');

        if ($dateParam) {
            $today = Carbon::parse($dateParam, $tz);
        } else {
            $today = Carbon::today($tz);
            // If it's early morning (before 6 AM) and today has no orders yet,
            // check if there were orders yesterday (e.g. night shift continuation)
            $hasTodayOrders = Order::whereDate('created_at', $today)
                ->where('status', '!=', Order::STATUS_CANCELLED)
                ->exists();

            if (! $hasTodayOrders && Carbon::now($tz)->hour < 6) {
                $yesterday = Carbon::yesterday($tz);
                $hasYesterdayOrders = Order::whereDate('created_at', $yesterday)
                    ->where('status', '!=', Order::STATUS_CANCELLED)
                    ->exists();
                if ($hasYesterdayOrders) {
                    $today = $yesterday;
                }
            }
        }

        $setting = Setting::instance();
        $currency = $setting->currency ?? 'ج.م';

        // 1. Target day's orders & sales
        $todayOrdersQuery = Order::whereDate('created_at', $today)
            ->where('status', '!=', Order::STATUS_CANCELLED);

        $todaySales = (float) (clone $todayOrdersQuery)->sum('total');
        $todayOrdersCount = (int) (clone $todayOrdersQuery)->count();
        $todayDineinCount = (int) (clone $todayOrdersQuery)->where('order_type', 'dinein')->count();
        $todayDeliveryCount = (int) (clone $todayOrdersQuery)->where('order_type', 'delivery')->count();
        $todayTakeawayCount = (int) (clone $todayOrdersQuery)->where('order_type', 'takeaway')->count();

        // All-time sales
        $allTimeSales = (float) Order::where('status', '!=', Order::STATUS_CANCELLED)->sum('total');
        $allTimeOrders = (int) Order::where('status', '!=', Order::STATUS_CANCELLED)->count();

        // 2. Customers
        $totalCustomers = Customer::count();
        $newCustomersThisMonth = Customer::where('created_at', '>=', now()->subDays(30))->count();

        // 3. Tables summary
        $totalTables = RestaurantTable::where('is_active', true)->count();
        $occupiedTables = RestaurantTable::where('is_active', true)->where('status', 'occupied')->count();
        $reservedTables = RestaurantTable::where('is_active', true)->where('status', 'reserved')->count();
        $availableTables = max(0, $totalTables - ($occupiedTables + $reservedTables));

        // 4. Delivery fleet summary
        $totalDrivers = DeliveryDriver::where('is_active', true)->count();
        $onDeliveryDrivers = DeliveryDriver::where('is_active', true)->where('status', 'on_delivery')->count();
        $availableDrivers = DeliveryDriver::where('is_active', true)->where('status', 'available')->count();
        $offDutyDrivers = DeliveryDriver::where('is_active', true)->where('status', 'off_duty')->count();

        // 5. Hourly sales for target day (2-hour buckets across the full 24h)
        $hourlyBuckets = [
            ['label' => '١٢ ص', 'full_label' => '١٢:٠٠ ص - ٠٢:٠٠ ص', 'hour_start' => 0, 'hour_end' => 2],
            ['label' => '٢ ص',  'full_label' => '٠٢:٠٠ ص - ٠٤:٠٠ ص', 'hour_start' => 2, 'hour_end' => 4],
            ['label' => '٤ ص',  'full_label' => '٠٤:٠٠ ص - ٠٦:٠٠ ص', 'hour_start' => 4, 'hour_end' => 6],
            ['label' => '٦ ص',  'full_label' => '٠٦:٠٠ ص - ٠٨:٠٠ ص', 'hour_start' => 6, 'hour_end' => 8],
            ['label' => '٨ ص',  'full_label' => '٠٨:٠٠ ص - ١٠:٠٠ ص', 'hour_start' => 8, 'hour_end' => 10],
            ['label' => '١٠ ص', 'full_label' => '١٠:٠٠ ص - ١٢:٠٠ م', 'hour_start' => 10, 'hour_end' => 12],
            ['label' => '١٢ م', 'full_label' => '١٢:٠٠ م - ٠٢:٠٠ م', 'hour_start' => 12, 'hour_end' => 14],
            ['label' => '٢ م',  'full_label' => '٠٢:٠٠ م - ٠٤:٠٠ م', 'hour_start' => 14, 'hour_end' => 16],
            ['label' => '٤ م',  'full_label' => '٠٤:٠٠ م - ٠٦:٠٠ م', 'hour_start' => 16, 'hour_end' => 18],
            ['label' => '٦ م',  'full_label' => '٠٦:٠٠ م - ٠٨:٠٠ م', 'hour_start' => 18, 'hour_end' => 20],
            ['label' => '٨ م',  'full_label' => '٠٨:٠٠ م - ١٠:٠٠ م', 'hour_start' => 20, 'hour_end' => 22],
            ['label' => '١٠ م', 'full_label' => '١٠:٠٠ م - ١٢:٠٠ ص', 'hour_start' => 22, 'hour_end' => 24],
        ];

        $todayOrders = Order::whereDate('created_at', $today)
            ->where('status', '!=', Order::STATUS_CANCELLED)
            ->get(['id', 'total', 'created_at']);

        $hourlySalesData = [];
        foreach ($hourlyBuckets as $bucket) {
            $matching = $todayOrders->filter(function ($ord) use ($bucket, $tz) {
                $h = $ord->created_at->timezone($tz)->hour;

                return $h >= $bucket['hour_start'] && $h < $bucket['hour_end'];
            });

            $hourlySalesData[] = [
                'time' => $bucket['label'],
                'full_time' => $bucket['full_label'],
                'sales' => (float) round($matching->sum('total'), 2),
                'orders' => (int) $matching->count(),
            ];
        }

        // 6. Weekly finance: past 7 days sales vs expenses
        $arabicDays = [
            'Saturday' => 'السبت',
            'Sunday' => 'الأحد',
            'Monday' => 'الإثنين',
            'Tuesday' => 'الثلاثاء',
            'Wednesday' => 'الأربعاء',
            'Thursday' => 'الخميس',
            'Friday' => 'الجمعة',
        ];

        $weeklyFinanceData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today($tz)->subDays($i);
            $dayNameEn = $date->format('l');
            $dayNameAr = $arabicDays[$dayNameEn] ?? $dayNameEn;

            $daySales = (float) Order::whereDate('created_at', $date)
                ->where('status', '!=', Order::STATUS_CANCELLED)
                ->sum('total');

            $dayExpenses = (float) FinancialTransaction::whereDate('date', $date)
                ->whereIn('transaction_type', ['payment', 'expense'])
                ->sum('amount');

            $weeklyFinanceData[] = [
                'day' => $dayNameAr,
                'date' => $date->toDateString(),
                'sales' => round($daySales, 2),
                'expenses' => round($dayExpenses, 2),
            ];
        }

        // 7. Active orders (last 10 active)
        $activeOrders = Order::with(['table', 'customer', 'deliveryDriver', 'items'])
            ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($ord) use ($currency) {
                $itemsSummary = $ord->items->map(fn ($it) => "{$it->quantity} {$it->product_name}")->implode('، ');

                return [
                    'id' => $ord->order_number,
                    'order_id' => $ord->id,
                    'customer' => $ord->customer_name ?: ($ord->customer?->name ?: ($ord->table ? $ord->table->name : 'عميل غير مسجل')),
                    'type' => match ($ord->order_type) {
                        'dinein' => 'صالة',
                        'delivery' => 'توصيل',
                        'takeaway' => 'استلام',
                        default => $ord->order_type,
                    },
                    'raw_type' => $ord->order_type,
                    'place' => match ($ord->order_type) {
                        'dinein' => $ord->table ? "{$ord->table->name} • {$ord->table->capacity} مقاعد" : 'صالة',
                        'delivery' => $ord->customer?->address ?: 'توصيل للعنوان',
                        'takeaway' => 'استلام من الفرع',
                        default => '',
                    },
                    'items' => $itemsSummary ?: 'طلب بدون أصناف',
                    'total' => number_format((float) $ord->total, 2).' '.$currency,
                    'raw_total' => (float) $ord->total,
                    'time' => $ord->created_at->diffForHumans(),
                    'status' => $ord->status,
                ];
            });

        // 8. Top selling dishes
        $topDishesRaw = OrderItem::select(
                'product_name',
                DB::raw('MAX(product_id) as product_id'),
                DB::raw('SUM(quantity) as total_qty'),
                DB::raw('SUM(total_price) as total_revenue')
            )
            ->whereHas('order', function ($q) {
                $q->where('status', '!=', Order::STATUS_CANCELLED);
            })
            ->groupBy('product_name')
            ->orderByDesc('total_qty')
            ->take(5)
            ->get();

        $productIds = $topDishesRaw->pluck('product_id')->filter()->unique();
        $productsMap = \App\Models\Product::with('category')->whereIn('id', $productIds)->get()->keyBy('id');

        $maxQty = $topDishesRaw->max('total_qty') ?: 1;
        $topDishes = $topDishesRaw->map(function ($item) use ($maxQty, $currency, $productsMap) {
            $percent = min(100, (int) round(($item->total_qty / $maxQty) * 100));
            $product = $item->product_id ? ($productsMap[$item->product_id] ?? null) : null;
            $categoryName = $product?->category?->name ?? 'الأطباق الأكثر طلباً';

            return [
                'name' => $item->product_name,
                'category' => $categoryName,
                'orders' => (int) $item->total_qty,
                'revenue' => number_format((float) $item->total_revenue, 2).' '.$currency,
                'raw_revenue' => (float) $item->total_revenue,
                'percent' => $percent,
            ];
        });

        // 9. Tables list for floor overview
        $tablesList = RestaurantTable::where('is_active', true)
            ->with(['orders' => function ($q) {
                $q->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
                    ->latest();
            }])
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($tbl) use ($currency) {
                $activeOrder = $tbl->orders->first();

                return [
                    'id' => $tbl->name,
                    'table_id' => $tbl->id,
                    'order_id' => $activeOrder ? $activeOrder->id : null,
                    'seats' => (int) $tbl->capacity,
                    'status' => $tbl->status,
                    'orderId' => $activeOrder ? $activeOrder->order_number : ($tbl->status === 'available' ? 'جاهزة للاستقبال' : 'حجز مسبق'),
                    'bill' => $activeOrder ? number_format((float) $activeOrder->total, 2).' '.$currency : '-',
                    'raw_bill' => $activeOrder ? (float) $activeOrder->total : 0,
                    'time' => $activeOrder ? $activeOrder->created_at->diffForHumans(null, true) : ($tbl->notes ?: '-'),
                ];
            });

        // 10. Delivery fleet list
        $deliveryFleet = DeliveryDriver::where('is_active', true)
            ->with(['orders' => function ($q) {
                $q->where('status', Order::STATUS_OUT_FOR_DELIVERY)->latest();
            }])
            ->get()
            ->map(function ($driver) {
                $activeOrder = $driver->orders->first();
                $statusAr = match ($driver->status) {
                    'on_delivery' => 'في الطريق للعميل',
                    'available' => 'متاح للتوصيل',
                    'off_duty' => 'خارج الخدمة',
                    default => $driver->status,
                };
                $vehicleAr = match ($driver->vehicle_type) {
                    'motorcycle' => 'دراجة نارية',
                    'car' => 'سيارة',
                    'scooter' => 'سكوتر',
                    'bicycle' => 'دراجة هوائية',
                    default => $driver->vehicle_type,
                };

                return [
                    'driver_id' => $driver->id,
                    'driver' => $driver->name,
                    'phone' => $driver->phone,
                    'vehicle' => $vehicleAr,
                    'status' => $statusAr,
                    'raw_status' => $driver->status,
                    'time' => $activeOrder ? $activeOrder->created_at->diffForHumans(null, true) : 'جاهز فوراً',
                    'order' => $activeOrder ? $activeOrder->order_number : '-',
                    'destination' => $activeOrder?->customer?->address ?: ($activeOrder ? 'عنوان العميل' : '-'),
                ];
            });

        return $this->successResponse([
            'summary' => [
                'today_sales' => round($todaySales, 2),
                'today_orders_count' => $todayOrdersCount,
                'today_dinein_count' => $todayDineinCount,
                'today_delivery_count' => $todayDeliveryCount,
                'today_takeaway_count' => $todayTakeawayCount,
                'all_time_sales' => round($allTimeSales, 2),
                'all_time_orders' => $allTimeOrders,
                'total_customers' => $totalCustomers,
                'new_customers_30d' => $newCustomersThisMonth,
                'tables' => [
                    'total' => $totalTables,
                    'occupied' => $occupiedTables,
                    'reserved' => $reservedTables,
                    'available' => $availableTables,
                ],
                'drivers' => [
                    'total' => $totalDrivers,
                    'on_delivery' => $onDeliveryDrivers,
                    'available' => $availableDrivers,
                    'off_duty' => $offDutyDrivers,
                ],
                'currency' => $currency,
                'stats_date' => $today->toDateString(),
                'is_today' => $today->isToday(),
            ],
            'hourly_sales' => $hourlySalesData,
            'weekly_finance' => $weeklyFinanceData,
            'active_orders' => $activeOrders,
            'top_dishes' => $topDishes,
            'tables' => $tablesList,
            'delivery_fleet' => $deliveryFleet,
        ], 'تم جلب إحصائيات لوحة التحكم بنجاح.');
    }

    /**
     * Get detailed sales reports and shift closing summary.
     */
    public function reports(Request $request): JsonResponse
    {
        $setting = Setting::instance();
        $currency = $setting->currency ?? 'ج.م';

        $dateFrom = $request->query('date_from', Carbon::today()->toDateString());
        $dateTo = $request->query('date_to', Carbon::today()->toDateString());
        $registerId = $request->query('cash_register_id');

        $ordersQuery = Order::whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->where('status', '!=', Order::STATUS_CANCELLED);

        if ($registerId && $registerId !== 'all') {
            $ordersQuery->where('cash_register_id', $registerId);
        }

        $totalSales = (float) (clone $ordersQuery)->sum('total');
        $totalSubtotal = (float) (clone $ordersQuery)->sum('subtotal');
        $totalTax = (float) (clone $ordersQuery)->sum('tax');
        $totalDeliveryFees = (float) (clone $ordersQuery)->sum('delivery_fee');
        $totalOrdersCount = (int) (clone $ordersQuery)->count();

        // Cancelled orders
        $cancelledOrdersCount = Order::whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->where('status', Order::STATUS_CANCELLED)
            ->count();

        // Breakdown by order type
        $byOrderType = [
            'dinein' => [
                'count' => (int) (clone $ordersQuery)->where('order_type', 'dinein')->count(),
                'total' => (float) round((clone $ordersQuery)->where('order_type', 'dinein')->sum('total'), 2),
            ],
            'takeaway' => [
                'count' => (int) (clone $ordersQuery)->where('order_type', 'takeaway')->count(),
                'total' => (float) round((clone $ordersQuery)->where('order_type', 'takeaway')->sum('total'), 2),
            ],
            'delivery' => [
                'count' => (int) (clone $ordersQuery)->where('order_type', 'delivery')->count(),
                'total' => (float) round((clone $ordersQuery)->where('order_type', 'delivery')->sum('total'), 2),
            ],
        ];

        // Payments breakdown
        $paymentsQuery = DB::table('payments')
            ->join('orders', 'payments.order_id', '=', 'orders.id')
            ->whereDate('payments.paid_at', '>=', $dateFrom)
            ->whereDate('payments.paid_at', '<=', $dateTo)
            ->where('orders.status', '!=', Order::STATUS_CANCELLED);

        if ($registerId && $registerId !== 'all') {
            $paymentsQuery->where('payments.cash_register_id', $registerId);
        }

        $paymentsByMethod = (clone $paymentsQuery)
            ->select('payments.payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(payments.amount) as total'))
            ->groupBy('payments.payment_method')
            ->get()
            ->keyBy('payment_method');

        $paymentMethods = [
            'cash' => [
                'count' => (int) ($paymentsByMethod['cash']->count ?? 0),
                'total' => (float) round($paymentsByMethod['cash']->total ?? 0, 2),
            ],
            'card' => [
                'count' => (int) ($paymentsByMethod['card']->count ?? 0),
                'total' => (float) round($paymentsByMethod['card']->total ?? 0, 2),
            ],
            'transfer' => [
                'count' => (int) ($paymentsByMethod['transfer']->count ?? 0),
                'total' => (float) round($paymentsByMethod['transfer']->total ?? 0, 2),
            ],
        ];

        // Registers breakdown
        $registers = CashRegister::where('is_active', true)->get()->map(function ($reg) use ($dateFrom, $dateTo) {
            $collected = (float) DB::table('payments')
                ->where('cash_register_id', $reg->id)
                ->whereDate('paid_at', '>=', $dateFrom)
                ->whereDate('paid_at', '<=', $dateTo)
                ->sum('amount');

            $receiptVouchers = (float) FinancialTransaction::where('cash_register_id', $reg->id)
                ->where('transaction_type', 'receipt')
                ->whereDate('date', '>=', $dateFrom)
                ->whereDate('date', '<=', $dateTo)
                ->sum('amount');

            $expenseVouchers = (float) FinancialTransaction::where('cash_register_id', $reg->id)
                ->whereIn('transaction_type', ['payment', 'expense'])
                ->whereDate('date', '>=', $dateFrom)
                ->whereDate('date', '<=', $dateTo)
                ->sum('amount');

            return [
                'id' => $reg->id,
                'name' => $reg->name,
                'current_balance' => (float) $reg->balance,
                'period_order_payments' => round($collected, 2),
                'period_receipt_vouchers' => round($receiptVouchers, 2),
                'period_expenses' => round($expenseVouchers, 2),
                'net_period_flow' => round($collected + $receiptVouchers - $expenseVouchers, 2),
            ];
        });

        // Top dishes for period
        $topDishes = OrderItem::select('product_name', DB::raw('SUM(quantity) as qty'), DB::raw('SUM(total_price) as revenue'))
            ->whereHas('order', function ($q) use ($dateFrom, $dateTo, $registerId) {
                $q->whereDate('created_at', '>=', $dateFrom)
                    ->whereDate('created_at', '<=', $dateTo)
                    ->where('status', '!=', Order::STATUS_CANCELLED);
                if ($registerId && $registerId !== 'all') {
                    $q->where('cash_register_id', $registerId);
                }
            })
            ->groupBy('product_name')
            ->orderByDesc('qty')
            ->take(10)
            ->get()
            ->map(fn ($it) => [
                'name' => $it->product_name,
                'quantity' => (int) $it->qty,
                'revenue' => (float) round($it->revenue, 2),
            ]);

        // Recent orders in period
        $orders = $ordersQuery->with(['table', 'customer', 'cashRegister', 'payments'])
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get();

        return $this->successResponse([
            'summary' => [
                'total_sales' => round($totalSales, 2),
                'total_subtotal' => round($totalSubtotal, 2),
                'total_tax' => round($totalTax, 2),
                'total_delivery_fees' => round($totalDeliveryFees, 2),
                'orders_count' => $totalOrdersCount,
                'cancelled_orders_count' => $cancelledOrdersCount,
                'currency' => $currency,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'by_order_type' => $byOrderType,
            'by_payment_method' => $paymentMethods,
            'registers' => $registers,
            'top_dishes' => $topDishes,
            'orders' => $orders,
        ], 'تم جلب تقرير المبيعات بنجاح.');
    }
}
