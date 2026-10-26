<?php

namespace App\Http\Controllers\Api\DeliveryDrivers;

use App\Http\Controllers\Controller;
use App\Models\DeliveryDriver;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class DeliveryDriverController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of delivery drivers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DeliveryDriver::with('user');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('license_plate', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('email', 'like', "%{$search}%");
                  });
            });
        }

        if ($status = $request->query('status')) {
            if (in_array($status, ['available', 'on_delivery', 'off_duty'])) {
                $query->where('status', $status);
            }
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $drivers = $query->orderBy('name', 'asc')->get();

        return $this->successResponse($drivers, 'تم جلب قائمة مندوبي التوصيل بنجاح.');
    }

    /**
     * Store a newly created delivery driver.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30', 'unique:delivery_drivers,phone'],
            'vehicle_type' => ['required', 'in:motorcycle,car,bicycle,scooter'],
            'license_plate' => ['nullable', 'string', 'max:30'],
            'status' => ['nullable', 'in:available,on_delivery,off_duty'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'max:150', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:6'],
        ], [
            'name.required' => 'اسم مندوب التوصيل مطلوب.',
            'phone.required' => 'رقم الهاتف مطلوب.',
            'phone.unique' => 'رقم الهاتف مسجل بالفعل لمندوب آخر.',
            'vehicle_type.required' => 'نوع وسيلة التوصيل مطلوب.',
            'email.email' => 'البريد الإلكتروني المدخل غير صالح.',
            'email.unique' => 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر.',
            'password.min' => 'يجب ألا تقل كلمة المرور عن 6 أحرف.',
        ]);

        $result = DB::transaction(function () use ($validated) {
            $cleanPhone = preg_replace('/[^0-9]/', '', $validated['phone']);
            if (empty($cleanPhone)) {
                $cleanPhone = 'driver' . rand(1000, 9999);
            }

            // توليد البريد الإلكتروني تلقائياً وبشكل ذكي إذا لم يدخله المشرف
            if (!empty($validated['email'])) {
                $email = strtolower(trim($validated['email']));
            } else {
                $baseEmail = "driver.{$cleanPhone}@restro.com";
                $email = $baseEmail;
                $counter = 1;
                while (User::where('email', $email)->exists()) {
                    $email = "driver.{$cleanPhone}_{$counter}@restro.com";
                    $counter++;
                }
            }

            // كلمة المرور الافتراضية هي رقم هاتف المندوب لتسهيل حفظه ودخوله
            $plainPassword = !empty($validated['password'])
                ? $validated['password']
                : (strlen($cleanPhone) >= 6 ? $cleanPhone : 'driver123456');

            // إنشاء حساب مستخدم في النظام بصلاحية delivery
            $user = User::create([
                'name' => $validated['name'],
                'email' => $email,
                'password' => Hash::make($plainPassword),
                'role' => 'delivery',
            ]);

            // إنشاء سجل مندوب التوصيل وربطه بالمستخدم
            $driver = DeliveryDriver::create([
                'user_id' => $user->id,
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'vehicle_type' => $validated['vehicle_type'],
                'license_plate' => $validated['license_plate'] ?? null,
                'status' => $validated['status'] ?? 'available',
                'is_active' => $validated['is_active'] ?? true,
                'notes' => $validated['notes'] ?? null,
            ]);

            $driver->load('user');

            $driverData = $driver->toArray();
            $driverData['generated_credentials'] = [
                'email' => $user->email,
                'password' => $plainPassword,
                'login_identifier' => $validated['phone'],
            ];

            return $driverData;
        });

        return $this->successResponse($result, 'تم إضافة مندوب التوصيل وإنشاء حساب مستخدم خاص به تلقائياً بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified delivery driver.
     */
    public function show(DeliveryDriver $deliveryDriver): JsonResponse
    {
        $deliveryDriver->load([
            'user',
            'orders' => function ($q) {
                $q->orderBy('created_at', 'desc')->limit(10);
            },
        ]);

        return $this->successResponse($deliveryDriver, 'تم جلب بيانات المندوب بنجاح.');
    }

    /**
     * Update the specified delivery driver.
     */
    public function update(Request $request, DeliveryDriver $deliveryDriver): JsonResponse
    {
        $userId = $deliveryDriver->user_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30', 'unique:delivery_drivers,phone,' . $deliveryDriver->id],
            'vehicle_type' => ['required', 'in:motorcycle,car,bicycle,scooter'],
            'license_plate' => ['nullable', 'string', 'max:30'],
            'status' => ['nullable', 'in:available,on_delivery,off_duty'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'max:150', $userId ? Rule::unique('users', 'email')->ignore($userId) : 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:6'],
        ], [
            'name.required' => 'اسم مندوب التوصيل مطلوب.',
            'phone.required' => 'رقم الهاتف مطلوب.',
            'phone.unique' => 'رقم الهاتف مسجل بالفعل لمندوب آخر.',
            'vehicle_type.required' => 'نوع وسيلة التوصيل مطلوب.',
            'email.email' => 'البريد الإلكتروني المدخل غير صالح.',
            'email.unique' => 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر.',
            'password.min' => 'يجب ألا تقل كلمة المرور عن 6 أحرف.',
        ]);

        DB::transaction(function () use ($validated, $deliveryDriver) {
            $user = $deliveryDriver->user;

            if ($user) {
                $userUpdates = ['name' => $validated['name']];
                if (!empty($validated['email'])) {
                    $userUpdates['email'] = strtolower(trim($validated['email']));
                }
                if (!empty($validated['password'])) {
                    $userUpdates['password'] = Hash::make($validated['password']);
                }
                $user->update($userUpdates);
            } else {
                // إنشاء حساب تلقائي للمندوب إذا كان قديماً وبلا مستخدم
                $cleanPhone = preg_replace('/[^0-9]/', '', $validated['phone']);
                if (empty($cleanPhone)) {
                    $cleanPhone = 'driver' . rand(1000, 9999);
                }
                $email = !empty($validated['email']) ? strtolower(trim($validated['email'])) : "driver.{$cleanPhone}@restro.com";
                $counter = 1;
                while (User::where('email', $email)->exists()) {
                    $email = "driver.{$cleanPhone}_{$counter}@restro.com";
                    $counter++;
                }
                $plainPassword = !empty($validated['password'])
                    ? $validated['password']
                    : (strlen($cleanPhone) >= 6 ? $cleanPhone : 'driver123456');

                $user = User::create([
                    'name' => $validated['name'],
                    'email' => $email,
                    'password' => Hash::make($plainPassword),
                    'role' => 'delivery',
                ]);
                $validated['user_id'] = $user->id;
            }

            $driverData = [
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'vehicle_type' => $validated['vehicle_type'],
                'license_plate' => $validated['license_plate'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ];
            if (isset($validated['status'])) {
                $driverData['status'] = $validated['status'];
            }
            if (isset($validated['is_active'])) {
                $driverData['is_active'] = $validated['is_active'];
            }
            if (isset($validated['user_id'])) {
                $driverData['user_id'] = $validated['user_id'];
            }

            $deliveryDriver->update($driverData);
        });

        $deliveryDriver->load('user');

        return $this->successResponse($deliveryDriver, 'تم تحديث بيانات المندوب وحسابه بنجاح.');
    }

    /**
     * Remove the specified delivery driver.
     */
    public function destroy(DeliveryDriver $deliveryDriver): JsonResponse
    {
        DB::transaction(function () use ($deliveryDriver) {
            if ($deliveryDriver->user) {
                $deliveryDriver->user->tokens()->delete();
                $deliveryDriver->user->delete();
            }
            $deliveryDriver->delete();
        });

        return $this->successResponse(null, 'تم حذف مندوب التوصيل وحسابه المرتبط بنجاح.');
    }

    /**
     * Toggle status or active.
     */
    public function updateStatus(Request $request, DeliveryDriver $deliveryDriver): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:available,on_delivery,off_duty'],
        ]);

        $deliveryDriver->update(['status' => $validated['status']]);

        return $this->successResponse($deliveryDriver, 'تم تحديث حالة المندوب بنجاح.');
    }
}
