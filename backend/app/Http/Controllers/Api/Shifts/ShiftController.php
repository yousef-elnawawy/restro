<?php

namespace App\Http\Controllers\Api\Shifts;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\FinancialTransaction;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Shift;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ShiftController extends Controller
{
    use ApiResponse;

    /**
     * Get the current active open shift for the user/register.
     */
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();
        $registerId = $request->query('cash_register_id');

        $query = Shift::with(['user', 'cashRegister'])->where('status', 'open');

        if ($registerId) {
            $query->where('cash_register_id', $registerId);
        } else {
            $query->where('user_id', $user->id);
        }

        $shift = $query->latest('opened_at')->first();

        if (! $shift) {
            // Also check if any open shift exists on the default register
            $defaultReg = CashRegister::where('is_default', true)->first();
            if ($defaultReg && ! $registerId) {
                $shift = Shift::with(['user', 'cashRegister'])
                    ->where('status', 'open')
                    ->where('cash_register_id', $defaultReg->id)
                    ->latest('opened_at')
                    ->first();
            }
        }

        if (! $shift) {
            return $this->successResponse(null, 'لا توجد وردية مفتوحة حالياً.');
        }

        // Calculate live metrics on the fly
        $metrics = $this->calculateShiftMetrics($shift);

        $data = $shift->toArray();
        $data['live_metrics'] = $metrics;

