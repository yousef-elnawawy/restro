<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First map any legacy 'in_progress' to 'preparing'
        DB::table('orders')->where('status', 'in_progress')->update(['status' => 'pending']);

        // Update ENUM definition for status and payment_status on MySQL
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'preparing', 'ready', 'served', 'out_for_delivery', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE orders MODIFY COLUMN payment_status ENUM('unpaid', 'partially_paid', 'paid') NOT NULL DEFAULT 'unpaid'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert any new statuses back to pending or in_progress before restoring old enum
        DB::table('orders')->whereIn('status', ['preparing', 'ready', 'served', 'out_for_delivery'])->update(['status' => 'pending']);
        DB::table('orders')->where('payment_status', 'partially_paid')->update(['payment_status' => 'unpaid']);

        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE orders MODIFY COLUMN payment_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid'");
    }
};
