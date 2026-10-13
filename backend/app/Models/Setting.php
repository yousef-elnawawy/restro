<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $table = 'settings';

    protected $fillable = [
        'restaurant_name',
        'restaurant_phone',
        'restaurant_email',
        'restaurant_address',
        'currency',
        'tax_percentage',
        'tax_enabled',
        'tax_number',
        'delivery_fee',
        'receipt_header',
        'receipt_footer',
        'logo',
        'enable_tables',
        'enable_delivery',
        'enable_takeaway',
    ];

    protected function casts(): array
    {
        return [
            'tax_percentage' => 'float',
            'tax_enabled' => 'boolean',
            'delivery_fee' => 'float',
            'enable_tables' => 'boolean',
            'enable_delivery' => 'boolean',
            'enable_takeaway' => 'boolean',
        ];
    }

    /**
     * Get or initialize the primary settings record.
     */
    public static function instance(): self
    {
        $setting = self::first();

        if (! $setting) {
            $setting = self::create([
                'restaurant_name' => 'مطعم ريسترو',
                'restaurant_phone' => '01000000000',
                'restaurant_email' => 'contact@restro.com',
                'restaurant_address' => 'الفرع الرئيسي',
                'currency' => 'ج.م',
                'tax_percentage' => 14.00,
                'tax_enabled' => true,
                'tax_number' => null,
                'delivery_fee' => 20.00,
                'receipt_header' => null,
                'receipt_footer' => 'شكراً لزيارتكم! نسعد بخدمتكم دائماً.',
                'enable_tables' => true,
                'enable_delivery' => true,
                'enable_takeaway' => true,
            ]);
        }

        return $setting;
    }
}
