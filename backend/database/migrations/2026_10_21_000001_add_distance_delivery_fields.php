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
        Schema::table('settings', function (Blueprint $table) {
            $table->decimal('delivery_base_fee', 8, 2)->default(15.00)->after('delivery_fee');
            $table->decimal('delivery_fee_per_km', 8, 2)->default(5.00)->after('delivery_base_fee');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('delivery_address', 500)->nullable()->after('customer_name');
            $table->decimal('delivery_distance', 8, 2)->nullable()->after('delivery_fee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn(['delivery_base_fee', 'delivery_fee_per_km']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_address', 'delivery_distance']);
        });
    }
};
