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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('restaurant_name')->default('مطعم ريسترو');
            $table->string('restaurant_phone')->nullable()->default('01000000000');
            $table->string('restaurant_email')->nullable()->default('contact@restro.com');
            $table->string('restaurant_address')->nullable()->default('الفرع الرئيسي');
            $table->string('currency')->default('ج.م');
            $table->decimal('tax_percentage', 5, 2)->default(14.00);
            $table->boolean('tax_enabled')->default(true);
            $table->string('tax_number')->nullable();
            $table->decimal('delivery_fee', 8, 2)->default(20.00);
            $table->string('receipt_header', 500)->nullable();
            $table->string('receipt_footer', 500)->nullable()->default('شكراً لزيارتكم! نسعد بخدمتكم دائماً.');
            $table->longText('logo')->nullable();
            $table->boolean('enable_tables')->default(true);
            $table->boolean('enable_delivery')->default(true);
            $table->boolean('enable_takeaway')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
