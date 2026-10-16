'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bike, CheckCircle2, Clock, Search, MapPin, User, Navigation } from 'lucide-react';
import type { Order } from '@/lib/types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { KitchenSubNav } from '@/components/kitchen/kitchen-sub-nav';

export default function KitchenDeliveryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [counts, setCounts] = useState<{
    active: number;
    served: number;
    takeaway: number;
    delivery: number;
  }>({ active: 0, served: 0, takeaway: 0, delivery: 0 });

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      if (data && Array.isArray(data)) {
        const mapped = data.map((o: any) => ({
          ...o,
          id: o._id || o.id,
        }));

        setCounts({
          active: mapped.filter((o) => ['new', 'preparing', 'ready'].includes(o.status)).length,
          served: mapped.filter((o) => o.status === 'served' || (o.status === 'completed' && o.orderType === 'dine-in')).length,
          takeaway: mapped.filter((o) => o.orderType === 'takeaway' && ['ready', 'completed', 'served'].includes(o.status)).length,
          delivery: mapped.filter((o) => o.orderType === 'delivery' && ['picked_up', 'out_for_delivery', 'delivered', 'completed'].includes(o.status)).length,
        });

        // Delivery orders in final / in-progress stages
        const deliveryOrders = mapped.filter(
          (o) =>
            o.orderType === 'delivery' &&
            ['ready', 'picked_up', 'out_for_delivery', 'delivered', 'completed'].includes(o.status)
        );
        setOrders(deliveryOrders);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOrders();

    const socket = getSocket();
    if (socket) {
      socket.emit('join_role_room', 'kitchen');

      socket.on('order:updated', () => {
        loadOrders();
      });

      return () => {
        socket.off('order:updated');
      };
    }
  }, []);

  const getElapsed = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (isNaN(mins)) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'active' && !['ready', 'picked_up', 'out_for_delivery'].includes(o.status)) return false;
    if (statusFilter === 'delivered' && !['delivered', 'completed'].includes(o.status)) return false;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      o.orderNumber?.toLowerCase().includes(query) ||
      o.customerName?.toLowerCase().includes(query) ||
      o.deliveryStaffName?.toLowerCase().includes(query) ||
      o.address?.toLowerCase().includes(query) ||
      o.items.some((item) => item.name?.toLowerCase().includes(query))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
            Waiting for Rider
          </Badge>
        );
      case 'picked_up':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300">
            Rider Picked Up
          </Badge>
        );
      case 'out_for_delivery':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 gap-1 animate-pulse">
            <Navigation className="h-3 w-3" /> Out for Delivery
          </Badge>
        );
      case 'delivered':
      case 'completed':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 gap-1 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Delivered
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Kitchen Sub-Navigation */}
      <KitchenSubNav counts={counts} />

      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Bike className="h-6 w-6 text-indigo-500" />
            Delivery Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor prepared kitchen orders dispatched for home delivery
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border bg-card p-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              On The Way ({orders.filter((o) => ['ready', 'picked_up', 'out_for_delivery'].includes(o.status)).length})
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                statusFilter === 'delivered'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Delivered ({orders.filter((o) => ['delivered', 'completed'].includes(o.status)).length})
            </button>
          </div>

          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search rider, address, order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Bike className="mb-3 h-12 w-12 opacity-30 text-indigo-500" />
            <p className="text-base font-medium">No delivery orders found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Delivery orders dispatched from the kitchen will be tracked here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between border-b border-border/60 pb-3">
                  <div>
                    <span className="font-bold text-base text-foreground">{order.orderNumber}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{getElapsed(order.createdAt)}</span>
                      <span>•</span>
                      <span>৳{order.total}</span>
                    </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Rider Info */}
                {order.deliveryStaffName ? (
                  <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-2 text-xs text-indigo-900 dark:text-indigo-300 font-medium">
                    <User className="h-4 w-4 shrink-0 text-indigo-600" />
                    <span>
                      Rider: <strong>{order.deliveryStaffName}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                    Waiting for delivery rider assignment
                  </div>
                )}

                {/* Delivery Address */}
                {order.address && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-accent/30 p-2 rounded">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                    <span className="line-clamp-2">{order.address}</span>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Dispatched Items:
                  </p>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs rounded bg-accent/40 px-2 py-1.5"
                      >
                        <span className="font-medium text-foreground">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="text-muted-foreground">৳{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
