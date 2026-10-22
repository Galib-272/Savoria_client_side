'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Eye, X, Utensils, CheckCircle2, Loader2, Bike, Banknote, Ban, PackageCheck } from 'lucide-react';
import type { Order } from '@/lib/types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  preparing: 'bg-amber-100 text-amber-700 border-amber-200',
  ready: 'bg-green-100 text-green-700 border-green-200',
  served: 'bg-teal-100 text-teal-700 border-teal-200',
  assigned: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  picked_up: 'bg-purple-100 text-purple-700 border-purple-200',
  out_for_delivery: 'bg-violet-100 text-violet-700 border-violet-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const modifierText = (mods: any[] | undefined) =>
  (mods || []).map((m) => (typeof m === 'string' ? m : m?.name)).filter(Boolean).join(', ');

type ActionKey = 'claim' | 'serve' | 'complete' | 'handover' | 'pickup' | 'out' | 'delivered' | 'collect' | 'cancel';

interface OrderAction {
  key: ActionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

/** Which buttons a role sees for an order — mirrors the server's rules */
function actionsFor(order: Order, role: string | undefined, userId: string | undefined): OrderAction[] {
  if (!role) return [];
  const actions: OrderAction[] = [];
  const mgmt = role === 'admin' || role === 'manager';
  const isWaiter = role === 'waiter' || mgmt;
  const isRider = role === 'delivery' || mgmt;
  const isCashier = role === 'cashier' || mgmt;
  const ownsAsWaiter = !order.waiterId || order.waiterId === userId || mgmt;

  if (order.orderType === 'dine-in') {
    if (isWaiter && order.status === 'ready' && !order.waiterId && !order.waiterName)
      actions.push({ key: 'claim', label: 'Take Order', icon: Utensils });
    if (isWaiter && order.status === 'ready' && (order.waiterId || order.waiterName) && ownsAsWaiter)
      actions.push({ key: 'serve', label: 'Mark Served', icon: CheckCircle2, className: 'bg-teal-600 hover:bg-teal-700 text-white' });
    if ((isWaiter || isCashier) && order.status === 'served')
      actions.push({ key: 'complete', label: order.paymentStatus === 'paid' ? 'Complete & Free Table' : 'Collect Cash & Complete', icon: PackageCheck, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' });
  }

  if (order.orderType === 'takeaway' && isCashier && order.status === 'ready')
    actions.push({ key: 'handover', label: order.paymentStatus === 'paid' ? 'Hand Over' : 'Collect Cash & Hand Over', icon: PackageCheck, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' });

  if (order.orderType === 'delivery' && isRider) {
    if (order.status === 'ready') actions.push({ key: 'pickup', label: 'Pick Up', icon: Bike, className: 'bg-indigo-600 hover:bg-indigo-700 text-white' });
    if (order.status === 'picked_up') actions.push({ key: 'out', label: 'Out for Delivery', icon: Bike, variant: 'secondary' });
    if (['picked_up', 'out_for_delivery'].includes(order.status) && (role !== 'delivery' || !order.deliveryStaffId || order.deliveryStaffId === userId))
      actions.push({ key: 'delivered', label: 'Delivered', icon: CheckCircle2, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' });
  }

  if (isCashier && order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded' && !['cancelled', 'completed', 'delivered'].includes(order.status))
    actions.push({ key: 'collect', label: 'Collect Payment', icon: Banknote, variant: 'outline' });

  if (isCashier && ['new', 'confirmed', 'preparing', 'ready'].includes(order.status))
    actions.push({ key: 'cancel', label: 'Cancel', icon: Ban, variant: 'outline', className: 'text-destructive border-destructive/40 hover:bg-destructive/10' });

  return actions;
}

function OrdersPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedOrderId = searchParams.get('orderId');
  const initialSearch = searchParams.get('search') || '';
  const consumedOrderIdRef = useRef<string | null>(null);

  const [orderList, setOrderList] = useState<Order[] | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const currentUser = useCurrentUser();
  const role = currentUser?.role;
  const userId = currentUser?.id || currentUser?._id;

  useEffect(() => setSearch(initialSearch), [initialSearch]);

  const load = useCallback(async () => {
    try {
      const data = await api.getOrders({ limit: '500' });
      const mapped = (Array.isArray(data) ? data : []).map((o: any) => ({ ...o, id: o._id || o.id }));
      setOrderList(mapped);
      if (requestedOrderId && consumedOrderIdRef.current !== requestedOrderId) {
        const found = mapped.find(
          (o: any) => o.id === requestedOrderId || o.orderNumber === requestedOrderId || o.orderNumber === `#${requestedOrderId}`
        );
        if (found) setSelectedOrder(found);
        consumedOrderIdRef.current = requestedOrderId;
        router.replace('/dashboard/orders', { scroll: false });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load orders');
      setOrderList([]);
    }
  }, [requestedOrderId, router]);

  useEffect(() => {
    load();
    const socket = getSocket();
    if (!socket) return;
    // Data refresh only — popups come from the notification bell
    const handleOrderUpdate = (updated: any) => {
      const mapped = { ...updated, id: updated._id || updated.id };
      setOrderList((prev) => {
        const list = prev || [];
        return list.some((o) => o.id === mapped.id) ? list.map((o) => (o.id === mapped.id ? mapped : o)) : [mapped, ...list];
      });
      setSelectedOrder((prev) => (prev && prev.id === mapped.id ? mapped : prev));
    };
    socket.on('order:updated', handleOrderUpdate);
    socket.io.on('reconnect', load);
    return () => {
      socket.off('order:updated', handleOrderUpdate);
      socket.io.off('reconnect', load);
    };
  }, [load]);

  const runAction = async (order: Order, key: ActionKey, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (key === 'cancel' && !window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    setActionLoadingId(order.id);
    try {
      let res: any;
      switch (key) {
        case 'claim':
          res = await api.waiterClaimFood(order.id);
          toast.success(`You took Order ${order.orderNumber}`);
          break;
        case 'serve':
          res = await api.updateOrderStatus(order.id, 'served');
          toast.success(`Order ${order.orderNumber} marked as served`);
          break;
        case 'complete':
        case 'handover':
          res = await api.updateOrderStatus(order.id, 'completed');
          toast.success(`Order ${order.orderNumber} completed`);
          break;
        case 'pickup':
          res = await api.deliveryPickup(order.id);
          toast.success(`Order ${order.orderNumber} picked up`);
          break;
        case 'out':
          res = await api.deliveryOut(order.id);
          toast.success(`Order ${order.orderNumber} is out for delivery`);
          break;
        case 'delivered':
          res = await api.deliveryDelivered(order.id);
          toast.success(`Order ${order.orderNumber} delivered`);
          break;
        case 'collect':
          res = await api.processPayment({ orderId: order.id, amount: order.total, paymentMethod: order.paymentMethod || 'cash' });
          toast.success(`Payment received — ${res?.receiptNumber}`);
          res = { data: res?.order };
          break;
        case 'cancel':
          res = await api.updateOrderStatus(order.id, 'cancelled');
          toast.success(`Order ${order.orderNumber} cancelled`);
          break;
      }
      const updated = res?.data;
      if (updated?._id) {
        const mapped = { ...updated, id: updated._id };
        setOrderList((prev) => (prev || []).map((o) => (o.id === mapped.id ? mapped : o)));
        setSelectedOrder((prev) => (prev && prev.id === mapped.id ? mapped : prev));
      }
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
      load();
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...(orderList || [])];
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.customerPhone || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter((o) => o.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter((o) => o.orderType === typeFilter);
    return result;
  }, [orderList, search, statusFilter, typeFilter]);

  const renderActions = (order: Order, size: 'sm' | 'default' = 'sm') => {
    const actions = actionsFor(order, role, userId);
    if (actions.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
    const loading = actionLoadingId === order.id;
    return (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {actions.map((a) => (
          <Button
            key={a.key}
            size={size}
            variant={a.variant || 'default'}
            className={cn('h-8 gap-1.5 px-3 font-semibold', a.className)}
            disabled={loading}
            onClick={(e) => runAction(order, a.key, e)}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <a.icon className="h-3.5 w-3.5" />}
            {a.label}
          </Button>
        ))}
      </div>
    );
  };

  const statusPill = (status: string) => (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">Manage and track all restaurant orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by order number, customer or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="served">Served</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="dine-in">Dine In</SelectItem>
              <SelectItem value="takeaway">Takeaway</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {orderList === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No orders found matching your filters</CardContent>
        </Card>
      ) : (
        <>
          {/* Phones: cards */}
          <div className="space-y-3 md:hidden">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="cursor-pointer" onClick={() => setSelectedOrder(order)}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.customerName}
                        {order.tableNumber ? ` · T${order.tableNumber}` : ''}
                      </p>
                    </div>
                    {statusPill(order.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">
                      {order.orderType.replace('-', ' ')} · {order.items.length} item{order.items.length === 1 ? '' : 's'}
                    </span>
                    <span className="font-semibold">{formatCurrency(order.total)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'} className="capitalize">
                      {order.paymentStatus}
                    </Badge>
                    {renderActions(order)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tablets / desktop: table */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedOrder(order)}>
                      <TableCell className="whitespace-nowrap font-semibold text-foreground">{order.orderNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{order.customerName}</p>
                        {order.tableNumber && <p className="text-xs text-muted-foreground">Table T{order.tableNumber}</p>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap capitalize">{order.orderType.replace('-', ' ')}</TableCell>
                      <TableCell className="hidden lg:table-cell">{order.items.length} items</TableCell>
                      <TableCell>
                        <Badge variant={order.paymentStatus === 'paid' ? 'default' : order.paymentStatus === 'pending' ? 'secondary' : 'outline'} className="capitalize">
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusPill(order.status)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">{formatCurrency(order.total)}</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {renderActions(order)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="View order"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                Order {selectedOrder.orderNumber}
                {statusPill(selectedOrder.status)}
              </DialogTitle>
              <DialogDescription>
                {selectedOrder.customerName} · <span className="capitalize">{selectedOrder.orderType.replace('-', ' ')}</span> ·{' '}
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {actionsFor(selectedOrder, role, userId).length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-accent/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>
                  {renderActions(selectedOrder)}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-sm font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{selectedOrder.customerPhone || 'N/A'}</p>
                </div>
                {selectedOrder.tableNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground">Table / Seats</p>
                    <p className="text-sm font-medium">
                      T{selectedOrder.tableNumber}
                      {selectedOrder.seats?.length ? ` · ${selectedOrder.seats.join(', ')}` : ''}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="text-sm font-medium capitalize">
                    {selectedOrder.paymentStatus} · {(selectedOrder.paymentMethod || 'cash').replace('_', ' ')}
                  </p>
                </div>
                {selectedOrder.waiterName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Waiter</p>
                    <p className="text-sm font-semibold text-primary">{selectedOrder.waiterName}</p>
                  </div>
                )}
                {selectedOrder.kitchenStaffName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Kitchen Chef</p>
                    <p className="text-sm font-medium">{selectedOrder.kitchenStaffName}</p>
                  </div>
                )}
                {selectedOrder.deliveryStaffName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Rider</p>
                    <p className="text-sm font-medium">{selectedOrder.deliveryStaffName}</p>
                  </div>
                )}
                {selectedOrder.address && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Delivery Address</p>
                    <p className="text-sm font-medium">{selectedOrder.address}</p>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="hidden sm:table-cell">Modifiers</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item: any, i: number) => {
                      const modPrice = (item.modifiers || []).reduce((s: number, m: any) => s + (typeof m === 'object' ? m.price || 0 : 0), 0);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {item.name}
                            {modifierText(item.modifiers) && (
                              <span className="block text-xs text-muted-foreground sm:hidden">{modifierText(item.modifiers)}</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{modifierText(item.modifiers) || '—'}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="whitespace-nowrap text-right">{formatCurrency((item.price + modPrice) * item.quantity)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2 rounded-lg border border-border p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Discount{(selectedOrder as any).couponCode ? ` (${(selectedOrder as any).couponCode})` : ''}</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                {selectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-lg border border-border p-4">
                  <p className="mb-1 text-xs text-muted-foreground">Special Instructions</p>
                  <p className="whitespace-pre-line text-sm italic">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-sm font-semibold">Order Timeline</p>
                <div className="space-y-3">
                  {selectedOrder.timeline.map((event, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 shrink-0 rounded-full ${
                          i < selectedOrder.timeline.length - 1 ? 'bg-primary' : 'animate-pulse bg-primary ring-4 ring-primary/20'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner />
    </Suspense>
  );
}
