'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, formatNotificationTime } from '@/hooks/use-notifications';
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

export function CustomerNotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousUnread = useRef(0);

  const openTarget = (n: { orderId?: string; reservationId?: string; type?: string; title?: string }) => {
    if (n.orderId) router.push(`/orders?orderId=${n.orderId}`);
    else if (n.type === 'reservation' || n.reservationId) router.push('/reservations');
  };

  const { user, notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications({
    toastAction: (n) =>
      n.orderId
        ? { label: 'View Order', onClick: () => openTarget(n) }
        : n.type === 'reservation' || n.reservationId
        ? { label: 'View Reservation', onClick: () => openTarget(n) }
        : undefined,
  });

  useEffect(() => {
    if (unreadCount > previousUnread.current) {
      setIsRinging(true);
      const t = window.setTimeout(() => setIsRinging(false), 2000);
      previousUnread.current = unreadCount;
      return () => window.clearTimeout(t);
    }
    previousUnread.current = unreadCount;
  }, [unreadCount]);

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

  // The bell is the customer's panel; staff use the dashboard header instead
  if (!user || user.role !== 'customer') return null;

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
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-[100]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-accent/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Notifications</span>
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
                  Order and reservation updates will appear here
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
                      markRead(notif.id);
                      openTarget(notif);
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
                        {formatNotificationTime(notif)}
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
                  router.push('/orders');
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
