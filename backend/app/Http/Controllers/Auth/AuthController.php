<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Handle admin login request.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $throttleKey = Str::transliterate(Str::lower($request->input('email')).'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return $this->errorResponse(
                "تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة بعد {$seconds} ثانية.",
                ['retry_after' => $seconds],
                Response::HTTP_TOO_MANY_REQUESTS
            );
        }

        $loginInput = trim($request->validated('email'));

        $user = User::where('email', $loginInput)
            ->orWhereHas('deliveryDriver', function ($q) use ($loginInput) {
                $q->where('phone', $loginInput);
            })
            ->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            RateLimiter::hit($throttleKey, 60);

            return $this->errorResponse('البريد الإلكتروني / رقم الهاتف أو كلمة المرور غير صحيحة.', null, Response::HTTP_UNAUTHORIZED);
        }

        $allowedRoles = ['admin', 'cashier', 'kitchen', 'delivery'];
        if (! in_array($user->role, $allowedRoles)) {
            RateLimiter::hit($throttleKey, 60);

            return $this->errorResponse('غير مصرح لك بالوصول إلى لوحة التحكم. حسابك مخصص للزبائن.', null, Response::HTTP_FORBIDDEN);
        }

        RateLimiter::clear($throttleKey);

        // إنشاء توكن دخول صالح لمدة يوم واحد فقط (24 ساعة) ثم تنتهي الجلسة تلقائياً
        $token = $user->createToken(
            'admin-dashboard',
            ['*'],
            now()->addDay()
        )->plainTextToken;

        $driver = $user->isDelivery() ? $user->deliveryDriver : null;

        return $this->successResponse([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'delivery_driver' => $driver,
            ],
        ], 'تم تسجيل الدخول بنجاح');
    }

    /**
     * Handle user logout request.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->successResponse(null, 'تم تسجيل الخروج بنجاح');
    }

    /**
     * Get authenticated admin profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $driver = $user->isDelivery() ? $user->deliveryDriver : null;

        return $this->successResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'delivery_driver' => $driver,
        ], 'تم استرجاع بيانات المستخدم بنجاح');
    }

    /**
     * Update authenticated user profile and/or password.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            "name" => "sometimes|required|string|max:255",
            "email" => "sometimes|required|email|unique:users,email,".$user->id,
            "current_password" => "nullable|required_with:password|string",
            "password" => "nullable|min:6",
        ], [
            "name.required" => "الاسم مطلوب",
            "email.required" => "البريد الإلكتروني مطلوب",
            "email.email" => "صيغة البريد الإلكتروني غير صحيحة",
            "email.unique" => "البريد الإلكتروني مستخدم بالفعل",
            "current_password.required_with" => "يرجى إدخال كلمة المرور الحالية لتغيير كلمة المرور",
            "password.min" => "كلمة المرور يجب أن لا تقل عن 6 أحرف",
        ]);

        if (!empty($validated["current_password"]) && !empty($validated["password"])) {
            if (!Hash::check($validated["current_password"], $user->password)) {
                return $this->errorResponse("كلمة المرور الحالية غير صحيحة.", ["current_password" => ["كلمة المرور الحالية غير صحيحة"]], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $user->password = Hash::make($validated["password"]);
        }

        if (isset($validated["name"])) {
            $user->name = $validated["name"];
        }
        if (isset($validated["email"])) {
            $user->email = $validated["email"];
        }

        $user->save();

        return $this->successResponse([
            "id" => $user->id,
            "name" => $user->name,
            "email" => $user->email,
            "role" => $user->role,
        ], "تم حفظ التعديلات بنجاح");
    }
}
