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
            ['name' => 'طاولة 1', 'capacity' => 2, 'location' => 'الصالة الرئيسية', 'status' => 'available'],
            ['name' => 'طاولة 2', 'capacity' => 4, 'location' => 'الصالة الرئيسية', 'status' => 'available'],
            ['name' => 'طاولة 3', 'capacity' => 4, 'location' => 'الصالة الرئيسية', 'status' => 'available'],
            ['name' => 'طاولة 4', 'capacity' => 6, 'location' => 'العائلات', 'status' => 'available'],
            ['name' => 'طاولة 5', 'capacity' => 8, 'location' => 'العائلات', 'status' => 'available'],
            ['name' => 'طاولة 6', 'capacity' => 4, 'location' => 'الشرفة الخارجية', 'status' => 'available'],
        ];

        foreach ($tables as $t) {
            RestaurantTable::firstOrCreate(['name' => $t['name']], $t);
        }
    }
}
