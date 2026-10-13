<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = Category::all()->keyBy('slug');

        $products = [
            // البرجر
            [
                'category_slug' => 'burgers-sandwiches',
                'name' => 'كلاسيك برجر لحم',
                'description' => 'شريحة لحم بقري أنجوس مشوية مع خس، طماطم، مخلل، وصوص ريسترو الخاص',
                'price' => 150.00,
                'image' => 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
                    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'سنجل (شريحة واحدة)', 'price' => 150.00],
                    ['name' => 'دبل (شريحتين لحم)', 'price' => 210.00],
                    ['name' => 'تربل سوبر', 'price' => 260.00],
                ],
                'modifier_ids' => [1, 2, 4],
                'is_active' => true,
            ],
            [
                'category_slug' => 'burgers-sandwiches',
                'name' => 'دبل تشيز برجر',
                'description' => 'شريحتان من اللحم البقري المشوي مع طبقتين من جبنة الشيدر الذائبة',
                'price' => 210.00,
                'image' => 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [1, 2],
                'is_active' => true,
            ],
            [
                'category_slug' => 'burgers-sandwiches',
                'name' => 'كرسبي تشيكن برجر',
                'description' => 'صدر دجاج مقرمش مع صوص الرانش والمايونيز والجبنة الذائبة',
                'price' => 165.00,
                'image' => 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [1, 3],
                'is_active' => true,
            ],

            // البيتزا
            [
                'category_slug' => 'pizza-pastries',
                'name' => 'بيتزا مارجريتا إيطالية',
                'description' => 'صلصة طماطم سان مارزانو، جبنة موزاريلا طازجة، ريحان وزيت زيتون بكر',
                'price' => 140.00,
                'image' => 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
                    'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'صغير (22 سم)', 'price' => 140.00],
                    ['name' => 'وسط (28 سم)', 'price' => 180.00],
                    ['name' => 'كبير عائلي (35 سم)', 'price' => 230.00],
                ],
                'modifier_ids' => [1, 4],
                'is_active' => true,
            ],
            [
                'category_slug' => 'pizza-pastries',
                'name' => 'بيتزا بيبروني',
                'description' => 'شرائح بيبروني بقري فاخرة مع جبنة موزاريلا وصلصة الطماطم الغنية',
                'price' => 170.00,
                'image' => 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => true,
                'sizes' => [
                    ['name' => 'وسط', 'price' => 170.00],
                    ['name' => 'كبير', 'price' => 220.00],
                ],
                'modifier_ids' => [1, 2],
                'is_active' => true,
            ],

            // المقبلات
            [
                'category_slug' => 'appetizers-sides',
                'name' => 'بطاطس مقلية كلاسيك',
                'description' => 'أصابع بطاطس مقرمشة ذهبية متبلة ببهارات ريسترو الخاصة',
                'price' => 55.00,
                'image' => 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'appetizers-sides',
                'name' => 'تشيزي فرايز بالهالبينو',
                'description' => 'بطاطس مقلية مغطاة بصوص الجبن الذائب وقطع الهالبينو الحارة',
                'price' => 85.00,
                'image' => 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [1, 2],
                'is_active' => true,
            ],

            // المشروبات
            [
                'category_slug' => 'beverages-drinks',
                'name' => 'كوكاكولا باردة',
                'description' => 'علبة كوكاكولا مثلجة مع شرائح الليمون ومكعبات الثلج',
                'price' => 35.00,
                'image' => 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
            [
                'category_slug' => 'beverages-drinks',
                'name' => 'موهيتو ليمون ونعناع',
                'description' => 'عصير منعش من الليمون الطازج وأوراق النعناع مع الصودا الفوارة',
                'price' => 70.00,
                'image' => 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],

            // الحلويات
            [
                'category_slug' => 'desserts',
                'name' => 'مولتن لافا كيك',
                'description' => 'كيك شوكولاتة ساخنة محشوة بالشوكولاتة السائلة مع بولة آيس كريم فانيليا',
                'price' => 110.00,
                'image' => 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
                'images' => [
                    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
                ],
                'has_sizes' => false,
                'sizes' => [],
                'modifier_ids' => [],
                'is_active' => true,
            ],
        ];

        foreach ($products as $item) {
            $cat = $categories->get($item['category_slug']);
            if ($cat) {
                Product::updateOrCreate(
                    [
                        'name' => $item['name'],
                        'category_id' => $cat->id,
                    ],
                    [
                        'description' => $item['description'],
                        'price' => $item['price'],
                        'image' => $item['image'],
                        'images' => $item['images'],
                        'has_sizes' => $item['has_sizes'],
                        'sizes' => $item['sizes'],
                        'modifier_ids' => $item['modifier_ids'],
                        'is_active' => $item['is_active'],
                    ]
                );
            }
        }
    }
}
