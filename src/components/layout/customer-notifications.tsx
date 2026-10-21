'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { getStoredUser } from '@/lib/auth';
import { toast } from 'sonner';
import {
  Bell,
  ChefHat,
  CheckCircle2,
  Bike,
  Home,
  UtensilsCrossed,
  Package,
  X,
  Clock,
  CheckCheck,
  Calendar,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  orderId?: string;
  reservationId?: string;
  time: string;
  read: boolean;
}

const STATUS_ICONS: Record<string, any> = {
  preparing: ChefHat,
  ready: CheckCircle2,
  served: UtensilsCrossed,
  out_for_delivery: Bike,
  delivered: Home,
  completed: CheckCircle2,
  confirmed: CheckCircle2,
  declined: XCircle,
  reservation: Calendar,
  default: Package,
};

const STATUS_COLORS: Record<string, string> = {
  preparing: 'text-orange-500 bg-orange-500/10',
  ready: 'text-emerald-500 bg-emerald-500/10',
  served: 'text-blue-500 bg-blue-500/10',
  out_for_delivery: 'text-indigo-500 bg-indigo-500/10',
  delivered: 'text-green-600 bg-green-600/10',
  completed: 'text-emerald-600 bg-emerald-600/10',
  confirmed: 'text-emerald-600 bg-emerald-600/10',
  declined: 'text-rose-600 bg-rose-600/10',
  reservation: 'text-purple-500 bg-purple-500/10',
  default: 'text-primary bg-primary/10',
};

const NOTIFS_STORAGE_KEY = 'rms_customer_notifications';

