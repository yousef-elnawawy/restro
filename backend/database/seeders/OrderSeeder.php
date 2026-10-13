<?php

namespace Database\Seeders;

use App\Models\CashRegister;
use App\Models\Customer;
use App\Models\DeliveryDriver;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class OrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = Product::all()->keyBy('id');
        if ($products->isEmpty()) {
            return;
        }

        $cashierUser = User::where('role', 'cashier')->first() ?? User::first();
        $adminUser = User::where('role', 'admin')->first() ?? User::first();
        $defaultRegister = CashRegister::where('is_default', true)->first() ?? CashRegister::first();
        $tables = RestaurantTable::all()->keyBy('id');
        $customers = Customer::all();
        $drivers = DeliveryDriver::all();

        // قائمة بطلبات متنوعة لملء شاشة المطبخ (KDS)، الصالة، ونقاط البيع، والتقارير
        $seedOrdersData = [
            // 1. طلب صالة قيد التحضير في المطبخ (Preparing)
            [
                'order_number' => 'ORD-1001',
                'order_type' => 'dinein',
                'table_id' => 1,
                'customer_name' => 'عائلة الأحمد',
                'status' => Order::STATUS_PREPARING,
                'payment_status' => Order::PAYMENT_UNPAID,
                'notes' => 'المشروبات تقدم أولاً لو سمحت',
                'created_at' => Carbon::now()->subMinutes(12),
                'items' => [
                    ['product_name' => 'كلاسيك برجر لحم', 'size_name' => 'دبل (300 جم)', 'quantity' => 2, 'unit_price' => 210.00],
                    ['product_name' => 'تشيزي فرايز بالهالبينو', 'size_name' => null, 'quantity' => 1, 'unit_price' => 85.00],
                    ['product_name' => 'كوكاكولا باردة', 'size_name' => null, 'quantity' => 2, 'unit_price' => 35.00],
                ],
            ],

            // 2. طلب صالة جديد بانتظار بدء الطهي (Pending)
            [
                'order_number' => 'ORD-1002',
                'order_type' => 'dinein',
                'table_id' => 3,
                'customer_name' => 'أحمد حسني',
                'status' => Order::STATUS_PENDING,
                'payment_status' => Order::PAYMENT_UNPAID,
                'notes' => 'بدون شطة في البيتزا',
                'created_at' => Carbon::now()->subMinutes(4),
                'items' => [
                    ['product_name' => 'بيتزا بيبروني', 'size_name' => 'كبير عائلي (35 سم)', 'quantity' => 1, 'unit_price' => 220.00],
                    ['product_name' => 'أصابع جبنة موزاريلا مقلية', 'size_name' => null, 'quantity' => 1, 'unit_price' => 80.00],
                    ['product_name' => 'موهيتو ليمون ونعناع', 'size_name' => null, 'quantity' => 2, 'unit_price' => 70.00],
                ],
            ],

            // 3. طلب سفري تيك أواي جاهز للتسليم (Ready)
            [
                'order_number' => 'ORD-1003',
                'order_type' => 'takeaway',
                'table_id' => null,
                'customer_name' => 'طارق مصطفى',
                'status' => Order::STATUS_READY,
                'payment_status' => Order::PAYMENT_PAID,
                'payment_method' => 'cash',
                'cash_register_id' => $defaultRegister?->id,
                'paid_at' => Carbon::now()->subMinutes(18),
                'notes' => 'تغليف سفري محكم',
                'created_at' => Carbon::now()->subMinutes(20),
                'items' => [
                    ['product_name' => 'فيتوتشيني ألفريدو بالدجاج', 'size_name' => null, 'quantity' => 1, 'unit_price' => 165.00],
                    ['product_name' => 'سيزر سالاد بالدجاج المشوي', 'size_name' => null, 'quantity' => 1, 'unit_price' => 135.00],
                    ['product_name' => 'مولتن لافا كيك بالشوكولاتة', 'size_name' => null, 'quantity' => 1, 'unit_price' => 110.00],
                ],
            ],

            // 4. طلب توصيل دليفري جارٍ تحضيره بالمطبخ (Preparing)
            [
                'order_number' => 'ORD-1004',
                'order_type' => 'delivery',
                'table_id' => null,
                'customer_id' => $customers->first()?->id,
                'customer_name' => $customers->first()?->name ?? 'سارة الشريف',
                'delivery_driver_id' => $drivers->first()?->id,
                'status' => Order::STATUS_PREPARING,
                'payment_status' => Order::PAYMENT_UNPAID,
                'delivery_fee' => 30.00,
                'notes' => 'الدور الرابع - الشقة رقم 12',
                'created_at' => Carbon::now()->subMinutes(16),
                'items' => [
                    ['product_name' => 'دبل تشيز برجر', 'size_name' => null, 'quantity' => 2, 'unit_price' => 210.00],
                    ['product_name' => 'كرسبي تشيكن برجر', 'size_name' => null, 'quantity' => 1, 'unit_price' => 165.00],
                    ['product_name' => 'بطاطس مقلية كلاسيك', 'size_name' => null, 'quantity' => 2, 'unit_price' => 55.00],
                    ['product_name' => 'كوكاكولا باردة', 'size_name' => null, 'quantity' => 3, 'unit_price' => 35.00],
                ],
            ],

            // 5. طلب صالة تم تقديمه وجالسون بالصالة (Served)
            [
                'order_number' => 'ORD-1005',
                'order_type' => 'dinein',
                'table_id' => 7,
                'customer_name' => 'مجموعة شباب',
                'status' => Order::STATUS_SERVED,
                'payment_status' => Order::PAYMENT_UNPAID,
                'notes' => 'طاولة عائلية 7',
                'created_at' => Carbon::now()->subMinutes(35),
                'items' => [
                    ['product_name' => 'ستيك ريب آي بلاك أنجوس', 'size_name' => '350 جرام', 'quantity' => 1, 'unit_price' => 490.00],
                    ['product_name' => 'ميكس جريل ريسترو مشكل', 'size_name' => 'مزدوج لشخصين', 'quantity' => 1, 'unit_price' => 620.00],
                    ['product_name' => 'شوربة كريمة الدجاج والمشروم', 'size_name' => null, 'quantity' => 2, 'unit_price' => 75.00],
                    ['product_name' => 'عصير برتقال فريش طبيعي', 'size_name' => null, 'quantity' => 3, 'unit_price' => 60.00],
                ],
            ],

            // 6. طلب مكتمل ومدفوع (Completed)
            [
                'order_number' => 'ORD-0995',
                'order_type' => 'dinein',
                'table_id' => 2,
                'customer_name' => 'محمود رشاد',
                'status' => Order::STATUS_COMPLETED,
                'payment_status' => Order::PAYMENT_PAID,
                'payment_method' => 'cash',
                'cash_register_id' => $defaultRegister?->id,
                'paid_at' => Carbon::now()->subHours(2),
                'notes' => 'تم الدفع كاش وإخلاء الطاولة',
                'created_at' => Carbon::now()->subHours(2)->subMinutes(40),
                'items' => [
                    ['product_name' => 'بيتزا مارجريتا إيطالية', 'size_name' => 'وسط (28 سم)', 'quantity' => 1, 'unit_price' => 180.00],
                    ['product_name' => 'بافلو تشيكن وينجز', 'size_name' => null, 'quantity' => 1, 'unit_price' => 120.00],
                    ['product_name' => 'موهيتو توت أزرق (بلو بيري)', 'size_name' => null, 'quantity' => 2, 'unit_price' => 75.00],
                ],
            ],

            // 7. طلب دليفري مكتمل ومُسلَّم (Completed)
            [
                'order_number' => 'ORD-0996',
                'order_type' => 'delivery',
                'table_id' => null,
                'customer_id' => $customers->skip(1)->first()?->id,
                'customer_name' => 'منى يوسف',
                'delivery_driver_id' => $drivers->skip(1)->first()?->id,
                'status' => Order::STATUS_COMPLETED,
                'payment_status' => Order::PAYMENT_PAID,
                'payment_method' => 'card',
                'delivery_fee' => 30.00,
                'cash_register_id' => $defaultRegister?->id,
                'paid_at' => Carbon::now()->subHours(3),
                'notes' => 'تم التوصيل بنجاح',
                'created_at' => Carbon::now()->subHours(3)->subMinutes(30),
                'items' => [
                    ['product_name' => 'شاورما دجاج عربي صاج', 'size_name' => null, 'quantity' => 3, 'unit_price' => 110.00],
                    ['product_name' => 'تشيزي فرايز بالهالبينو', 'size_name' => null, 'quantity' => 1, 'unit_price' => 85.00],
                    ['product_name' => 'عصير مانجو طبيعي فاخر', 'size_name' => null, 'quantity' => 3, 'unit_price' => 70.00],
                ],
            ],

            // 8. طلب تيك أواي مكتمل للأمس (Past statistics)
            [
                'order_number' => 'ORD-0980',
                'order_type' => 'takeaway',
                'table_id' => null,
                'customer_name' => 'كريم الدسوقي',
                'status' => Order::STATUS_COMPLETED,
                'payment_status' => Order::PAYMENT_PAID,
                'payment_method' => 'cash',
                'cash_register_id' => $defaultRegister?->id,
                'paid_at' => Carbon::yesterday()->setHour(19),
                'notes' => 'طلب مسائي',
                'created_at' => Carbon::yesterday()->setHour(18)->setMinute(45),
                'items' => [
                    ['product_name' => 'جمبري بتر فلاي مشوي', 'size_name' => null, 'quantity' => 1, 'unit_price' => 310.00],
                    ['product_name' => 'طاجن سي فود بالوايت صوص', 'size_name' => null, 'quantity' => 1, 'unit_price' => 280.00],
                    ['product_name' => 'سمك فيليه مشوي بصوص الليمون', 'size_name' => null, 'quantity' => 1, 'unit_price' => 230.00],
                ],
            ],
        ];

        foreach ($seedOrdersData as $orderData) {
            $itemsData = $orderData['items'];
            unset($orderData['items']);

            // حساب الإجماليات
            $subtotal = 0;
            foreach ($itemsData as $it) {
                $subtotal += ($it['quantity'] * $it['unit_price']);
            }
            $tax = round($subtotal * 0.14, 2);
            $deliveryFee = $orderData['delivery_fee'] ?? 0;
            $total = $subtotal + $tax + $deliveryFee;

            $order = Order::updateOrCreate(
                ['order_number' => $orderData['order_number']],
                array_merge($orderData, [
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'delivery_fee' => $deliveryFee,
                    'total' => $total,
                    'user_id' => $cashierUser?->id ?? $adminUser?->id,
                ])
            );

            // حذف البنود القديمة وإعادة إنشائها
            $order->items()->delete();
            foreach ($itemsData as $it) {
                // محاولة ربط الصنف بمنتج حقيقي إن وجد
                $matchedProduct = Product::where('name', $it['product_name'])->first();

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $matchedProduct?->id,
                    'product_name' => $it['product_name'],
                    'size_name' => $it['size_name'],
                    'unit_price' => $it['unit_price'],
                    'quantity' => $it['quantity'],
                    'total_price' => $it['quantity'] * $it['unit_price'],
                    'selected_extras' => [],
                    'notes' => null,
                ]);
            }

            // تحديث حالة الطاولات النشطة
            if ($order->table_id && in_array($order->status, [Order::STATUS_PENDING, Order::STATUS_PREPARING, Order::STATUS_READY, Order::STATUS_SERVED])) {
                RestaurantTable::where('id', $order->table_id)->update(['status' => 'occupied']);
            }
        }
    }
}
