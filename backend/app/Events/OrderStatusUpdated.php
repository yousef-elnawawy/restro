<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order,
        public string $previousStatus = '',
        public string $message = ''
    ) {
        $this->order->loadMissing(['items.product', 'table', 'customer', 'deliveryDriver']);

        if (empty($this->message)) {
            $statusLabels = [
                'pending' => 'معلق / بانتظار التأكيد',
                'preparing' => 'قيد التحضير في المطبخ',
                'ready' => 'جاهز للتسليم الآن!',
                'delivered' => 'تم التسليم بنجاح',
                'cancelled' => 'تم إلغاء الطلب',
            ];
            $label = $statusLabels[$this->order->status] ?? $this->order->status;
            $this->message = "تم تحديث حالة الطلب #{$this->order->order_number} إلى: {$label}";
        }
    }

    /**
     * The channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('kitchen-orders'),
            new Channel('cashier-orders'),
            new Channel('orders'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'order' => $this->order->toArray(),
            'previous_status' => $this->previousStatus,
            'status' => $this->order->status,
            'is_ready' => $this->order->status === 'ready',
            'message' => $this->message,
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
