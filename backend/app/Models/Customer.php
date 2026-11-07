<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $table = 'customers';

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'notes',
        'total_orders',
        'total_spent',
        'balance',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'total_orders' => 'integer',
            'total_spent' => 'decimal:2',
            'balance' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(FinancialTransaction::class, 'customer_id');
    }

    /**
     * Recalculate customer's balance and metrics accurately:
     * Balance = (Payments on orders + Receipt vouchers) - (Total of active orders + Expense/Payment vouchers to customer)
     * Positive balance (+) => Customer has prepaid credit / surplus (له رصيد متبقي).
     * Negative balance (-) => Customer owes debt to restaurant (عليه مديونية مستحقة).
     * Zero balance (0)     => Account is fully settled (خالص).
     */
    public function recalculateBalance(): float
    {
        $orders = $this->orders()->where('status', '!=', Order::STATUS_CANCELLED)->get();
        $ordersTotal = (float) $orders->sum('total');

        $ordersPaid = (float) \Illuminate\Support\Facades\DB::table('payments')
            ->join('orders', 'payments.order_id', '=', 'orders.id')
            ->where('orders.customer_id', $this->id)
            ->where('orders.status', '!=', Order::STATUS_CANCELLED)
            ->sum('payments.amount');

        $receiptsTotal = (float) $this->transactions()->where('transaction_type', 'receipt')->sum('amount');
        $payoutsTotal = (float) $this->transactions()->where('transaction_type', 'payment')->sum('amount');

        $totalPaid = $ordersPaid + $receiptsTotal;
        $totalOwed = $ordersTotal + $payoutsTotal;

        $balance = round($totalPaid - $totalOwed, 2);

        $this->update([
            'balance' => $balance,
            'total_orders' => $orders->count(),
            'total_spent' => round($ordersPaid, 2),
        ]);

        return $balance;
    }
}
