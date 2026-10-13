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
                'name' => 'أحمد محمود العوضي',
                'phone' => '01012345678',
                'email' => 'ahmed.mahmoud@example.com',
                'address' => 'شارع التحرير، الدقي، الجيزة',
                'notes' => 'عميل مميز - يفضل الوجبات الحارة والبيكون الإضافي',
                'total_orders' => 12,
                'total_spent' => 3850.00,
                'is_active' => true,
            ],
            [
                'name' => 'سارة الشريف',
                'phone' => '01198765432',
                'email' => 'sara.elsharif@example.com',
                'address' => 'المعادي، شارع 9، القاهرة',
                'notes' => 'تطلب باستمرار بدون بصل، تفضل الدفع الإلكتروني',
                'total_orders' => 8,
                'total_spent' => 2140.00,
                'is_active' => true,
            ],
            [
                'name' => 'محمد عبد الرحمن',
                'phone' => '01234567890',
                'email' => 'mohamed.abdelrahman@example.com',
                'address' => 'مدينة نصر، الحي السابع، القاهرة',
                'notes' => 'عميل أسبوعي منتظم - ولائم عائلية',
                'total_orders' => 15,
                'total_spent' => 5400.00,
                'is_active' => true,
            ],
            [
                'name' => 'منى يوسف إبراهيم',
                'phone' => '01055566677',
                'email' => 'mona.youssef@example.com',
                'address' => 'التجمع الخامس، النرجس، القاهرة الجديدة',
                'notes' => 'توصيل خلال المساء فقط بعد الساعة 6',
                'total_orders' => 6,
                'total_spent' => 1920.00,
                'is_active' => true,
            ],
            [
                'name' => 'خالد إبراهيم متولي',
                'phone' => '01599887766',
                'email' => 'khaled.ibrahim@example.com',
                'address' => 'الشيخ زايد، الحي الأول، الجيزة',
                'notes' => 'شركة استشارات - يطلب فواتير ضريبية مفصلة',
                'total_orders' => 20,
                'total_spent' => 7800.00,
                'is_active' => true,
            ],
            [
                'name' => 'ياسمين عبد العزيز',
                'phone' => '01033221100',
                'email' => 'yasmin.aziz@example.com',
                'address' => 'الزمالك، شارع حسن صبري، القاهرة',
                'notes' => 'تفضل أطباق السي فود والباستا',
                'total_orders' => 5,
                'total_spent' => 1750.00,
                'is_active' => true,
            ],
            [
                'name' => 'طارق مصطفى سليم',
                'phone' => '01144556677',
                'email' => 'tarek.mostafa@example.com',
                'address' => 'مصر الجديدة، ميدان الكوربة، القاهرة',
                'notes' => 'يحب البرجر الدبل مع أصابع الجبنة',
                'total_orders' => 9,
                'total_spent' => 2600.00,
                'is_active' => true,
            ],
            [
                'name' => 'نورهان فوزي',
                'phone' => '01288776655',
                'email' => 'nourhan.fawzy@example.com',
                'address' => 'شبرا، شارع روض الفرج، القاهرة',
                'notes' => 'تطلب حلويات ومشروبات باستمرار',
                'total_orders' => 4,
                'total_spent' => 890.00,
                'is_active' => true,
            ],
            [
                'name' => 'عمر عبد الله الجابري',
                'phone' => '01066778899',
                'email' => 'omar.aljabri@example.com',
                'address' => 'المهندسين، شارع جامعة الدول العربية',
                'notes' => 'زبون صالة دائم في عطلات نهاية الأسبوع',
                'total_orders' => 14,
                'total_spent' => 4300.00,
                'is_active' => true,
            ],
            [
                'name' => 'رانيا حسن كمال',
                'phone' => '01122338899',
                'email' => 'rania.hassan@example.com',
                'address' => 'المقطم، الهضبة العليا، القاهرة',
                'notes' => 'تفضل التوصيل السريع للمنزل',
                'total_orders' => 3,
                'total_spent' => 950.00,
                'is_active' => true,
            ],
            [
                'name' => 'هشام طلعت صبري',
                'phone' => '01511223344',
                'email' => 'hesham.talaat@example.com',
                'address' => 'حدائق الأهرام، البوابة الأولى، الجيزة',
                'notes' => 'عاشق المشويات والستيك البلاك أنجوس',
                'total_orders' => 11,
                'total_spent' => 4900.00,
                'is_active' => true,
            ],
            [
                'name' => 'مي الشناوي',
                'phone' => '01099881122',
                'email' => 'mai.elshenawy@example.com',
                'address' => 'الهرم، شارع فيصل الرئيسي، الجيزة',
                'notes' => 'تطلب وجبات كيدز للأطفال وبيتزا مارجريتا',
                'total_orders' => 7,
                'total_spent' => 1820.00,
                'is_active' => true,
            ],
            [
                'name' => 'كريم نبيل الدسوقي',
                'phone' => '01200112233',
                'email' => 'karim.nabil@example.com',
                'address' => 'الرحاب، المرحلة الرابعة، القاهرة الجديدة',
                'notes' => 'يطلب كل يوم جمعة مع العائلة',
                'total_orders' => 16,
                'total_spent' => 6100.00,
                'is_active' => true,
            ],
            [
                'name' => 'دينا السعدني',
                'phone' => '01177665544',
                'email' => 'dina.elsadany@example.com',
                'address' => 'مدينتي، منطقة B1، القاهرة الجديدة',
                'notes' => 'تفضل السوشي والسي فود والباستا الخفيفة',
                'total_orders' => 5,
                'total_spent' => 1950.00,
                'is_active' => true,
            ],
            [
                'name' => 'حسام الدين زكريا',
                'phone' => '01044332211',
                'email' => 'hossam.zakaria@example.com',
                'address' => 'العجوزة، شارع النيل، الجيزة',
                'notes' => 'طلبات غداء عمل للمكتب',
                'total_orders' => 22,
                'total_spent' => 9300.00,
                'is_active' => true,
            ],
        ];

        foreach ($customers as $c) {
            Customer::updateOrCreate(['phone' => $c['phone']], $c);
        }
    }
}
