<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    use ApiResponse;

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            return $this->errorResponse('غير مسجل دخول أو انتهت صلاحية الجلسة.', null, Response::HTTP_UNAUTHORIZED);
        }

        if (! $request->user()->isAdmin()) {
            return $this->errorResponse('ليس لديك صلاحية لتنفيذ هذا الإجراء. هذه العملية مخصصة لمدير النظام فقط.', null, Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
