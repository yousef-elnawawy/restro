<?php

use App\Http\Controllers\Api\CashRegisters\CashRegisterController;
use App\Http\Controllers\Api\Categories\CategoryController;
use App\Http\Controllers\Api\Customers\CustomerController;
use App\Http\Controllers\Api\Dashboard\DashboardController;
use App\Http\Controllers\Api\DeliveryDrivers\DeliveryDriverController;
use App\Http\Controllers\Api\Financial\FinancialTransactionController;
use App\Http\Controllers\Api\Modifiers\ModifierController;
use App\Http\Controllers\Api\Orders\OrderController;
use App\Http\Controllers\Api\Products\ProductController;
use App\Http\Controllers\Api\Settings\SettingController;
use App\Http\Controllers\Api\Tables\TableController;
use App\Http\Controllers\Api\Users\UserController;
use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Authentication Routes (Dashboard Admin)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    // Admin login with rate limiting (5 attempts per minute)
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

    // Protected auth routes (Requires valid token for any staff role)
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
    });
});

/*
|--------------------------------------------------------------------------
| Menu Resources (Read-only endpoints for dashboard & frontend)
|--------------------------------------------------------------------------
*/
Route::get('categories', [CategoryController::class, 'index']);
Route::get('categories/{category}', [CategoryController::class, 'show']);

Route::get('products', [ProductController::class, 'index']);
Route::get('products/{product}', [ProductController::class, 'show']);

Route::get('modifiers', [ModifierController::class, 'index']);
Route::get('modifiers/{modifier}', [ModifierController::class, 'show']);

Route::get('tables', [TableController::class, 'index']);
Route::get('tables/{table}', [TableController::class, 'show']);
Route::get('tables/{table}/active-order', [TableController::class, 'activeOrder']);

Route::get('orders', [OrderController::class, 'index']);
Route::get('orders/{order}', [OrderController::class, 'show']);
Route::post('orders', [OrderController::class, 'store']);
Route::put('orders/{order}', [OrderController::class, 'update']);
Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);
Route::patch('orders/{order}/driver', [OrderController::class, 'assignDriver']);
Route::post('orders/{order}/pay', [OrderController::class, 'pay']);
Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);

Route::get('cash-registers', [CashRegisterController::class, 'index']);
Route::get('cash-registers/{cash_register}', [CashRegisterController::class, 'show']);
Route::get('cash-registers/{cash_register}/statement', [CashRegisterController::class, 'statement']);

// Customers CRUD & Statement
Route::get('customers', [CustomerController::class, 'index']);
Route::get('customers/{customer}', [CustomerController::class, 'show']);
Route::get('customers/{customer}/statement', [CustomerController::class, 'statement']);
Route::post('customers', [CustomerController::class, 'store']);
Route::put('customers/{customer}', [CustomerController::class, 'update']);
Route::delete('customers/{customer}', [CustomerController::class, 'destroy']);

// Financial Transactions & Vouchers (سندات القبض والدفع والمصاريف - Admin & Cashier)
Route::middleware(['auth:sanctum', 'role:admin,cashier'])->group(function () {
    Route::get('financial-transactions', [FinancialTransactionController::class, 'index']);
    Route::get('financial-transactions/{financial_transaction}', [FinancialTransactionController::class, 'show']);
    Route::post('financial-transactions', [FinancialTransactionController::class, 'store']);
});
Route::delete('financial-transactions/{financial_transaction}', [FinancialTransactionController::class, 'destroy'])->middleware(['auth:sanctum', 'role:admin']);

// Delivery Drivers CRUD (Admin, Cashier, and Delivery Staff)
Route::middleware(['auth:sanctum', 'role:admin,cashier,delivery'])->group(function () {
    Route::get('delivery-drivers', [DeliveryDriverController::class, 'index']);
    Route::get('delivery-drivers/{delivery_driver}', [DeliveryDriverController::class, 'show']);
    Route::post('delivery-drivers', [DeliveryDriverController::class, 'store']);
    Route::put('delivery-drivers/{delivery_driver}', [DeliveryDriverController::class, 'update']);
    Route::delete('delivery-drivers/{delivery_driver}', [DeliveryDriverController::class, 'destroy']);
    Route::patch('delivery-drivers/{delivery_driver}/status', [DeliveryDriverController::class, 'updateStatus']);
});

// Admin Only Settings & Reports
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::put('settings', [SettingController::class, 'update']);
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('reports', [DashboardController::class, 'reports']);
});

// System Settings (Read-only for app info)
Route::get('settings', [SettingController::class, 'show']);

// Public Menu aliases for customer website
Route::get('menu/categories', [CategoryController::class, 'index']);
Route::get('menu/products', [ProductController::class, 'index']);
Route::get('menu/modifiers', [ModifierController::class, 'index']);
Route::get('menu/tables', [TableController::class, 'index']);

/*
|--------------------------------------------------------------------------
| Menu & System Protected Actions (Requires valid token AND admin role)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    // Categories CRUD
    Route::post('categories', [CategoryController::class, 'store']);
    Route::put('categories/{category}', [CategoryController::class, 'update']);
    Route::delete('categories/{category}', [CategoryController::class, 'destroy']);
    Route::patch('categories/{category}/toggle-status', [CategoryController::class, 'toggleStatus']);

    // Products CRUD
    Route::post('products', [ProductController::class, 'store']);
    Route::put('products/{product}', [ProductController::class, 'update']);
    Route::delete('products/{product}', [ProductController::class, 'destroy']);
    Route::patch('products/{product}/toggle-status', [ProductController::class, 'toggleStatus']);

    // Modifiers CRUD
    Route::post('modifiers', [ModifierController::class, 'store']);
    Route::put('modifiers/{modifier}', [ModifierController::class, 'update']);
    Route::delete('modifiers/{modifier}', [ModifierController::class, 'destroy']);
    Route::patch('modifiers/{modifier}/toggle-status', [ModifierController::class, 'toggleStatus']);

    // Tables CRUD
    Route::post('tables', [TableController::class, 'store']);
    Route::put('tables/{table}', [TableController::class, 'update']);
    Route::delete('tables/{table}', [TableController::class, 'destroy']);
    Route::patch('tables/{table}/status', [TableController::class, 'updateStatus']);
    Route::patch('tables/{table}/toggle-status', [TableController::class, 'toggleActive']);

    // Cash Registers CRUD
    Route::post('cash-registers', [CashRegisterController::class, 'store']);
    Route::put('cash-registers/{cash_register}', [CashRegisterController::class, 'update']);
    Route::delete('cash-registers/{cash_register}', [CashRegisterController::class, 'destroy']);
    Route::patch('cash-registers/{cash_register}/toggle-status', [CashRegisterController::class, 'toggleActive']);

    // Staff Users Management (Admin only)
    Route::apiResource('users', UserController::class);
});
