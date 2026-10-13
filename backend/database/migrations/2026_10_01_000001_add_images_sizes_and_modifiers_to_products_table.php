<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->text('image')->nullable()->default(null)->change();
            $table->json('images')->nullable()->after('image');
            $table->boolean('has_sizes')->default(false)->after('price');
            $table->json('sizes')->nullable()->after('has_sizes');
            $table->json('modifier_ids')->nullable()->after('sizes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['images', 'has_sizes', 'sizes', 'modifier_ids']);
        });
    }
};
