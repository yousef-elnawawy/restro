<?php

namespace App\Http\Controllers\Api\Users;

use App\Http\Controllers\Controller;
use App\Models\DeliveryDriver;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class UserController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of staff users.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->query('role')) {
            if ($role !== 'all') {
                $query->where('role', $role);
            }
        }

        $users = $query->orderBy('role', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return $this->successResponse($users, 'تم استرجاع قائمة الموظفين بنجاح.');
    }

    /**
     * Store a newly created staff user.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'string', Rule::in(['cashier', 'kitchen', 'delivery'])],
        ], [
            'name.required' => 'اسم الموظف مطلوب.',
            'email.required' => 'البريد الإلكتروني مطلوب.',
            'email.email' => 'صيغة البريد الإلكتروني غير صحيحة.',
            'email.unique' => 'البريد الإلكتروني مسجل بالفعل لموظف آخر.',
            'password.required' => 'كلمة المرور مطلوبة.',
            'password.min' => 'يجب ألا تقل كلمة المرور عن 6 أحرف.',
            'role.required' => 'الدور / الصلاحية مطلوبة.',
            'role.in' => 'لا يمكن منح صلاحية المدير لأي حساب موظف جديد. الأدوار المتاحة لطاقم العمل هي: كاشير، مطبخ، أو توصيل فقط.',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        // إذا كان الموظف مسؤول توصيل، ننشئ له سجلاً في جدول السائقين تلقائياً لربطه
        if ($user->role === 'delivery') {
            DeliveryDriver::create([
                'user_id' => $user->id,
                'name' => $user->name,
                'phone' => '010' . str_pad((string) $user->id, 8, '0', STR_PAD_LEFT),
                'vehicle_type' => 'motorcycle',
                'status' => 'available',
                'is_active' => true,
            ]);
        }

        return $this->successResponse($user, 'تم إضافة الموظف بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified staff user.
     */
    public function show(User $user): JsonResponse
    {
        return $this->successResponse($user, 'تم استرجاع بيانات الموظف بنجاح.');
    }

    /**
     * Update the specified staff user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        // حماية حساب المدير العام من أي تعديل من شاشة الموظفين
        if ($user->isAdmin() || $user->role === 'admin') {
            return $this->errorResponse('حساب المدير العام محمي بالكامل ولا يمكن تعديل بياناته من قائمة الموظفين نهائياً.', null, Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', 'string', Rule::in(['cashier', 'kitchen', 'delivery'])],
        ], [
            'name.required' => 'اسم الموظف مطلوب.',
            'email.required' => 'البريد الإلكتروني مطلوب.',
            'email.email' => 'صيغة البريد الإلكتروني غير صحيحة.',
            'email.unique' => 'البريد الإلكتروني مسجل بالفعل لموظف آخر.',
            'password.min' => 'يجب ألا تقل كلمة المرور عن 6 أحرف.',
            'role.required' => 'الدور / الصلاحية مطلوبة.',
            'role.in' => 'لا يمكن ترقية أي موظف إلى صلاحية المدير. الأدوار المتاحة هي: كاشير، مطبخ، أو توصيل فقط.',
        ]);

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
        ];

        if (! empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        // تحديث أو إنشاء سجل السائق عند تعديل بيانات الموظف
        if ($user->role === 'delivery') {
            $driver = DeliveryDriver::where('user_id', $user->id)->first();
            if ($driver) {
                $driver->update(['name' => $user->name]);
            } else {
                DeliveryDriver::create([
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'phone' => '010' . str_pad((string) $user->id, 8, '0', STR_PAD_LEFT),
                    'vehicle_type' => 'motorcycle',
                    'status' => 'available',
                    'is_active' => true,
                ]);
            }
        }

        return $this->successResponse($user, 'تم تحديث بيانات الموظف بنجاح.');
    }

    /**
     * Remove the specified staff user.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        // حماية حساب المدير العام من الحذف نهائياً
        if ($user->isAdmin() || $user->role === 'admin') {
            return $this->errorResponse('حساب المدير العام محمي بالكامل ولا يمكن حذفه نهائياً من النظام.', null, Response::HTTP_FORBIDDEN);
        }

        $currentUser = $request->user();

        // Cannot delete oneself
        if ($currentUser && $currentUser->id === $user->id) {
            return $this->errorResponse('لا يمكنك حذف حسابك الشخصي الحالي أثناء تسجيل الدخول به.', null, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($user->role === 'delivery') {
            DeliveryDriver::where('user_id', $user->id)->delete();
        }

        $user->tokens()->delete();
        $user->delete();

        return $this->successResponse(null, 'تم حذف الموظف بنجاح.');
    }
}