        return $this->successResponse($data, 'تم جلب بيانات الوردية الحالية بنجاح.');
    }

    /**
     * Open a new shift.
     */
    public function open(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cash_register_id' => ['required', 'exists:cash_registers,id'],
            'starting_cash' => ['required', 'numeric', 'min:0'],
            'opening_notes' => ['nullable', 'string', 'max:500'],
        ], [
            'cash_register_id.required' => 'يرجى تحديد الخزينة لفتح الوردية.',
            'starting_cash.required' => 'يرجى إدخال مبلغ العهدة النقدية الافتتاحية.',
            'starting_cash.min' => 'لا يمكن أن تكون العهدة الافتتاحية سالبة.',
        ]);

        $user = $request->user();

        // Check if there is already an open shift on this register
        $existing = Shift::where('cash_register_id', $validated['cash_register_id'])
            ->where('status', 'open')
            ->first();

        if ($existing) {
            return $this->errorResponse(
                "توجد وردية مفتوحة بالفعل على هذه الخزنة (#{$existing->shift_number}) بواسطة {$existing->user?->name}. يرجى إغلاقها أولاً لإجراء تقفيل Z-Report.",
                null,
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $shiftCount = Shift::count() + 1;
        $shiftNumber = 'SH-' . date('Ymd') . '-' . str_pad((string) $shiftCount, 4, '0', STR_PAD_LEFT);

        $shift = Shift::create([
            'user_id' => $user->id,
            'cash_register_id' => $validated['cash_register_id'],
            'shift_number' => $shiftNumber,
            'opened_at' => now(),
            'starting_cash' => $validated['starting_cash'],
            'status' => 'open',
            'opening_notes' => $validated['opening_notes'] ?? null,
        ]);

        $shift->load(['user', 'cashRegister']);

        return $this->successResponse($shift, "تم فتح الوردية (#{$shiftNumber}) بنجاح وتسجيل العهدة الافتتاحية.", Response::HTTP_CREATED);
    }

    /**
     * Close the shift, calculate discrepancies, and generate Z-Report.
     */
    public function close(Request $request, int $id): JsonResponse
    {
        $shift = Shift::with(['user', 'cashRegister'])->findOrFail($id);

        if ($shift->status === 'closed') {
            return $this->errorResponse('هذه الوردية مغلقة بالفعل وتم إصدار تقرير الـ Z-Report الخاص بها مسبقاً.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'actual_cash' => ['required', 'numeric', 'min:0'],
            'closing_notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'actual_cash.required' => 'يرجى إدخال النقدية الفعلية المحصية في الدرج.',
            'actual_cash.min' => 'لا يمكن أن تكون النقدية الفعلية سالبة.',
        ]);

        $metrics = $this->calculateShiftMetrics($shift);

        $actualCash = (float) $validated['actual_cash'];
        $expectedCash = $metrics['expected_cash'];
        $difference = round($actualCash - $expectedCash, 2);

        // Generate Z-Report Number
        $zReportNumber = 'Z-' . date('Ymd') . '-' . str_pad((string) $shift->id, 4, '0', STR_PAD_LEFT);

        $shift->update([
            'closed_at' => now(),
            'z_report_number' => $zReportNumber,
            'expected_cash' => $expectedCash,
            'actual_cash' => $actualCash,
            'difference' => $difference,
            'total_sales' => $metrics['total_sales'],
            'cash_sales' => $metrics['cash_sales'],
            'card_sales' => $metrics['card_sales'],
            'transfer_sales' => $metrics['transfer_sales'],
            'total_orders' => $metrics['total_orders'],
            'total_expenses' => $metrics['total_expenses'],
            'total_receipts' => $metrics['total_receipts'],
            'status' => 'closed',
            'closing_notes' => $validated['closing_notes'] ?? null,
        ]);

        $zReportData = $this->buildZReportPayload($shift, $metrics);

        return $this->successResponse([
            'shift' => $shift->fresh(['user', 'cashRegister']),
            'z_report' => $zReportData,
        ], "تم تقفيل الوردية وإصدار تقرير الـ Z-Report (#{$zReportNumber}) بنجاح.");
    }

    /**
     * List all past shifts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Shift::with(['user', 'cashRegister'])->orderBy('opened_at', 'desc');

        if ($regId = $request->query('cash_register_id')) {
            if ($regId !== 'all') {
                $query->where('cash_register_id', $regId);
            }
        }

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('opened_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('opened_at', '<=', $dateTo);
        }

        $shifts = $query->paginate(20);

        return $this->successResponse($shifts, 'تم جلب سجل الورديات بنجاح.');
    }

    /**
     * Get details of a single shift and its Z-report.
     */
    public function show(int $id): JsonResponse
    {
        $shift = Shift::with(['user', 'cashRegister'])->findOrFail($id);

        $metrics = $shift->isOpen() ? $this->calculateShiftMetrics($shift) : [
            'total_sales' => (float) $shift->total_sales,
            'cash_sales' => (float) $shift->cash_sales,
            'card_sales' => (float) $shift->card_sales,
            'transfer_sales' => (float) $shift->transfer_sales,
            'total_orders' => (int) $shift->total_orders,
            'total_expenses' => (float) $shift->total_expenses,
            'total_receipts' => (float) $shift->total_receipts,
            'starting_cash' => (float) $shift->starting_cash,
            'expected_cash' => (float) $shift->expected_cash,
            'actual_cash' => (float) $shift->actual_cash,
            'difference' => (float) $shift->difference,
        ];

        $zReport = $this->buildZReportPayload($shift, $metrics);

        return $this->successResponse([
            'shift' => $shift,
            'z_report' => $zReport,
        ], 'تم جلب تقرير الوردية بنجاح.');
    }

    /**
     * Helper to compute shift financials.
     */
    private function calculateShiftMetrics(Shift $shift): array
    {
        $regId = $shift->cash_register_id;
        $openTime = $shift->opened_at;
        $closeTime = $shift->closed_at ?? now();

        // Payments on this register during shift
        $paymentsQuery = Payment::where('cash_register_id', $regId)
            ->whereBetween('created_at', [$openTime, $closeTime]);

        $cashSales = (float) (clone $paymentsQuery)->where('payment_method', 'cash')->sum('amount');
        $cardSales = (float) (clone $paymentsQuery)->where('payment_method', 'card')->sum('amount');
        $transferSales = (float) (clone $paymentsQuery)->where('payment_method', 'transfer')->sum('amount');
        $totalSales = $cashSales + $cardSales + $transferSales;
        $totalOrders = (clone $paymentsQuery)->distinct('order_id')->count('order_id');

        // Cash Vouchers during shift
        $txQuery = FinancialTransaction::where('cash_register_id', $regId)
            ->whereBetween('created_at', [$openTime, $closeTime]);

        $cashReceipts = (float) (clone $txQuery)->where('transaction_type', 'receipt')->where('payment_method', 'cash')->sum('amount');
        $cashExpenses = (float) (clone $txQuery)->whereIn('transaction_type', ['payment', 'expense'])->where('payment_method', 'cash')->sum('amount');

        $startingCash = (float) $shift->starting_cash;
        $expectedCash = round($startingCash + $cashSales + $cashReceipts - $cashExpenses, 2);

        return [
            'starting_cash' => $startingCash,
            'cash_sales' => round($cashSales, 2),
            'card_sales' => round($cardSales, 2),
            'transfer_sales' => round($transferSales, 2),
            'total_sales' => round($totalSales, 2),
            'total_orders' => $totalOrders,
            'total_receipts' => round($cashReceipts, 2),
            'total_expenses' => round($cashExpenses, 2),
            'expected_cash' => $expectedCash,
        ];
    }

    /**
     * Build standard Z-Report receipt structure.
     */
    private function buildZReportPayload(Shift $shift, array $metrics): array
    {
        $settings = Setting::first();
        $restaurantName = $settings->restaurant_name ?? 'ريسترو';
        $currency = $settings->currency ?? 'ج.م';

        return [
            'restaurant_name' => $restaurantName,
            'currency' => $currency,
            'shift_number' => $shift->shift_number,
            'z_report_number' => $shift->z_report_number ?? 'DRAFT',
            'cashier_name' => $shift->user?->name ?? 'غير محدد',
            'register_name' => $shift->cashRegister?->name ?? 'الخزينة العامة',
            'opened_at' => $shift->opened_at ? $shift->opened_at->format('Y-m-d H:i') : null,
            'closed_at' => $shift->closed_at ? $shift->closed_at->format('Y-m-d H:i') : null,
            'status' => $shift->status,
            'starting_cash' => $metrics['starting_cash'],
            'sales' => [
                'cash' => $metrics['cash_sales'],
                'card' => $metrics['card_sales'],
                'transfer' => $metrics['transfer_sales'],
                'total' => $metrics['total_sales'],
                'orders_count' => $metrics['total_orders'],
            ],
            'movements' => [
                'cash_receipts' => $metrics['total_receipts'],
                'cash_expenses' => $metrics['total_expenses'],
            ],
            'cash_drawer' => [
                'starting' => $metrics['starting_cash'],
                'expected' => $metrics['expected_cash'],
                'actual' => $shift->actual_cash !== null ? (float) $shift->actual_cash : null,
                'difference' => $shift->difference !== null ? (float) $shift->difference : null,
                'discrepancy_status' => $shift->difference > 0 ? 'surplus' : ($shift->difference < 0 ? 'shortage' : 'matched'),
            ],
            'notes' => [
                'opening' => $shift->opening_notes,
                'closing' => $shift->closing_notes,
            ],
        ];
    }
}
