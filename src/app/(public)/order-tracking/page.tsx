'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Package, ChefHat, Bike, Home, MapPin, Phone, ArrowRight, Clock } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const steps = [
  { key: 'confirmed', label: 'Order Confirmed', icon: Package },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready for Pickup', icon: CheckCircle2 },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Bike },
  { key: 'delivered', label: 'Delivered', icon: Home },
];

function getStepFromStatus(status?: string): number {
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
      return 1;
  }
}

export default function OrderTrackingPage() {
  const searchParams = useSearchParams();
  const requestedOrderId = searchParams.get('orderId');

  const [order, setOrder] = useState<any>({
    id: 'ORD-1024',
    orderNumber: 1024,
    status: 'preparing',
    items: [
      { name: 'Classic Beef Burger × 2', price: 830 },
      { name: 'Chocolate Milkshake × 1', price: 180 },
      { name: 'Loaded French Fries × 1', price: 150 },
    ],
    subtotal: 1180,
    tax: 118,
    deliveryFee: 50,
    total: 1348,
    deliveryAddress: 'House 12, Road 5, Dhanmondi, Dhaka',
    customerPhone: '+880 1700-000000',
    rider: 'Karim Uddin',
    riderPhone: '+880 1711-222333',
  });

  useEffect(() => {
    // If specific order ID requested
    if (requestedOrderId) {
      api.getOrderById(requestedOrderId).then((data) => {
        if (data) {
          setOrder({
            ...data,
            id: data._id || data.id,
            items: data.items.map((i: any) => ({
              name: `${i.name || i.menuItem?.name || 'Dish'} × ${i.quantity}`,
              price: (i.price || 0) * (i.quantity || 1),
            })),
          });
        }
      }).catch(console.error);
    } else {
      // Load latest order
      api.getOrders().then((all) => {
        if (all && all.length > 0) {
          const latest = all[0];
          setOrder({
            ...latest,
            id: latest._id || latest.id,
            items: latest.items.map((i: any) => ({
              name: `${i.name || i.menuItem?.name || 'Dish'} × ${i.quantity}`,
              price: (i.price || 0) * (i.quantity || 1),
            })),
          });
        }
      }).catch(console.error);
    }

    const socket = getSocket();
    if (socket) {
      socket.on('order:updated', (updated: any) => {
        if (!requestedOrderId || (updated._id || updated.id) === requestedOrderId) {
          setOrder((prev: any) => ({
            ...prev,
            ...updated,
            id: updated._id || updated.id,
          }));
        }
      });
      return () => {
        socket.off('order:updated');
      };
    }
  }, [requestedOrderId]);

  const currentStep = getStepFromStatus(order?.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Track Your Order</h1>
          <p className="text-muted-foreground">Order #{order.id}</p>
        </div>
        <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
          {steps[currentStep].label}
        </span>
      </div>

      {/* Progress Steps */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.key} className="relative flex flex-1 flex-col items-center">
                  {idx < steps.length - 1 && (
                    <div className={cn('absolute left-1/2 top-6 h-0.5 w-full bg-border', idx < currentStep && 'bg-success')} />
                  )}
                  <div className={cn('relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all', isDone ? 'border-success bg-success text-white' : isCurrent ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground')}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className={cn('mt-2 text-center text-xs font-medium', isCurrent ? 'text-primary' : isDone ? 'text-success' : 'text-muted-foreground')}>{step.label}</p>
                  {(step as any).time && <p className="text-[10px] text-muted-foreground">{(step as any).time}</p>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ETA */}
      <Card className="mb-6 bg-primary/5">
        <CardContent className="flex items-center gap-4 p-4">
          <Clock className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Estimated Delivery Time</p>
            <p className="text-xl font-bold text-primary">{currentStep >= 3 ? 'Arriving soon' : '25-35 minutes'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Order Details */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.name}</span><span>{formatCurrency(item.price)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(order.tax)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery Fee</span><span>{formatCurrency(order.deliveryFee)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">{formatCurrency(order.total)}</span></div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Delivery Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div><p className="text-sm font-medium">Delivery Address</p><p className="text-sm text-muted-foreground">{order.deliveryAddress || order.address || 'Dining in Restaurant'}</p></div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div><p className="text-sm font-medium">Contact</p><p className="text-sm text-muted-foreground">{order.customerPhone || order.phone || 'N/A'}</p></div>
            </div>
            {currentStep >= 3 && (
              <div className="rounded-lg bg-muted p-3">
                <p className="mb-2 text-sm font-medium">Your Delivery Rider</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">K</div>
                    <div><p className="text-sm font-medium">{order.rider}</p><p className="text-xs text-muted-foreground">{order.riderPhone}</p></div>
                  </div>
                  <Button size="sm" variant="outline">Call</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link href="/menu"><Button variant="outline">Order More</Button></Link>
        <Link href="/"><Button>Back to Home <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
      </div>
    </div>
  );
}
