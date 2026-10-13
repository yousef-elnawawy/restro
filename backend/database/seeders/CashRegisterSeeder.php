<?php

namespace Database\Seeders;

use App\Models\CashRegister;
use Illuminate\Database\Seeder;

class CashRegisterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CashRegister::firstOrCreate(
            ['name' => 'الخزنة الرئيسية'],
            [
                'balance' => 0.00,
                'is_active' => true,
                'is_default' => true,
                'notes' => 'الخزنة المركزية الافتراضية للمطعم لتسجيل كافة المقبوضات النقدية.',
            ]
        );

        CashRegister::firstOrCreate(
            ['name' => 'خزنة الكاشير 1'],
            [
                'balance' => 0.00,
                'is_active' => true,
                'is_default' => false,
                'notes' => 'خزنة نقطة بيع الكاشير الرئيسي بالصالة.',
            ]
        );
    }
}
