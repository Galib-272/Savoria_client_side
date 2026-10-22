'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame, CheckCircle, ChefHat, Utensils, Bike, ShoppingBag, Loader2, Lock } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { KitchenSubNav } from '@/components/kitchen/kitchen-sub-nav';

const columns = [
  { key: 'new', label: 'New', color: 'bg-blue-500', icon: Clock },
  { key: 'preparing', label: 'Preparing', color: 'bg-amber-500', icon: Flame },
  { key: 'ready', label: 'Ready for Pickup', color: 'bg-green-500', icon: CheckCircle },
];

export default function KitchenPage() {
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>([]);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [counts, setCounts] = useState<{
    active: number;
    served: number;
    takeaway: number;
    delivery: number;
  }>({ active: 0, served: 0, takeaway: 0, delivery: 0 });

  const loadAllOrders = async () => {
    try {
      const data = await api.getOrders({ limit: '500' });
      if (data && Array.isArray(data)) {
        const mapped = data.map((o: any) => ({
          ...o,
          id: o._id || o.id,
        }));

        setCounts({
          active: mapped.filter((o) => ['new', 'confirmed', 'preparing', 'ready'].includes(o.status)).length,
          served: mapped.filter((o) => o.status === 'served' || (o.status === 'completed' && o.orderType === 'dine-in')).length,
          takeaway: mapped.filter((o) => o.orderType === 'takeaway' && ['ready', 'completed', 'served'].includes(o.status)).length,
          delivery: mapped.filter((o) => o.orderType === 'delivery' && ['picked_up', 'out_for_delivery', 'delivered', 'completed'].includes(o.status)).length,
        });

        // Kitchen active board only displays New, Preparing, and Ready (Served column removed)
        // 'confirmed' = older paid orders that haven't been started yet → shown in the New column
        const activeBoard = mapped.filter((o) => ['new', 'confirmed', 'preparing', 'ready'].includes(o.status));
        setKitchenOrders(activeBoard);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAllOrders();

    // Data refresh only — popups come from the notification bell (no duplicates)
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => loadAllOrders();
    socket.on('order:updated', refresh);
    socket.on('kitchen:new_order', refresh);
    socket.io.on('reconnect', refresh);
    return () => {
      socket.off('order:updated', refresh);
      socket.off('kitchen:new_order', refresh);
      socket.io.off('reconnect', refresh);
    };
  }, []);

  const handleStartPreparing = async (orderId: string) => {
    setLoadingOrderId(orderId);
    try {
      await api.startPreparingOrder(orderId);
      toast.success('Started preparation');
      loadAllOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start preparation');
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleMarkReady = async (orderId: string, targetPanel: 'dine-in' | 'takeaway' | 'delivery') => {
    const targetOrder = kitchenOrders.find((o) => o.id === orderId);
    if (targetOrder) {
      const allowedType = targetOrder.orderType === 'takeaway'
        ? 'takeaway'
        : targetOrder.orderType === 'delivery'
        ? 'delivery'
        : 'dine-in';
      if (allowedType !== targetPanel) {
        toast.error(`Action blocked: Customer selected ${allowedType.replace('-', ' ')}`);
        return;
      }
    }

    setLoadingOrderId(orderId);
    try {
      await api.markOrderReady(orderId, targetPanel);
      const label = targetPanel === 'dine-in' ? 'Dine-In' : targetPanel === 'takeaway' ? 'Takeaway' : 'Delivery';
      toast.success(`Order marked as ready for ${label}`);
      loadAllOrders();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark ready');
    } finally {
      setLoadingOrderId(null);
    }
  };

  const getElapsed = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (isNaN(mins)) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  };

  return (
    <div className="space-y-6">
      {/* Top Kitchen Sub-Navigation */}
      <KitchenSubNav counts={counts} />

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            Kitchen Display Board
          </h1>
          <p className="text-sm text-muted-foreground">Real-time order preparation board</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-1.5">
            <ChefHat className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground">Cooking now</p>
              <p className="text-xs font-bold">{kitchenOrders.filter((o) => o.status === 'preparing').length} orders</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-1.5">
            <Flame className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-[10px] text-muted-foreground">Waiting to start</p>
              <p className="text-xs font-bold">{kitchenOrders.filter((o) => ['new', 'confirmed'].includes(o.status)).length} orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Kanban Board: New, Preparing, Ready */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((col) => {
          const colOrders = kitchenOrders.filter((o) =>
            col.key === 'new' ? ['new', 'confirmed'].includes(o.status) : o.status === col.key
          );
          const Icon = col.icon;
          return (
            <div key={col.key} className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-card p-3 border">
                <div className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded-full', col.color)} />
                  <span className="font-semibold text-sm">{col.label}</span>
                </div>
                <Badge variant="secondary" className="font-bold">
                  {colOrders.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {colOrders.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                      <Icon className="mb-2 h-8 w-8 opacity-40" />
                      <p className="text-sm">No {col.label.toLowerCase()} orders</p>
                    </CardContent>
                  </Card>
                ) : (
                  colOrders.map((order) => {
                    const isLoading = loadingOrderId === order.id;

                    return (
                      <Card key={order.id} className="transition-shadow hover:shadow-md border-border">
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-start justify-between">
                            <div>
                              <span className="font-bold text-base text-foreground">{order.orderNumber}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{getElapsed(order.createdAt)}</span>
                                <span>•</span>
                                <span className="capitalize font-medium">{order.orderType || 'Dine-In'}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="flex items-center gap-1 font-semibold text-xs">
                              {order.orderType === 'delivery' ? (
                                <>
                                  <Bike className="h-3 w-3 text-indigo-500" /> Delivery
                                </>
                              ) : order.orderType === 'takeaway' ? (
                                <>
                                  <ShoppingBag className="h-3 w-3 text-orange-500" /> Takeaway
                                </>
                              ) : (
                                <>
                                  <Utensils className="h-3 w-3 text-teal-500" /> Dine-in
                                </>
                              )}
                            </Badge>
                          </div>

                          {order.tableNumber && (
                            <div className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              Table {order.tableNumber}
                            </div>
                          )}

                          <div className="mb-3 space-y-1.5">
                            {order.items.map((item, i) => (
                              <div key={i} className="rounded-lg bg-accent/50 p-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-foreground">
                                    {item.quantity}× {item.name}
                                  </span>
                                </div>
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    {Array.isArray(item.modifiers)
                                      ? typeof item.modifiers[0] === 'string'
                                        ? item.modifiers.join(', ')
                                        : item.modifiers.map((m: any) => m.name || m).join(', ')
                                      : ''}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:bg-amber-950/30 dark:border-amber-900/40">
                              <p className="text-xs text-amber-800 dark:text-amber-300">⚠ {order.notes}</p>
                            </div>
                          )}

                          {/* Claimed status info for Ready column */}
                          {order.waiterName && (
                            <div className="mb-3 rounded-lg bg-teal-50 border border-teal-200 p-2 dark:bg-teal-950/40 dark:border-teal-900">
                              <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                                ✓ Claimed by waiter: {order.waiterName}
                              </p>
                            </div>
                          )}
                          {order.deliveryStaffName && (
                            <div className="mb-3 rounded-lg bg-indigo-50 border border-indigo-200 p-2 dark:bg-indigo-950/40 dark:border-indigo-900">
                              <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
                                ✓ Picked up by: {order.deliveryStaffName}
                              </p>
                            </div>
                          )}

                          {/* Action 1: New -> Start Preparing */}
                          {col.key === 'new' && (
                            <Button
                              className="w-full font-semibold"
                              size="sm"
                              variant="default"
                              disabled={isLoading}
                              onClick={() => handleStartPreparing(order.id)}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Flame className="h-4 w-4 mr-1.5" /> Start Preparing
                                </>
                              )}
                            </Button>
                          )}

                          {/* Action 2: Preparing -> 3 Distinct Ready Options */}
                          {col.key === 'preparing' && (() => {
                            const customerChoice = order.orderType === 'takeaway'
                              ? 'takeaway'
                              : order.orderType === 'delivery'
                              ? 'delivery'
                              : 'dine-in';

                            return (
                              <div className="space-y-2 pt-1 border-t border-border/60">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  <span>Mark Ready As:</span>
                                  <span className="text-[10px] font-bold text-primary capitalize px-1.5 py-0.5 rounded bg-primary/10">
                                    Customer: {customerChoice.replace('-', ' ')}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {/* Dine In Button */}
                                  <Button
                                    size="sm"
                                    disabled={isLoading || customerChoice !== 'dine-in'}
                                    title={customerChoice === 'dine-in' ? 'Mark ready for Dine-In' : `Blocked: Order was placed as ${customerChoice}`}
                                    className={cn(
                                      "h-9 px-1 text-xs font-semibold flex flex-col items-center justify-center gap-0.5 leading-tight transition-all",
                                      customerChoice === 'dine-in'
                                        ? "bg-teal-600 hover:bg-teal-700 text-white ring-2 ring-teal-500/30 shadow-sm cursor-pointer"
                                        : "bg-muted/70 text-muted-foreground/40 border border-border/40 opacity-35 cursor-not-allowed pointer-events-none hover:bg-muted/70"
                                    )}
                                    onClick={() => handleMarkReady(order.id, 'dine-in')}
                                  >
                                    <div className="flex items-center gap-1">
                                      <Utensils className="h-3.5 w-3.5" />
                                      {customerChoice !== 'dine-in' && <Lock className="h-2.5 w-2.5 opacity-70" />}
                                    </div>
                                    <span>Dine In</span>
                                  </Button>

                                  {/* Takeaway Button */}
                                  <Button
                                    size="sm"
                                    disabled={isLoading || customerChoice !== 'takeaway'}
                                    title={customerChoice === 'takeaway' ? 'Mark ready for Takeaway' : `Blocked: Order was placed as ${customerChoice}`}
                                    className={cn(
                                      "h-9 px-1 text-xs font-semibold flex flex-col items-center justify-center gap-0.5 leading-tight transition-all",
                                      customerChoice === 'takeaway'
                                        ? "bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-500/30 shadow-sm cursor-pointer"
                                        : "bg-muted/70 text-muted-foreground/40 border border-border/40 opacity-35 cursor-not-allowed pointer-events-none hover:bg-muted/70"
                                    )}
                                    onClick={() => handleMarkReady(order.id, 'takeaway')}
                                  >
                                    <div className="flex items-center gap-1">
                                      <ShoppingBag className="h-3.5 w-3.5" />
                                      {customerChoice !== 'takeaway' && <Lock className="h-2.5 w-2.5 opacity-70" />}
                                    </div>
                                    <span>Takeaway</span>
                                  </Button>

                                  {/* Delivery Button */}
                                  <Button
                                    size="sm"
                                    disabled={isLoading || customerChoice !== 'delivery'}
                                    title={customerChoice === 'delivery' ? 'Mark ready for Delivery' : `Blocked: Order was placed as ${customerChoice}`}
                                    className={cn(
                                      "h-9 px-1 text-xs font-semibold flex flex-col items-center justify-center gap-0.5 leading-tight transition-all",
                                      customerChoice === 'delivery'
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-500/30 shadow-sm cursor-pointer"
                                        : "bg-muted/70 text-muted-foreground/40 border border-border/40 opacity-35 cursor-not-allowed pointer-events-none hover:bg-muted/70"
                                    )}
                                    onClick={() => handleMarkReady(order.id, 'delivery')}
                                  >
                                    <div className="flex items-center gap-1">
                                      <Bike className="h-3.5 w-3.5" />
                                      {customerChoice !== 'delivery' && <Lock className="h-2.5 w-2.5 opacity-70" />}
                                    </div>
                                    <span>Delivery</span>
                                  </Button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Action 3: Ready status badge */}
                          {col.key === 'ready' && (
                            <div className="space-y-1 pt-1">
                              {order.orderType === 'takeaway' ? (
                                <Badge className="w-full justify-center py-1.5 bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 font-semibold text-xs">
                                  🛍️ Ready for Customer Handover
                                </Badge>
                              ) : order.orderType === 'delivery' ? (
                                <Badge className="w-full justify-center py-1.5 bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 font-semibold text-xs">
                                  {order.deliveryStaffName
                                    ? `🛵 Dispatched with ${order.deliveryStaffName}`
                                    : '🛵 Waiting for Delivery Rider'}
                                </Badge>
                              ) : (
                                <Badge className="w-full justify-center py-1.5 bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 font-semibold text-xs">
                                  {order.waiterName
                                    ? `🍽️ Assigned to ${order.waiterName}`
                                    : '🍽️ Waiting for Waiter to Claim'}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
