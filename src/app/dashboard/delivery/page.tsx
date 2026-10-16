'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bike, MapPin, Phone, Package, CheckCircle, Clock, User } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

const deliveryColumns = [
  { key: 'ready', label: 'Ready for Pickup', color: 'bg-green-500' },
  { key: 'picked_up', label: 'Picked Up', color: 'bg-amber-500' },
  { key: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-blue-500' },
  { key: 'delivered', label: 'Delivered', color: 'bg-emerald-500' },
];

export default function DeliveryPage() {
  const [deliveryOrders, setDeliveryOrders] = useState<Order[]>([]);

  useEffect(() => {
    // 1. Fetch live delivery orders
    api.getOrders({ orderType: 'delivery' }).then((data) => {
      if (data && data.length) {
        setDeliveryOrders(
          data.map((o: any) => ({ ...o, id: o._id || o.id }))
            .filter((o: any) => ['ready', 'picked_up', 'out_for_delivery', 'delivered'].includes(o.status))
        );
      }
    }).catch(console.error);

    // 2. Real-time updates
    const socket = getSocket();
    if (socket) {
      socket.emit('join_role_room', 'delivery');

      socket.on('delivery:order_ready', (alert: any) => {
        toast.info(`🛵 ${alert.message}`);
        api.getOrders({ orderType: 'delivery' }).then((data) => {
          if (data && data.length) {
            setDeliveryOrders(
              data.map((o: any) => ({ ...o, id: o._id || o.id }))
                .filter((o: any) => ['ready', 'picked_up', 'out_for_delivery', 'delivered'].includes(o.status))
            );
          }
        }).catch(console.error);
      });

      socket.on('order:updated', (updated: any) => {
        if (updated.orderType === 'delivery') {
          const mapped = { ...updated, id: updated._id || updated.id };
          setDeliveryOrders((prev) => {
            const exists = prev.some((o) => o.id === mapped.id);
            if (exists) {
              return prev.map((o) => (o.id === mapped.id ? mapped : o));
            }
            if (['ready', 'picked_up', 'out_for_delivery', 'delivered'].includes(mapped.status)) {
              return [mapped, ...prev];
            }
            return prev;
          });
        }
      });

      return () => {
        socket.off('delivery:order_ready');
        socket.off('order:updated');
      };
    }
  }, []);

  const advanceDelivery = async (orderId: string) => {
    const order = deliveryOrders.find((o) => o.id === orderId);
    if (!order) return;

    try {
      if (order.status === 'ready') {
        await api.deliveryPickup(orderId);
        toast.success(`Order ${order.orderNumber} picked up`);
        setDeliveryOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'picked_up' as OrderStatus } : o))
        );
      } else if (order.status === 'picked_up') {
        await api.deliveryOut(orderId);
        toast.success(`Order ${order.orderNumber} out for delivery`);
        setDeliveryOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'out_for_delivery' as OrderStatus } : o))
        );
      } else if (order.status === 'out_for_delivery') {
        await api.deliveryDelivered(orderId);
        toast.success(`Order ${order.orderNumber} marked as delivered`);
        setDeliveryOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'delivered' as OrderStatus } : o))
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to advance delivery order');
    }
  };

  const stats = {
    active: deliveryOrders.filter((o) => ['picked_up', 'out_for_delivery'].includes(o.status)).length,
    ready: deliveryOrders.filter((o) => o.status === 'ready').length,
    delivered: deliveryOrders.filter((o) => o.status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Delivery Management</h1>
        <p className="text-sm text-muted-foreground">Track and manage delivery orders in real-time</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600"><Package className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{stats.ready}</p><p className="text-xs text-muted-foreground">Ready for Pickup</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><Bike className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-muted-foreground">Active Deliveries</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><CheckCircle className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold">{stats.delivered}</p><p className="text-xs text-muted-foreground">Delivered Today</p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {deliveryColumns.map((col) => {
          const colOrders = deliveryOrders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded-full', col.color)} />
                  <span className="text-sm font-medium">{col.label}</span>
                </div>
                <Badge variant="secondary">{colOrders.length}</Badge>
              </div>

              <div className="space-y-3">
                {colOrders.length === 0 ? (
                  <Card className="border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">No orders</CardContent></Card>
                ) : (
                  colOrders.map((order) => (
                    <Card key={order.id} className="transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-bold">{order.orderNumber}</span>
                          <Badge variant="outline" className="text-xs">{formatCurrency(order.total)}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{order.customerName}</div>
                          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{order.customerPhone || 'N/A'}</div>
                          {order.address && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span className="text-xs">{order.address}</span></div>}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {order.items.length} items · {order.deliveryStaffName ? `Driver: ${order.deliveryStaffName}` : 'Unassigned'}
                        </div>
                        {col.key !== 'delivered' && (
                          <Button className="mt-3 w-full" size="sm" variant={col.key === 'ready' ? 'default' : 'outline'} onClick={() => advanceDelivery(order.id)}>
                            {col.key === 'ready' && 'Pick Up'}
                            {col.key === 'picked_up' && 'Mark Out for Delivery'}
                            {col.key === 'out_for_delivery' && 'Mark Delivered'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
