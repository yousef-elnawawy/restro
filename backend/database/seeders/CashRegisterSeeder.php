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
        CashRegister::updateOrCreate(
            ['name' => 'الخزنة الرئيسية'],
            [
                'balance' => 15450.00,
                'is_active' => true,
                'is_default' => true,
                'notes' => 'الخزنة المركزية الافتراضية للمطعم لتسجيل كافة المقبوضات النقدية والتحويلات.',
            ]
        );

        CashRegister::updateOrCreate(
            ['name' => 'خزنة كاشير الصالة 1'],
            [
                'balance' => 4200.00,
                'is_active' => true,
                'is_default' => false,
                'notes' => 'خزنة نقطة بيع الكاشير الرئيسي بصالة الاستقبال.',
            ]
        );

        CashRegister::updateOrCreate(
            ['name' => 'خزنة كاشير الصالة 2'],
            [
                'balance' => 2850.00,
                'is_active' => true,
                'is_default' => false,
                'notes' => 'خزنة نقطة بيع كاشير الدور الثاني وقسم العائلات.',
            ]
        );

        CashRegister::updateOrCreate(
            ['name' => 'خزنة خدمة التوصيل والدليفري'],
            [
                'balance' => 6100.00,
                'is_active' => true,
                'is_default' => false,
                'notes' => 'خزنة توريدات مناديب التوصيل وتحصيل فواتير الدليفري النقدية.',
            ]
        );
    }
}
