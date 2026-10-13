<?php

namespace App\Http\Controllers\Api\Modifiers;

use App\Http\Controllers\Controller;
use App\Models\Modifier;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ModifierController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of modifiers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Modifier::query();

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $status = $request->query('status');
        if ($status === 'active') {
            $query->active();
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $modifiers = $query->latest('id')->get();

        return $this->successResponse($modifiers, 'تم جلب الإضافات والخيارات بنجاح.');
    }

    /**
     * Store a newly created modifier in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ], [
            'name.required' => 'اسم الإضافة مطلوب.',
            'price.required' => 'سعر الإضافة مطلوب.',
            'price.numeric' => 'يجب أن يكون السعر رقماً.',
        ]);

        $modifier = Modifier::create($validated);

        return $this->successResponse($modifier, 'تمت إضافة الخيار بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified modifier.
     */
    public function show(int $id): JsonResponse
    {
        $modifier = Modifier::find($id);

        if (! $modifier) {
            return $this->errorResponse('الخيار غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        return $this->successResponse($modifier, 'تم جلب تفاصيل الخيار.');
    }

    /**
     * Update the specified modifier in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $modifier = Modifier::find($id);

        if (! $modifier) {
            return $this->errorResponse('الخيار غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ], [
            'name.required' => 'اسم الإضافة مطلوب.',
            'price.numeric' => 'يجب أن يكون السعر رقماً.',
        ]);

        $modifier->update($validated);

        return $this->successResponse($modifier, 'تم تحديث بيانات الخيار بنجاح.');
    }

    /**
     * Remove the specified modifier from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        $modifier = Modifier::find($id);

        if (! $modifier) {
            return $this->errorResponse('الخيار غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        $modifier->delete();

        return $this->successResponse(null, 'تم حذف الخيار بنجاح.');
    }

    /**
     * Toggle the active status of the specified modifier.
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $modifier = Modifier::find($id);

        if (! $modifier) {
            return $this->errorResponse('الخيار غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        $modifier->is_active = ! $modifier->is_active;
        $modifier->save();

        $statusText = $modifier->is_active ? 'تفعيل' : 'تعطيل';

        return $this->successResponse($modifier, "تم {$statusText} الخيار بنجاح.");
    }
}
