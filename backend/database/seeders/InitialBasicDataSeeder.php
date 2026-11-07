<?php

namespace Database\Seeders;

use App\Models\CashRegister;
use App\Models\Category;
use App\Models\Customer;
use App\Models\DeliveryDriver;
use App\Models\Modifier;
use App\Models\Product;
use App\Models\RestaurantTable;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class InitialBasicDataSeeder extends Seeder
{
    /**
     * تشغيل بيانات التهيئة الأساسية للنظام:
     * - المستخدمين (مدير، كاشير، شيف)
     * - إعدادات المطعم والضرائب
     * - الخزن ونقاط البيع
     * - طاولات الصالة
     * - مناديب التوصيل
     * - سجل العملاء
     * - الإضافات (الموديفايرز)
     * - التصنيفات والمنتجات
     *
     * ملاحظة: لا تحتوي هذه البيانات على أي طلبات أو فواتير، وخالية تماماً من الصور والرموز التعبيرية (الإيموجي).
     */
    public function run(): void
    {
        // ==========================================
        // 1. المستخدمين الأساسيين (Users)
        // ==========================================
        $users = [
            [
                'name' => 'مدير المطعم',
                'email' => 'admin@restro.com',
                'password' => Hash::make('Admin@2026!'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'كاشير الصالة',
                'email' => 'cashier@restro.com',
                'password' => Hash::make('Cashier@2026!'),
                'role' => 'cashier',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'رئيس المطبخ',
                'email' => 'chef@restro.com',
                'password' => Hash::make('Chef@2026!'),
                'role' => 'kitchen',
                'email_verified_at' => now(),
            ],
        ];

        foreach ($users as $u) {
            User::updateOrCreate(['email' => $u['email']], $u);
        }

        // ==========================================
        // 2. إعدادات المطعم العامة (Settings)
        // ==========================================
        Setting::updateOrCreate(
            ['id' => 1],
            [
                'restaurant_name' => 'مطعم ريسترو',
                'restaurant_phone' => '01000000000',
                'restaurant_email' => 'contact@restro.com',
                'restaurant_address' => 'الفرع الرئيسي - شارع النصر، المعادي، القاهرة',
                'currency' => 'ج.م',
                'tax_percentage' => 14.00,
                'tax_enabled' => true,
                'tax_number' => '30045678900003',
                'delivery_fee' => 25.00,
                'delivery_base_fee' => 20.00,
                'delivery_fee_per_km' => 5.00,
                'receipt_header' => "أهلاً وسهلاً بكم في مطعم ريسترو\nنتمنى لكم وجبة شهية وتجربة مميزة",
                'receipt_footer' => "شكراً لزيارتكم ويسعدنا دائماً خدمتكم\nللمقترحات والشكاوى: 01000000000",
                'logo' => null,
                'enable_tables' => true,
                'enable_delivery' => true,
                'enable_takeaway' => true,
            ]
        );

        // ==========================================
        // 3. الخزن ونقاط البيع (Cash Registers)
        // ==========================================
        $registers = [
            [
                'name' => 'الخزنة الرئيسية',
                'opening_balance' => 5000.00,
                'balance' => 5000.00,
                'is_active' => true,
                'is_default' => true,
                'notes' => 'الخزنة المركزية الافتراضية للمطعم لتسجيل كافة المقبوضات والتحويلات.',
            ],
            [
                'name' => 'خزنة كاشير الصالة 1',
                'opening_balance' => 2000.00,
                'balance' => 2000.00,
                'is_active' => true,
                'is_default' => false,
                'notes' => 'خزنة نقطة بيع الكاشير الرئيسي بصالة الاستقبال.',
            ],
            [
                'name' => 'خزنة كاشير الصالة 2',
                'opening_balance' => 1500.00,
                'balance' => 1500.00,
                'is_active' => true,
                'is_default' => false,
                'notes' => 'خزنة نقطة بيع كاشير الدور الثاني وقسم العائلات.',
            ],
            [
                'name' => 'خزنة خدمة التوصيل والدليفري',
                'opening_balance' => 1000.00,
                'balance' => 1000.00,
                'is_active' => true,
                'is_default' => false,
                'notes' => 'خزنة توريدات مناديب التوصيل وتحصيل فواتير الدليفري النقدية.',
            ],
        ];

        foreach ($registers as $reg) {
            CashRegister::updateOrCreate(['name' => $reg['name']], $reg);
        }

        // ==========================================
        // 4. طاولات الصالة (Restaurant Tables)
        // ==========================================
        $tables = [
            // الصالة الرئيسية
            ['name' => 'طاولة 1', 'capacity' => 2, 'location' => 'الصالة الرئيسية', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 2', 'capacity' => 2, 'location' => 'الصالة الرئيسية', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 3', 'capacity' => 4, 'location' => 'الصالة الرئيسية', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 4', 'capacity' => 4, 'location' => 'الصالة الرئيسية', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 5', 'capacity' => 4, 'location' => 'الصالة الرئيسية', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 6', 'capacity' => 6, 'location' => 'الصالة الرئيسية', 'status' => 'available', 'is_active' => true],

            // قسم العائلات
            ['name' => 'طاولة 7 (عائلات)', 'capacity' => 6, 'location' => 'قسم العائلات', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 8 (عائلات)', 'capacity' => 8, 'location' => 'قسم العائلات', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 9 (عائلات)', 'capacity' => 8, 'location' => 'قسم العائلات', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 10 (عائلات كبرى)', 'capacity' => 12, 'location' => 'قسم العائلات', 'status' => 'available', 'is_active' => true],

            // الشرفة الخارجية والتراس
            ['name' => 'طاولة 11 (تراس)', 'capacity' => 2, 'location' => 'الشرفة الخارجية', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 12 (تراس)', 'capacity' => 4, 'location' => 'الشرفة الخارجية', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 13 (تراس)', 'capacity' => 4, 'location' => 'الشرفة الخارجية', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 14 (تراس)', 'capacity' => 6, 'location' => 'الشرفة الخارجية', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة 15 (إطلالة)', 'capacity' => 4, 'location' => 'الشرفة الخارجية', 'status' => 'available', 'is_active' => true],

            // الصالون الخاص VIP
            ['name' => 'جناح VIP 1', 'capacity' => 8, 'location' => 'صالون VIP', 'status' => 'available', 'is_active' => true],
            ['name' => 'جناح VIP 2', 'capacity' => 10, 'location' => 'صالون VIP', 'status' => 'available', 'is_active' => true],

            // منطقة البار السريع
            ['name' => 'طاولة بار 1', 'capacity' => 2, 'location' => 'منطقة البار السريع', 'status' => 'available', 'is_active' => true],
            ['name' => 'طاولة بار 2', 'capacity' => 2, 'location' => 'منطقة البار السريع', 'status' => 'available', 'is_active' => true],
        ];

        foreach ($tables as $t) {
            RestaurantTable::updateOrCreate(['name' => $t['name']], $t);
        }

        // ==========================================
        // 5. مناديب وسائقو التوصيل (Delivery Drivers)
        // ==========================================
        $drivers = [
            [
                'name' => 'إسلام فؤاد منصور',
                'phone' => '01022334455',
                'vehicle_type' => 'motorcycle',
                'license_plate' => 'أ ب ج 1234',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'سائق سريع في منطقة وسط البلد والدقي',
            ],
            [
                'name' => 'عمر سامي خليل',
                'phone' => '01133445566',
                'vehicle_type' => 'motorcycle',
                'license_plate' => 'د هـ و 5678',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'متخصص في توصيل الطلبات السريعة',
            ],
            [
                'name' => 'طارق جلال رضوان',
                'phone' => '01244556677',
                'vehicle_type' => 'car',
                'license_plate' => 'س ص ع 9012',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'سيارة مكيفة ومخصص للطلبات العائلية الكبيرة',
            ],
            [
                'name' => 'محمود حسن عثمان',
                'phone' => '01566778899',
                'vehicle_type' => 'scooter',
                'license_plate' => 'ن م ك 3456',
                'status' => 'available',
                'is_active' => true,
                'notes' => 'سكوتر كهربائي - وردية صباحية',
            ],
        ];

        foreach ($drivers as $d) {
            DeliveryDriver::updateOrCreate(['phone' => $d['phone']], $d);
        }

        // ==========================================
        // 6. سجل العملاء (Customers)
        // ==========================================
        $customers = [
            [
                'name' => 'أحمد محمود العوضي',
                'phone' => '01012345678',
                'email' => 'ahmed.mahmoud@example.com',
                'address' => 'شارع التحرير، الدقي، الجيزة',
                'notes' => 'عميل مميز - يفضل الوجبات الحارة',
                'total_orders' => 0,
                'total_spent' => 0.00,
                'balance' => 0.00,
                'is_active' => true,
            ],
            [
                'name' => 'سارة الشريف',
                'phone' => '01198765432',
                'email' => 'sara.elsharif@example.com',
                'address' => 'المعادي، شارع 9، القاهرة',
                'notes' => 'تطلب باستمرار بدون بصل، تفضل الدفع الإلكتروني',
                'total_orders' => 0,
                'total_spent' => 0.00,
                'balance' => 0.00,
                'is_active' => true,
            ],
            [
                'name' => 'محمد عبد الرحمن',
                'phone' => '01234567890',
                'email' => 'mohamed.abdelrahman@example.com',
                'address' => 'مدينة نصر، الحي السابع، القاهرة',
                'notes' => 'عميل أسبوعي منتظم',
                'total_orders' => 0,
                'total_spent' => 0.00,
                'balance' => 0.00,
                'is_active' => true,
            ],
            [
                'name' => 'منى يوسف إبراهيم',
                'phone' => '01055566677',
                'email' => 'mona.youssef@example.com',
                'address' => 'التجمع الخامس، النرجس، القاهرة الجديدة',
                'notes' => 'توصيل مسائي بعد الساعة 6',
                'total_orders' => 0,
                'total_spent' => 0.00,
                'balance' => 0.00,
                'is_active' => true,
            ],
            [
                'name' => 'خالد إبراهيم متولي',
                'phone' => '01599887766',
                'email' => 'khaled.ibrahim@example.com',
                'address' => 'الشيخ زايد، الحي الأول، الجيزة',
                'notes' => 'يفضل الدفع كاش عند الاستلام',
                'total_orders' => 0,
                'total_spent' => 0.00,
                'balance' => 0.00,
                'is_active' => true,
            ],
            [
                'name' => 'هبة عبد الله',
                'phone' => '01023456789',
                'email' => 'heba.abdallah@example.com',
                'address' => 'مصر الجديدة، روكسي، القاهرة',
                'notes' => 'عميلة جديدة',
                'total_orders' => 0,
                'total_spent' => 0.00,
                'balance' => 0.00,
                'is_active' => true,
            ],
        ];

        foreach ($customers as $c) {
            Customer::updateOrCreate(['phone' => $c['phone']], $c);
        }

        // ==========================================
        // 7. الإضافات والموديفايرز (Modifiers)
        // ==========================================
        $modifiers = [
            ['name' => 'شريحة جبن شيدر إضافية', 'price' => 20.00, 'is_active' => true],
            ['name' => 'شريحة لحم برجر أنجوس إضافية', 'price' => 65.00, 'is_active' => true],
            ['name' => 'شريحة بيكون بقري مقرمش', 'price' => 30.00, 'is_active' => true],
            ['name' => 'صوص ريسترو الخاص', 'price' => 15.00, 'is_active' => true],
            ['name' => 'صوص جبنة شيدر سائلة', 'price' => 25.00, 'is_active' => true],
            ['name' => 'صوص رانش كريمي', 'price' => 15.00, 'is_active' => true],
            ['name' => 'صوص باربكيو مدخن', 'price' => 15.00, 'is_active' => true],
            ['name' => 'صوص مايونيز بالثوم (تومية)', 'price' => 15.00, 'is_active' => true],
            ['name' => 'قطع هالبينو حار', 'price' => 15.00, 'is_active' => true],
            ['name' => 'بصل مكرمل', 'price' => 15.00, 'is_active' => true],
            ['name' => 'مشروم سوتيه طازج', 'price' => 25.00, 'is_active' => true],
            ['name' => 'جبنة موزاريلا إضافية', 'price' => 30.00, 'is_active' => true],
            ['name' => 'حجم عائلي كبير', 'price' => 35.00, 'is_active' => true],
            ['name' => 'بولة آيس كريم فانيليا', 'price' => 25.00, 'is_active' => true],
            ['name' => 'صوص نوتيلا إضافي', 'price' => 25.00, 'is_active' => true],
            ['name' => 'مكسرات محمصة مطحونة', 'price' => 20.00, 'is_active' => true],
        ];

        foreach ($modifiers as $m) {
            Modifier::updateOrCreate(['name' => $m['name']], $m);
        }

        $allModifiers = Modifier::all()->keyBy('name');

        // ==========================================
        // 8. التصنيفات (Categories)
        // ==========================================
        $categories = [
            [
                'name' => 'البرجر والساندوتشات',
                'slug' => 'burgers-sandwiches',
                'description' => 'أشهى ساندوتشات البرجر باللحم البقري الأنجوس والدجاج المقرمش مع الإضافات الخاصة',
                'image' => null,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'البيتزا والمعجنات',
                'slug' => 'pizza-pastries',
                'description' => 'بيتزا إيطالية مخبوزة على الحطب بجبنة الموزاريلا الفاخرة وصلصة السان مارزانو',
                'image' => null,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'الباستا والمكرونات',
                'slug' => 'pasta',
                'description' => 'مكرونات إيطالية طازجة بصلصات الألفريدو والبولونيز والبيستو الفاخرة',
                'image' => null,
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'المشويات والأطباق الرئيسية',
                'slug' => 'main-courses-grill',
                'description' => 'ستيك ريب آي، كباب، شيش طاووق، ومشاوي على الفحم متبلة بأسرار ريسترو',
                'image' => null,
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'المأكولات البحرية',
                'slug' => 'seafood',
                'description' => 'جمبري، طواجن سي فود، سمك فيليه طازج، وأطباق ثمار البحر الفاخرة',
                'image' => null,
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'المقبلات والأطباق الجانبية',
                'slug' => 'appetizers-sides',
                'description' => 'بطاطس مقرمشة، أصابع جبنة، حلقات بصل، تشيكن وينجز، وصوصات مميزة',
                'image' => null,
                'is_active' => true,
                'sort_order' => 6,
            ],
            [
                'name' => 'السلطات والشوربات',
                'slug' => 'salads-soups',
                'description' => 'سلطات خضراء طازجة، سلطة سيزر، وشوربات دافئة غنية بالنكهات',
                'image' => null,
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'name' => 'المشروبات الباردة والعصائر',
                'slug' => 'cold-drinks',
                'description' => 'مشروبات غازية، عصائر طبيعية فريش، موهيتو منعش ومياه معدنية',
                'image' => null,
                'is_active' => true,
                'sort_order' => 8,
            ],
            [
                'name' => 'المشروبات الساخنة والقهوة',
                'slug' => 'hot-drinks',
                'description' => 'إسبريسو، كابتشينو، لاتيه، شاي بنكهات متنوعة ومشروبات دافئة',
                'image' => null,
                'is_active' => true,
                'sort_order' => 9,
            ],
            [
                'name' => 'الحلويات',
                'slug' => 'desserts',
                'description' => 'تشيز كيك، مولتن كيك الشوكولاتة، وافل ونوتيلا وأم علي بالمكسرات',
                'image' => null,
                'is_active' => true,
                'sort_order' => 10,
            ],
        ];

        foreach ($categories as $cat) {
            Category::updateOrCreate(['slug' => $cat['slug']], $cat);
        }

        $allCategories = Category::all()->keyBy('slug');

        // مصفوفة مساعدة لجلب معرفات الموديفايرز بالأسماء
        $getModIds = function (array $names) use ($allModifiers): array {
            $ids = [];
            foreach ($names as $name) {
                if (isset($allModifiers[$name])) {
                    $ids[] = $allModifiers[$name]->id;
                }
            }
            return $ids;
        };

        // ==========================================
        // 9. المنتجات (Products)
        // ==========================================
        $products = [
            // --- البرجر والساندوتشات ---
            [
                'category_slug' => 'burgers-sandwiches',
                'name' => 'كلاسيك برجر لحم',
                'description' => 'شريحة لحم بقري أنجوس مشوية مع خس، طماطم، مخلل، وصوص ريسترو الخاص',
                'price' => 150.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'سنجل (150 جم)', 'price' => 150.00],
                    ['name' => 'دبل (300 جم)', 'price' => 210.00],
                    ['name' => 'تربل (450 جم)', 'price' => 260.00],
                ],
                'modifier_ids' => $getModIds(['شريحة جبن شيدر إضافية', 'شريحة لحم برجر أنجوس إضافية', 'صوص ريسترو الخاص']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'burgers-sandwiches',
                'name' => 'دبل تشيز برجر',
                'description' => 'شريحتان من اللحم البقري المشوي مع طبقتين من جبنة الشيدر الذائبة',
                'price' => 210.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['شريحة جبن شيدر إضافية', 'صوص جبنة شيدر سائلة', 'قطع هالبينو حار']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'burgers-sandwiches',
                'name' => 'كرسبي تشيكن برجر',
                'description' => 'صدر دجاج مقرمش ذهبي مع صوص الرانش والمايونيز والجبنة الذائبة والخس المقرمش',
                'price' => 165.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['شريحة جبن شيدر إضافية', 'صوص رانش كريمي']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'burgers-sandwiches',
                'name' => 'سموكي بيكون برجر',
                'description' => 'لحم بقري مشوي مع شرائح البيكون البقري المدخن وصوص الباربكيو والجبنة الذائبة',
                'price' => 230.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['شريحة بيكون بقري مقرمش', 'صوص باربكيو مدخن', 'بصل مكرمل']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'burgers-sandwiches',
                'name' => 'مشروم سويس برجر',
                'description' => 'برجر لحم أنجوس مغطى بشرائح المشروم الطازج سوتيه مع صوص المايونيز والجبنة السويسرية',
                'price' => 220.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['مشروم سوتيه طازج', 'شريحة جبن شيدر إضافية']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'burgers-sandwiches',
                'name' => 'زنجر سوبريم حار',
                'description' => 'دجاج زنجر حار ومقرمش مع هالبينو، صوص الشيدر الحار، وخس طازج في خبز البريوش',
                'price' => 175.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['قطع هالبينو حار', 'صوص جبنة شيدر سائلة']),
                'is_active' => true,
            ],

            // --- البيتزا والمعجنات ---
            [
                'category_slug' => 'pizza-pastries',
                'name' => 'بيتزا مارجريتا كلاسيك',
                'description' => 'صلصة طماطم إيطالية طازجة مع جبنة موزاريلا فاخرة وريحان طازج وزيت زيتون بكر',
                'price' => 140.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'وسط (Medium)', 'price' => 140.00],
                    ['name' => 'كبير (Large)', 'price' => 190.00],
                ],
                'modifier_ids' => $getModIds(['جبنة موزاريلا إضافية']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'pizza-pastries',
                'name' => 'بيتزا بيبروني فاخرة',
                'description' => 'شرائح بيبروني بقري مدخن فاخرة مع جبنة الموزاريلا وصلصة الطماطم الغنية',
                'price' => 180.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'وسط (Medium)', 'price' => 180.00],
                    ['name' => 'كبير (Large)', 'price' => 240.00],
                ],
                'modifier_ids' => $getModIds(['جبنة موزاريلا إضافية', 'قطع هالبينو حار']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'pizza-pastries',
                'name' => 'بيتزا سوبر سوبريم',
                'description' => 'لحم مفروم، بيبروني، مشروم، فلفل رومي، زيتون أسود، وجبنة موزاريلا مضاعفة',
                'price' => 210.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'وسط (Medium)', 'price' => 210.00],
                    ['name' => 'كبير (Large)', 'price' => 275.00],
                ],
                'modifier_ids' => $getModIds(['جبنة موزاريلا إضافية']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'pizza-pastries',
                'name' => 'بيتزا باربكيو تشيكن',
                'description' => 'قطع صدور دجاج مشوية مع صوص الباربكيو المدخن، بصل أحمر وجبنة الموزاريلا',
                'price' => 195.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'وسط (Medium)', 'price' => 195.00],
                    ['name' => 'كبير (Large)', 'price' => 255.00],
                ],
                'modifier_ids' => $getModIds(['صوص باربكيو مدخن', 'جبنة موزاريلا إضافية']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'pizza-pastries',
                'name' => 'بيتزا أربعة أجبان (كواترو فورماجي)',
                'description' => 'مزيج فاخر من جبنة الموزاريلا، الشيدر، البارميزان، والجبنة الزرقاء الركفور',
                'price' => 200.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'وسط (Medium)', 'price' => 200.00],
                    ['name' => 'كبير (Large)', 'price' => 260.00],
                ],
                'modifier_ids' => $getModIds(['جبنة موزاريلا إضافية']),
                'is_active' => true,
            ],

            // --- الباستا والمكرونات ---
            [
                'category_slug' => 'pasta',
                'name' => 'فيتوتشيني ألفريدو بالدجاج والمشروم',
                'description' => 'مكرونة فيتوتشيني مع شرائح صدور الدجاج والمشروم الطازج بصلصة الكريمة الإيطالية والبارميزان',
                'price' => 175.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['مشروم سوتيه طازج', 'جبنة موزاريلا إضافية']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'pasta',
                'name' => 'بيني أرابياتا حارة',
                'description' => 'مكرونة بيني مع صلصة طماطم حارة بالثوم وزيت الزيتون والريحان ورقائق الفلفل الحار',
                'price' => 125.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['قطع هالبينو حار']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'pasta',
                'name' => 'لازانيا لحم كلاسيك بالفرن',
                'description' => 'طبقات مكرونة اللازانيا الإيطالية محشوة باللحم البقري المفروم وصلصة البشاميل والموزاريلا',
                'price' => 190.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['جبنة موزاريلا إضافية']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'pasta',
                'name' => 'سباغيتي بولونيز',
                'description' => 'مكرونة سباغيتي بصلصة اللحم المفروم الإيطالية الغنية بالأعشاب وجبنة البارميزان',
                'price' => 155.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],

            // --- المشويات والأطباق الرئيسية ---
            [
                'category_slug' => 'main-courses-grill',
                'name' => 'مشكل مشويات ريسترو على الفحم',
                'description' => 'كباب، كفتة لحم، شيش طاووق، وريش ضاني مشوية على الفحم مع أرز بسمتي وخضار مشوي',
                'price' => 340.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'فردي (نصف كيلو)', 'price' => 340.00],
                    ['name' => 'عائلي (كيلو كامل)', 'price' => 620.00],
                ],
                'modifier_ids' => $getModIds(['صوص مايونيز بالثوم (تومية)', 'حجم عائلي كبير']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'main-courses-grill',
                'name' => 'ستيك ريب آي أنجوس مشوي',
                'description' => 'قطعة ستيك ريب آي لحم بقري أنجوس طرية مشوية مع صوص الفلفل الأسود وبطاطس بيوريه',
                'price' => 390.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => '250 جرام', 'price' => 390.00],
                    ['name' => '350 جرام', 'price' => 490.00],
                ],
                'modifier_ids' => $getModIds(['مشروم سوتيه طازج']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'main-courses-grill',
                'name' => 'شيش طاووق على الفحم',
                'description' => 'أوراك دجاج متبلة بخلطة التوابل والزبادي مشوية على الفحم مع أرز بسمتي وتومية',
                'price' => 195.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['صوص مايونيز بالثوم (تومية)']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'main-courses-grill',
                'name' => 'بيكاتا لحم بالمشروم والصوص البني',
                'description' => 'شرائح بتلو رفيعة مطبوخة في صوص الديمي جلاس والمشروم الطازج مع مكرونة أو أرز',
                'price' => 265.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['مشروم سوتيه طازج']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'main-courses-grill',
                'name' => 'تشيكن كوردون بلو',
                'description' => 'صدور دجاج محشوة بالجبنة الشيدر والبيكون البقري ومقلية بالبقسماط الذهبي المقرمش',
                'price' => 220.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['صوص جبنة شيدر سائلة']),
                'is_active' => true,
            ],

            // --- المأكولات البحرية ---
            [
                'category_slug' => 'seafood',
                'name' => 'طاجن جمبري إسكندراني بالخلطة',
                'description' => 'جمبري طازج مطبوخ في الفرن بصلصة الطماطم والخضار والأعشاب الإسكندرانية مع أرز صيادية',
                'price' => 280.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'seafood',
                'name' => 'سمك فيليه مشوي بصوص الليمون والزبدة',
                'description' => 'فيليه سمك طازج مشوي يقدم مع صوص الليمون والزبدة والشبت وخضار سوتيه',
                'price' => 210.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'seafood',
                'name' => 'جمبري مقلي كرسبي جامبو',
                'description' => 'جمبري مقرمش بخلطة التيمبورا الخاصة مع صوص التارتار والبطاطس المقلية',
                'price' => 295.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['صوص رانش كريمي']),
                'is_active' => true,
            ],

            // --- المقبلات والأطباق الجانبية ---
            [
                'category_slug' => 'appetizers-sides',
                'name' => 'بطاطس مقلية كلاسيك',
                'description' => 'أصابع بطاطس مقرمشة ذهبية ومملحة بالبهارات الخاصة',
                'price' => 45.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'عادي (Regular)', 'price' => 45.00],
                    ['name' => 'كبير (Large)', 'price' => 65.00],
                ],
                'modifier_ids' => $getModIds(['صوص جبنة شيدر سائلة', 'صوص ريسترو الخاص']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'appetizers-sides',
                'name' => 'أصابع جبنة موزاريلا مقرمشة',
                'description' => 'أصابع جبنة موزاريلا مغطاة بفتات الخبز ومقلية حتى تذوب مع صوص المارينارا الإيطالي',
                'price' => 85.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['صوص رانش كريمي']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'appetizers-sides',
                'name' => 'حلقات بصل مقرمشة',
                'description' => 'حلقات بصل مقلية في خليط مقرمش تقدم مع صوص الباربكيو المدخن',
                'price' => 60.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['صوص باربكيو مدخن']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'appetizers-sides',
                'name' => 'تشيكن وينجز بافلو (أجنحة دجاج)',
                'description' => 'أجنحة دجاج مقلية ومغموسة في صوص البافلو الحار تقدم مع صوص الرانش والخيار',
                'price' => 110.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => '6 قطع', 'price' => 110.00],
                    ['name' => '12 قطعة', 'price' => 195.00],
                ],
                'modifier_ids' => $getModIds(['صوص رانش كريمي', 'قطع هالبينو حار']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'appetizers-sides',
                'name' => 'خبز بالثوم والجبنة الذائبة',
                'description' => 'خبز باغيت إيطالي محمص بزبدة الثوم والأعشاب ومغطى بطبقة سخية من الموزاريلا الذائبة',
                'price' => 70.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],

            // --- السلطات والشوربات ---
            [
                'category_slug' => 'salads-soups',
                'name' => 'سلطة سيزر بالدجاج المشوي',
                'description' => 'خس روماني طازج مع قطع دجاج مشوي، مكعبات خبز محمص كروتون، جبنة بارميزان وصوص سيزر',
                'price' => 125.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'salads-soups',
                'name' => 'سلطة يونانية كلاسيكية',
                'description' => 'طماطم، خيار، بصل أحمر، فلفل أخضر، زيتون كالاماتا، مكعبات جبنة فيتا وزيت زيتون بكر',
                'price' => 105.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'salads-soups',
                'name' => 'شوربة كريمة الدجاج بالمشروم',
                'description' => 'شوربة دافئة غنية بالكريمة مع قطع صدور الدجاج والمشروم الطازج والأعشاب العطرية',
                'price' => 75.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'salads-soups',
                'name' => 'شوربة سي فود بالكريمة',
                'description' => 'شوربة ثمار البحر الغنية بقطع الجمبري، الكاليماري، والسمك الفيليه مع الكريمة والليمون',
                'price' => 135.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],

            // --- المشروبات الباردة والعصائر ---
            [
                'category_slug' => 'cold-drinks',
                'name' => 'كوكاكولا كانز',
                'description' => 'مشروب غازي منعش 330 مل',
                'price' => 25.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'cold-drinks',
                'name' => 'كوكاكولا زيرو كانز',
                'description' => 'مشروب غازي بدون سكر 330 مل',
                'price' => 25.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'cold-drinks',
                'name' => 'سبرايت كانز',
                'description' => 'مشروب غازي بنكهة الليمون 330 مل',
                'price' => 25.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'cold-drinks',
                'name' => 'عصير برتقال طازج فريش',
                'description' => 'عصير برتقال طبيعي 100% معصور طازج بدون سكر مضاف',
                'price' => 55.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'cold-drinks',
                'name' => 'عصير مانجو طبيعي فريش',
                'description' => 'عصير مانجو طبيعي طازج وبارد',
                'price' => 60.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'cold-drinks',
                'name' => 'ليموناضة بالنعناع المنعش',
                'description' => 'عصير ليمون طازج ممزوج بأوراق النعناع الأخضر والثلج المجروش',
                'price' => 50.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'cold-drinks',
                'name' => 'مياه معدنية طبيعية',
                'description' => 'مياه معدنية نقية باردة',
                'price' => 15.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'صغيرة (600 مل)', 'price' => 15.00],
                    ['name' => 'كبيرة (1.5 لتر)', 'price' => 25.00],
                ],
                'modifier_ids' => [],
                'is_active' => true,
            ],

            // --- المشروبات الساخنة والقهوة ---
            [
                'category_slug' => 'hot-drinks',
                'name' => 'إسبريسو إيطالي',
                'description' => 'شوت قهوة إسبريسو غني ومركز محضر من حبوب البن الفاخرة',
                'price' => 35.00,
                'image' => null,
                'images' => null,
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'سنجل (Single)', 'price' => 35.00],
                    ['name' => 'دبل (Double)', 'price' => 45.00],
                ],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'hot-drinks',
                'name' => 'كابتشينو كلاسيك',
                'description' => 'مزيج متوازن من الإسبريسو والحليب المبخر مع رغوة كريمية غنية ورشة كاكاو',
                'price' => 55.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'hot-drinks',
                'name' => 'كافيه لاتيه',
                'description' => 'شوت إسبريسو ممزوج بحليب ساخن مخفوق وناعم',
                'price' => 55.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'hot-drinks',
                'name' => 'أمريكانو كلاسيك',
                'description' => 'شوت إسبريسو مخفف بالماء الساخن لنكهة قهوة سوداء نقية وغنية',
                'price' => 45.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'hot-drinks',
                'name' => 'شاي أحمر فاخر بالنعناع',
                'description' => 'شاي إنجليزي أحمر يقدم مع أوراق النعناع الطازجة حسب الرغبة',
                'price' => 25.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],

            // --- الحلويات ---
            [
                'category_slug' => 'desserts',
                'name' => 'تشيز كيك نيويورك بصوص التوت',
                'description' => 'تشيز كيك كريمية مخبوزة على طبقة من البسكويت الهش ومغطاة بصوص التوت البري',
                'price' => 85.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['بولة آيس كريم فانيليا']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'desserts',
                'name' => 'مولتن كيك الشوكولاتة الذائبة',
                'description' => 'كيكة شوكولاتة ساخنة محشوة بقلب شوكولاتة ذائب مع بولة آيس كريم فانيليا',
                'price' => 95.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['بولة آيس كريم فانيليا', 'صوص نوتيلا إضافي']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'desserts',
                'name' => 'وافل بالنوتيلا والفراولة',
                'description' => 'وافل بلجيكي مقرمش ومغطى بصوص النوتيلا الغني مع قطع الفراولة والموز',
                'price' => 90.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['بولة آيس كريم فانيليا', 'مكسرات محمصة مطحونة']),
                'is_active' => true,
            ],
            [
                'category_slug' => 'desserts',
                'name' => 'أم علي بالمكسرات والقشطة',
                'description' => 'حلوى شرقية تقليدية من رقائق العجين المخبوزة في الحليب الساخن مع المكسرات والقشطة والزبيب',
                'price' => 75.00,
                'image' => null,
                'images' => null,
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => $getModIds(['مكسرات محمصة مطحونة']),
                'is_active' => true,
            ],
        ];

        foreach ($products as $p) {
            $cat = $allCategories->get($p['category_slug']);
            if (! $cat) {
                continue;
            }

            Product::updateOrCreate(
                [
                    'category_id' => $cat->id,
                    'name' => $p['name'],
                ],
                [
                    'description' => $p['description'],
                    'price' => $p['price'],
                    'image' => $p['image'],
                    'images' => $p['images'],
                    'has_sizes' => $p['has_sizes'],
                    'sizes' => $p['sizes'],
                    'modifier_ids' => $p['modifier_ids'],
                    'is_active' => $p['is_active'],
                ]
            );
        }
    }
}

