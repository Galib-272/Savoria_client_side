'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Utensils, CheckCircle2, User, Search, Clock, Hash } from 'lucide-react';
import type { Order } from '@/lib/types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { KitchenSubNav } from '@/components/kitchen/kitchen-sub-nav';

export default function KitchenServedPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState<{
    active: number;
    served: number;
    takeaway: number;
    delivery: number;
  }>({ active: 0, served: 0, takeaway: 0, delivery: 0 });

  const loadOrders = async () => {
    try {
      const data = await api.getOrders({ limit: '500' });
      if (data && Array.isArray(data)) {
        const mapped = data.map((o: any) => ({
          ...o,
          id: o._id || o.id,
        }));

        setCounts({
          active: mapped.filter((o) => ['new', 'confirmed', 'preparing', 'ready'].includes(o.status)).length,
          served: mapped.filter((o) => (o.status === 'served' || (o.status === 'completed' && o.orderType === 'dine-in'))).length,
          takeaway: mapped.filter((o) => o.orderType === 'takeaway' && ['ready', 'completed', 'served'].includes(o.status)).length,
          delivery: mapped.filter((o) => o.orderType === 'delivery' && ['picked_up', 'out_for_delivery', 'delivered', 'completed'].includes(o.status)).length,
        });

        // Served to Table: Dine-in orders that have been served or completed
        const servedOrders = mapped.filter(
          (o) => o.status === 'served' || (o.status === 'completed' && o.orderType === 'dine-in')
        );
        setOrders(servedOrders);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadOrders();

    const socket = getSocket();
    if (!socket) return;
    const refresh = () => loadOrders();
    socket.on('order:updated', refresh);
    socket.io.on('reconnect', refresh);
    return () => {
      socket.off('order:updated', refresh);
      socket.io.off('reconnect', refresh);
    };
  }, []);

  const getElapsed = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (isNaN(mins)) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const filteredOrders = orders.filter((o) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      o.orderNumber?.toLowerCase().includes(query) ||
      String(o.tableNumber || '').includes(query) ||
      o.waiterName?.toLowerCase().includes(query) ||
      o.items.some((item) => item.name?.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Kitchen Sub-Navigation */}
      <KitchenSubNav counts={counts} />

      {/* Header and Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Utensils className="h-6 w-6 text-teal-500" />
            Served to Table
          </h1>
          <p className="text-sm text-muted-foreground">
            History of kitchen orders successfully served to dining tables
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search table, order #, waiter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Badge variant="outline" className="h-9 px-3 border-teal-300 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            {filteredOrders.length} Served Orders
          </Badge>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Utensils className="mb-3 h-12 w-12 opacity-30 text-teal-500" />
            <p className="text-base font-medium">No served orders found</p>
            <p className="text-sm text-muted-foreground mt-1">
              When a waiter marks a dine-in order as served, it will appear here.
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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground">{order.orderNumber}</span>
                      {order.tableNumber && (
                        <Badge className="bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                          Table {order.tableNumber}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{getElapsed(order.createdAt)}</span>
                      <span>•</span>
                      <span>৳{order.total}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700 font-semibold gap-1 dark:bg-teal-950 dark:text-teal-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                    Served
                  </Badge>
                </div>

                {/* Waiter Info */}
                <div className="flex items-center gap-2 rounded-lg bg-teal-500/10 px-3 py-2 text-xs text-teal-800 dark:text-teal-300 font-medium">
                  <User className="h-4 w-4 shrink-0 text-teal-600" />
                  <span>
                    Served by waiter: <strong>{order.waiterName || 'Staff'}</strong>
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Items Served:
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
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

                {order.notes && (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                    ⚠ {order.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
