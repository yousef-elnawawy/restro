<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. مدير المطعم (صلاحيات كاملة)
        User::updateOrCreate(
            ['email' => 'admin@restro.com'],
            [
                'name' => 'مدير المطعم',
                'password' => Hash::make('Admin@2026!'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        // 2. الكاشير (نقطة البيع والصالة وسداد الطلبات)
        User::updateOrCreate(
            ['email' => 'cashier@restro.com'],
            [
                'name' => 'كاشير الصالة',
                'password' => Hash::make('Cashier@2026!'),
                'role' => 'cashier',
                'email_verified_at' => now(),
            ]
        );

        // 3. الطباخ / المطبخ (شاشة تحضير وتذاكر KDS)
        User::updateOrCreate(
            ['email' => 'chef@restro.com'],
            [
                'name' => 'رئيس المطبخ',
                'password' => Hash::make('Chef@2026!'),
                'role' => 'kitchen',
                'email_verified_at' => now(),
            ]
        );
    }
}
