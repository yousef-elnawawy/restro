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
                'description' => 'أشهى ساندوتشات البرجر باللحم البقري الأنجوس والدجاج المقرمش مع الإضافات الخاصة',
                'image' => 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'البيتزا والمعجنات',
                'slug' => 'pizza-pastries',
                'description' => 'بيتزا إيطالية مخبوزة على الحطب بجبنة الموزاريلا الفاخرة وصلصة السان مارزانو',
                'image' => 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'الباستا والمكرونات',
                'slug' => 'pasta',
                'description' => 'مكرونات إيطالية طازجة بصلصات الألفريدو والبولونيز والبيستو الفاخرة',
                'image' => 'https://images.unsplash.com/photo-1621996346565-e3d5d6281141?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'المشويات والأطباق الرئيسية',
                'slug' => 'main-courses-grill',
                'description' => 'ستيك ريب آي، كباب، شيش طاووق، ومشاوي على الفحم متبلة بأسرار ريسترو',
                'image' => 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'المأكولات البحرية (سي فود)',
                'slug' => 'seafood',
                'description' => 'جمبري، طواجن سي فود، سمك فيليه طازج، وأطباق ثمار البحر الفاخرة',
                'image' => 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'المقبلات والأطباق الجانبية',
                'slug' => 'appetizers-sides',
                'description' => 'بطاطس مقرمشة، أصابع جبنة، حلقات بصل، تشيكن وينجز، وصوصات مميزة',
                'image' => 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 6,
            ],
            [
                'name' => 'الشوربات والسلطات',
                'slug' => 'soups-salads',
                'description' => 'شوربات ساخنة غنية، سيزر سالاد، وسلطات خضراء طازجة بتتبيلات شهية',
                'image' => 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'name' => 'الساندوتشات السريعة والراب',
                'slug' => 'wraps-quick',
                'description' => 'شاورما عربي، كلوب ساندوتش، راب دجاج، وكاساديا مكسيكية سريعة ولذيذة',
                'image' => null,
                'is_active' => true,
                'sort_order' => 8,
            ],
            [
                'name' => 'المشروبات والعصائر الطبيعية',
                'slug' => 'beverages-drinks',
                'description' => 'عصائر طازجة، موهيتو منعش، مشروبات غازية، وسموذي مثلج',
                'image' => 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 9,
            ],
            [
                'name' => 'الحلويات والمخبوزات',
                'slug' => 'desserts',
                'description' => 'كيك لافا، تشيز كيك، وافل نوتيلا، آيس كريم، وحلويات شرقية وغربية طازجة',
                'image' => 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80',
                'is_active' => true,
                'sort_order' => 10,
            ],
        ];

        foreach ($categories as $cat) {
            Category::updateOrCreate(['slug' => $cat['slug']], $cat);
        }
    }
}
