<?php

namespace Database\Seeders;

use App\Models\DeliveryDriver;
use Illuminate\Database\Seeder;

class DeliveryDriverSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $drivers = [
            [
                'name' => 'إسلام فؤاد منصور',
                'phone' => '01022334455',
                'vehicle_type' => 'motorcycle',
                'license_plate' => 'أ ب ج 1234',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'سائق سريع وموثوق في منطقة وسط البلد والدقي',
            ],
            [
                'name' => 'عمر سامي خليل',
                'phone' => '01133445566',
                'vehicle_type' => 'motorcycle',
                'license_plate' => 'د هـ و 5678',
                'status' => 'on_delivery',
                'is_active' => true,
                'notes' => 'متخصص في توصيل الطلبات السريعة والمشروبات',
            ],
            [
                'name' => 'طارق جلال رضوان',
                'phone' => '01244556677',
                'vehicle_type' => 'car',
                'license_plate' => 'س ص ع 9012',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'سيارة مكيفة - مخصص للطلبات العائلية والولائم الكبيرة',
            ],
            [
                'name' => 'محمود حسن عثمان',
                'phone' => '01566778899',
                'vehicle_type' => 'scooter',
                'license_plate' => 'ن م ك 3456',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'سكوتر كهربائي - وردية صباحية ووسط البلد',
            ],
            [
                'name' => 'مصطفى عبد الفتاح',
                'phone' => '01088990011',
                'vehicle_type' => 'motorcycle',
                'license_plate' => 'ط ظ ع 7890',
                'status' => 'on_delivery',
                'is_active' => true,
                'notes' => 'خبير مناطق التجمع والرحاب ومدينتي',
            ],
            [
                'name' => 'أحمد سمير الشامي',
                'phone' => '01155443322',
                'vehicle_type' => 'motorcycle',
                'license_plate' => 'ر ز س 4321',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'وردية مسائية - المعادي والمقطم',
            ],
            [
                'name' => 'ياسر كمال الألفي',
                'phone' => '01211223344',
                'vehicle_type' => 'car',
                'license_plate' => 'ف ق ك 8765',
                'status' => 'off_duty',
                'is_active' => true,
                'notes' => 'سيارة فان لنقل الولائم وحفلات الكيترينج',
            ],
            [
                'name' => 'سيد بيومي غانم',
                'phone' => '01533445566',
                'vehicle_type' => 'bicycle',
                'license_plate' => 'دراجة 01',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'توصيل صديق للبيئة للمناطق المجاورة للمطعم',
            ],
        ];

        foreach ($drivers as $data) {
            DeliveryDriver::updateOrCreate(
                ['phone' => $data['phone']],
                $data
            );
        }
    }
}
