<?php

namespace App\Http\Controllers\Api\Analytics;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Setting;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    use ApiResponse;

    /**
     * Menu Engineering Matrix (BCG Matrix for Restaurant Dishes).
     */
    public function menuEngineering(Request $request): JsonResponse
    {
        $dateFrom = $request->query('date_from', now()->subDays(30)->toDateString());
        $dateTo = $request->query('date_to', now()->toDateString());

        // Get total sold items grouped by product
        $soldItems = OrderItem::query()
            ->select('product_id', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(total_price) as total_revenue'))
            ->whereHas('order', function ($q) use ($dateFrom, $dateTo) {
                $q->where('status', 'completed')
                  ->whereDate('created_at', '>=', $dateFrom)
                  ->whereDate('created_at', '<=', $dateTo);
            })
            ->whereNotNull('product_id')
            ->groupBy('product_id')
            ->get()
            ->keyBy('product_id');

        $allProducts = Product::with('category')->get();

        if ($allProducts->isEmpty()) {
            return $this->successResponse([
                'matrix' => ['stars' => [], 'plowhorses' => [], 'puzzles' => [], 'dogs' => []],
                'summary' => ['total_items' => 0, 'avg_popularity' => 0, 'avg_margin' => 0],
            ], 'لا توجد أطباق مسجلة في المنيو.');
        }

        // Calculate metrics per product
        $productsMetrics = [];
        $totalQuantitySold = 0;
        $totalRevenue = 0;

        foreach ($allProducts as $product) {
            $sold = $soldItems->get($product->id);
            $qty = $sold ? (int) $sold->total_qty : 0;
            $revenue = $sold ? (float) $sold->total_revenue : 0.0;
            $price = (float) $product->price;

            // Estimated food cost (35% default if no explicit cost field)
            $estimatedCost = round($price * 0.35, 2);
            $unitMargin = round($price - $estimatedCost, 2);
            $totalMargin = round($qty * $unitMargin, 2);

            $totalQuantitySold += $qty;
            $totalRevenue += $revenue;

            $productsMetrics[] = [
                'id' => $product->id,
                'name' => $product->name,
                'category_name' => $product->category?->name ?? 'عام',
                'image' => $product->image,
                'price' => $price,
                'estimated_cost' => $estimatedCost,
                'unit_margin' => $unitMargin,
                'quantity_sold' => $qty,
                'total_revenue' => $revenue,
                'total_margin' => $totalMargin,
            ];
        }

        $activeProductCount = count($productsMetrics);
        $avgQty = $activeProductCount > 0 ? ($totalQuantitySold / $activeProductCount) : 0;
        $avgMargin = $activeProductCount > 0 ? (collect($productsMetrics)->avg('unit_margin') ?: 0) : 0;

        // Classify each product into the 4 Menu Engineering categories
        $stars = [];
        $plowhorses = [];
        $puzzles = [];
        $dogs = [];

        foreach ($productsMetrics as $item) {
            $isHighPopularity = $item['quantity_sold'] >= $avgQty;
            $isHighMargin = $item['unit_margin'] >= $avgMargin;

            if ($isHighPopularity && $isHighMargin) {
                $item['category'] = 'star';
                $item['category_label'] = 'نجم ساطع (Star)';
                $item['badge_color'] = 'emerald';
                $item['recommendation'] = 'حافظ على جودته وثبات مكوناته، وامنحه صدارة القائمة في العرض والتسويق.';
                $stars[] = $item;
            } elseif ($isHighPopularity && ! $isHighMargin) {
                $item['category'] = 'plowhorse';
                $item['category_label'] = 'حصان جر (Plowhorse)';
                $item['badge_color'] = 'amber';
                $item['recommendation'] = 'مبيعاته ممتازة بهامش ربح قليل، فكر في رفع سعره قليلاً (5%-10%) أو تقليل تكلفة مكوناته.';
                $plowhorses[] = $item;
            } elseif (! $isHighPopularity && $isHighMargin) {
                $item['category'] = 'puzzle';
                $item['category_label'] = 'لغز غامض (Puzzle)';
                $item['badge_color'] = 'blue';
                $item['recommendation'] = 'ربحيته عالية لكن الإقبال ضعيف، قم بعمل عروض كومبو أو تجارب تذوق وترويج مكثف له.';
                $puzzles[] = $item;
            } else {
                $item['category'] = 'dog';
                $item['category_label'] = 'صنف راكد (Dog)';
                $item['badge_color'] = 'rose';
                $item['recommendation'] = 'مبيعات وأرباح منخفضة، فكر في تطوير وصفته أو استبداله بصنف جديد لتوفير المخزون.';
                $dogs[] = $item;
            }
        }

        $settings = Setting::first();
        $currency = $settings->currency ?? 'ج.م';

        return $this->successResponse([
            'matrix' => [
                'stars' => $stars,
                'plowhorses' => $plowhorses,
                'puzzles' => $puzzles,
                'dogs' => $dogs,
            ],
            'summary' => [
                'total_products' => $activeProductCount,
                'total_quantity_sold' => $totalQuantitySold,
                'total_revenue' => round($totalRevenue, 2),
                'avg_popularity_threshold' => round($avgQty, 1),
                'avg_margin_threshold' => round($avgMargin, 2),
                'currency' => $currency,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ], 'تم تحليل هندسة المنيو بنجاح.');
    }

    /**
     * Peak Hours & Busyness Heatmap Analytics.
     */
    public function peakHours(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);
        $since = now()->subDays($days);

        // SQLite / MySQL compatibility for date extraction
        $isSqlite = DB::connection()->getDriverName() === 'sqlite';

        if ($isSqlite) {
            $orders = Order::where('created_at', '>=', $since)
                ->where('status', 'completed')
                ->select([
                    'id',
                    'total',
                    'created_at',
                    DB::raw("CAST(strftime('%w', created_at) AS INTEGER) as day_of_week"),
                    DB::raw("CAST(strftime('%H', created_at) AS INTEGER) as hour_of_day"),
                ])
                ->get();
        } else {
            $orders = Order::where('created_at', '>=', $since)
                ->where('status', 'completed')
                ->select([
                    'id',
                    'total',
                    'created_at',
                    DB::raw('DAYOFWEEK(created_at) - 1 as day_of_week'),
                    DB::raw('HOUR(created_at) as hour_of_day'),
                ])
                ->get();
        }

        // Initialize 7 days x 24 hours grid
        $daysLabels = [
            0 => 'الأحد',
            1 => 'الإثنين',
            2 => 'الثلاثاء',
            3 => 'الأربعاء',
            4 => 'الخميس',
            5 => 'الجمعة',
            6 => 'السبت',
        ];

        $grid = [];
        for ($d = 0; $d < 7; $d++) {
            for ($h = 0; $h < 24; $h++) {
                $grid["{$d}_{$h}"] = [
                    'day' => $d,
                    'day_name' => $daysLabels[$d],
                    'hour' => $h,
                    'hour_label' => sprintf('%02d:00', $h),
                    'orders_count' => 0,
                    'total_sales' => 0.0,
                ];
            }
        }

        $hourlyAggregate = array_fill(0, 24, ['hour' => 0, 'count' => 0, 'sales' => 0.0]);
        for ($h = 0; $h < 24; $h++) {
            $hourlyAggregate[$h]['hour'] = $h;
            $hourlyAggregate[$h]['hour_label'] = sprintf('%02d:00', $h);
        }

        foreach ($orders as $order) {
            $d = (int) $order->day_of_week;
            $h = (int) $order->hour_of_day;
            $key = "{$d}_{$h}";

            if (isset($grid[$key])) {
                $grid[$key]['orders_count'] += 1;
                $grid[$key]['total_sales'] += (float) $order->total;
            }

            if (isset($hourlyAggregate[$h])) {
                $hourlyAggregate[$h]['count'] += 1;
                $hourlyAggregate[$h]['sales'] += (float) $order->total;
            }
        }

        // Identify Top Peak Hours
        $sortedHours = collect($hourlyAggregate)->sortByDesc('count')->values();
        $topPeakHours = $sortedHours->take(3)->map(function ($item) {
            return [
                'hour_label' => $item['hour_label'],
                'orders_count' => $item['count'],
                'total_sales' => round($item['sales'], 2),
            ];
        });

        $settings = Setting::first();
        $currency = $settings->currency ?? 'ج.م';

        return $this->successResponse([
            'days_labels' => $daysLabels,
            'heatmap_grid' => array_values($grid),
            'hourly_aggregate' => $hourlyAggregate,
            'top_peak_hours' => $topPeakHours,
            'total_analyzed_orders' => $orders->count(),
            'period_days' => $days,
            'currency' => $currency,
        ], 'تم جلب تحليلات ساعات الذروة بنجاح.');
    }
}
