<?php

namespace App\Http\Controllers\Api\CashRegisters;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CashRegisterController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of cash registers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = CashRegister::query()->withCount(['payments', 'orders']);

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
        }

        if ($status = $request->query('status')) {
            if ($status === 'active') {
                $query->active();
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $registers = $query->orderBy('is_default', 'desc')->orderBy('name', 'asc')->get();

        return $this->successResponse($registers, 'تم جلب الخزائن بنجاح.');
    }

    /**
     * Store a newly created cash register in storage.
     */
    /**
     * Store a newly created cash register in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:cash_registers,name'],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'balance' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
            'is_default' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'name.required' => 'اسم الخزنة مطلوب.',
            'name.unique' => 'يوجد خزنة مسجلة بهذا الاسم بالفعل.',
            'opening_balance.numeric' => 'يجب أن يكون رصيد أول المدة رقماً صحيحاً.',
        ]);

        $openingBalance = isset($validated['opening_balance'])
            ? (float) $validated['opening_balance']
            : (isset($validated['balance']) ? (float) $validated['balance'] : 0.00);

        if (! empty($validated['is_default'])) {
            // Only one default register allowed
            CashRegister::where('is_default', true)->update(['is_default' => false]);
        }

        $register = CashRegister::create([
            'name' => $validated['name'],
            'opening_balance' => $openingBalance,
            'balance' => $openingBalance,
            'is_active' => $validated['is_active'] ?? true,
            'is_default' => $validated['is_default'] ?? false,
            'notes' => $validated['notes'] ?? null,
        ]);

        return $this->successResponse($register, 'تمت إضافة الخزنة بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified cash register.
     */
    public function show(int $id): JsonResponse
    {
        $register = CashRegister::with(['payments.order'])->find($id);

        if (! $register) {
            return $this->errorResponse('الخزنة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        return $this->successResponse($register, 'تم جلب تفاصيل الخزنة.');
    }

    /**
     * Update the specified cash register in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $register = CashRegister::find($id);

        if (! $register) {
            return $this->errorResponse('الخزنة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100', "unique:cash_registers,name,{$id}"],
            'opening_balance' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
            'is_default' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'name.required' => 'اسم الخزنة مطلوب.',
            'name.unique' => 'يوجد خزنة مسجلة بهذا الاسم بالفعل.',
            'opening_balance.numeric' => 'يجب أن يكون رصيد أول المدة رقماً صحيحاً.',
        ]);

        if (! empty($validated['is_default'])) {
            CashRegister::where('id', '!=', $id)->where('is_default', true)->update(['is_default' => false]);
        }

        // When modifying opening balance, reflect the difference onto the current balance
        if (array_key_exists('opening_balance', $validated)) {
            $newOpening = (float) $validated['opening_balance'];
            $oldOpening = (float) $register->opening_balance;
            $diff = $newOpening - $oldOpening;

            $register->opening_balance = $newOpening;
            $register->balance = round((float) $register->balance + $diff, 2);
        }

        if (array_key_exists('name', $validated)) {
            $register->name = $validated['name'];
        }
        if (array_key_exists('is_active', $validated)) {
            $register->is_active = $validated['is_active'];
        }
        if (array_key_exists('is_default', $validated)) {
            $register->is_default = $validated['is_default'];
        }
        if (array_key_exists('notes', $validated)) {
            $register->notes = $validated['notes'];
        }

        $register->save();

        return $this->successResponse($register, 'تم تحديث بيانات الخزنة بنجاح.');
    }

    /**
     * Get detailed Statement of Account (كشف حساب الخزنة) with chronological running balance.
     */
    public function statement(Request $request, int $id): JsonResponse
    {
        $register = CashRegister::find($id);

        if (! $register) {
            return $this->errorResponse('الخزنة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $typeFilter = $request->query('type', 'all');

        // 1. Fetch Order Payments
        $paymentsQuery = $register->payments()->with(['order.user', 'order.table', 'order.customer']);
        if ($dateFrom) {
            $paymentsQuery->whereDate('paid_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $paymentsQuery->whereDate('paid_at', '<=', $dateTo);
        }
        $payments = $paymentsQuery->get();

        // 2. Fetch Financial Transactions (Vouchers)
        $txQuery = $register->transactions()->with(['creator', 'customer']);
        if ($dateFrom) {
            $txQuery->whereDate('date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $txQuery->whereDate('date', '<=', $dateTo);
        }
        $transactions = $txQuery->get();

        // 3. Build unified timeline of entries
        $entries = collect();

        // Opening balance entry
        $entries->push([
            'id' => 'opening-' . $register->id,
            'date' => $register->created_at ? $register->created_at->format('Y-m-d H:i') : now()->format('Y-m-d 00:00'),
            'raw_date' => $register->created_at ? $register->created_at->timestamp : 0,
            'type' => 'opening_balance',
            'type_label' => 'رصيد أول المدة',
            'reference' => 'افتتاحي',
            'description' => 'الرصيد الافتتاحي المعتمد عند تأسيس الخزنة',
            'credit' => (float) $register->opening_balance,
            'debit' => 0.00,
            'payment_method' => 'cash',
            'user_name' => 'النظام',
            'notes' => null,
        ]);

        // Payments (POS sales)
        foreach ($payments as $pay) {
            $orderNum = $pay->order?->order_number ?? "ORD-{$pay->order_id}";
            $cust = $pay->order?->customer_name;
            $desc = "تحصيل مبيعات طلب {$orderNum}" . ($cust ? " (العميل: {$cust})" : "");

            $entries->push([
                'id' => 'payment-' . $pay->id,
                'date' => $pay->paid_at ? $pay->paid_at->format('Y-m-d H:i') : $pay->created_at->format('Y-m-d H:i'),
                'raw_date' => $pay->paid_at ? $pay->paid_at->timestamp : $pay->created_at->timestamp,
                'type' => 'pos_payment',
                'type_label' => 'مبيعات كاشير',
                'reference' => $orderNum,
                'description' => $desc,
                'credit' => (float) $pay->amount,
                'debit' => 0.00,
                'payment_method' => $pay->payment_method ?? 'cash',
                'user_name' => $pay->order?->user?->name ?? 'كاشير',
                'notes' => $pay->notes,
            ]);
        }

        // Financial Transactions
        foreach ($transactions as $tx) {
            $isReceipt = $tx->transaction_type === 'receipt';
            $isExpense = $tx->transaction_type === 'expense';
            $amount = (float) $tx->amount;

            $typeLabel = $isReceipt ? 'سند قبض' : ($isExpense ? 'سند مصاريف' : 'سند صرف');
            $desc = $tx->description ?? ($isExpense ? "مصروفات [{$tx->category}]" : $typeLabel);
            if ($tx->recipient_or_payer) {
                $desc .= $isReceipt ? " (من: {$tx->recipient_or_payer})" : " (إلى: {$tx->recipient_or_payer})";
            }

            $entries->push([
                'id' => 'voucher-' . $tx->id,
                'date' => $tx->date ? $tx->date->format('Y-m-d') . ' ' . $tx->created_at->format('H:i') : $tx->created_at->format('Y-m-d H:i'),
                'raw_date' => $tx->created_at ? $tx->created_at->timestamp : ($tx->date ? $tx->date->timestamp : 0),
                'type' => $tx->transaction_type,
                'type_label' => $typeLabel,
                'reference' => $tx->voucher_number ?? "VOU-{$tx->id}",
                'description' => $desc,
                'credit' => $isReceipt ? $amount : 0.00,
                'debit' => ! $isReceipt ? $amount : 0.00,
                'payment_method' => $tx->payment_method ?? 'cash',
                'user_name' => $tx->creator?->name ?? 'المسؤول',
                'notes' => $tx->notes,
            ]);
        }

        // Sort chronologically ascending to accurately accumulate running balance
        $sorted = $entries->sortBy('raw_date')->values();

        $runningBalance = 0.00;
        $entriesWithRunningBalance = $sorted->map(function ($item) use (&$runningBalance) {
            $runningBalance += ($item['credit'] - $item['debit']);
            $item['running_balance'] = round($runningBalance, 2);
            return $item;
        });

        // Filter by type if requested
        $finalEntries = $entriesWithRunningBalance;
        if ($typeFilter && $typeFilter !== 'all') {
            if ($typeFilter === 'income') {
                $finalEntries = $finalEntries->filter(fn ($e) => $e['credit'] > 0);
            } elseif ($typeFilter === 'expense') {
                $finalEntries = $finalEntries->filter(fn ($e) => $e['debit'] > 0);
            } else {
                $finalEntries = $finalEntries->filter(fn ($e) => $e['type'] === $typeFilter);
            }
        }

        // Summary metrics
        $totalIncome = (float) $payments->sum('amount') + (float) $transactions->where('transaction_type', 'receipt')->sum('amount');
        $totalExpenses = (float) $transactions->whereIn('transaction_type', ['payment', 'expense'])->sum('amount');
        $netFlow = $totalIncome - $totalExpenses;

        return $this->successResponse([
            'register' => $register,
            'summary' => [
                'opening_balance' => (float) $register->opening_balance,
                'total_income' => round($totalIncome, 2),
                'total_expenses' => round($totalExpenses, 2),
                'net_flow' => round($netFlow, 2),
                'current_balance' => (float) $register->balance,
            ],
            'entries' => $finalEntries->reverse()->values(),
        ], 'تم جلب كشف حساب الخزنة بنجاح.');
    }

    /**
     * Remove the specified cash register from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        $register = CashRegister::find($id);

        if (! $register) {
            return $this->errorResponse('الخزنة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        if ($register->is_default) {
            return $this->errorResponse('لا يمكن حذف الخزنة الرئيسية الافتراضية للنظام.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($register->payments()->exists() || $register->orders()->exists()) {
            return $this->errorResponse('لا يمكن حذف الخزنة لوجود معاملات دفع مرتبطة بها، يمكنك تعطيلها بدلاً من الحذف.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $register->delete();

        return $this->successResponse(null, 'تم حذف الخزنة بنجاح.');
    }

    /**
     * Toggle the active status of the specified cash register.
     */
    public function toggleActive(int $id): JsonResponse
    {
        $register = CashRegister::find($id);

        if (! $register) {
            return $this->errorResponse('الخزنة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        if ($register->is_default && $register->is_active) {
            return $this->errorResponse('لا يمكن تعطيل الخزنة الرئيسية الافتراضية للنظام.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $register->is_active = ! $register->is_active;
        $register->save();

        $statusText = $register->is_active ? 'تفعيل' : 'تعطيل';

        return $this->successResponse($register, "تم {$statusText} الخزنة بنجاح.");
    }
}
