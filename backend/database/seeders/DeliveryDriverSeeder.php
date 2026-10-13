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
                'name' => 'إسلام فؤاد',
                'phone' => '01022334455',
                'vehicle_type' => 'motorcycle',
                'license_plate' => 'أ ب ج 1234',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'سائق سريع وموثوق في منطقة وسط البلد',
            ],
            [
                'name' => 'عمر سامي',
                'phone' => '01133445566',
                'vehicle_type' => 'motorcycle',
                'license_plate' => 'د هـ و 5678',
                'status' => 'on_delivery',
                'is_active' => true,
                'notes' => 'متخصص في توصيل الطلبات السريعة',
            ],
            [
                'name' => 'طارق جلال',
                'phone' => '01244556677',
                'vehicle_type' => 'car',
                'license_plate' => 'س ص ع 9012',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'سيارة - مناسب للطلبات والولائم الكبيرة',
            ],
            [
                'name' => 'محمود حسن',
                'phone' => '01566778899',
                'vehicle_type' => 'scooter',
                'license_plate' => 'ن م ك 3456',
                'status' => 'off_duty',
                'is_active' => true,
                'notes' => 'وردية مسائية فقط',
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
