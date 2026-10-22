'use client';

import { RequireRole } from '@/components/auth/require-role';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Package, ChefHat, Bike, Home, MapPin, Phone, ArrowRight, Utensils, ShoppingBag, Loader2, XCircle } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { getStoredUser } from '@/lib/auth';

type Step = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; statuses: string[] };

const STEPS: Record<string, Step[]> = {
  delivery: [
    { key: 'placed', label: 'Order Placed', icon: Package, statuses: ['new', 'confirmed'] },
    { key: 'preparing', label: 'Preparing', icon: ChefHat, statuses: ['preparing'] },
    { key: 'ready', label: 'Ready', icon: CheckCircle2, statuses: ['ready', 'picked_up'] },
    { key: 'out', label: 'On the Way', icon: Bike, statuses: ['out_for_delivery'] },
    { key: 'delivered', label: 'Delivered', icon: Home, statuses: ['delivered', 'completed'] },
  ],
  takeaway: [
    { key: 'placed', label: 'Order Placed', icon: Package, statuses: ['new', 'confirmed'] },
    { key: 'preparing', label: 'Preparing', icon: ChefHat, statuses: ['preparing'] },
    { key: 'ready', label: 'Ready for Pickup', icon: ShoppingBag, statuses: ['ready'] },
    { key: 'done', label: 'Picked Up', icon: CheckCircle2, statuses: ['completed', 'served'] },
  ],
  'dine-in': [
    { key: 'placed', label: 'Order Placed', icon: Package, statuses: ['new', 'confirmed'] },
    { key: 'preparing', label: 'Preparing', icon: ChefHat, statuses: ['preparing'] },
    { key: 'ready', label: 'Ready', icon: CheckCircle2, statuses: ['ready'] },
    { key: 'served', label: 'Served', icon: Utensils, statuses: ['served'] },
    { key: 'done', label: 'Completed', icon: Home, statuses: ['completed'] },
  ],
};

function TrackingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedOrderId = searchParams.get('orderId');
  const [order, setOrder] = useState<any | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  const load = useCallback(async () => {
    try {
      let data: any = null;
      if (requestedOrderId) {
        data = await api.getOrderById(requestedOrderId);
      } else {
        const mine = await api.getOrders({ limit: '1' }); // the signed-in customer's latest order
        data = Array.isArray(mine) ? mine[0] : null;
      }
      setOrder(data || null);
      setState(data ? 'ready' : 'missing');
    } catch {
      setOrder(null);
      setState('missing');
    }
  }, [requestedOrderId]);

  useEffect(() => {
    if (!getStoredUser()) {
      router.replace(`/login?redirect=${encodeURIComponent(`/order-tracking${requestedOrderId ? `?orderId=${requestedOrderId}` : ''}`)}`);
      return;
    }
    load();
  }, [load, requestedOrderId, router]);

  // Live updates for THIS order only
  useEffect(() => {
    const id = order?._id;
    if (!id) return;
    const socket = getSocket();
    if (!socket) return;
    const join = () => socket.emit('join_order_room', id);
    join();
    const onUpdate = (updated: any) => {
      if (updated?._id === id) setOrder(updated);
    };
    socket.on('order:updated', onUpdate);
    socket.on('connect', join);
    return () => {
      socket.emit('leave_order_room', id);
      socket.off('order:updated', onUpdate);
      socket.off('connect', join);
    };
  }, [order?._id]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'missing' || !order) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h1 className="font-display text-2xl font-bold">No order to track</h1>
        <p className="mt-2 text-muted-foreground">We couldn&apos;t find that order on your account.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/orders">
            <Button variant="outline">My Orders</Button>
          </Link>
          <Link href="/menu">
            <Button>Browse Menu</Button>
          </Link>
        </div>
      </div>
    );
  }

  const steps = STEPS[order.orderType] || STEPS['dine-in'];
  const cancelled = order.status === 'cancelled';
  const currentStep = Math.max(0, steps.findIndex((s) => s.statuses.includes(order.status)));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Track Your Order</h1>
          <p className="text-muted-foreground">
            Order {order.orderNumber} · <span className="capitalize">{String(order.orderType).replace('-', ' ')}</span>
            {order.tableNumber ? ` · Table T${order.tableNumber}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'self-start rounded-full px-3 py-1 text-sm font-medium',
            cancelled ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
          )}
        >
          {cancelled ? 'Cancelled' : steps[currentStep].label}
        </span>
      </div>

      {cancelled ? (
        <Card className="mb-6 border-destructive/30">
          <CardContent className="flex items-center gap-3 p-6 text-destructive">
            <XCircle className="h-6 w-6 shrink-0" /> This order was cancelled.
            {order.paymentStatus === 'refunded' ? ' Your payment will be refunded.' : ''}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            {/* vertical on phones, horizontal from sm */}
            <ol className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:gap-0">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx < currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <li key={step.key} className="relative flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-0">
                    {idx < steps.length - 1 && (
                      <div className={cn('absolute left-1/2 top-6 hidden h-0.5 w-full bg-border sm:block', idx < currentStep && 'bg-success')} />
                    )}
                    <div
                      className={cn(
                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all sm:h-12 sm:w-12',
                        isDone ? 'border-success bg-success text-white' : isCurrent ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className={cn('text-sm font-medium sm:mt-2 sm:text-center sm:text-xs', isCurrent ? 'text-primary' : isDone ? 'text-success' : 'text-muted-foreground')}>
                      {step.label}
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(order.items || []).map((item: any, i: number) => {
              const modPrice = (item.modifiers || []).reduce((s: number, m: any) => s + (typeof m === 'object' ? m.price || 0 : 0), 0);
              return (
                <div key={i} className="flex justify-between gap-3 text-sm">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span className="whitespace-nowrap">{formatCurrency((item.price + modPrice) * item.quantity)}</span>
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm font-medium text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(order.total)}</span>
            </div>
            <p className="text-xs capitalize text-muted-foreground">
              Payment: {order.paymentStatus} · {String(order.paymentMethod || 'cash').replace('_', ' ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{order.orderType === 'delivery' ? 'Delivery Information' : 'Pickup / Table'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{order.orderType === 'delivery' ? 'Delivery Address' : 'Where'}</p>
                <p className="text-sm text-muted-foreground">
                  {order.orderType === 'delivery'
                    ? order.address
                    : order.orderType === 'takeaway'
                    ? 'Collect at the front counter'
                    : `Table T${order.tableNumber}${order.seats?.length ? ` · seats ${order.seats.join(', ')}` : ''}`}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Contact</p>
                <p className="text-sm text-muted-foreground">{order.customerPhone || 'N/A'}</p>
              </div>
            </div>
            {order.deliveryStaffName && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">Your rider: {order.deliveryStaffName}</p>
              </div>
            )}
            {order.waiterName && order.orderType === 'dine-in' && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">Your waiter: {order.waiterName}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/orders">
          <Button variant="outline">My Orders</Button>
        </Link>
        <Link href="/menu">
          <Button>
            Order More <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function OrderTrackingPageContent() {
  return (
    <Suspense fallback={null}>
      <TrackingInner />
    </Suspense>
  );
}

export default function OrderTrackingPage() {
  return (
    <RequireRole roles={['customer']}>
      <OrderTrackingPageContent />
    </RequireRole>
  );
}
