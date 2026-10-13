<?php

namespace App\Http\Controllers\Api\Products;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProductController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of products.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('category');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($categoryId = $request->query('category_id')) {
            if ($categoryId !== 'all') {
                $query->where('category_id', $categoryId);
            }
        }

        $status = $request->query('status');
        if ($status === 'active') {
            $query->active();
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        // If client specifically requests non-paginated data (e.g. all=true or paginate=false)
        if ($request->boolean('all') || $request->query('paginate') === 'false') {
            $products = $query->latest('id')->get();
            return $this->successResponse($products, 'تم جلب المنتجات بنجاح.');
        }

        $perPage = (int) $request->query('per_page', 12);
        if ($perPage <= 0) {
            $perPage = 12;
        } elseif ($perPage > 100) {
            $perPage = 100;
        }

        $page = (int) $request->query('page', 1);
        if ($page <= 0) {
            $page = 1;
        }

        $paginated = $query->latest('id')->paginate($perPage, ['*'], 'page', $page);

        // Pre-compute filter-aware counts for UI badges/tabs
        $baseCountQuery = Product::query();
        if ($search = $request->query('search')) {
            $baseCountQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        if ($categoryId = $request->query('category_id')) {
            if ($categoryId !== 'all') {
                $baseCountQuery->where('category_id', $categoryId);
            }
        }

        $counts = [
            'total' => (clone $baseCountQuery)->count(),
            'active' => (clone $baseCountQuery)->where('is_active', true)->count(),
            'inactive' => (clone $baseCountQuery)->where('is_active', false)->count(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'تم جلب المنتجات بنجاح.',
            'data' => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
            'counts' => $counts,
        ]);
    }

    /**
     * Store a newly created product in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => ['required', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:150'],
            'price' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            'image' => ['nullable', 'string'],
            'images' => ['nullable', 'array'],
            'has_sizes' => ['nullable', 'boolean'],
            'sizes' => ['nullable', 'array'],
            'modifier_ids' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ], [
            'category_id.required' => 'يرجى اختيار القسم التابع له المنتج.',
            'category_id.exists' => 'القسم المحدد غير موجود.',
            'name.required' => 'اسم المنتج مطلوب.',
            'price.required' => 'سعر المنتج مطلوب.',
            'price.numeric' => 'يجب أن يكون السعر رقماً صحيحاً.',
        ]);

        $product = Product::create($validated);
        $product->load('category');

        return $this->successResponse($product, 'تمت إضافة المنتج بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified product.
     */
    public function show(int $id): JsonResponse
    {
        $product = Product::with('category')->find($id);

        if (! $product) {
            return $this->errorResponse('المنتج غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        return $this->successResponse($product, 'تم جلب تفاصيل المنتج.');
    }

    /**
     * Update the specified product in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $product = Product::find($id);

        if (! $product) {
            return $this->errorResponse('المنتج غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'category_id' => ['sometimes', 'required', 'exists:categories,id'],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            'image' => ['nullable', 'string'],
            'images' => ['nullable', 'array'],
            'has_sizes' => ['nullable', 'boolean'],
            'sizes' => ['nullable', 'array'],
            'modifier_ids' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ], [
            'category_id.exists' => 'القسم المحدد غير موجود.',
            'name.required' => 'اسم المنتج مطلوب.',
            'price.numeric' => 'يجب أن يكون السعر رقماً صحيحاً.',
        ]);

        $product->update($validated);
        $product->load('category');

        return $this->successResponse($product, 'تم تحديث بيانات المنتج بنجاح.');
    }

    /**
     * Remove the specified product from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        $product = Product::find($id);

        if (! $product) {
            return $this->errorResponse('المنتج غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        $product->delete();

        return $this->successResponse(null, 'تم حذف المنتج بنجاح.');
    }

    /**
     * Toggle the active status of the specified product.
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $product = Product::find($id);

        if (! $product) {
            return $this->errorResponse('المنتج غير موجود.', null, Response::HTTP_NOT_FOUND);
        }

        $product->is_active = ! $product->is_active;
        $product->save();

        $statusText = $product->is_active ? 'تفعيل' : 'تعطيل';

        return $this->successResponse($product, "تم {$statusText} المنتج بنجاح.");
    }
}
