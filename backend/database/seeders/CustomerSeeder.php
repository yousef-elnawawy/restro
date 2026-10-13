<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $customers = [
            [
                'name' => 'أحمد محمود',
                'phone' => '01012345678',
                'email' => 'ahmed.mahmoud@example.com',
                'address' => 'شارع التحرير، الدقي، الجيزة',
                'notes' => 'عميل مميز - يفضل الوجبات الحارة',
                'total_orders' => 4,
                'total_spent' => 1250.00,
                'is_active' => true,
            ],
            [
                'name' => 'سارة الشريف',
                'phone' => '01198765432',
                'email' => 'sara.elsharif@example.com',
                'address' => 'المعادي، شارع 9، القاهرة',
                'notes' => 'طلب بدون بصل في المشويات',
                'total_orders' => 2,
                'total_spent' => 680.00,
                'is_active' => true,
            ],
            [
                'name' => 'محمد عبد الرحمن',
                'phone' => '01234567890',
                'email' => 'mohamed.abdelrahman@example.com',
                'address' => 'مدينة نصر، الحي السابع، القاهرة',
                'notes' => 'عميل منتظم أسبوعياً',
                'total_orders' => 5,
                'total_spent' => 2100.00,
                'is_active' => true,
            ],
            [
                'name' => 'منى يوسف',
                'phone' => '01055566677',
                'email' => 'mona.youssef@example.com',
                'address' => 'التجمع الخامس، النرجس، القاهرة الجديدة',
                'notes' => 'توصيل خلال المساء فقط',
                'total_orders' => 1,
                'total_spent' => 420.00,
                'is_active' => true,
            ],
            [
                'name' => 'خالد إبراهيم',
                'phone' => '01599887766',
                'email' => 'khaled.ibrahim@example.com',
                'address' => 'الشيخ زايد، الحي الأول، الجيزة',
                'notes' => 'طلبات عائلية كبيرة',
                'total_orders' => 3,
                'total_spent' => 950.00,
                'is_active' => true,
            ],
        ];

        foreach ($customers as $data) {
            Customer::updateOrCreate(
                ['phone' => $data['phone']],
                $data
            );
        }
    }
}
