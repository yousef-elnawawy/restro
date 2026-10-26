<?php

namespace App\Http\Controllers\Api\Orders;

use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\Customer;
use App\Models\DeliveryDriver;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\RestaurantTable;
use App\Models\Setting;
use App\Models\Shift;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class OrderController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of orders.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::query()->with([
            'table',
            'customer',
            'deliveryDriver',
            'cashRegister',
            'items.product',
            'payments.cashRegister',
        ]);

        $authUser = $request->user() ?? auth('sanctum')->user();
        if ($authUser && $authUser->isDelivery()) {
            $driver = $authUser->deliveryDriver;
            if (! $driver) {
                $driver = DeliveryDriver::firstOrCreate(
                    ['user_id' => $authUser->id],
                    [
                        'name' => $authUser->name,
                        'phone' => '010' . str_pad((string) $authUser->id, 8, '0', STR_PAD_LEFT),
                        'vehicle_type' => 'motorcycle',
                        'status' => 'available',
                        'is_active' => true,
                    ]
                );
            }
            // مسؤول وسائق الديليفري يرى فقط طلبات التوصيل المسندة إليه
            $query->where('order_type', 'delivery')
                  ->where('delivery_driver_id', $driver->id);
        } elseif ($driverId = $request->query('delivery_driver_id')) {
            $query->where('delivery_driver_id', $driverId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        if ($orderType = $request->query('order_type')) {
            if ($orderType !== 'all' && in_array($orderType, ['dinein', 'takeaway', 'delivery'])) {
                $query->where('order_type', $orderType);
            }
        }

        if ($status = $request->query('status')) {
            if ($status !== 'all' && in_array($status, [
                Order::STATUS_PENDING,
                Order::STATUS_PREPARING,
                Order::STATUS_READY,
                Order::STATUS_SERVED,
                Order::STATUS_OUT_FOR_DELIVERY,
                Order::STATUS_COMPLETED,
                Order::STATUS_CANCELLED,
            ])) {
                $query->where('status', $status);
            }
        }

        if ($paymentStatus = $request->query('payment_status')) {
            if ($paymentStatus !== 'all' && in_array($paymentStatus, [
                Order::PAYMENT_UNPAID,
                Order::PAYMENT_PARTIALLY_PAID,
                Order::PAYMENT_PAID,
            ])) {
                $query->where('payment_status', $paymentStatus);
            }
        }

        if ($tableId = $request->query('table_id')) {
            $query->where('table_id', $tableId);
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        return $this->successResponse($orders, 'تم جلب الطلبات بنجاح.');
    }

    /**
     * Store a newly created order.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_type' => ['required', 'in:dinein,takeaway,delivery'],
            'table_id' => ['required_if:order_type,dinein', 'nullable', 'exists:restaurant_tables,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'delivery_driver_id' => ['nullable', 'exists:delivery_drivers,id'],
            'customer_name' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.product_name' => ['required', 'string', 'max:150'],
            'items.*.size_name' => ['nullable', 'string', 'max:50'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.total_price' => ['required', 'numeric', 'min:0'],
            'items.*.selected_extras' => ['nullable', 'array'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
            'subtotal' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'delivery_distance' => ['nullable', 'numeric', 'min:0'],
            'delivery_address' => ['nullable', 'string', 'max:500'],
            'total' => ['nullable', 'numeric', 'min:0'],
        ], [
            'order_type.required' => 'نوع الطلب مطلوب.',
            'order_type.in' => 'نوع الطلب غير صالح.',
            'table_id.required_if' => 'يرجى اختيار الطاولة عند طلب داخل الصالة.',
            'table_id.exists' => 'الطاولة المحددة غير موجودة.',
            'items.required' => 'يجب إضافة صنف واحد على الأقل للطلب.',
            'items.min' => 'يجب إضافة صنف واحد على الأقل للطلب.',
        ]);

        // If dinein, check table availability
        $table = null;
        if ($validated['order_type'] === 'dinein') {
            $table = RestaurantTable::find($validated['table_id']);
            if (! $table) {
                return $this->errorResponse('الطاولة المحددة غير موجودة.', null, Response::HTTP_NOT_FOUND);
            }

            // Check if table currently has an active unpaid order
            $activeOrder = $table->currentOrder()->first();
            if ($activeOrder) {
                return $this->errorResponse("الطاولة ({$table->name}) مشغولة حالياً بالطلب رقم {$activeOrder->order_number}.", null, Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $setting = Setting::instance();
        $deliveryFee = 0.00;
        $deliveryDistance = isset($validated['delivery_distance']) ? (float) $validated['delivery_distance'] : null;
        $deliveryAddress = $validated['delivery_address'] ?? null;

        if ($validated['order_type'] === 'delivery') {
            if (isset($validated['delivery_fee'])) {
                $deliveryFee = (float) $validated['delivery_fee'];
            } elseif ($deliveryDistance !== null && $deliveryDistance > 0) {
                $baseFee = (float) ($setting->delivery_base_fee ?? $setting->delivery_fee ?? 0);
                $perKm = (float) ($setting->delivery_fee_per_km ?? 0);
                $deliveryFee = round($baseFee + ($deliveryDistance * $perKm), 2);
            } else {
                $deliveryFee = (float) ($setting->delivery_base_fee ?? $setting->delivery_fee ?? 0);
            }
        }

        // Calculate totals if not provided or to ensure integrity
        $calculatedSubtotal = 0;
        foreach ($validated['items'] as $item) {
            $calculatedSubtotal += (float) $item['total_price'];
        }
        $subtotal = isset($validated['subtotal']) ? (float) $validated['subtotal'] : $calculatedSubtotal;
        $taxPercentage = $setting->tax_enabled ? (float) $setting->tax_percentage : 0;
        $calculatedTax = round($subtotal * ($taxPercentage / 100), 2);
        $tax = isset($validated['tax']) ? (float) $validated['tax'] : $calculatedTax;
        $total = isset($validated['total']) ? (float) $validated['total'] : round($subtotal + $tax + $deliveryFee, 2);

        $order = DB::transaction(function () use ($validated, $table, $subtotal, $tax, $deliveryFee, $deliveryDistance, $deliveryAddress, $total, $request) {
            // Generate unique human-readable order number
            $todayCount = Order::whereDate('created_at', today())->count();
            $orderNumber = 'ORD-'.date('Ymd').'-'.str_pad($todayCount + 1, 4, '0', STR_PAD_LEFT);

            $customerName = $validated['customer_name'] ?? null;
            if (! $customerName && ! empty($validated['customer_id'])) {
                $cust = Customer::find($validated['customer_id']);
                if ($cust) {
                    $customerName = $cust->name;
                    if (! $deliveryAddress && ! empty($cust->address)) {
                        $deliveryAddress = $cust->address;
                    }
                }
            }

            // Link to active shift and cash register if available
            $regId = $validated['cash_register_id'] ?? $request->input('cash_register_id');
            $activeShift = null;
            if ($regId) {
                $activeShift = Shift::where('status', 'open')->where('cash_register_id', $regId)->latest('opened_at')->first();
            }
            if (! $activeShift && $request->user()) {
                $activeShift = Shift::where('status', 'open')->where('user_id', $request->user()->id)->latest('opened_at')->first();
            }
            if (! $activeShift) {
                $defaultReg = CashRegister::where('is_default', true)->first();
                if ($defaultReg) {
                    $activeShift = Shift::where('status', 'open')->where('cash_register_id', $defaultReg->id)->latest('opened_at')->first();
                }
            }
            $targetRegisterId = $regId ?? $activeShift?->cash_register_id;

            // Create Order
            $order = Order::create([
                'order_number' => $orderNumber,
                'order_type' => $validated['order_type'],
                'table_id' => $validated['order_type'] === 'dinein' ? $validated['table_id'] : null,
                'customer_id' => $validated['customer_id'] ?? null,
                'delivery_driver_id' => $validated['delivery_driver_id'] ?? null,
                'customer_name' => $customerName ?? ($table ? $table->name : null),
                'delivery_address' => $deliveryAddress,
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'cash_register_id' => $targetRegisterId,
                'shift_id' => $activeShift?->id,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'delivery_fee' => $deliveryFee,
                'delivery_distance' => $deliveryDistance,
                'total' => $total,
                'notes' => $validated['notes'] ?? null,
                'user_id' => $request->user()?->id,
            ]);

            if (! empty($validated['customer_id'])) {
                Customer::where('id', $validated['customer_id'])->increment('total_orders');
            }

            // Create OrderItems
            foreach ($validated['items'] as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'size_name' => $item['size_name'] ?? null,
                    'unit_price' => $item['unit_price'],
                    'quantity' => $item['quantity'],
                    'total_price' => $item['total_price'],
                    'selected_extras' => $item['selected_extras'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            // If dinein, mark table as occupied in the database
            if ($table) {
                $table->status = 'occupied';
                $table->save();
            }

            return $order;
        });

        $order->load(['table', 'customer', 'deliveryDriver', 'items', 'cashRegister']);

        // بث الحدث لحظياً إلى شاشة المطبخ والكاشير عبر Laravel Reverb
        $this->safeBroadcast(new OrderCreated($order));

        return $this->successResponse($order, 'تم إنشاء الطلب بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified order.
     */
    public function show(int $id): JsonResponse
    {
        $order = Order::with([
            'table',
            'customer',
            'deliveryDriver',
            'cashRegister',
            'items.product',
            'payments.cashRegister',
        ])->find($id);

        if (! $order) {
            return $this->errorResponse('الطلب غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        return $this->successResponse($order, 'تم جلب تفاصيل الطلب.');
    }

    /**
     * Update an existing open order (items, table, customer, notes, etc.)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $order = Order::with(['table', 'customer', 'items', 'payments'])->find($id);

        if (! $order) {
            return $this->errorResponse('الطلب غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        if (in_array($order->status, [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])) {
            return $this->errorResponse('لا يمكن تعديل بنود طلب مكتمل أو ملغي.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'order_type' => ['nullable', 'in:dinein,takeaway,delivery'],
            'table_id' => ['nullable', 'exists:restaurant_tables,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'delivery_driver_id' => ['nullable', 'exists:delivery_drivers,id'],
            'customer_name' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.product_name' => ['required', 'string', 'max:150'],
            'items.*.size_name' => ['nullable', 'string', 'max:50'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.total_price' => ['required', 'numeric', 'min:0'],
            'items.*.selected_extras' => ['nullable', 'array'],
            'items.*.notes' => ['nullable', 'string', 'max:500'],
            'subtotal' => ['nullable', 'numeric'],
            'tax' => ['nullable', 'numeric'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'delivery_distance' => ['nullable', 'numeric', 'min:0'],
            'delivery_address' => ['nullable', 'string', 'max:500'],
            'total' => ['nullable', 'numeric'],
        ], [
            'items.required' => 'يجب أن يحتوي الطلب على صنف واحد على الأقل.',
            'items.min' => 'يجب أن يحتوي الطلب على صنف واحد على الأقل.',
        ]);

        $setting = Setting::instance();
        $newOrderType = $validated['order_type'] ?? $order->order_type;
        $deliveryDistance = array_key_exists('delivery_distance', $validated) ? $validated['delivery_distance'] : $order->delivery_distance;
        $deliveryAddress = array_key_exists('delivery_address', $validated) ? $validated['delivery_address'] : $order->delivery_address;
        $deliveryFee = 0.00;

        if ($newOrderType === 'delivery') {
            if (isset($validated['delivery_fee'])) {
                $deliveryFee = (float) $validated['delivery_fee'];
            } elseif ($deliveryDistance !== null && (float) $deliveryDistance > 0) {
                $baseFee = (float) ($setting->delivery_base_fee ?? $setting->delivery_fee ?? 0);
                $perKm = (float) ($setting->delivery_fee_per_km ?? 0);
                $deliveryFee = round($baseFee + ((float) $deliveryDistance * $perKm), 2);
            } else {
                $deliveryFee = ((float) $order->delivery_fee > 0 ? (float) $order->delivery_fee : (float) ($setting->delivery_base_fee ?? $setting->delivery_fee ?? 0));
            }
        }

        // Calculate totals
        $calculatedSubtotal = 0;
        foreach ($validated['items'] as $item) {
            $calculatedSubtotal += (float) $item['total_price'];
        }
        $subtotal = isset($validated['subtotal']) ? (float) $validated['subtotal'] : $calculatedSubtotal;

        $taxPercentage = $setting->tax_enabled ? (float) $setting->tax_percentage : 0;
        $calculatedTax = round($subtotal * ($taxPercentage / 100), 2);
        $tax = isset($validated['tax']) ? (float) $validated['tax'] : $calculatedTax;
        $total = isset($validated['total']) ? (float) $validated['total'] : round($subtotal + $tax + $deliveryFee, 2);

        $order = DB::transaction(function () use ($order, $validated, $newOrderType, $subtotal, $tax, $deliveryFee, $deliveryDistance, $deliveryAddress, $total) {
            $oldTableId = $order->table_id;
            $newTableId = $newOrderType === 'dinein' ? ($validated['table_id'] ?? $order->table_id) : null;

            // Handle table change
            if ($oldTableId && $oldTableId !== $newTableId) {
                $otherActiveOrders = Order::where('table_id', $oldTableId)
                    ->where('id', '!=', $order->id)
                    ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
                    ->exists();

                if (! $otherActiveOrders) {
                    RestaurantTable::where('id', $oldTableId)->update(['status' => 'available']);
                }
            }

            if ($newTableId && $newTableId !== $oldTableId) {
                RestaurantTable::where('id', $newTableId)->update(['status' => 'occupied']);
            }

            // Sync Customer name
            $customerName = $validated['customer_name'] ?? $order->customer_name;
            if (! empty($validated['customer_id']) && $validated['customer_id'] !== $order->customer_id) {
                $cust = Customer::find($validated['customer_id']);
                if ($cust) {
                    $customerName = $cust->name;
                    if (! $deliveryAddress && ! empty($cust->address)) {
                        $deliveryAddress = $cust->address;
                    }
                }
            }

            // Update order attributes
            $order->update([
                'order_type' => $newOrderType,
                'table_id' => $newTableId,
                'customer_id' => array_key_exists('customer_id', $validated) ? $validated['customer_id'] : $order->customer_id,
                'delivery_driver_id' => array_key_exists('delivery_driver_id', $validated) ? $validated['delivery_driver_id'] : $order->delivery_driver_id,
                'customer_name' => $customerName,
                'delivery_address' => $deliveryAddress,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'delivery_fee' => $deliveryFee,
                'delivery_distance' => $deliveryDistance,
                'total' => $total,
                'notes' => array_key_exists('notes', $validated) ? $validated['notes'] : $order->notes,
            ]);

            // Recreate items
            $order->items()->delete();

            foreach ($validated['items'] as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'size_name' => $item['size_name'] ?? null,
                    'unit_price' => $item['unit_price'],
                    'quantity' => $item['quantity'],
                    'total_price' => $item['total_price'],
                    'selected_extras' => $item['selected_extras'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            // Re-evaluate payment status if payments exist
            $totalPaid = (float) $order->payments()->sum('amount');
            if ($totalPaid > 0) {
                if ($totalPaid >= $total) {
                    $order->update(['payment_status' => Order::PAYMENT_PAID]);
                } else {
                    $order->update(['payment_status' => Order::PAYMENT_PARTIALLY_PAID]);
                }
            } else {
                $order->update(['payment_status' => Order::PAYMENT_UNPAID]);
            }

            return $order;
        });

        $order->load(['table', 'customer', 'deliveryDriver', 'cashRegister', 'items.product', 'payments.cashRegister']);

        return $this->successResponse($order, 'تم تحديث أصناف وبيانات الطلب بنجاح.');
    }

    /**
     * Update the status of the order following type-specific lifecycle.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $order = Order::with(['table', 'deliveryDriver', 'payments', 'items'])->find($id);

        if (! $order) {
            return $this->errorResponse('الطلب غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        $allowedStatuses = Order::STATUSES_BY_TYPE[$order->order_type] ?? [];
        $allowedStatusesStr = implode(',', $allowedStatuses);

        $validated = $request->validate([
            'status' => ['required', 'string', "in:{$allowedStatusesStr}"],
            'delivery_driver_id' => ['nullable', 'exists:delivery_drivers,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'status.required' => 'حالة الطلب مطلوبة.',
            'status.in' => 'الحالة المحددة غير صالحة لهذا النوع من الطلبات.',
            'delivery_driver_id.exists' => 'سائق التوصيل المحدد غير موجود.',
        ]);

        $newStatus = $validated['status'];
        $oldStatus = $order->status;

        // If delivery order moving to out_for_delivery, ensure a driver is linked
        if ($order->order_type === 'delivery' && $newStatus === Order::STATUS_OUT_FOR_DELIVERY) {
            $driverId = $validated['delivery_driver_id'] ?? $order->delivery_driver_id;
            if (! $driverId) {
                return $this->errorResponse('يرجى تحديد سائق التوصيل أولاً قبل إخراج الطلب للتوصيل.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $order->delivery_driver_id = $driverId;
        } elseif (! empty($validated['delivery_driver_id'])) {
            $order->delivery_driver_id = $validated['delivery_driver_id'];
        }

        DB::transaction(function () use ($order, $newStatus, $validated) {
            $order->status = $newStatus;
            if (! empty($validated['notes'])) {
                $order->notes = ($order->notes ? $order->notes."\n" : '')."ملاحظة ({$newStatus}): ".$validated['notes'];
            }
            $order->save();

            // 1. Delivery driver status synchronization
            if ($order->delivery_driver_id) {
                $driver = DeliveryDriver::find($order->delivery_driver_id);
                if ($driver) {
                    if ($newStatus === Order::STATUS_OUT_FOR_DELIVERY) {
                        $driver->update(['status' => 'on_delivery']);
                    } elseif (in_array($newStatus, [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])) {
                        $hasOtherDeliveries = Order::where('delivery_driver_id', $driver->id)
                            ->where('id', '!=', $order->id)
                            ->where('status', Order::STATUS_OUT_FOR_DELIVERY)
                            ->exists();

                        if (! $hasOtherDeliveries) {
                            $driver->update(['status' => 'available']);
                        }
                    }
                }
            }

            // 2. Table status synchronization (Dine-in)
            if ($order->table_id) {
                if (in_array($newStatus, [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])) {
                    $hasOtherActiveOrders = Order::where('table_id', $order->table_id)
                        ->where('id', '!=', $order->id)
                        ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
                        ->exists();

                    if (! $hasOtherActiveOrders) {
                        RestaurantTable::where('id', $order->table_id)->update(['status' => 'available']);
                    }
                } elseif (in_array($newStatus, [Order::STATUS_PENDING, Order::STATUS_PREPARING, Order::STATUS_SERVED])) {
                    RestaurantTable::where('id', $order->table_id)->update(['status' => 'occupied']);
                }
            }
        });

        $order->load(['table', 'customer', 'deliveryDriver', 'cashRegister', 'items.product', 'payments.cashRegister']);

        // بث تحديث الحالة لحظياً إلى شاشة الكاشير والمطبخ
        $this->safeBroadcast(new OrderStatusUpdated($order, $oldStatus));

        $statusLabels = [
            Order::STATUS_PENDING => 'جديد',
            Order::STATUS_PREPARING => 'جاري التحضير',
            Order::STATUS_READY => 'جاهز',
            Order::STATUS_SERVED => 'تم التقديم',
            Order::STATUS_OUT_FOR_DELIVERY => 'خرج للتوصيل',
            Order::STATUS_COMPLETED => 'مكتمل',
            Order::STATUS_CANCELLED => 'ملغي',
        ];

        $label = $statusLabels[$newStatus] ?? $newStatus;

        return $this->successResponse($order, "تم تحديث حالة الطلب إلى ({$label}) بنجاح.");
    }

    /**
     * Assign or change delivery driver for a delivery order.
     */
    public function assignDriver(Request $request, int $id): JsonResponse
    {
        $order = Order::find($id);

        if (! $order) {
            return $this->errorResponse('الطلب غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        if ($order->order_type !== 'delivery') {
            return $this->errorResponse('يمكن تعيين سائق لطلبات التوصيل (الديليفري) فقط.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'delivery_driver_id' => ['required', 'exists:delivery_drivers,id'],
        ], [
            'delivery_driver_id.required' => 'يرجى اختيار سائق التوصيل.',
            'delivery_driver_id.exists' => 'سائق التوصيل غير موجود.',
        ]);

        $order->delivery_driver_id = $validated['delivery_driver_id'];
        $order->save();

        $order->load(['table', 'customer', 'deliveryDriver', 'cashRegister', 'items.product', 'payments.cashRegister']);

        return $this->successResponse($order, 'تم تعيين سائق التوصيل بنجاح.');
    }

    /**
     * Settle payment for an order (partial or full).
     */
    public function pay(Request $request, int $id): JsonResponse
    {
        $order = Order::with(['table', 'items', 'payments'])->find($id);

        if (! $order) {
            return $this->errorResponse('الطلب غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        if ($order->payment_status === Order::PAYMENT_PAID) {
            return $this->errorResponse('هذا الطلب تم سداده بالكامل مسبقاً.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $totalPaidBefore = (float) $order->payments()->sum('amount');
        $remainingTotal = max(0, round((float) $order->total - $totalPaidBefore, 2));

        $validated = $request->validate([
            'cash_register_id' => ['required', 'exists:cash_registers,id'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'payment_method' => ['nullable', 'string'],
            'notes' => ['nullable', 'string', 'max:500'],
            'complete_order' => ['nullable', 'boolean'],
        ], [
            'cash_register_id.required' => 'يرجى تحديد الخزنة المراد تسجيل الدفع عليها.',
            'cash_register_id.exists' => 'الخزنة المحددة غير موجودة.',
        ]);

        $register = CashRegister::find($validated['cash_register_id']);
        if (! $register || ! $register->is_active) {
            return $this->errorResponse('الخزنة المحددة غير مفعلة، يرجى اختيار خزنة نشطة.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $amountToPay = isset($validated['amount']) ? (float) $validated['amount'] : $remainingTotal;
        $paymentMethod = $validated['payment_method'] ?? 'cash';
        $completeOrder = $validated['complete_order'] ?? false;

        DB::transaction(function () use ($order, $register, $amountToPay, $totalPaidBefore, $paymentMethod, $completeOrder, $validated) {
            // Find active shift on this register or user
            $activeShift = Shift::where('status', 'open')
                ->where('cash_register_id', $register->id)
                ->latest('opened_at')
                ->first();

            // 1. Record payment transaction
            Payment::create([
                'order_id' => $order->id,
                'cash_register_id' => $register->id,
                'shift_id' => $activeShift?->id ?? $order->shift_id,
                'amount' => $amountToPay,
                'payment_method' => $paymentMethod,
                'notes' => $validated['notes'] ?? "سداد للطلب {$order->order_number}",
                'paid_at' => now(),
            ]);

            // 2. Increment cash register balance
            $register->increment('balance', $amountToPay);

            // 3. Determine new payment status
            $newTotalPaid = round($totalPaidBefore + $amountToPay, 2);
            $isFullyPaid = $newTotalPaid >= (float) $order->total;
            $newPaymentStatus = $isFullyPaid ? Order::PAYMENT_PAID : Order::PAYMENT_PARTIALLY_PAID;

            // 4. Update order payment attributes
            $orderUpdates = [
                'payment_status' => $newPaymentStatus,
                'payment_method' => $paymentMethod,
                'cash_register_id' => $register->id,
            ];

            if ($activeShift && ! $order->shift_id) {
                $orderUpdates['shift_id'] = $activeShift->id;
            }

            if ($isFullyPaid) {
                $orderUpdates['paid_at'] = now();
            }

            // Only complete the order if explicitly requested, or if a dine-in order is already served/ready and now fully paid
            if ($completeOrder) {
                $orderUpdates['status'] = Order::STATUS_COMPLETED;
            } elseif ($isFullyPaid && $order->order_type === 'dinein' && in_array($order->status, [Order::STATUS_SERVED, Order::STATUS_READY])) {
                $orderUpdates['status'] = Order::STATUS_COMPLETED;
            }

            $order->update($orderUpdates);
            $currentStatus = $orderUpdates['status'] ?? $order->status;

            // 5. Update customer spending if linked
            if ($order->customer_id) {
                Customer::where('id', $order->customer_id)->increment('total_spent', $amountToPay);
            }

            // 6. Free table if order is completed
            if ($currentStatus === Order::STATUS_COMPLETED && $order->table_id) {
                $otherActiveOrders = Order::where('table_id', $order->table_id)
                    ->where('id', '!=', $order->id)
                    ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
                    ->exists();

                if (! $otherActiveOrders) {
                    RestaurantTable::where('id', $order->table_id)->update(['status' => 'available']);
                }
            }
        });

        $order->load(['table', 'customer', 'deliveryDriver', 'cashRegister', 'items', 'payments.cashRegister']);

        // بث تحديث حالة السداد وإغلاق الطلب
        $this->safeBroadcast(new OrderStatusUpdated($order, '', 'تم سداد الطلب بنجاح'));

        $message = $order->payment_status === Order::PAYMENT_PAID
            ? 'تم تسجيل الدفع بالكامل بنجاح.'
            : 'تم تسجيل الدفعة الجزئية بنجاح.';

        return $this->successResponse($order, $message);
    }

    /**
     * Cancel the specified order.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $order = Order::find($id);

        if (! $order) {
            return $this->errorResponse('الطلب غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        if ($order->payment_status === Order::PAYMENT_PAID) {
            return $this->errorResponse('لا يمكن إلغاء طلب تم سداده بالكامل وإغلاقه.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        DB::transaction(function () use ($order) {
            $order->status = Order::STATUS_CANCELLED;

            // Refund any partial or recorded payments from cash registers and adjust customer totals
            $totalRefunded = 0;
            $payments = $order->payments()->get();
            foreach ($payments as $payment) {
                if ($payment->cash_register_id && (float) $payment->amount > 0) {
                    $register = CashRegister::find($payment->cash_register_id);
                    if ($register) {
                        $register->decrement('balance', (float) $payment->amount);
                    }
                }
                $totalRefunded += (float) $payment->amount;
            }

            // Adjust customer total_spent and total_orders if linked
            if ($order->customer_id) {
                $customer = Customer::find($order->customer_id);
                if ($customer) {
                    if ($totalRefunded > 0) {
                        $customer->decrement('total_spent', min($totalRefunded, (float) $customer->total_spent));
                    }
                    if ($customer->total_orders > 0) {
                        $customer->decrement('total_orders', 1);
                    }
                }
            }

            if ($totalRefunded > 0) {
                $order->payments()->delete();
                $order->payment_status = Order::PAYMENT_UNPAID;
            }

            $order->save();

            // If table linked, check if table can be freed
            if ($order->table_id) {
                $otherActiveOrders = Order::where('table_id', $order->table_id)
                    ->where('id', '!=', $order->id)
                    ->whereNotIn('status', [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED])
                    ->exists();

                if (! $otherActiveOrders) {
                    RestaurantTable::where('id', $order->table_id)->update(['status' => 'available']);
                }
            }

            // If driver linked, check if driver can be freed
            if ($order->delivery_driver_id) {
                $otherDeliveries = Order::where('delivery_driver_id', $order->delivery_driver_id)
                    ->where('id', '!=', $order->id)
                    ->where('status', Order::STATUS_OUT_FOR_DELIVERY)
                    ->exists();

                if (! $otherDeliveries) {
                    DeliveryDriver::where('id', $order->delivery_driver_id)->update(['status' => 'available']);
                }
            }
        });

        $order->load(['table', 'customer', 'deliveryDriver', 'items']);
        $this->safeBroadcast(new OrderStatusUpdated($order, '', "تم إلغاء الطلب #{$order->order_number}"));

        return $this->successResponse(null, 'تم إلغاء الطلب بنجاح وتحديث الحالات المرتبطة.');
    }

    /**
     * Display active preparing and ready orders for customer calling display.
     */
    public function queueOrders(): JsonResponse
    {
        $orders = Order::select(['id', 'order_number', 'status', 'order_type', 'table_id', 'created_at', 'updated_at'])
            ->with(['table:id,name'])
            ->whereIn('status', [Order::STATUS_PREPARING, Order::STATUS_READY])
            ->where('created_at', '>=', now()->subHours(14))
            ->orderBy('updated_at', 'desc')
            ->get();

        $preparing = $orders->where('status', Order::STATUS_PREPARING)->values();
        $ready = $orders->where('status', Order::STATUS_READY)->values();

        return $this->successResponse([
            'preparing' => $preparing,
            'ready' => $ready,
        ], 'تم جلب طلبات شاشة النداء بنجاح.');
    }

    /**
     * Safely dispatch broadcast events without failing the request if the WebSocket server is down.
     */
    private function safeBroadcast(object $event): void
    {
        try {
            event($event);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('WebSocket broadcast failed: '.$e->getMessage());
        }
    }
}
