'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingBag, CheckCircle2, Clock, Search, User, Phone, Check } from 'lucide-react';
import type { Order } from '@/lib/types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { KitchenSubNav } from '@/components/kitchen/kitchen-sub-nav';

export default function KitchenTakeawayPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'completed'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
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

        // Takeaway orders in final states: ready or completed/served
        const takeawayOrders = mapped.filter(
          (o) => o.orderType === 'takeaway' && ['ready', 'completed', 'served'].includes(o.status)
        );
        setOrders(takeawayOrders);
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

  const handleMarkHandedOver = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      await api.updateOrderStatus(orderId, 'completed');
      toast.success('Takeaway order marked as handed over to customer!');
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getElapsed = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (isNaN(mins)) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ready' && o.status !== 'ready') return false;
    if (statusFilter === 'completed' && !['completed', 'served'].includes(o.status)) return false;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      o.orderNumber?.toLowerCase().includes(query) ||
      o.customerName?.toLowerCase().includes(query) ||
      o.customerPhone?.toLowerCase().includes(query) ||
      o.items.some((item) => item.name?.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Kitchen Sub-Navigation */}
      <KitchenSubNav counts={counts} />

      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-orange-500" />
            Takeaway Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Takeaway orders ready for pickup and completed handovers
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
              onClick={() => setStatusFilter('ready')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                statusFilter === 'ready'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ready ({orders.filter((o) => o.status === 'ready').length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Handed Over ({orders.filter((o) => ['completed', 'served'].includes(o.status)).length})
            </button>
          </div>

          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customer, order #..."
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
            <ShoppingBag className="mb-3 h-12 w-12 opacity-30 text-orange-500" />
            <p className="text-base font-medium">No takeaway orders found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Takeaway orders marked ready by the kitchen will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const isCompleted = ['completed', 'served'].includes(order.status);
            return (
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
                    {isCompleted ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 gap-1 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Handed Over
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 gap-1 font-semibold animate-pulse">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        Ready for Pickup
                      </Badge>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs text-orange-900 dark:text-orange-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <User className="h-3.5 w-3.5 text-orange-600" />
                      <span>{order.customerName || 'Walk-in Customer'}</span>
                    </div>
                    {order.customerPhone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{order.customerPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Packed Items:
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

                  {/* Action button if ready for handover */}
                  {!isCompleted && (
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                      disabled={actionLoadingId === order.id}
                      onClick={() => handleMarkHandedOver(order.id)}
                    >
                      <Check className="h-4 w-4" />
                      {actionLoadingId === order.id ? 'Updating...' : 'Hand Over to Customer'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
