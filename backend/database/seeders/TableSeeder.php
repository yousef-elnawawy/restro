<?php

namespace Database\Seeders;

use App\Models\RestaurantTable;
use Illuminate\Database\Seeder;

class TableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tables = [
            // الصالة الرئيسية
            ['name' => 'طاولة 1', 'capacity' => 2, 'location' => 'الصالة الرئيسية', 'status' => 'available'],
            ['name' => 'طاولة 2', 'capacity' => 2, 'location' => 'الصالة الرئيسية', 'status' => 'available'],
            ['name' => 'طاولة 3', 'capacity' => 4, 'location' => 'الصالة الرئيسية', 'status' => 'available'],
            ['name' => 'طاولة 4', 'capacity' => 4, 'location' => 'الصالة الرئيسية', 'status' => 'available'],
            ['name' => 'طاولة 5', 'capacity' => 4, 'location' => 'الصالة الرئيسية', 'status' => 'available'],
            ['name' => 'طاولة 6', 'capacity' => 6, 'location' => 'الصالة الرئيسية', 'status' => 'available'],

            // قسم العائلات
            ['name' => 'طاولة 7 (عائلات)', 'capacity' => 6, 'location' => 'قسم العائلات', 'status' => 'available'],
            ['name' => 'طاولة 8 (عائلات)', 'capacity' => 8, 'location' => 'قسم العائلات', 'status' => 'available'],
            ['name' => 'طاولة 9 (عائلات)', 'capacity' => 8, 'location' => 'قسم العائلات', 'status' => 'available'],
            ['name' => 'طاولة 10 (عائلات كبرى)', 'capacity' => 12, 'location' => 'قسم العائلات', 'status' => 'available'],

            // الشرفة الخارجية والتراس
            ['name' => 'طاولة 11 (تراس)', 'capacity' => 2, 'location' => 'الشرفة الخارجية', 'status' => 'available'],
            ['name' => 'طاولة 12 (تراس)', 'capacity' => 4, 'location' => 'الشرفة الخارجية', 'status' => 'available'],
            ['name' => 'طاولة 13 (تراس)', 'capacity' => 4, 'location' => 'الشرفة الخارجية', 'status' => 'available'],
            ['name' => 'طاولة 14 (تراس)', 'capacity' => 6, 'location' => 'الشرفة الخارجية', 'status' => 'available'],
            ['name' => 'طاولة 15 (إطلالة)', 'capacity' => 4, 'location' => 'الشرفة الخارجية', 'status' => 'available'],

            // الصالون الخاص VIP
            ['name' => 'جناح VIP 1', 'capacity' => 8, 'location' => 'صالون VIP', 'status' => 'available'],
            ['name' => 'جناح VIP 2', 'capacity' => 10, 'location' => 'صالون VIP', 'status' => 'available'],
            ['name' => 'طاولة بار 1', 'capacity' => 2, 'location' => 'منطقة البار السريع', 'status' => 'available'],
            ['name' => 'طاولة بار 2', 'capacity' => 2, 'location' => 'منطقة البار السريع', 'status' => 'available'],
            ['name' => 'طاولة بار 3', 'capacity' => 2, 'location' => 'منطقة البار السريع', 'status' => 'available'],
        ];

        foreach ($tables as $t) {
            RestaurantTable::updateOrCreate(['name' => $t['name']], $t);
        }
    }
}
