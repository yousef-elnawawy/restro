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
        Schema::table('orders', function (Blueprint $table) {
            $table->string('discount_type', 30)->default('none')->after('delivery_fee');
            $table->decimal('discount_value', 10, 2)->default(0.00)->after('discount_type');
            $table->decimal('discount_amount', 10, 2)->default(0.00)->after('discount_value');
            $table->string('discount_reason', 255)->nullable()->after('discount_amount');
            $table->decimal('service_charge', 10, 2)->default(0.00)->after('discount_reason');
            $table->decimal('service_charge_percentage', 5, 2)->default(0.00)->after('service_charge');
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->decimal('service_charge_percentage', 5, 2)->default(0.00)->after('delivery_fee_per_km');
            $table->boolean('service_charge_enabled')->default(false)->after('service_charge_percentage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'discount_type',
                'discount_value',
                'discount_amount',
                'discount_reason',
                'service_charge',
                'service_charge_percentage',
            ]);
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn([
                'service_charge_percentage',
                'service_charge_enabled',
            ]);
        });
    }
};

