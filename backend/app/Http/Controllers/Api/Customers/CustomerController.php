<?php

namespace App\Http\Controllers\Api\Customers;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CustomerController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of customers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $customers = $query->orderBy('name', 'asc')->get();

        return $this->successResponse($customers, 'تم جلب قائمة العملاء بنجاح.');
    }

    /**
     * Store a newly created customer.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30', 'unique:customers,phone'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'اسم العميل مطلوب.',
            'phone.required' => 'رقم هاتف العميل مطلوب.',
            'phone.unique' => 'رقم الهاتف مسجل بالفعل لعميل آخر.',
            'email.email' => 'البريد الإلكتروني غير صالح.',
        ]);

        $customer = Customer::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->successResponse($customer, 'تم إضافة العميل بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified customer.
     */
    public function show(Customer $customer): JsonResponse
    {
        $customer->load(['orders' => function ($q) {
            $q->orderBy('created_at', 'desc')->limit(10);
        }]);

        return $this->successResponse($customer, 'تم جلب بيانات العميل بنجاح.');
    }

    /**
     * Update the specified customer.
     */
    public function update(Request $request, Customer $customer): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30', 'unique:customers,phone,' . $customer->id],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'اسم العميل مطلوب.',
            'phone.required' => 'رقم هاتف العميل مطلوب.',
            'phone.unique' => 'رقم الهاتف مسجل بالفعل لعميل آخر.',
            'email.email' => 'البريد الإلكتروني غير صالح.',
        ]);

        $customer->update($validated);

        return $this->successResponse($customer, 'تم تحديث بيانات العميل بنجاح.');
    }

    /**
     * Remove the specified customer.
     */
    public function destroy(Customer $customer): JsonResponse
    {
        $customer->delete();

        return $this->successResponse(null, 'تم حذف العميل بنجاح.');
    }

    /**
     * Get account statement (كشف حساب العميل وعملياته ورصيده)
     */
    public function statement(Customer $customer): JsonResponse
    {
        $orders = $customer->orders()
            ->with(['items.product', 'table', 'payments'])
            ->orderBy('created_at', 'desc')
            ->get();

        $transactions = $customer->transactions()
            ->with(['cashRegister'])
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        // Build chronological ledger
        $entries = collect();

        foreach ($orders as $order) {
            $orderTotal = (float) $order->total;
            $orderPaid = (float) $order->payments->sum('amount');

            $entries->push([
                'id' => 'order-' . $order->id,
                'type' => 'order',
                'title' => 'طلب #' . $order->order_number,
                'reference' => $order->order_number,
                'date' => $order->created_at->format('Y-m-d H:i:s'),
                'debit' => $orderTotal,
                'credit' => $orderPaid,
                'payment_status' => $order->payment_status,
                'status' => $order->status,
                'notes' => $order->notes,
            ]);
        }

        foreach ($transactions as $tx) {
            $isReceipt = $tx->transaction_type === 'receipt';
            $entries->push([
                'id' => 'tx-' . $tx->id,
                'type' => 'voucher',
                'voucher_type' => $tx->transaction_type,
                'title' => $isReceipt ? 'سند قبض' : 'سند دفع',
                'reference' => $tx->voucher_number,
                'date' => $tx->date->format('Y-m-d') . ' ' . $tx->created_at->format('H:i:s'),
                'debit' => $isReceipt ? 0.00 : (float) $tx->amount,
                'credit' => $isReceipt ? (float) $tx->amount : 0.00,
                'payment_method' => $tx->payment_method,
                'register_name' => $tx->cashRegister?->name,
                'description' => $tx->description,
                'notes' => $tx->notes,
            ]);
        }

        $sortedEntries = $entries->sortBy('date')->values();
        $runningBalance = 0.00;
        $ledgerWithBalance = $sortedEntries->map(function ($entry) use (&$runningBalance) {
            $runningBalance += ($entry['credit'] - $entry['debit']);
            $entry['running_balance'] = round($runningBalance, 2);
            return $entry;
        });

        $totalPaidOnOrders = (float) $orders->reduce(fn ($carry, $ord) => $carry + (float) $ord->payments->sum('amount'), 0);

        return $this->successResponse([
            'customer' => $customer,
            'summary' => [
                'current_balance' => (float) $customer->balance,
                'total_orders_count' => (int) $customer->total_orders,
                'total_orders_amount' => (float) $orders->sum('total'),
                'total_payments_amount' => $totalPaidOnOrders + (float) $transactions->where('transaction_type', 'receipt')->sum('amount'),
            ],
            'orders' => $orders,
            'transactions' => $transactions,
            'ledger' => $ledgerWithBalance->reverse()->values(),
        ], 'تم جلب كشف حساب العميل بنجاح.');
    }
}
