'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, ShoppingBag, Users, Armchair, ArrowUpRight, AlertTriangle, Receipt } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useCurrentUser } from '@/hooks/use-current-user';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface Charts {
  monthly: { month: string; revenue: number; expenses: number }[];
  weekly: { day: string; sales: number; orders: number }[];
  categories: { name: string; value: number; fill: string }[];
  popular: { name: string; quantity: number; sales: number }[];
}

export default function DashboardPage() {
  const currentUser = useCurrentUser();
  const [stats, setStats] = useState<any | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[] | null>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [charts, setCharts] = useState<Charts>({ monthly: [], weekly: [], categories: [], popular: [] });

  const load = useCallback(async () => {
    const [statsData, ordersList, inventory, chartData, logs] = await Promise.all([
      api.getDashboardStats().catch(() => null),
      api.getOrders({ limit: '6' }).catch(() => []),
      api.getInventory().catch(() => []),
      api.getAnalyticsCharts().catch(() => null),
      api.getAuditLogs({ limit: '6' }).catch(() => ({ data: [] })),
    ]);
    if (statsData) setStats(statsData);
    setRecentOrders(Array.isArray(ordersList) ? ordersList.map((o: any) => ({ ...o, id: o._id || o.id })) : []);
    setLowStockItems(Array.isArray(inventory) ? inventory.filter((i: any) => i.status !== 'in_stock').slice(0, 5) : []);
    if (chartData) {
      setCharts({
        monthly: chartData.monthlyRevenue || [],
        weekly: chartData.weeklySales || [],
        categories: (chartData.categorySales || []).map((c: any, i: number) => ({ ...c, fill: PIE_COLORS[i % PIE_COLORS.length] })),
        popular: chartData.popularItems || [],
      });
    }
    setActivity(logs?.data || []);
  }, []);

  useEffect(() => {
    load();
    // Live refresh when orders / payments / tables change (no popups here — the bell handles those)
    const socket = getSocket();
    if (!socket) return;
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(load, 800); // debounce bursts of events
    };
    socket.on('order:updated', refresh);
    socket.on('payment:created', refresh);
    socket.on('table:updated', refresh);
    socket.on('inventory:low_stock', refresh);
    socket.io.on('reconnect', refresh);
    return () => {
      window.clearTimeout(timer);
      socket.off('order:updated', refresh);
      socket.off('payment:created', refresh);
      socket.off('table:updated', refresh);
      socket.off('inventory:low_stock', refresh);
      socket.io.off('reconnect', refresh);
    };
  }, [load]);

  const statCards = [
    { label: "Today's Sales", value: stats ? formatCurrency(stats.todayRevenue) : '…', sub: stats ? `${stats.todayOrders} orders today` : '', icon: DollarSign },
    { label: 'Active Orders', value: stats ? String(stats.activeOrders) : '…', sub: stats ? `${stats.preparingOrders} preparing · ${stats.readyOrders} ready` : '', icon: ShoppingBag },
    { label: 'Occupied Tables', value: stats ? `${stats.occupiedTables} / ${stats.totalTables || 25}` : '…', sub: stats ? `${stats.reservationsCount} reservations` : '', icon: Armchair },
    { label: 'Total Revenue', value: stats ? formatCurrency(stats.totalRevenue) : '…', sub: stats ? `${stats.activeCustomers} customers · ${stats.lowStockCount} low stock` : '', icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back{currentUser?.name ? `, ${currentUser.name}` : ''} — here&apos;s what&apos;s happening today
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/tables">
            <Button variant="outline" size="sm">
              <Armchair className="mr-2 h-4 w-4" /> Tables & Seats
            </Button>
          </Link>
          <Link href="/dashboard/orders">
            <Button size="sm">
              View Orders <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-bold break-words">{stat.value}</p>
              <p className="text-xs font-medium text-foreground/80">{stat.label}</p>
              {stat.sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Overview</CardTitle>
            <CardDescription>Revenue vs expenses — last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={charts.monthly}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  width={44}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--chart-3))" fill="url(#colorExpenses)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Sales by Category</CardTitle>
            <CardDescription>All non-cancelled orders</CardDescription>
          </CardHeader>
          <CardContent>
            {charts.categories.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No sales yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={charts.categories} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" nameKey="name">
                    {charts.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Sales + Popular Items */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Sales & Orders</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={charts.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="sales" width={44} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="orders" orientation="right" width={30} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar yAxisId="sales" dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales (৳)" />
                <Bar yAxisId="orders" dataKey="orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Popular Items</CardTitle>
            <CardDescription>Most ordered dishes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {charts.popular.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No data yet</p>
              ) : (
                charts.popular.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.sales)}</p>
                    </div>
                    <Badge variant="secondary">{item.quantity} sold</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Orders</CardTitle>
              <Link href="/dashboard/orders">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders === null ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      Loading orders...
                    </TableCell>
                  </TableRow>
                ) : recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No orders yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link href={`/dashboard/orders?orderId=${order.id}`} className="hover:text-primary">
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate">{order.customerName}</TableCell>
                      <TableCell className="hidden capitalize sm:table-cell">{(order.orderType || '').replace('-', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize whitespace-nowrap">
                          {(order.status || '').replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(order.total || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockItems.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">✓ All stock levels OK</p>
                ) : (
                  lowStockItems.map((item: any) => (
                    <div key={item._id || item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.currentStock} {item.unit} / min {item.minStock} {item.unit}
                        </p>
                      </div>
                      <Badge variant={item.status === 'out_of_stock' ? 'destructive' : 'secondary'}>
                        {item.status === 'out_of_stock' ? 'Out' : 'Low'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">No activity yet</p>
                ) : (
                  activity.map((log: any) => (
                    <div key={log._id} className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.userName}</span>{' '}
                          <span className="text-muted-foreground break-words">{log.details}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(log.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
