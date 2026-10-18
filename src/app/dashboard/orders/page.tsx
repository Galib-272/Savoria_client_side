'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Eye, X, Utensils, CheckCircle2, Loader2, Bike, ShoppingBag } from 'lucide-react';
import type { Order } from '@/lib/types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

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

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const dashboardRouter = useRouter();
  const requestedOrderId = searchParams.get('orderId');
  // Track whether the initial orderId param has already been consumed so we don't re-open on re-renders
  const consumedOrderIdRef = useRef<string | null>(null);

  const [orderList, setOrderList] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const currentUser = useCurrentUser();
  const isWaiter = currentUser?.role === 'waiter' || currentUser?.role === 'admin' || currentUser?.role === 'manager';
  const isDelivery = currentUser?.role === 'delivery' || currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
    api.getOrders().then((data) => {
      if (data && data.length) {
        const mapped = data.map((o: any) => ({ ...o, id: o._id || o.id }));
        setOrderList(mapped);

        // Only auto-select if we have an orderId param that hasn't been consumed yet
        if (requestedOrderId && consumedOrderIdRef.current !== requestedOrderId) {
          const found = mapped.find(
            (o: any) =>
              o.id === requestedOrderId ||
              o._id === requestedOrderId ||
              o.orderNumber === requestedOrderId ||
              o.orderNumber === `#${requestedOrderId}`
          );
          if (found) {
            setSelectedOrder(found);
          }
          // Mark as consumed & clear the URL param so refreshing doesn't re-open the modal
          consumedOrderIdRef.current = requestedOrderId;
          dashboardRouter.replace('/dashboard/orders', { scroll: false });
        }
      }
    }).catch(console.error);

    const socket = getSocket();
    if (socket) {
      const handleOrderUpdate = (updated: any) => {
        const mapped = { ...updated, id: updated._id || updated.id };
        setOrderList((prev) => {
          const exists = prev.some((o) => o.id === mapped.id);
          if (exists) {
            return prev.map((o) => (o.id === mapped.id ? mapped : o));
          }
          return [mapped, ...prev];
        });

        setSelectedOrder((prev) => (prev && prev.id === mapped.id ? mapped : prev));
      };

      socket.on('order:updated', handleOrderUpdate);

      // Listen for waiter ready alerts
      socket.on('waiter:order_ready', (data: any) => {
        toast.info(data.message || `Order ${data.orderNumber} is ready for serving!`);
      });

      return () => {
        socket.off('order:updated', handleOrderUpdate);
        socket.off('waiter:order_ready');
      };
    }
  }, [requestedOrderId, dashboardRouter]);

  // Waiter action: Take Order (Claim Food)
  const handleTakeOrder = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (order.orderType === 'takeaway' || order.orderType === 'delivery') {
      toast.error('Waiters can only take Dine-In orders.');
      return;
    }
    setActionLoadingId(order.id);
    try {
      await api.waiterClaimFood(order.id, currentUser?.name || 'Waiter');
      toast.success(`You claimed Order ${order.orderNumber}! Status updated to Claimed.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim order');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Waiter action: Mark Served
  const handleMarkServed = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (order.orderType === 'takeaway' || order.orderType === 'delivery') {
      toast.error('Waiters can only serve Dine-In orders.');
      return;
    }
    setActionLoadingId(order.id);
    try {
      await api.updateOrderStatus(order.id, 'served');
      toast.success(`Order ${order.orderNumber} marked as Served!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delivery action: Pick Up
  const handleDeliveryPickup = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionLoadingId(order.id);
    try {
      await api.deliveryPickup(order.id, currentUser?.name || 'Rider');
      toast.success(`Order ${order.orderNumber} picked up!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to pick up order');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delivery action: Mark Delivered
  const handleDeliveryDelivered = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionLoadingId(order.id);
    try {
      await api.deliveryDelivered(order.id);
      toast.success(`Order ${order.orderNumber} marked as Delivered!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark delivered');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...orderList];
    if (search) {
      result = result.filter((o) =>
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (statusFilter !== 'all') result = result.filter((o) => o.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter((o) => o.orderType === typeFilter);
    return result;
  }, [orderList, search, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">Manage and track all restaurant orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="served">Served</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
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

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Workflow Action</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    No orders found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const isLoading = actionLoadingId === order.id;

                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell className="font-semibold text-foreground">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{order.customerName}</p>
                        {order.tableNumber && (
                          <p className="text-xs text-muted-foreground">Table #{order.tableNumber}</p>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{order.orderType.replace('-', ' ')}</TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.paymentStatus === 'paid'
                              ? 'default'
                              : order.paymentStatus === 'pending'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="capitalize"
                        >
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            statusColors[order.status] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>

                      {/* Workflow Actions Column */}
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {/* Waiter: Ready Dine-In order not yet claimed -> Take Order button */}
                        {isWaiter && (order.orderType === 'dine-in' || (!order.orderType && !!order.tableNumber)) && order.status === 'ready' && !order.waiterName && (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-8 px-3 gap-1.5 shadow-sm"
                            disabled={isLoading}
                            onClick={(e) => handleTakeOrder(order, e)}
                          >
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Utensils className="h-3.5 w-3.5" />
                            )}
                            Take Order
                          </Button>
                        )}

                        {/* Waiter: Ready Dine-In order claimed by waiter -> Mark Served */}
                        {isWaiter && (order.orderType === 'dine-in' || (!order.orderType && !!order.tableNumber)) && order.status === 'ready' && !!order.waiterName && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 px-3 gap-1.5 border border-teal-300 text-teal-800 bg-teal-50 hover:bg-teal-100"
                            disabled={isLoading}
                            onClick={(e) => handleMarkServed(order, e)}
                          >
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                            )}
                            Mark Served
                          </Button>
                        )}

                        {/* Waiter: Dine-In order already served */}
                        {isWaiter && (order.orderType === 'dine-in' || (!order.orderType && !!order.tableNumber)) && order.status === 'served' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Served
                          </span>
                        )}

                        {/* Waiter panel: Takeaway orders cannot be taken by waiters */}
                        {isWaiter && order.orderType === 'takeaway' && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/80 font-medium bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
                            <ShoppingBag className="h-3.5 w-3.5 text-orange-500" /> Counter Takeaway
                          </span>
                        )}

                        {/* Waiter panel: Delivery orders cannot be taken by waiters */}
                        {isWaiter && order.orderType === 'delivery' && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/80 font-medium bg-muted/50 px-2.5 py-1 rounded-full border border-border/50">
                            <Bike className="h-3.5 w-3.5 text-indigo-500" /> Rider Delivery
                          </span>
                        )}

                        {/* Delivery rider: Delivery ready -> Pick Up button */}
                        {isDelivery && order.orderType === 'delivery' && order.status === 'ready' && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-8 px-3 gap-1.5 shadow-sm"
                            disabled={isLoading}
                            onClick={(e) => handleDeliveryPickup(order, e)}
                          >
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Bike className="h-3.5 w-3.5" />
                            )}
                            Pick Up
                          </Button>
                        )}

                        {/* Delivery rider: Picked up -> Mark Delivered */}
                        {isDelivery && order.orderType === 'delivery' && (order.status === 'picked_up' || order.status === 'out_for_delivery') && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8 px-3 gap-1.5 shadow-sm"
                            disabled={isLoading}
                            onClick={(e) => handleDeliveryDelivered(order, e)}
                          >
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Delivered
                          </Button>
                        )}

                        {/* Fallback when no workflow action is pending */}
                        {!['ready', 'picked_up', 'out_for_delivery'].includes(order.status) && order.status !== 'served' && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Order {selectedOrder.orderNumber}
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    statusColors[selectedOrder.status]
                  }`}
                >
                  {selectedOrder.status.replace(/_/g, ' ')}
                </span>
              </DialogTitle>
              <DialogDescription>
                {selectedOrder.customerName} · {selectedOrder.orderType.replace('-', ' ')} ·{' '}
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Actions Header Bar for Waiter & Staff */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-accent/40 rounded-lg border border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Order Workflow Actions:
                </span>
                <div className="flex items-center gap-2">
                  {/* Take Order action in dialog: ONLY for Dine-In when ready and not yet claimed */}
                  {isWaiter &&
                    selectedOrder.status === 'ready' &&
                    (selectedOrder.orderType === 'dine-in' || (!selectedOrder.orderType && !!selectedOrder.tableNumber)) &&
                    !selectedOrder.waiterName && (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
                        disabled={actionLoadingId === selectedOrder.id}
                        onClick={() => handleTakeOrder(selectedOrder)}
                      >
                        <Utensils className="h-3.5 w-3.5" /> Take Order (Claim)
                      </Button>
                    )}

                  {/* Mark Served in dialog: ONLY for Dine-In when ready and claimed by waiter */}
                  {isWaiter &&
                    selectedOrder.status === 'ready' &&
                    (selectedOrder.orderType === 'dine-in' || (!selectedOrder.orderType && !!selectedOrder.tableNumber)) &&
                    !!selectedOrder.waiterName && (
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1.5 shadow-sm"
                        disabled={actionLoadingId === selectedOrder.id}
                        onClick={() => handleMarkServed(selectedOrder)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Served
                      </Button>
                    )}

                  {/* Note for Waiter on Takeaway order in dialog */}
                  {isWaiter && selectedOrder.orderType === 'takeaway' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
                      <ShoppingBag className="h-3.5 w-3.5" /> Takeaway (Handed over at front counter)
                    </span>
                  )}

                  {/* Note for Waiter on Delivery order in dialog */}
                  {isWaiter && selectedOrder.orderType === 'delivery' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
                      <Bike className="h-3.5 w-3.5" /> Delivery (Handled by delivery riders)
                    </span>
                  )}

                  {/* Order already served */}
                  {selectedOrder.status === 'served' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" /> Food Served to Table
                    </span>
                  )}

                  {/* Delivery Pick Up in dialog */}
                  {selectedOrder.status === 'ready' && selectedOrder.orderType === 'delivery' && (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
                      disabled={actionLoadingId === selectedOrder.id}
                      onClick={() => handleDeliveryPickup(selectedOrder)}
                    >
                      <Bike className="h-3.5 w-3.5" /> Pick Up for Delivery
                    </Button>
                  )}

                  {/* Delivery Complete in dialog */}
                  {(selectedOrder.status === 'picked_up' || selectedOrder.status === 'out_for_delivery') && selectedOrder.orderType === 'delivery' && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                      disabled={actionLoadingId === selectedOrder.id}
                      onClick={() => handleDeliveryDelivered(selectedOrder)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
                    </Button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4">
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
                    <p className="text-xs text-muted-foreground">Table</p>
                    <p className="text-sm font-medium">Table {selectedOrder.tableNumber}</p>
                  </div>
                )}
                {selectedOrder.waiterName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Waiter</p>
                    <p className="text-sm font-medium text-primary font-semibold">{selectedOrder.waiterName}</p>
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
                    <p className="text-xs text-muted-foreground">Delivery Staff</p>
                    <p className="text-sm font-medium">{selectedOrder.deliveryStaffName}</p>
                  </div>
                )}
                {selectedOrder.address && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Delivery Address</p>
                    <p className="text-sm font-medium">{selectedOrder.address}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Modifiers</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.modifiers?.join(', ') || '—'}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="space-y-2 rounded-lg border border-border p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (10%)</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                {selectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Special Instructions</p>
                  <p className="text-sm italic">&quot;{selectedOrder.notes}&quot;</p>
                </div>
              )}

              {/* Timeline */}
              <div className="rounded-lg border border-border p-4">
                <p className="mb-3 text-sm font-semibold">Live Order Timeline</p>
                <div className="space-y-3">
                  {selectedOrder.timeline.map((event, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          i < selectedOrder.timeline.length - 1 ? 'bg-primary' : 'bg-primary animate-pulse ring-4 ring-primary/20'
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.label}</p>
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
