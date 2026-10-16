'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  ChefHat,
  CheckCircle,
  AlertTriangle,
  Receipt,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Armchair,
  Check,
  Calendar,
  Sparkles,
  MapPin,
  Utensils,
} from 'lucide-react';
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
import Link from 'next/link';
import { api } from '@/lib/api';
import { getStoredUser, type CurrentUser } from '@/lib/auth';
import type { Table as TableType, TableStatus, Seat } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getSocket } from '@/lib/socket';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

const FALLBACK_CHART_DATA = {
  monthly: [
    { month: 'Jan', revenue: 0, expenses: 0 },
    { month: 'Feb', revenue: 0, expenses: 0 },
    { month: 'Mar', revenue: 0, expenses: 0 },
    { month: 'Apr', revenue: 0, expenses: 0 },
    { month: 'May', revenue: 0, expenses: 0 },
    { month: 'Jun', revenue: 0, expenses: 0 },
    { month: 'Jul', revenue: 0, expenses: 0 },
    { month: 'Aug', revenue: 0, expenses: 0 },
    { month: 'Sep', revenue: 0, expenses: 0 },
    { month: 'Oct', revenue: 0, expenses: 0 },
    { month: 'Nov', revenue: 0, expenses: 0 },
    { month: 'Dec', revenue: 0, expenses: 0 },
  ],
  weekly: [
    { day: 'Mon', sales: 0, orders: 0 },
    { day: 'Tue', sales: 0, orders: 0 },
    { day: 'Wed', sales: 0, orders: 0 },
    { day: 'Thu', sales: 0, orders: 0 },
    { day: 'Fri', sales: 0, orders: 0 },
    { day: 'Sat', sales: 0, orders: 0 },
    { day: 'Sun', sales: 0, orders: 0 },
  ],
  categories: [] as { name: string; value: number; fill: string }[],
  popular: [] as { name: string; orders: number }[],
};

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  ChefHat,
  CheckCircle,
  AlertTriangle,
  Receipt,
};

const recentActivity = [
  { user: 'Chef Rakib', action: 'marked Order #1026 ready', time: '5 min ago' },
  { user: 'Rahim', action: 'created Order #1029', time: '10 min ago' },
  { user: 'Nadia', action: 'completed payment for Order #1028', time: '25 min ago' },
  { user: 'Jamal', action: 'picked up Order #1027', time: '35 min ago' },
  { user: 'System', action: 'Low stock alert: Chicken (3kg)', time: '1 hr ago' },
  { user: 'Karim', action: 'requested bill for Table 12', time: '1 hr ago' },
];

const DEFAULT_SEATS: Seat[] = [
  { seatNumber: 'S1', status: 'available' },
  { seatNumber: 'S2', status: 'available' },
  { seatNumber: 'S3', status: 'available' },
  { seatNumber: 'S4', status: 'available' },
];

