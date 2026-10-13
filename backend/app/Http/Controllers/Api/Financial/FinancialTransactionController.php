<?php

namespace App\Http\Controllers\Api\Financial;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\Customer;
use App\Models\FinancialTransaction;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class FinancialTransactionController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of financial transactions (vouchers).
     */
    public function index(Request $request): JsonResponse
    {
        $query = FinancialTransaction::with(['cashRegister', 'customer', 'order', 'creator']);

        if ($type = $request->query('type')) {
            if (in_array($type, ['receipt', 'payment', 'expense'])) {
                $query->where('transaction_type', $type);
            }
        }

        if ($registerId = $request->query('cash_register_id')) {
            $query->where('cash_register_id', $registerId);
        }

        if ($customerId = $request->query('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('date', '>=', $dateFrom);
        }

        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('date', '<=', $dateTo);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('voucher_number', 'like', "%{$search}%")
                  ->orWhere('recipient_or_payer', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $transactions = $query->orderBy('date', 'desc')->orderBy('id', 'desc')->get();

        // Calculate summary metrics
        $totalReceipts = (float) FinancialTransaction::where('transaction_type', 'receipt')->sum('amount');
        $totalPayments = (float) FinancialTransaction::where('transaction_type', 'payment')->sum('amount');
        $totalExpenses = (float) FinancialTransaction::where('transaction_type', 'expense')->sum('amount');
        $netFlow = $totalReceipts - ($totalPayments + $totalExpenses);

        return $this->successResponse([
            'transactions' => $transactions,
            'summary' => [
                'total_receipts' => $totalReceipts,
                'total_payments' => $totalPayments,
                'total_expenses' => $totalExpenses,
                'net_flow' => $netFlow,
            ],
        ], 'تم جلب السندات والمعاملات المالية بنجاح.');
    }

    /**
     * Store a newly created financial transaction (voucher).
     */
    public function store(Request $request): JsonResponse
    {
        if (!$request->has('date') || empty($request->input('date'))) {
            $request->merge(['date' => now()->toDateString()]);
        }

        $validated = $request->validate([
            'transaction_type' => ['required', 'in:receipt,payment,expense'],
            'cash_register_id' => ['required', 'exists:cash_registers,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'order_id' => ['nullable', 'exists:orders,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['nullable', 'in:cash,card,transfer'],
            'category' => ['nullable', 'string', 'max:100'],
            'recipient_or_payer' => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'transaction_type.required' => 'نوع السند مطلوب (قبض، دفع، مصاريف).',
            'cash_register_id.required' => 'الخزنة المالية مطلوبة.',
            'cash_register_id.exists' => 'الخزنة المحددة غير موجودة.',
            'amount.required' => 'المبلغ مطلوب.',
            'amount.min' => 'يجب أن يكون المبلغ أكبر من صفر.',
            'date.required' => 'تاريخ السند مطلوب.',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $register = CashRegister::lockForUpdate()->findOrFail($validated['cash_register_id']);
            $amount = (float) $validated['amount'];
            $type = $validated['transaction_type'];

            // Validation for payments/expenses: check if register has sufficient balance
            if (in_array($type, ['payment', 'expense']) && $register->balance < $amount) {
                // Allowed in standard POS accounting flow
            }

            // Generate voucher number
            $voucherNumber = FinancialTransaction::generateVoucherNumber($type);

            // For expenses: payee is null and payment method defaults to cash
            $recipientOrPayer = $type === 'expense' ? null : ($validated['recipient_or_payer'] ?? null);
            $paymentMethod = $validated['payment_method'] ?? 'cash';
            $customerId = $type === 'expense' ? null : ($validated['customer_id'] ?? null);

            $transaction = FinancialTransaction::create([
                'transaction_type' => $type,
                'voucher_number' => $voucherNumber,
                'cash_register_id' => $register->id,
                'customer_id' => $customerId,
                'order_id' => $validated['order_id'] ?? null,
                'amount' => $amount,
                'payment_method' => $paymentMethod,
                'category' => $type === 'expense' ? ($validated['category'] ?? 'مصاريف تشغيلية') : null,
                'recipient_or_payer' => $recipientOrPayer,
                'description' => $validated['description'] ?? null,
                'date' => $validated['date'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            // Update cash register balance
            if ($type === 'receipt') {
                $register->increment('balance', $amount);
            } else {
                $register->decrement('balance', $amount);
            }

            // If transaction is linked to a customer
            if (!empty($validated['customer_id'])) {
                $customer = Customer::lockForUpdate()->find($validated['customer_id']);
                if ($customer) {
                    if ($type === 'receipt') {
                        // Customer paid money into their account / settled debt
                        $customer->increment('balance', $amount);
                    } elseif ($type === 'payment') {
                        // Paid out to customer (refund or withdrawal)
                        $customer->decrement('balance', $amount);
                    }
                }
            }

            $transaction->load(['cashRegister', 'customer', 'order']);

            $typeName = match ($type) {
                'receipt' => 'سند قبض',
                'payment' => 'سند دفع',
                'expense' => 'سند مصاريف',
            };

            return $this->successResponse(
                $transaction,
                "تم تسجيل {$typeName} برقم {$voucherNumber} بنجاح.",
                Response::HTTP_CREATED
            );
        });
    }

    /**
     * Display the specified financial transaction.
     */
    public function show(int $id): JsonResponse
    {
        $transaction = FinancialTransaction::with(['cashRegister', 'customer', 'order', 'creator'])->find($id);

        if (!$transaction) {
            return $this->errorResponse('السند غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        return $this->successResponse($transaction, 'تم جلب تفاصيل السند.');
    }

    /**
     * Remove the specified financial transaction (reverses balance impact).
     */
    public function destroy(int $id): JsonResponse
    {
        return DB::transaction(function () use ($id) {
            $transaction = FinancialTransaction::lockForUpdate()->find($id);

            if (!$transaction) {
                return $this->errorResponse('السند غير موجود.', null, Response::HTTP_NOT_FOUND);
            }

            $amount = (float) $transaction->amount;
            $type = $transaction->transaction_type;

            // Reverse CashRegister balance
            $register = CashRegister::lockForUpdate()->find($transaction->cash_register_id);
            if ($register) {
                if ($type === 'receipt') {
                    $register->decrement('balance', $amount);
                } else {
                    $register->increment('balance', $amount);
                }
            }

            // Reverse Customer balance
            if ($transaction->customer_id) {
                $customer = Customer::lockForUpdate()->find($transaction->customer_id);
                if ($customer) {
                    if ($type === 'receipt') {
                        $customer->decrement('balance', $amount);
                    } elseif ($type === 'payment') {
                        $customer->increment('balance', $amount);
                    }
                }
            }

            $voucherNumber = $transaction->voucher_number;
            $transaction->delete();

            return $this->successResponse(null, "تم حذف السند {$voucherNumber} وإلغاء أثره المالي بنجاح.");
        });
    }
}
