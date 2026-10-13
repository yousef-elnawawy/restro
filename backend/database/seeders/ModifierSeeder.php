<?php

namespace Database\Seeders;

use App\Models\Modifier;
use Illuminate\Database\Seeder;

class ModifierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $modifiers = [
            ['name' => 'شريحة جبن شيدر إضافية', 'price' => 20.00, 'is_active' => true],
            ['name' => 'إضافة شريحة لحم برجر (Patty)', 'price' => 60.00, 'is_active' => true],
            ['name' => 'صوص ريسترو الخاص', 'price' => 15.00, 'is_active' => true],
            ['name' => 'صوص جبنة شيدر سائلة', 'price' => 25.00, 'is_active' => true],
            ['name' => 'قطع هالبينو حار', 'price' => 15.00, 'is_active' => true],
            ['name' => 'بصل مكرمل', 'price' => 15.00, 'is_active' => true],
            ['name' => 'مشروم مشوي', 'price' => 25.00, 'is_active' => true],
            ['name' => 'حجم كبير (Large Size)', 'price' => 30.00, 'is_active' => true],
        ];

        foreach ($modifiers as $item) {
            Modifier::updateOrCreate(['name' => $item['name']], $item);
        }
    }
}
