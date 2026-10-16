<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    use ApiResponse;

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return $this->errorResponse('غير مسجل دخول أو انتهت صلاحية الجلسة.', null, Response::HTTP_UNAUTHORIZED);
        }

        // Admin always has access to all routes
        if ($user->role === 'admin') {
            return $next($request);
        }

        // Check if user's role is one of the permitted roles
        if (! in_array($user->role, $roles)) {
            $roleNames = [
                'admin' => 'مدير النظام',
                'cashier' => 'الكاشير',
                'kitchen' => 'المطبخ',
                'delivery' => 'مسؤول التوصيل والديليفري',
            ];
            $allowedArabic = array_map(fn($r) => $roleNames[$r] ?? $r, $roles);
            $allowedStr = implode(' أو ', $allowedArabic);

            return $this->errorResponse(
                "ليس لديك صلاحية الوصول إلى هذا القسم. هذا القسم متاح فقط لـ ({$allowedStr}).",
                null,
                Response::HTTP_FORBIDDEN
            );
        }

        return $next($request);
    }
}
