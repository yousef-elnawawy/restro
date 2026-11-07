<?php

namespace App\Http\Controllers\Api\Tables;

use App\Http\Controllers\Controller;
use App\Models\RestaurantTable;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class TableController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of tables.
     */
    public function index(Request $request): JsonResponse
    {
        $query = RestaurantTable::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            if (in_array($status, ['available', 'occupied', 'reserved'])) {
                $query->where('status', $status);
            }
        }

        if ($location = $request->query('location')) {
            if ($location !== 'all') {
                $query->where('location', $location);
            }
        }

        $activeStatus = $request->query('active_status');
        if ($activeStatus === 'active') {
            $query->active();
        } elseif ($activeStatus === 'inactive') {
            $query->where('is_active', false);
        }

        $tables = $query->with(['currentOrder.items'])->orderBy('name', 'asc')->get();

        return $this->successResponse($tables, 'تم جلب الطاولات بنجاح.');
    }

    /**
     * Store a newly created table in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'location' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:available,occupied,reserved'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'name.required' => 'اسم أو رقم الطاولة مطلوب.',
            'capacity.required' => 'سعة الطاولة بالأشخاص مطلوبة.',
            'capacity.integer' => 'يجب أن تكون السعة رقماً صحيحاً.',
            'capacity.min' => 'يجب أن تسع الطاولة شخصاً واحداً على الأقل.',
        ]);

        if (! isset($validated['status'])) {
            $validated['status'] = 'available';
        }

        $table = RestaurantTable::create($validated);
        $table->load(['currentOrder.items']);

        return $this->successResponse($table, 'تمت إضافة الطاولة بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified table.
     */
    public function show(int $id): JsonResponse
    {
        $table = RestaurantTable::with(['currentOrder.items'])->find($id);

        if (! $table) {
            return $this->errorResponse('الطاولة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        return $this->successResponse($table, 'تم جلب تفاصيل الطاولة.');
    }

    /**
     * Get the active order for the specified table.
     */
    public function activeOrder(int $id): JsonResponse
    {
        $table = RestaurantTable::find($id);

        if (! $table) {
            return $this->errorResponse('الطاولة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        $order = $table->currentOrder()->with(['items', 'table', 'customer'])->first();

        if (! $order) {
            return $this->errorResponse('لا يوجد طلب نشط حالياً على هذه الطاولة.', null, Response::HTTP_NOT_FOUND);
        }

        return $this->successResponse($order, 'تم جلب تفاصيل الطلب الحالي على الطاولة.');
    }

    /**
     * Update the specified table in storage.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $table = RestaurantTable::find($id);

        if (! $table) {
            return $this->errorResponse('الطاولة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'capacity' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
            'location' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:available,occupied,reserved'],
            'is_active' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'name.required' => 'اسم أو رقم الطاولة مطلوب.',
            'capacity.required' => 'سعة الطاولة مطلوبة.',
        ]);

        $table->update($validated);

        return $this->successResponse($table, 'تم تحديث بيانات الطاولة بنجاح.');
    }

    /**
     * Remove the specified table from storage.
     */
    public function destroy(int $id): JsonResponse
    {
        $table = RestaurantTable::find($id);

        if (! $table) {
            return $this->errorResponse('الطاولة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        $table->delete();

        return $this->successResponse(null, 'تم حذف الطاولة بنجاح.');
    }

    /**
     * Update the occupancy/reservation status of the specified table.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $table = RestaurantTable::find($id);

        if (! $table) {
            return $this->errorResponse('الطاولة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:available,occupied,reserved'],
        ]);

        $table->status = $validated['status'];
        $table->save();

        $statusLabels = [
            'available' => 'متاحة',
            'occupied' => 'مشغولة',
            'reserved' => 'محجوزة',
        ];

        return $this->successResponse($table, "تم تغيير حالة الطاولة إلى {$statusLabels[$table->status]}.");
    }

    /**
     * Toggle the active status of the specified table.
     */
    public function toggleActive(int $id): JsonResponse
    {
        $table = RestaurantTable::find($id);

        if (! $table) {
            return $this->errorResponse('الطاولة غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        $table->is_active = ! $table->is_active;
        $table->save();

        $statusText = $table->is_active ? 'تفعيل' : 'تعطيل';

        return $this->successResponse($table, "تم {$statusText} الطاولة بنجاح.");
    }

    /**
     * Transfer the active order from this table to another available table.
     */
    public function transferOrder(Request $request, int $id): JsonResponse
    {
        $sourceTable = RestaurantTable::find($id);

        if (! $sourceTable) {
            return $this->errorResponse('طاولة المصدر غير موجودة.', null, Response::HTTP_NOT_FOUND);
        }

        $order = $sourceTable->currentOrder;
        if (! $order) {
            return $this->errorResponse('لا يوجد طلب نشط لنقله من هذه الطاولة.');
        }

        $validated = $request->validate([
            'target_table_id' => ['required', 'integer', 'exists:restaurant_tables,id', 'different:'.$id],
        ], [
            'target_table_id.required' => 'يرجى اختيار الطاولة الهدف.',
            'target_table_id.different' => 'لا يمكن نقل الطلب إلى نفس الطاولة.',
            'target_table_id.exists' => 'الطاولة المختارة غير موجودة.',
        ]);

        $targetTable = RestaurantTable::find($validated['target_table_id']);

        if (! $targetTable->is_active) {
            return $this->errorResponse('الطاولة المختارة غير مفعلة.');
        }

        if ($targetTable->status === 'occupied' && $targetTable->currentOrder) {
            return $this->errorResponse("الطاولة {$targetTable->name} مشغولة بالفعل بطلب نشط.");
        }

        DB::transaction(function () use ($order, $sourceTable, $targetTable) {
            $order->update(['table_id' => $targetTable->id]);
            $sourceTable->update(['status' => 'available']);
            $targetTable->update(['status' => 'occupied']);
        });

        return $this->successResponse([
            'order' => $order->fresh(['table', 'items']),
            'source_table' => $sourceTable->fresh(),
            'target_table' => $targetTable->fresh(),
        ], "تم نقل الطلب بنجاح من {$sourceTable->name} إلى {$targetTable->name}.");
    }
}
