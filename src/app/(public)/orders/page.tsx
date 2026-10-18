'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ChefHat,
  CheckCircle2,
  Bike,
  Home,
  MapPin,
  Phone,
  Clock,
  ArrowLeft,
  ShoppingBag,
  Loader2,
  AlertCircle,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { getStoredUser, type CurrentUser } from '@/lib/auth';

// Steps for Dine-In Orders (Table Service)
const DINE_IN_STEPS = [
  { key: 'new', label: 'Order Placed', icon: Package },
  { key: 'preparing', label: 'In Kitchen', icon: ChefHat },
  { key: 'ready', label: 'Food Ready', icon: CheckCircle2 },
  { key: 'served', label: 'Served to Table', icon: UtensilsCrossed },
];

// Steps for Delivery Orders
const DELIVERY_STEPS = [
  { key: 'new', label: 'Order Placed', icon: Package },
  { key: 'preparing', label: 'In Kitchen', icon: ChefHat },
  { key: 'ready', label: 'Food Ready', icon: CheckCircle2 },
  { key: 'out_for_delivery', label: 'On the Way', icon: Bike },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

// Steps for Takeaway Orders
const TAKEAWAY_STEPS = [
  { key: 'new', label: 'Order Placed', icon: Package },
  { key: 'preparing', label: 'In Kitchen', icon: ChefHat },
  { key: 'ready', label: 'Ready for Pickup', icon: CheckCircle2 },
  { key: 'completed', label: 'Picked Up', icon: Home },
];

function getStepsForOrder(orderType?: string) {
  if (orderType === 'dine-in') return DINE_IN_STEPS;
  if (orderType === 'takeaway') return TAKEAWAY_STEPS;
  return DELIVERY_STEPS;
}

function getStepIndex(status?: string, orderType?: string): number {
  if (orderType === 'dine-in') {
    switch (status) {
      case 'new':
      case 'confirmed':
        return 0;
      case 'preparing':
        return 1;
      case 'ready':
        return 2;
      case 'served':
      case 'completed':
        return 3;
      default:
        return 0;
    }
  }

  if (orderType === 'takeaway') {
    switch (status) {
      case 'new':
      case 'confirmed':
        return 0;
      case 'preparing':
        return 1;
      case 'ready':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0;
    }
  }

  // Delivery
  switch (status) {
    case 'new':
    case 'confirmed':
      return 0;
    case 'preparing':
      return 1;
    case 'ready':
    case 'assigned':
    case 'picked_up':
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'delivered':
    case 'completed':
      return 4;
    default:
      return 0;
  }
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  preparing: { label: 'Cooking in Kitchen', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  ready: { label: 'Food Ready', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  served: { label: 'Served', className: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/30' },
  assigned: { label: 'Rider Assigned', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  picked_up: { label: 'Picked Up', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  out_for_delivery: { label: 'Out for Delivery', className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' },
  delivered: { label: 'Delivered', className: 'bg-green-600/10 text-green-700 border-green-600/30' },
  completed: { label: 'Completed', className: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/30' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedOrderIdParam = searchParams.get('orderId');

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPickup, setUpdatingPickup] = useState(false);
  const ordersRef = useRef<any[]>([]);
  ordersRef.current = orders;

  const handleConfirmPickup = async (order: any) => {
    const orderId = order._id || order.id;
    setUpdatingPickup(true);
    try {
      await api.updateOrderStatus(orderId, 'completed', 'Takeaway food picked up by customer');
      toast.success('Food picked up successfully! Enjoy your meal 🍽️');
      setSelectedOrder((prev: any) => (prev ? { ...prev, status: 'completed' } : null));
      setOrders((prev) =>
        prev.map((o) => ((o._id || o.id) === orderId ? { ...o, status: 'completed' } : o))
      );
      const stored = getStoredUser();
      if (stored) {
        fetchOrders(stored, orderId);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm pickup');
    } finally {
      setUpdatingPickup(false);
    }
  };

  const fetchOrders = async (activeUser: CurrentUser, autoSelectId?: string | null) => {
    try {
      const data = await api.getOrders({ email: activeUser.email });
      const list = Array.isArray(data) ? data : [];
      setOrders(list);

      const targetId = autoSelectId || selectedOrderIdParam;
      if (targetId && list.length > 0) {
        const matched = list.find(
          (o: any) =>
            o._id === targetId ||
            o.id === targetId ||
            o.orderNumber === targetId ||
            o.orderNumber === `#${targetId}`
        );
        setSelectedOrder(matched || list[0]);
      } else if (list.length > 0) {
        setSelectedOrder(list[0]);
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Error fetching customer orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace('/login?redirect=/orders');
      return;
    }
    setUser(stored);
    fetchOrders(stored, selectedOrderIdParam);

    // Real-time socket updates for customer orders
    const socket = getSocket();
    if (socket) {
      const joinRooms = () => {
        socket.emit('join_role_room', 'customer');
      };

      if (socket.connected) {
        joinRooms();
      }
      socket.on('connect', joinRooms);

      const handleOrderUpdate = (updatedOrder: any) => {
        if (!updatedOrder) return;
        const orderId = updatedOrder._id || updatedOrder.id;
        const status = updatedOrder.status;
        const orderNum = updatedOrder.orderNumber || (orderId || '').slice(-6).toUpperCase();

        // Check if this updated order is in customer's order list
        const isCustomerOrder =
          ordersRef.current.some((o) => (o._id || o.id) === orderId) ||
          (stored?.email && updatedOrder.customerEmail === stored.email);

        if (isCustomerOrder) {
          if (status === 'preparing') {
            toast.info(`🍳 Kitchen Preparing Order #${orderNum}`, {
              description: 'The kitchen chef has started preparing your food.',
              duration: 6000,
            });
          } else if (status === 'ready') {
            toast.success(
              updatedOrder.orderType === 'takeaway'
                ? `🥡 Order #${orderNum} is Ready for Pickup!`
                : `🍽️ Order #${orderNum} is Ready!`,
              {
                description:
                  updatedOrder.orderType === 'takeaway'
                    ? 'Your takeaway food is ready! Collect your meal at the counter and click "Pick Up Food".'
                    : 'Your food is hot and ready!',
                duration: 7000,
              }
            );
          } else if (status === 'served') {
            toast.success(`🍽️ Order #${orderNum} Served`, {
              description: 'Your food has been served to your table. Enjoy your meal!',
              duration: 6000,
            });
          } else if (status === 'completed') {
            toast.success(`✅ Order #${orderNum} Picked Up`, {
              description: 'Takeaway food handover completed. Enjoy your meal!',
              duration: 6000,
            });
          } else if (status === 'out_for_delivery') {
            toast.info(`🛵 Order #${orderNum} Out for Delivery`, {
              description: 'The delivery rider has picked up your food and is on the way.',
              duration: 6000,
            });
          } else if (status === 'delivered') {
            toast.success(`🏠 Order #${orderNum} Delivered`, {
              description: 'Your order has been delivered. Enjoy your meal!',
              duration: 6000,
            });
          }
        }

        setOrders((prev) =>
          prev.map((o) =>
            (o._id || o.id) === orderId ? { ...o, ...updatedOrder } : o
          )
        );
        setSelectedOrder((prev: any) => {
          if (!prev) return null;
          if ((prev._id || prev.id) === orderId) {
            return { ...prev, ...updatedOrder };
          }
          return prev;
        });
      };

      // Listen for order updates with toast notifications for status changes
      const handleCustomerUpdate = (data: any) => {
        if (data._id || data.id) {
          handleOrderUpdate(data);
        }
        fetchOrders(stored, selectedOrderIdParam);
      };

      socket.on('order:updated', handleOrderUpdate);
      socket.on('order:status-change', handleOrderUpdate);
      socket.on('order:customer_update', handleCustomerUpdate);

      return () => {
        socket.off('connect', joinRooms);
        socket.off('order:updated', handleOrderUpdate);
        socket.off('order:status-change', handleOrderUpdate);
        socket.off('order:customer_update', handleCustomerUpdate);
      };
    }
  }, [router, selectedOrderIdParam]);

  const handleManualRefresh = () => {
    if (!user) return;
    setRefreshing(true);
    fetchOrders(user, selectedOrder?._id || selectedOrder?.id);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your orders & live status...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold">No Active or Past Orders</h1>
        <p className="mt-2 text-muted-foreground">
          You haven&apos;t placed any orders yet. Once you order food, live tracking and preparation updates will show here.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/menu">
            <Button className="gap-2">
              <UtensilsCrossed className="h-4 w-4" /> Browse Menu
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline">My Profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(selectedOrder?.status, selectedOrder?.orderType);
  const statusBadge = STATUS_BADGES[selectedOrder?.status] || {
    label: selectedOrder?.status || 'Pending',
    className: 'bg-muted text-foreground border-border',
  };

  return (
    <div className="min-h-screen bg-background pb-12 pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Live Order Tracking
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              My Orders & Live Status
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="/menu">
              <Button size="sm" className="gap-1.5">
                <UtensilsCrossed className="h-4 w-4" /> Order More
              </Button>
            </Link>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Orders List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-foreground">
                Your Orders ({orders.length})
              </span>
              <span className="text-xs text-muted-foreground">Select an order to track</span>
            </div>

            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {orders.map((o) => {
                const isSelected = (selectedOrder?._id || selectedOrder?.id) === (o._id || o.id);
                const orderBadge = STATUS_BADGES[o.status] || {
                  label: o.status,
                  className: 'bg-muted text-foreground',
                };
                const dateStr = o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString('en-BD', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';
                const total = o.total || o.totalAmount || 0;

                return (
                  <button
                    key={o._id || o.id}
                    onClick={() => setSelectedOrder(o)}
                    className={cn(
                      'w-full text-left rounded-xl border p-4 transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/30'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          Order {o.orderNumber?.startsWith('#') ? o.orderNumber : `#${o.orderNumber || (o._id || o.id || '').slice(-6).toUpperCase()}`}
                        </span>
                        <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          {o.orderType || 'delivery'}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          orderBadge.className
                        )}
                      >
                        {orderBadge.label}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                      {o.items?.map((it: any) => `${it.name} × ${it.quantity}`).join(', ') || 'No item details'}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">{dateStr}</span>
                      <span className="font-bold text-foreground">৳{total.toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Order Live Tracking Details */}
          <div className="lg:col-span-7">
            {selectedOrder ? (
              <div className="space-y-6">
                {/* Status Hero Card */}
                <Card className="border-border shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/15 via-orange-500/10 to-transparent p-6 border-b border-border">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold font-display text-foreground">
                            Order {selectedOrder.orderNumber?.startsWith('#') ? selectedOrder.orderNumber : `#${selectedOrder.orderNumber || (selectedOrder._id || selectedOrder.id || '').slice(-6).toUpperCase()}`}
                          </h2>
                          <Badge variant="outline" className="capitalize">
                            {selectedOrder.orderType || 'delivery'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Placed on{' '}
                          {selectedOrder.createdAt
                            ? new Date(selectedOrder.createdAt).toLocaleString('en-BD', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : 'Just now'}
                        </p>
                      </div>

                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold shadow-sm',
                          statusBadge.className
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Multi-step progress tracker */}
                  <CardContent className="p-6">
                    {(() => {
                      const activeSteps = getStepsForOrder(selectedOrder.orderType);
                      return (
                        <div className="mb-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                            Order Progress ({selectedOrder.orderType === 'dine-in' ? 'Table Service' : selectedOrder.orderType})
                          </p>
                          <div className="flex justify-between items-start">
                            {activeSteps.map((step, idx) => {
                              const Icon = step.icon;
                              // A step is done if:
                              // - its index is before the current step, OR
                              // - it IS the final terminal step (e.g. 'served' for dine-in, 'delivered' for delivery, 'completed') AND the order has reached that status!
                              const isOrderFinished =
                                (selectedOrder.orderType === 'dine-in' && (selectedOrder.status === 'served' || selectedOrder.status === 'completed')) ||
                                (selectedOrder.orderType === 'delivery' && (selectedOrder.status === 'delivered' || selectedOrder.status === 'completed')) ||
                                (selectedOrder.orderType === 'takeaway' && selectedOrder.status === 'completed');

                              const isDone = idx < currentStep || (idx === currentStep && isOrderFinished);
                              const isCurrent = idx === currentStep && !isOrderFinished;

                              return (
                                <div key={step.key} className="relative flex flex-1 flex-col items-center">
                                  {idx < activeSteps.length - 1 && (
                                    <div
                                      className={cn(
                                        'absolute left-1/2 top-5 h-1 w-full -translate-y-1/2 transition-colors',
                                        idx < currentStep || (idx === currentStep - 1 && isOrderFinished)
                                          ? 'bg-emerald-500'
                                          : 'bg-border'
                                      )}
                                    />
                                  )}
                                  <div
                                    className={cn(
                                      'relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 transition-all shadow-sm',
                                      isDone
                                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/20'
                                        : isCurrent
                                        ? 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/20 scale-105 shadow-primary/25'
                                        : 'border-border bg-card text-muted-foreground'
                                    )}
                                  >
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <p
                                    className={cn(
                                      'mt-2 text-center text-[11px] sm:text-xs font-medium',
                                      isDone
                                        ? 'text-emerald-600 font-semibold'
                                        : isCurrent
                                        ? 'text-primary font-bold'
                                        : 'text-muted-foreground'
                                    )}
                                  >
                                    {step.label}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Takeaway Pick Up Food Action Card */}
                    {selectedOrder.orderType === 'takeaway' && selectedOrder.status === 'ready' && (
                      <div className="mt-6 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3.5">
                          <div className="h-12 w-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-base text-foreground">
                                Your Food is Ready for Pickup!
                              </h4>
                              <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                              The kitchen has completed your order. Please collect your meal at the counter and click below once received.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleConfirmPickup(selectedOrder)}
                          disabled={updatingPickup}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 h-11 text-sm shrink-0 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          {updatingPickup ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Confirming Pickup...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Pick Up Food
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Timeline logs */}
                    {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
                      <div className="mt-6 rounded-lg bg-accent/40 p-3.5 border border-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" /> Live Kitchen & Staff Updates
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {selectedOrder.timeline.map((entry: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-foreground font-medium">• {entry.label}</span>
                              <span className="text-muted-foreground text-[11px]">{entry.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Order Items */}
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-primary" /> Items in Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {selectedOrder.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-border/40 last:border-0">
                            <div>
                              <p className="font-medium text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                            <span className="font-semibold text-foreground">
                              ৳{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>৳{(selectedOrder.subtotal || 0).toLocaleString()}</span>
                        </div>
                        {selectedOrder.tax > 0 && (
                          <div className="flex justify-between">
                            <span>Tax (10%)</span>
                            <span>৳{selectedOrder.tax.toLocaleString()}</span>
                          </div>
                        )}
                        {selectedOrder.deliveryFee > 0 && (
                          <div className="flex justify-between">
                            <span>Delivery Fee</span>
                            <span>৳{selectedOrder.deliveryFee.toLocaleString()}</span>
                          </div>
                        )}
                        {selectedOrder.discount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-medium">
                            <span>Discount</span>
                            <span>-৳{selectedOrder.discount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
                          <span>Total</span>
                          <span className="text-primary font-bold">
                            ৳{(selectedOrder.total || selectedOrder.totalAmount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Destination & Assignment */}
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" /> Delivery & Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3.5 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Order Type
                        </p>
                        <p className="font-medium capitalize text-foreground mt-0.5">
                          {selectedOrder.orderType === 'dine-in'
                            ? `Dine-In (Table ${selectedOrder.tableNumber || '1'})`
                            : selectedOrder.orderType}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Destination / Table
                        </p>
                        <p className="font-medium text-foreground mt-0.5">
                          {selectedOrder.address || selectedOrder.deliveryAddress || (selectedOrder.tableNumber ? `Table #${selectedOrder.tableNumber}` : 'Restaurant')}
                        </p>
                      </div>

                      {selectedOrder.notes && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Special Instructions
                          </p>
                          <p className="text-xs text-muted-foreground italic mt-0.5 bg-accent/40 p-2 rounded">
                            &quot;{selectedOrder.notes}&quot;
                          </p>
                        </div>
                      )}

                      <Separator />

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Assigned Staff
                        </p>
                        <div className="mt-1 space-y-1 text-xs text-foreground">
                          {selectedOrder.kitchenStaffName && (
                            <p className="flex items-center gap-1.5">
                              <ChefHat className="h-3.5 w-3.5 text-orange-500" />
                              Chef: <span className="font-semibold">{selectedOrder.kitchenStaffName}</span>
                            </p>
                          )}
                          {selectedOrder.waiterName && (
                            <p className="flex items-center gap-1.5">
                              <UtensilsCrossed className="h-3.5 w-3.5 text-blue-500" />
                              Waiter: <span className="font-semibold">{selectedOrder.waiterName}</span>
                            </p>
                          )}
                          {selectedOrder.deliveryStaffName && (
                            <p className="flex items-center gap-1.5">
                              <Bike className="h-3.5 w-3.5 text-indigo-500" />
                              Rider: <span className="font-semibold">{selectedOrder.deliveryStaffName}</span>
                            </p>
                          )}
                          {!selectedOrder.kitchenStaffName && !selectedOrder.waiterName && !selectedOrder.deliveryStaffName && (
                            <p className="text-muted-foreground">Order received by kitchen staff</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border text-center text-muted-foreground">
                Select an order from the list to view live tracking details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
