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
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cash_register_id')->constrained('cash_registers')->cascadeOnDelete();
            $table->string('shift_number', 50)->unique();
            $table->string('z_report_number', 50)->nullable()->unique();
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->decimal('starting_cash', 12, 2)->default(0.00);
            $table->decimal('expected_cash', 12, 2)->nullable();
            $table->decimal('actual_cash', 12, 2)->nullable();
            $table->decimal('difference', 12, 2)->nullable();
            $table->decimal('total_sales', 12, 2)->default(0.00);
            $table->decimal('cash_sales', 12, 2)->default(0.00);
            $table->decimal('card_sales', 12, 2)->default(0.00);
            $table->decimal('transfer_sales', 12, 2)->default(0.00);
            $table->integer('total_orders')->default(0);
            $table->decimal('total_expenses', 12, 2)->default(0.00);
            $table->decimal('total_receipts', 12, 2)->default(0.00);
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->text('opening_notes')->nullable();
            $table->text('closing_notes')->nullable();
            $table->timestamps();
        });

        // Add shift_id to orders, payments, and financial_transactions
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'shift_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->foreignId('shift_id')->nullable()->after('cash_register_id')->constrained('shifts')->nullOnDelete();
            });
        }

        if (Schema::hasTable('payments') && !Schema::hasColumn('payments', 'shift_id')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->foreignId('shift_id')->nullable()->after('cash_register_id')->constrained('shifts')->nullOnDelete();
            });
        }

        if (Schema::hasTable('financial_transactions') && !Schema::hasColumn('financial_transactions', 'shift_id')) {
            Schema::table('financial_transactions', function (Blueprint $table) {
                $table->foreignId('shift_id')->nullable()->after('cash_register_id')->constrained('shifts')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('financial_transactions') && Schema::hasColumn('financial_transactions', 'shift_id')) {
            Schema::table('financial_transactions', function (Blueprint $table) {
                $table->dropForeign(['shift_id']);
                $table->dropColumn('shift_id');
            });
        }

        if (Schema::hasTable('payments') && Schema::hasColumn('payments', 'shift_id')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropForeign(['shift_id']);
                $table->dropColumn('shift_id');
            });
        }

        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'shift_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['shift_id']);
                $table->dropColumn('shift_id');
            });
        }

        Schema::dropIfExists('shifts');
    }
};
