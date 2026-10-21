<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    use ApiResponse;

    /**
     * Get restaurant settings.
     */
    public function show(): JsonResponse
    {
        $setting = Setting::instance();
        return $this->successResponse($setting, 'تم جلب إعدادات المطعم بنجاح.');
    }

    /**
     * Update restaurant settings.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'restaurant_name' => ['required', 'string', 'max:150'],
            'restaurant_phone' => ['nullable', 'string', 'max:50'],
            'restaurant_email' => ['nullable', 'email', 'max:150'],
            'restaurant_address' => ['nullable', 'string', 'max:300'],
            'currency' => ['required', 'string', 'max:20'],
            'tax_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'tax_enabled' => ['boolean'],
            'tax_number' => ['nullable', 'string', 'max:100'],
            'delivery_fee' => ['nullable', 'numeric', 'min:0'],
            'delivery_base_fee' => ['nullable', 'numeric', 'min:0'],
            'delivery_fee_per_km' => ['nullable', 'numeric', 'min:0'],
            'receipt_header' => ['nullable', 'string', 'max:500'],
            'receipt_footer' => ['nullable', 'string', 'max:500'],
            'logo' => ['nullable', 'string'],
            'enable_tables' => ['boolean'],
            'enable_delivery' => ['boolean'],
            'enable_takeaway' => ['boolean'],
        ], [
            'restaurant_name.required' => 'اسم المطعم مطلوب.',
            'currency.required' => 'العملة مطلوبة.',
            'tax_percentage.required' => 'نسبة الضريبة مطلوبة.',
        ]);

        $setting = Setting::instance();
        if (isset($validated['delivery_base_fee']) && ! isset($validated['delivery_fee'])) {
            $validated['delivery_fee'] = $validated['delivery_base_fee'];
        } elseif (isset($validated['delivery_fee']) && ! isset($validated['delivery_base_fee'])) {
            $validated['delivery_base_fee'] = $validated['delivery_fee'];
        }
        $setting->update($validated);

        return $this->successResponse($setting, 'تم حفظ إعدادات المطعم بنجاح.');
    }
}
