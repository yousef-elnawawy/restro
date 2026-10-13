<?php

namespace App\Http\Controllers\Api\Categories;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class CategoryController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of categories.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Category::query();

        // Search by name or description
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by status (active / inactive)
        $status = $request->query('status');
        if ($status === 'active') {
            $query->active();
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $categories = $query->ordered()->get();

        return $this->successResponse($categories, 'تم جلب الأقسام بنجاح.');
    }

    /**
     * Store a newly created category in storage.
     */
    public function store(Request $request): JsonResponse
    {
        if ($request->has('slug')) {
            $cleaned = trim((string) $request->input('slug'), " -\t\n\r\0\x0B");
            if (empty($cleaned)) {
                $request->merge(['slug' => null]);
            }
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'string', 'max:120', 'unique:categories,slug'],
            'description' => ['nullable', 'string', 'max:1000'],
            'image' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ], [
            'name.required' => 'اسم القسم مطلوب.',
            'name.max' => 'اسم القسم يجب ألا يتجاوز 100 حرف.',
            'slug.unique' => 'الاسم اللطيف (Slug) مستخدم بالفعل.',
        ]);

        if (empty($validated['slug'])) {
            $baseSlug = Str::slug($validated['name']);
            if (empty($baseSlug)) {
                // In case of non-latin characters where Str::slug might be empty
                $baseSlug = 'category-' . Str::random(6);
            }
            $slug = $baseSlug;
            $counter = 1;
            while (Category::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        if (!isset($validated['sort_order'])) {
            $maxOrder = Category::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        }

        $category = Category::create($validated);

        return $this->successResponse($category, 'تمت إضافة القسم بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified category.
     */
    public function show(int $id): JsonResponse
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->errorResponse('القسم غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        return $this->successResponse($category, 'تم جلب تفاصيل القسم.');
    }

    /**
     * Update the specified category in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->errorResponse('القسم غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        if ($request->has('slug')) {
            $cleaned = trim((string) $request->input('slug'), " -\t\n\r\0\x0B");
            if (empty($cleaned)) {
                $request->merge(['slug' => null]);
            }
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120', "unique:categories,slug,{$id}"],
            'description' => ['nullable', 'string', 'max:1000'],
            'image' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ], [
            'name.required' => 'اسم القسم مطلوب.',
            'slug.unique' => 'الاسم اللطيف (Slug) مستخدم بالفعل.',
        ]);

        if (isset($validated['name']) && empty($validated['slug']) && empty($category->slug)) {
            $baseSlug = Str::slug($validated['name']) ?: ('category-' . Str::random(6));
            $slug = $baseSlug;
            $counter = 1;
            while (Category::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        $category->update($validated);

        return $this->successResponse($category, 'تم تحديث بيانات القسم بنجاح.');
    }

    /**
     * Remove the specified category from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->errorResponse('القسم غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        $category->delete();

        return $this->successResponse(null, 'تم حذف القسم بنجاح.');
    }

    /**
     * Toggle the active status of the specified category.
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->errorResponse('القسم غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        $category->is_active = ! $category->is_active;
        $category->save();

        $statusText = $category->is_active ? 'تفعيل' : 'تعطيل';

        return $this->successResponse($category, "تم {$statusText} القسم بنجاح.");
    }
}