export function CustomerNotificationBell() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    // Hydrate from localStorage
    try {
      const saved = localStorage.getItem(NOTIFS_STORAGE_KEY);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch {}

    const user = getStoredUser();
    if (!user) {
      setIsCustomer(false);
      return;
    }
    setIsCustomer(true);

    const socket = getSocket();
    if (!socket) return;

    const joinRooms = () => {
      socket.emit('join_role_room', 'customer');
      if (user?.role) socket.emit('join_role_room', user.role);
    };

    if (socket.connected) {
      joinRooms();
    }
    socket.on('connect', joinRooms);

    // Listen for real-time notifications from kitchen state changes
    const handleNotification = (data: any) => {
      const notif: CustomerNotification = {
        id: data.id || `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: data.title || 'Order Update',
        message: data.message || '',
        type: data.type || 'order',
        orderId: data.orderId,
        time: data.time || 'Just now',
        read: false,
      };

      setNotifications((prev) => [notif, ...prev.slice(0, 19)]);

      const statusKey = extractStatus(data.title || data.message);

      toast(data.title || 'Order Update', {
        description: data.message,
        duration: 6000,
        icon: getStatusEmoji(statusKey),
        action: data.orderId
          ? {
              label: 'View Order',
              onClick: () => {
                window.location.href = `/orders?orderId=${data.orderId}`;
              },
            }
          : undefined,
      });
    };

    // Listen for customer-specific order updates
    const handleCustomerUpdate = (data: any) => {
      const statusKey = data.status || extractStatus(data.title || data.message || '');
      toast(data.title || `Order ${statusKey}`, {
        description: data.message || `Your order status changed to ${statusKey}`,
        duration: 5000,
        icon: getStatusEmoji(statusKey),
      });
    };

    // Listen for general order updates broadcasted from kitchen
    const handleOrderUpdated = (order: any) => {
      if (!order) return;
      const status = order.status;
      const orderNum =
        order.orderNumber || (order._id || order.id || '').slice(-6).toUpperCase();

      let title = 'Order Update';
      let message = `Order #${orderNum} status is now ${status}`;

      if (status === 'preparing') {
        title = '🍳 Kitchen Started Preparing';
        message = `Chef started preparing your Order #${orderNum}!`;
      } else if (status === 'ready') {
        title =
          order.orderType === 'takeaway'
            ? '🥡 Food Ready for Pickup!'
            : '🍽️ Food Ready!';
        message =
          order.orderType === 'takeaway'
            ? `Your takeaway Order #${orderNum} is ready! Please collect your food at the counter.`
            : `Order #${orderNum} is hot & ready!`;
      } else if (status === 'served') {
        title = '🍽️ Food Served to Table';
        message = `Order #${orderNum} has been served. Enjoy your meal!`;
      } else if (status === 'completed') {
        title = '✅ Order Handover Completed';
        message = `Order #${orderNum} was picked up. Thank you!`;
      } else if (status === 'out_for_delivery') {
        title = '🛵 Order Out for Delivery';
        message = `Rider has picked up Order #${orderNum} and is on the way!`;
      } else if (status === 'delivered') {
        title = '🏠 Order Delivered';
        message = `Order #${orderNum} has been delivered. Enjoy!`;
      }

      handleNotification({
        id: `update-${order._id || order.id}-${status}-${Date.now()}`,
        title,
        message,
        type: 'order',
        orderId: order._id || order.id,
        time: 'Just now',
      });
    };

    // Listen for reservation status updates from waiter (accepted / declined)
    const handleReservationStatusUpdate = (data: any) => {
      if (!data) return;
      const { reservation, notification } = data;
      const isConfirmed = reservation?.status === 'confirmed';
      const isCancelled = reservation?.status === 'cancelled';

      const notifTitle =
        notification?.title ||
        (isConfirmed
          ? '🎉 Reservation Accepted!'
          : isCancelled
          ? '❌ Reservation Declined'
          : '📅 Reservation Update');

      const notifMessage =
        notification?.message ||
        `Table T${reservation?.tableNumber || ''} reservation status: ${reservation?.status}`;

      handleNotification({
        id: notification?.id || `res-${Date.now()}`,
        title: notifTitle,
        message: notifMessage,
        type: 'reservation',
        reservationId: reservation?._id || reservation?.id,
        time: 'Just now',
      });
    };

    socket.on('notification', handleNotification);
    socket.on('order:customer_update', handleCustomerUpdate);
    socket.on('order:updated', handleOrderUpdated);
    socket.on('reservation:status_update', handleReservationStatusUpdate);

    return () => {
      socket.off('connect', joinRooms);
      socket.off('notification', handleNotification);
      socket.off('order:customer_update', handleCustomerUpdate);
      socket.off('order:updated', handleOrderUpdated);
      socket.off('reservation:status_update', handleReservationStatusUpdate);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    try {
      localStorage.removeItem(NOTIFS_STORAGE_KEY);
    } catch {}
    setOpen(false);
  };

  if (!isCustomer) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setOpen((o) => !o);
        }}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full bg-accent text-foreground transition-all duration-200 hover:bg-secondary cursor-pointer",
          isRinging && "animate-bell-ring"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white animate-badge-pop shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-[100]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-accent/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Order Notifications</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary animate-badge-pop">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground font-medium">All caught up</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-primary/10"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Order updates from the kitchen will appear here
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const statusKey = extractStatus(notif.title);
                const Icon = STATUS_ICONS[statusKey] || STATUS_ICONS.default;
                const colorClass = STATUS_COLORS[statusKey] || STATUS_COLORS.default;

                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      setNotifications((prev) => {
                        const updated = prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
                        try {
                          localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(updated));
                        } catch {}
                        return updated;
                      });
                      if (notif.orderId) {
                        window.location.href = `/orders?orderId=${notif.orderId}`;
                      }
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors hover:bg-accent/40',
                      !notif.read && 'bg-primary/[0.03]'
                    )}
                  >
                    <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground leading-snug">{notif.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {notif.time}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5 text-center">
              <button
                onClick={() => {
                  window.location.href = '/orders';
                  setOpen(false);
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View All Orders & Live Tracking →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helpers
function extractStatus(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('accept') || lower.includes('confirmed')) return 'confirmed';
  if (lower.includes('decline') || lower.includes('reject') || lower.includes('cancelled')) return 'declined';
  if (lower.includes('reservation')) return 'reservation';
  if (lower.includes('prepar')) return 'preparing';
  if (lower.includes('ready') && !lower.includes('deliver')) return 'ready';
  if (lower.includes('served')) return 'served';
  if (lower.includes('out for delivery') || lower.includes('on the way')) return 'out_for_delivery';
  if (lower.includes('delivered')) return 'delivered';
  if (lower.includes('completed') || lower.includes('handover')) return 'completed';
  return 'default';
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'confirmed':
      return '🎉';
    case 'declined':
      return '❌';
    case 'reservation':
      return '📅';
    case 'preparing':
      return '👨‍🍳';
    case 'ready':
      return '✅';
    case 'served':
      return '🍽️';
    case 'out_for_delivery':
      return '🏍️';
    case 'delivered':
      return '📦';
    case 'completed':
      return '🎉';
    default:
      return '🔔';
  }
}
