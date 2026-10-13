<?php

namespace App\Http\Controllers\Api\DeliveryDrivers;

use App\Http\Controllers\Controller;
use App\Models\DeliveryDriver;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DeliveryDriverController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of delivery drivers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DeliveryDriver::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('license_plate', 'like', "%{$search}%");
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
        ], [
            'name.required' => 'اسم مندوب التوصيل مطلوب.',
            'phone.required' => 'رقم الهاتف مطلوب.',
            'phone.unique' => 'رقم الهاتف مسجل بالفعل لمندوب آخر.',
            'vehicle_type.required' => 'نوع وسيلة التوصيل مطلوب.',
        ]);

        $driver = DeliveryDriver::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'vehicle_type' => $validated['vehicle_type'],
            'license_plate' => $validated['license_plate'] ?? null,
            'status' => $validated['status'] ?? 'available',
            'is_active' => $validated['is_active'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        return $this->successResponse($driver, 'تم إضافة مندوب التوصيل بنجاح.', Response::HTTP_CREATED);
    }

    /**
     * Display the specified delivery driver.
     */
    public function show(DeliveryDriver $deliveryDriver): JsonResponse
    {
        $deliveryDriver->load(['orders' => function ($q) {
            $q->orderBy('created_at', 'desc')->limit(10);
        }]);

        return $this->successResponse($deliveryDriver, 'تم جلب بيانات المندوب بنجاح.');
    }

    /**
     * Update the specified delivery driver.
     */
    public function update(Request $request, DeliveryDriver $deliveryDriver): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30', 'unique:delivery_drivers,phone,' . $deliveryDriver->id],
            'vehicle_type' => ['required', 'in:motorcycle,car,bicycle,scooter'],
            'license_plate' => ['nullable', 'string', 'max:30'],
            'status' => ['nullable', 'in:available,on_delivery,off_duty'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'name.required' => 'اسم مندوب التوصيل مطلوب.',
            'phone.required' => 'رقم الهاتف مطلوب.',
            'phone.unique' => 'رقم الهاتف مسجل بالفعل لمندوب آخر.',
            'vehicle_type.required' => 'نوع وسيلة التوصيل مطلوب.',
        ]);

        $deliveryDriver->update($validated);

        return $this->successResponse($deliveryDriver, 'تم تحديث بيانات المندوب بنجاح.');
    }

    /**
     * Remove the specified delivery driver.
     */
    public function destroy(DeliveryDriver $deliveryDriver): JsonResponse
    {
        $deliveryDriver->delete();

        return $this->successResponse(null, 'تم حذف مندوب التوصيل بنجاح.');
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