interface StatItem {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Admin stats state with explicit typing
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Today's Sales", value: '৳0', change: '', trend: 'up', icon: 'DollarSign' },
    { label: 'Active Orders', value: '0', change: '', trend: 'up', icon: 'ShoppingBag' },
    { label: 'Occupied Tables', value: '0 / 25', change: '', trend: 'neutral', icon: 'Users' },
    { label: 'Active Customers', value: '0', change: '', trend: 'up', icon: 'Clock' },
  ]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [chartData, setChartData] = useState(FALLBACK_CHART_DATA);

  // Customer Table & Seat Selection states
  const [tables, setTables] = useState<TableType[]>([]);
  const [filterSection, setFilterSection] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSeatDialog, setSelectedSeatDialog] = useState<{
    table: TableType;
    seat: Seat;
  } | null>(null);
  const [customerBookingName, setCustomerBookingName] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('7:00 PM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    if (user?.name) {
      setCustomerBookingName(user.name);
    }

    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);

    // Fetch tables & real-time updates for seat selection
    api.getTables()
      .then((data) => {
        if (data && data.length) {
          setTables(
            data.map((t: any) => ({
              ...t,
              id: t._id || t.id,
              seats: t.seats && t.seats.length === 4 ? t.seats : DEFAULT_SEATS,
            }))
          );
        }
      })
      .catch(console.error);

    // Socket listener for table updates
    const socket = getSocket();
    if (socket) {
      socket.emit('join_role_room', user?.role || 'customer');
      socket.on('table:updated', (updatedTable: any) => {
        setTables((prev) =>
          prev.map((t) =>
            t.id === (updatedTable._id || updatedTable.id) || t.number === updatedTable.number
              ? {
                  ...updatedTable,
                  id: updatedTable._id || updatedTable.id,
                  seats: updatedTable.seats && updatedTable.seats.length === 4 ? updatedTable.seats : DEFAULT_SEATS,
                }
              : t
          )
        );
      });
      return () => {
        socket.off('table:updated');
      };
    }

    // Admin metrics (only needed if admin/manager/staff)
    if (user?.role !== 'customer') {
      api.getDashboardStats().then((data) => {
        if (data) {
          setStats([
            { label: "Today's Sales", value: formatCurrency(data.totalRevenue || 0), change: '+12.5%', trend: 'up', icon: 'DollarSign' },
            { label: 'Active Orders', value: String(data.totalOrders || 0), change: '+8.2%', trend: 'up', icon: 'ShoppingBag' },
            { label: 'Occupied Tables', value: `${data.occupiedTables || 0} / 25`, change: '-3.1%', trend: 'neutral', icon: 'Users' },
            { label: 'Active Customers', value: String(data.activeCustomers || 0), change: '+15.3%', trend: 'up', icon: 'Clock' },
          ]);
        }
      }).catch(console.error);

      api.getOrders().then((ordersList) => {
        if (ordersList && ordersList.length) {
          setRecentOrders(ordersList.slice(0, 5).map((o: any) => ({ ...o, id: o._id || o.id })));
        }
      }).catch(console.error);

      api.getInventory().then((items) => {
        if (items && items.length) {
          setLowStockItems(items.filter((i: any) => i.status !== 'in_stock').slice(0, 5));
        }
      }).catch(console.error);

      api.getAnalyticsCharts().then((data) => {
        if (data) {
          setChartData({
            monthly: data.monthlyRevenue || FALLBACK_CHART_DATA.monthly,
            weekly: data.weeklySales || FALLBACK_CHART_DATA.weekly,
            categories: (data.categorySales || []).map((c: any, i: number) => ({ ...c, fill: PIE_COLORS[i % PIE_COLORS.length] })),
            popular: data.popularItems || FALLBACK_CHART_DATA.popular,
          });
        }
      }).catch(console.error);
    }
  }, []);

  const handleSeatClick = (table: TableType, seat: Seat) => {
    if (seat.status === 'occupied') {
      toast.info(`Seat ${seat.seatNumber} on Table T${String(table.number).padStart(2, '0')} is currently occupied.`);
      return;
    }
    if (seat.status === 'reserved' && seat.currentCustomerName !== currentUser?.name) {
      toast.info(`Seat ${seat.seatNumber} is reserved by another customer.`);
      return;
    }
    setSelectedSeatDialog({ table, seat });
  };

  const handleConfirmSeatSelection = async () => {
    if (!selectedSeatDialog) return;
    const { table, seat } = selectedSeatDialog;
    const name = customerBookingName.trim() || currentUser?.name || 'Customer';

    setIsSubmitting(true);
    try {
      const isCurrentlyReservedByMe =
        seat.status === 'reserved' && seat.currentCustomerName === currentUser?.name;

      const nextStatus: 'available' | 'reserved' = isCurrentlyReservedByMe ? 'available' : 'reserved';
      const nextCustomerName = isCurrentlyReservedByMe ? undefined : name;

      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== table.id) return t;
          const updatedSeats = (t.seats || DEFAULT_SEATS).map((s) =>
            s.seatNumber === seat.seatNumber
              ? { ...s, status: nextStatus, currentCustomerName: nextCustomerName }
              : s
          );
          return { ...t, seats: updatedSeats };
        })
      );

      await api.updateSeatStatus(table.id, seat.seatNumber, nextStatus, nextCustomerName);

      if (nextStatus === 'reserved') {
        toast.success(`Seat ${seat.seatNumber} on Table T${String(table.number).padStart(2, '0')} reserved for ${name}!`);
      } else {
        toast.success(`Seat ${seat.seatNumber} reservation cancelled.`);
      }

      setSelectedSeatDialog(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update seat status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections = Array.from(new Set(tables.map((t) => t.section)));

  const filteredTables = tables.filter((t) => {
    if (filterSection !== 'all' && t.section !== filterSection) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  // Calculate seat stats for customer
  let totalAvailableSeats = 0;
  let myReservedSeats: { tableNum: number; seatNum: string; section: string }[] = [];
  tables.forEach((t) => {
    (t.seats || DEFAULT_SEATS).forEach((s) => {
      if (s.status === 'available') totalAvailableSeats++;
      if (
        s.status === 'reserved' &&
        s.currentCustomerName &&
        currentUser?.name &&
        s.currentCustomerName.toLowerCase() === currentUser.name.toLowerCase()
      ) {
        myReservedSeats.push({ tableNum: t.number, seatNum: s.seatNumber, section: t.section });
      }
    });
  });

  /* ==================================================================== */
  /* CUSTOMER VIEW: Direct Table & Seat Selection (4 Buttons per Table)   */
  /* ==================================================================== */
  if (currentUser?.role === 'customer') {
    return (
      <div className="space-y-6">
        {/* Customer Welcome Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/20 p-1.5 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <h1 className="font-display text-2xl font-bold">
                Welcome back, {currentUser.name || 'Valued Guest'}!
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose your favorite table and select a seat (S1 – S4) for your dine-in experience.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/menu">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Utensils className="h-4 w-4" /> Browse Menu
              </Button>
            </Link>
            <Link href="/reservations">
              <Button size="sm" className="gap-1.5">
                <Calendar className="h-4 w-4" /> Book Full Table
              </Button>
            </Link>
          </div>
        </div>

        {/* My Active Reservation Banner if any */}
        {myReservedSeats.length > 0 && (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Your Selected Seat(s)</p>
                  <p className="text-xs text-muted-foreground">
                    {myReservedSeats.map((s) => `Table T${String(s.tableNum).padStart(2, '0')} - Seat ${s.seatNum} (${s.section})`).join(', ')}
                  </p>
                </div>
              </div>
              <Badge className="bg-primary text-primary-foreground">Active Reservation</Badge>
            </div>
          </div>
        )}

        {/* Table & Seat Counts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-green-200 bg-green-50/40 dark:bg-green-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-7 w-7 text-green-600" />
              <div>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">
                  {tables.filter((t) => t.status === 'available').length}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">Available Tables</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Armchair className="h-7 w-7 text-primary" />
              <div>
                <p className="text-xl font-bold text-primary">{totalAvailableSeats}</p>
                <p className="text-xs text-muted-foreground">Available Seats</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-7 w-7 text-amber-600" />
              <div>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {tables.filter((t) => t.status === 'reserved').length}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Reserved Tables</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="h-7 w-7 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{tables.length || 25}</p>
                <p className="text-xs text-muted-foreground">Total Tables</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter bar & Seat legend */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold">Seat Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-md bg-green-500 border border-green-600 shadow-sm" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-md bg-yellow-400 border border-yellow-500 shadow-sm" />
              <span>Reserved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-md bg-red-500 border border-red-600 shadow-sm" />
              <span>Occupied</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 25 Tables with 4 Seat Buttons each */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTables.map((table) => {
            const seats = table.seats && table.seats.length === 4 ? table.seats : DEFAULT_SEATS;

            return (
              <Card
                key={table.id}
                className="border-2 transition-all hover:shadow-md bg-card/90 overflow-hidden"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Table Header */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-display text-lg font-bold">
                          Table T{String(table.number).padStart(2, '0')}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-medium py-0 px-1.5">
                          {table.section}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Capacity: 4 guests</p>
                    </div>

                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs font-semibold capitalize',
                        table.status === 'available'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : table.status === 'occupied'
                          ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      )}
                    >
                      {table.status}
                    </Badge>
                  </div>

                  {/* 4 Seat Boxes (Square layout like image 2) */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="grid grid-cols-2 gap-3 place-items-center py-1">
                      {seats.map((seat) => {
                        const isMySeat =
                          seat.currentCustomerName &&
                          currentUser?.name &&
                          seat.currentCustomerName.toLowerCase() === currentUser.name.toLowerCase();

                        const isAvailable = seat.status === 'available';
                        const isOccupied = seat.status === 'occupied';
                        const isReserved = seat.status === 'reserved';

                        return (
                          <button
                            key={seat.seatNumber}
                            type="button"
                            onClick={() => handleSeatClick(table, seat)}
                            className={cn(
                              'flex h-14 w-14 items-center justify-center rounded-xl text-base font-bold transition-all shadow-sm border-2',
                              isAvailable
                                ? 'bg-green-500 text-white border-green-600 hover:bg-green-600 hover:scale-105 active:scale-95 cursor-pointer'
                                : isReserved
                                ? cn(
                                    'bg-yellow-400 text-neutral-900 border-yellow-500 hover:bg-yellow-500 cursor-pointer',
                                    isMySeat && 'ring-4 ring-primary ring-offset-2'
                                  )
                                : 'bg-red-500 text-white border-red-600 cursor-not-allowed opacity-90'
                            )}
                          >
                            {seat.seatNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Seat Reservation Modal */}
        {selectedSeatDialog && (
          <Dialog open={!!selectedSeatDialog} onOpenChange={(open) => !open && setSelectedSeatDialog(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Armchair className="h-5 w-5 text-primary" />
                  Select Seat {selectedSeatDialog.seat.seatNumber} on Table T
                  {String(selectedSeatDialog.table.number).padStart(2, '0')}
                </DialogTitle>
                <DialogDescription>
                  Section: <span className="font-semibold text-foreground">{selectedSeatDialog.table.section}</span> · Table capacity: 4 guests
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                      {selectedSeatDialog.seat.seatNumber}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        Table T{String(selectedSeatDialog.table.number).padStart(2, '0')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedSeatDialog.table.section} Section · Seat {selectedSeatDialog.seat.seatNumber}
                      </p>
                    </div>
                  </div>
                  <Badge variant={selectedSeatDialog.seat.status === 'available' ? 'default' : 'secondary'}>
                    {selectedSeatDialog.seat.status}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="custName">Your Name</Label>
                  <Input
                    id="custName"
                    value={customerBookingName}
                    onChange={(e) => setCustomerBookingName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bDate">Date</Label>
                    <Input
                      id="bDate"
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bTime">Time</Label>
                    <Select value={bookingTime} onValueChange={setBookingTime}>
                      <SelectTrigger id="bTime">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['12:00 PM', '1:00 PM', '2:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2 sm:justify-between">
                <Button variant="ghost" onClick={() => setSelectedSeatDialog(null)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmSeatSelection} disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Saving...'
                  ) : selectedSeatDialog.seat.status === 'reserved' &&
                    selectedSeatDialog.seat.currentCustomerName === currentUser?.name ? (
                    'Cancel My Reservation'
                  ) : (
                    <>
                      <Check className="mr-1.5 h-4 w-4" /> Confirm Seat Selection
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  /* ==================================================================== */
  /* ADMIN / STAFF VIEW: Revenue Analytics, Operations & Orders           */
  /* ==================================================================== */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, here's what's happening today</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/tables">
            <Button variant="outline">
              <Armchair className="mr-2 h-4 w-4" /> Tables & Seats
            </Button>
          </Link>
          <Link href="/dashboard/orders">
            <Button>
              View Orders <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = iconMap[stat.icon] || DollarSign;
          return (
            <Card key={stat.label} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  {stat.change && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        stat.trend === 'up'
                          ? 'text-success'
                          : stat.trend === 'down'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {stat.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                      {stat.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue vs expenses (2026)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.monthly}>
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
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--chart-3))" fill="url(#colorExpenses)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales by Category</CardTitle>
            <CardDescription>This month's distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Sales + Popular Items */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Sales & Orders</CardTitle>
            <CardDescription>Last 7 days performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales (৳)" />
                <Bar dataKey="orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Popular Items</CardTitle>
            <CardDescription>Top selling this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chartData.popular.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
              ) : (
                chartData.popular.map((item: any, index: number) => (
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
                      <p className="text-xs text-muted-foreground">{item.orders} orders</p>
                    </div>
                    <Badge variant="secondary">{item.orders}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      Loading orders...
                    </TableCell>
                  </TableRow>
                ) : (
                  recentOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell className="capitalize">{(order.orderType || '').replace('-', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {(order.status || '').replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.total || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">✓ All stock levels OK</p>
                ) : (
                  lowStockItems.map((item: any) => (
                    <div
                      key={item._id || item.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.currentStock}
                          {item.unit} / min: {item.minStock}
                          {item.unit}
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

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{activity.user}</span>{' '}
                        <span className="text-muted-foreground">{activity.action}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
