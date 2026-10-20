'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  MapPin,
  Phone,
  User,
  Search,
  Calendar,
  Clock,
  ArrowLeft,
  Package,
  Bike,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';
import type { Order } from '@/lib/types';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import Link from 'next/link';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const isToday = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

const isThisWeek = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
};

type FilterPeriod = 'all' | 'today' | 'week' | 'month';

export default function DeliveryHistoryPage() {
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    const fetchDelivered = async () => {
      try {
        const data = await api.getOrders({ orderType: 'delivery' });
        if (data && data.length) {
          setDeliveredOrders(
            data
              .map((o: any) => ({ ...o, id: o._id || o.id }))
              .filter((o: any) => o.status === 'delivered')
              .sort((a: any, b: any) => new Date(b.completedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.completedAt || a.updatedAt || a.createdAt).getTime())
          );
        }
      } catch (err) {
        console.error('Failed to fetch delivery history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDelivered();

    // Real-time: when new orders are delivered, add to history
    const socket = getSocket();
    if (socket) {
      socket.emit('join_role_room', 'delivery');

      socket.on('order:updated', (updated: any) => {
        if (updated.orderType === 'delivery' && updated.status === 'delivered') {
          const mapped = { ...updated, id: updated._id || updated.id };
          setDeliveredOrders((prev) => {
            const exists = prev.some((o) => o.id === mapped.id);
            if (exists) return prev.map((o) => (o.id === mapped.id ? mapped : o));
            return [mapped, ...prev];
          });
        }
      });

      return () => {
        socket.off('order:updated');
      };
    }
  }, []);

  // Filter & search
  const filteredOrders = useMemo(() => {
    let orders = [...deliveredOrders];

    // Time filter
    if (filterPeriod === 'today') {
      orders = orders.filter((o) => isToday(o.completedAt || o.updatedAt || o.createdAt));
    } else if (filterPeriod === 'week') {
      orders = orders.filter((o) => isThisWeek(o.completedAt || o.updatedAt || o.createdAt));
    } else if (filterPeriod === 'month') {
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      orders = orders.filter((o) => new Date(o.completedAt || o.updatedAt || o.createdAt) >= monthAgo);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerPhone?.toLowerCase().includes(q) ||
          o.address?.toLowerCase().includes(q) ||
          o.deliveryStaffName?.toLowerCase().includes(q)
      );
    }

    return orders;
  }, [deliveredOrders, filterPeriod, searchQuery]);

  // Stats
  const todayCount = deliveredOrders.filter((o) => isToday(o.completedAt || o.updatedAt || o.createdAt)).length;
  const weekCount = deliveredOrders.filter((o) => isThisWeek(o.completedAt || o.updatedAt || o.createdAt)).length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Group by date
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    filteredOrders.forEach((order) => {
      const dateKey = formatDate(order.completedAt || order.updatedAt || order.createdAt);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(order);
    });
    return groups;
  }, [filteredOrders]);

  const filterButtons: { key: FilterPeriod; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/delivery"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold">Delivery History</h1>
            <p className="text-sm text-muted-foreground">Complete record of all delivered orders</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 to-background">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{todayCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Delivered Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-background">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{weekCount}</p>
              <p className="text-xs text-muted-foreground font-medium">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200/50 bg-gradient-to-br from-purple-50/80 to-background">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{deliveredOrders.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Deliveries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-background">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground font-medium">Revenue ({filterPeriod === 'all' ? 'Total' : filterPeriod === 'today' ? 'Today' : filterPeriod === 'week' ? 'Week' : 'Month'})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {filterButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setFilterPeriod(btn.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                  filterPeriod === btn.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders, customers, drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
      </div>

      {/* Delivery History List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-48 rounded bg-muted" />
                  </div>
                  <div className="h-6 w-24 rounded-full bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Bike className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold text-muted-foreground">No delivery history found</h3>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {searchQuery ? 'Try adjusting your search query' : 'Completed deliveries will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedOrders).map(([date, orders]) => (
            <div key={date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-3 px-1">
                <div className="flex items-center gap-2 rounded-full bg-accent px-3 py-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">{date}</span>
                </div>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground font-medium">{orders.length} {orders.length === 1 ? 'delivery' : 'deliveries'}</span>
              </div>

              {/* Orders for this date */}
              <div className="space-y-2">
                {orders.map((order) => {
                  const isExpanded = expandedOrder === order.id;
                  return (
                    <Card
                      key={order.id}
                      className={cn(
                        'transition-all duration-200 cursor-pointer overflow-hidden',
                        isExpanded
                          ? 'shadow-md border-emerald-200/60 ring-1 ring-emerald-100'
                          : 'hover:shadow-sm hover:border-border/80'
                      )}
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <CardContent className="p-0">
                        {/* Main Row */}
                        <div className="flex items-center gap-4 p-4">
                          {/* Status Icon */}
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>

                          {/* Order Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-sm">{order.orderNumber}</span>
                              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                                Delivered
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {order.customerName}
                              </span>
                              {order.deliveryStaffName && (
                                <span className="flex items-center gap-1">
                                  <Bike className="h-3 w-3" />
                                  {order.deliveryStaffName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Amount & Time */}
                          <div className="text-right shrink-0">
                            <p className="font-bold text-sm">{formatCurrency(order.total)}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" />
                              {formatTime(order.completedAt || order.updatedAt || order.createdAt)}
                            </p>
                          </div>

                          {/* Expand Arrow */}
                          <div className="text-muted-foreground">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-border/60 bg-accent/30 px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              {/* Customer Details */}
                              <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</h4>
                                <div className="space-y-1.5 text-sm">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium">{order.customerName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{order.customerPhone || 'N/A'}</span>
                                  </div>
                                  {order.address && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                      <span className="text-xs leading-relaxed">{order.address}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Delivery Details */}
                              <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery Info</h4>
                                <div className="space-y-1.5 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Bike className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium">{order.deliveryStaffName || 'Unassigned'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Payment: <Badge variant="outline" className="text-[10px] ml-1">{order.paymentMethod?.toUpperCase() || 'N/A'}</Badge></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs">Completed: {formatDate(order.completedAt || order.updatedAt || order.createdAt)} at {formatTime(order.completedAt || order.updatedAt || order.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items Ordered</h4>
                              <div className="rounded-lg border border-border bg-card overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border bg-accent/60">
                                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Item</th>
                                      <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Qty</th>
                                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map((item, idx) => (
                                      <tr key={idx} className="border-b border-border/40 last:border-b-0">
                                        <td className="px-3 py-2 font-medium">{item.name}</td>
                                        <td className="px-3 py-2 text-center text-muted-foreground">×{item.quantity}</td>
                                        <td className="px-3 py-2 text-right">{formatCurrency(item.price * item.quantity)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-accent/40">
                                      <td colSpan={2} className="px-3 py-2 font-semibold text-xs">Total</td>
                                      <td className="px-3 py-2 text-right font-bold">{formatCurrency(order.total)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>

                            {/* Timeline */}
                            {order.timeline && order.timeline.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</h4>
                                <div className="space-y-1.5">
                                  {order.timeline.map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-xs">
                                      <div className={cn(
                                        'h-2 w-2 rounded-full shrink-0',
                                        idx === order.timeline.length - 1 ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                                      )} />
                                      <span className="text-muted-foreground font-mono">{entry.time}</span>
                                      <span className="font-medium">{entry.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
