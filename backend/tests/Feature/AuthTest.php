<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('admin can login successfully and receives standardized json response', function () {
    $admin = User::factory()->admin()->create([
        'email' => 'admin@restro.com',
        'password' => 'password123',
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'admin@restro.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'token',
                'token_type',
                'user' => ['id', 'name', 'email', 'role'],
            ],
        ])
        ->assertJson([
            'success' => true,
            'message' => 'تم تسجيل الدخول بنجاح',
            'data' => [
                'token_type' => 'Bearer',
                'user' => [
                    'email' => 'admin@restro.com',
                    'role' => 'admin',
                ],
            ],
        ]);
});

test('non-admin user cannot login to dashboard and receives 403 forbidden', function () {
    $customer = User::factory()->create([
        'email' => 'customer@restro.com',
        'role' => 'customer',
        'password' => 'password123',
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'customer@restro.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(403)
        ->assertJson([
            'success' => false,
            'message' => 'غير مصرح لك بالوصول إلى لوحة التحكم.',
        ]);
});

test('login fails with invalid credentials and returns 401 unauthorized', function () {
    User::factory()->admin()->create([
        'email' => 'admin@restro.com',
        'password' => 'correct-password',
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'admin@restro.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(401)
        ->assertJson([
            'success' => false,
            'message' => 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        ]);
});

test('login fails with validation errors and returns 422 with standardized json format', function () {
    $response = $this->postJson('/api/auth/login', [
        'email' => '',
        'password' => '',
    ]);

    $response->assertStatus(422)
        ->assertJsonStructure([
            'success',
            'message',
            'errors' => ['email', 'password'],
        ])
        ->assertJson([
            'success' => false,
        ]);
});

test('authenticated admin can retrieve current profile via /api/auth/me', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/auth/me');

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'data' => [
                'id' => $admin->id,
                'email' => $admin->email,
                'role' => 'admin',
            ],
        ]);
});

test('non-admin user cannot access protected admin routes even if authenticated', function () {
    $customer = User::factory()->create(['role' => 'customer']);
    Sanctum::actingAs($customer);

    $response = $this->getJson('/api/auth/me');

    $response->assertStatus(403)
        ->assertJson([
            'success' => false,
            'message' => 'غير مصرح لك بالوصول إلى لوحة التحكم.',
        ]);
});

test('admin can logout successfully and revoke access token', function () {
    $admin = User::factory()->admin()->create();
    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/auth/logout');

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'تم تسجيل الخروج بنجاح',
        ]);

    expect($admin->tokens()->count())->toBe(0);
});

test('unauthenticated request to protected route returns standardized 401 response', function () {
    $response = $this->getJson('/api/auth/me');

    $response->assertStatus(401)
        ->assertJson([
            'success' => false,
            'message' => 'غير مسجل دخول أو انتهت صلاحية الجلسة.',
        ]);
});

test('non-existent api route returns standardized 404 response', function () {
    $response = $this->getJson('/api/non-existent-endpoint');

    $response->assertStatus(404)
        ->assertJson([
            'success' => false,
            'message' => 'المورد المطلوب غير موجود.',
        ]);
});
