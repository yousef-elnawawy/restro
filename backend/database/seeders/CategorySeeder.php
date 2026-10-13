<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'البرجر والساندوتشات',
                'slug' => 'burgers-sandwiches',
                'description' => 'أشهى ساندوتشات البرجر باللحم والدجاج المشوي مع الإضافات الخاصة',
                'image' => 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'البيتزا والمعجنات',
                'slug' => 'pizza-pastries',
                'description' => 'بيتزا إيطالية مخبوزة على الحطب بجبنة الموزاريلا الفاخرة',
                'image' => 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'المقبلات والأطباق الجانبية',
                'slug' => 'appetizers-sides',
                'description' => 'بطاطس مقرمشة، أصابع جبنة، حلقات بصل، وصوصات ريسترو المميزة',
                'image' => 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'المشروبات والعصائر',
                'slug' => 'beverages-drinks',
                'description' => 'مشروبات غازية، عصائر طبيعية طازجة، وموهيتو منعش',
                'image' => 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'الحلويات',
                'slug' => 'desserts',
                'description' => 'كيك شوكولاتة، تشيز كيك، آيس كريم، وحلويات شرقية وغربية',
                'image' => 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 5,
            ],
        ];

        foreach ($categories as $cat) {
            Category::updateOrCreate(['slug' => $cat['slug']], $cat);
        }
    }
}
