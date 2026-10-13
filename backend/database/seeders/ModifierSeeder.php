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
            ['name' => 'إضافة شريحة لحم برجر أنجوس (Patty)', 'price' => 65.00, 'is_active' => true],
            ['name' => 'شريحة بيكون بقري مقرمش', 'price' => 30.00, 'is_active' => true],
            ['name' => 'صوص ريسترو الخاص', 'price' => 15.00, 'is_active' => true],
            ['name' => 'صوص جبنة شيدر سائلة', 'price' => 25.00, 'is_active' => true],
            ['name' => 'صوص رانش كريمي', 'price' => 15.00, 'is_active' => true],
            ['name' => 'صوص باربكيو مدخن', 'price' => 15.00, 'is_active' => true],
            ['name' => 'صوص مايونيز بالثوم (تومية)', 'price' => 15.00, 'is_active' => true],
            ['name' => 'قطع هالبينو حار', 'price' => 15.00, 'is_active' => true],
            ['name' => 'بصل مكرمل مكرمل', 'price' => 15.00, 'is_active' => true],
            ['name' => 'مشروم سوتيه طازج', 'price' => 25.00, 'is_active' => true],
            ['name' => 'جبنة موزاريلا إضافية', 'price' => 30.00, 'is_active' => true],
            ['name' => 'حجم كبير عائلي (Upsize)', 'price' => 35.00, 'is_active' => true],
            ['name' => 'بولة آيس كريم فانيليا', 'price' => 25.00, 'is_active' => true],
            ['name' => 'إضافة صوص نوتيلا غني', 'price' => 25.00, 'is_active' => true],
            ['name' => 'مكسرات محمصة مطحونة', 'price' => 20.00, 'is_active' => true],
        ];

        foreach ($modifiers as $item) {
            Modifier::updateOrCreate(['name' => $item['name']], $item);
        }
    }
}
