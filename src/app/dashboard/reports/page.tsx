'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, ShoppingBag, TrendingUp, Receipt } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '@/lib/api';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const EMPTY_CHARTS = {
  weekly: [] as any[],
  monthly: [] as any[],
  categories: [] as any[],
  popular: [] as any[],
  paymentMethods: [] as any[],
  orderTypes: [] as any[],
};

export default function ReportsPage() {
  const [stats, setStats] = useState({ totalRevenue: 0, totalExpenses: 0, profit: 0, avgOrderValue: 0, totalOrders: 0 });
  const [charts, setCharts] = useState(EMPTY_CHARTS);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashData, chartData, orders] = await Promise.all([
          api.getDashboardStats().catch(() => null),
          api.getAnalyticsCharts().catch(() => null),
          api.getOrders().catch(() => []),
        ]);

        if (dashData) {
          setStats({
            totalRevenue: dashData.totalRevenue || 0,
            totalExpenses: dashData.totalExpenses || 0,
            profit: (dashData.totalRevenue || 0) - (dashData.totalExpenses || 0),
            avgOrderValue: dashData.avgOrderValue || 0,
            totalOrders: dashData.totalOrders || 0,
          });
        }

        if (chartData) {
          setCharts({
            weekly: chartData.weeklySales || [],
            monthly: chartData.monthlyRevenue || [],
            categories: (chartData.categorySales || []).map((c: any, i: number) => ({ ...c, fill: PIE_COLORS[i % PIE_COLORS.length] })),
            popular: chartData.popularItems || [],
            paymentMethods: (chartData.paymentMethods || []).map((p: any, i: number) => ({ ...p, fill: PIE_COLORS[i % PIE_COLORS.length] })),
            orderTypes: (chartData.orderTypes || []).map((o: any, i: number) => ({ ...o, fill: PIE_COLORS[i % PIE_COLORS.length] })),
          });
        }

        if (orders && orders.length) {
          setRecentOrders(orders.slice(0, 10).map((o: any) => ({ ...o, id: o._id || o.id })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const reportStats = [
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-primary' },
    { label: 'Total Expenses', value: formatCurrency(stats.totalExpenses), icon: Receipt, color: 'text-destructive' },
    { label: 'Estimated Profit', value: formatCurrency(stats.profit), icon: TrendingUp, color: 'text-success' },
    { label: 'Avg Order Value', value: formatCurrency(Math.round(stats.avgOrderValue)), icon: ShoppingBag, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">Comprehensive business insights and performance metrics</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {reportStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-xl font-bold">{loading ? '...' : stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="sales">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Weekly Sales</CardTitle><CardDescription>Daily sales and order count</CardDescription></CardHeader>
            <CardContent>
              {charts.weekly.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  {loading ? 'Loading...' : 'No data yet'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales (৳)" />
                    <Bar dataKey="orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Sales by Category</CardTitle></CardHeader>
              <CardContent>
                {charts.categories.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">{loading ? 'Loading...' : 'No data yet'}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={charts.categories} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                        {charts.categories.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Order Types</CardTitle></CardHeader>
              <CardContent>
                {charts.orderTypes.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">{loading ? 'Loading...' : 'No data yet'}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={charts.orderTypes} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                        {charts.orderTypes.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orders Report */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Recent Orders</CardTitle><CardDescription>Latest {recentOrders.length} orders</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Loading orders...</TableCell></TableRow>
                  ) : recentOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No orders found</TableCell></TableRow>
                  ) : recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell className="capitalize">{(order.orderType || '').replace('-', ' ')}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{(order.status || '').replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell><Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'} className="capitalize">{order.paymentStatus}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.total || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Report */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Top Selling Items</CardTitle><CardDescription>Most ordered menu items</CardDescription></CardHeader>
            <CardContent>
              {charts.popular.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">{loading ? 'Loading...' : 'No data yet'}</div>
              ) : (
                <div className="space-y-3">
                  {charts.popular.map((item: any, index: number) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${(item.orders / (charts.popular[0]?.orders || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <Badge variant="secondary">{item.orders} orders</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Revenue vs Expenses</CardTitle><CardDescription>Monthly financial overview</CardDescription></CardHeader>
            <CardContent>
              {charts.monthly.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  {loading ? 'Loading...' : 'No data yet'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={charts.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}K`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue" dot={false} />
                    <Line type="monotone" dataKey="expenses" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Expenses" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Payment Methods</CardTitle></CardHeader>
              <CardContent>
                {charts.paymentMethods.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">{loading ? 'Loading...' : 'No data yet'}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={charts.paymentMethods} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                        {charts.paymentMethods.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Financial Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), color: 'text-primary' },
                    { label: 'Total Expenses', value: formatCurrency(stats.totalExpenses), color: 'text-destructive' },
                    { label: 'Net Profit', value: formatCurrency(stats.profit), color: stats.profit >= 0 ? 'text-success' : 'text-destructive' },
                    { label: 'Total Orders', value: String(stats.totalOrders), color: 'text-foreground' },
                    { label: 'Avg Order Value', value: formatCurrency(stats.avgOrderValue), color: 'text-foreground' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className={`font-bold ${row.color}`}>{loading ? '...' : row.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
