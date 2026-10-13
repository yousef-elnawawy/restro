<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialTransaction extends Model
{
    use HasFactory;

    protected $table = 'financial_transactions';

    protected $fillable = [
        'transaction_type',
        'voucher_number',
        'cash_register_id',
        'customer_id',
        'order_id',
        'amount',
        'payment_method',
        'category',
        'recipient_or_payer',
        'description',
        'date',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'date' => 'date',
        ];
    }

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class, 'cash_register_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Generate unique sequential voucher number based on type.
     */
    public static function generateVoucherNumber(string $type): string
    {
        $prefix = match ($type) {
            'receipt' => 'REC',
            'payment' => 'PAY',
            'expense' => 'EXP',
            default => 'VOU',
        };

        $year = date('Y');
        $count = static::where('transaction_type', $type)
            ->whereYear('date', $year)
            ->count() + 1;

        return sprintf('%s-%s-%04d', $prefix, $year, $count);
    }
}
