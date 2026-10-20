'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChefHat,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Save,
  Flame,
  ShieldCheck,
  TrendingUp,
  UtensilsCrossed,
  Timer,
  Award,
  Layers,
  ShoppingBag,
  Bike,
  Utensils,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Order } from '@/lib/types';
import { toast } from 'sonner';
import Link from 'next/link';

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

const cleanOrderNumber = (num?: string) => {
  if (!num) return '#1001';
  return num.startsWith('#') ? num : `#${num}`;
};

export default function KitchenProfilePage() {
  const currentUser = useCurrentUser();

  // Basic Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Kitchen / Chef specific details
  const [stationName, setStationName] = useState('Main Hot Line (Grill & Fry)');
  const [shiftHours, setShiftHours] = useState('Morning Prep Shift (07:00 AM - 03:00 PM)');
  const [emergencyPhone, setEmergencyPhone] = useState('+880 1819-777666');

  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'cooking' | 'ready' | 'completed'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');

      // Load saved station info from localStorage
      try {
        const key = `rms_kitchen_info_${currentUser.id || currentUser.email}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.stationName) setStationName(parsed.stationName);
          if (parsed.shiftHours) setShiftHours(parsed.shiftHours);
          if (parsed.emergencyPhone) setEmergencyPhone(parsed.emergencyPhone);
        }
      } catch (err) {
        console.error('Failed to load kitchen info:', err);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    // Fetch live orders for kitchen order history & metrics
    api.getOrders()
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((o: any) => ({ ...o, id: o._id || o.id }));
          setOrders(mapped);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingOrders(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setSaving(true);
    try {
      await api.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });

      // Save kitchen specific station info
      if (currentUser) {
        const key = `rms_kitchen_info_${currentUser.id || currentUser.email}`;
        localStorage.setItem(
          key,
          JSON.stringify({
            stationName,
            shiftHours,
            emergencyPhone,
          })
        );
      }

      toast.success('Chef profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Metrics computation
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === todayStr
  );

  const cookingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyTodayCount = todayOrders.filter((o) =>
    ['ready', 'served', 'picked_up', 'out_for_delivery', 'delivered', 'completed'].includes(o.status)
  ).length;
  const totalCompletedDishes = orders
    .filter((o) => ['served', 'delivered', 'completed'].includes(o.status))
    .reduce((sum, o) => sum + (o.items?.reduce((iSum, item) => iSum + (item.quantity || 1), 0) || 0), 0);

  const displayName = currentUser?.name || 'Chef Rafiq';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Filtered orders for kitchen order history
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter === 'cooking' && order.status !== 'preparing') return false;
      if (statusFilter === 'ready' && order.status !== 'ready') return false;
      if (statusFilter === 'completed' && !['served', 'delivered', 'completed'].includes(order.status)) {
        return false;
      }

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matchesNum = order.orderNumber?.toLowerCase().includes(q);
        const matchesType = order.orderType?.toLowerCase().includes(q);
        const matchesItem = order.items?.some((i) => i.name.toLowerCase().includes(q));
        if (!matchesNum && !matchesType && !matchesItem) return false;
      }

      return true;
    });
  }, [orders, statusFilter, search]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'preparing':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 animate-pulse">
            <Flame className="h-3 w-3" /> In Prep
          </Badge>
        );
      case 'ready':
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1">
            <CheckCircle2 className="h-3 w-3" /> Ready
          </Badge>
        );
      case 'served':
      case 'delivered':
      case 'completed':
        return (
          <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Done
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery':
        return <Bike className="h-3.5 w-3.5 text-blue-500" />;
      case 'takeaway':
        return <ShoppingBag className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <Utensils className="h-3.5 w-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/kitchen">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Chef Profile & Kitchen History</h1>
            <p className="text-sm text-muted-foreground">
              Manage your kitchen station profile and view comprehensive order preparation history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/kitchen">
            <Button variant="outline" size="sm" className="gap-2">
              <UtensilsCrossed className="h-4 w-4" /> Kitchen Board
            </Button>
          </Link>
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 px-3 py-1 font-semibold text-xs ml-1">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            Kitchen Shift Active
          </Badge>
        </div>
      </div>

      {/* Hero Chef Card */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-card via-card to-amber-500/5 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-amber-600 text-3xl font-bold text-white shadow-md ring-4 ring-amber-500/20">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={displayName}
                    className="h-full w-full object-cover rounded-2xl"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-background">
                <ChefHat className="h-4 w-4" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 font-medium w-fit mx-auto sm:mx-0">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-amber-500" /> Head Cook / Kitchen Specialist
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-amber-600" /> {currentUser?.email || 'kitchen@savoria.com'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-amber-600" /> {phone || '+880 1712-444555'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-600" /> {stationName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-600" /> Kitchen member since {currentUser?.joinDate ? formatDate(currentUser.joinDate) : 'Jan 2026'}
                </span>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Clock className="h-3 w-3 text-blue-500" /> {shiftHours}
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Timer className="h-3 w-3 text-emerald-500" /> Avg Prep Time: 12 min
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Award className="h-3 w-3 text-amber-500" /> 99.8% Recipe Accuracy
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cookingCount}</p>
              <p className="text-xs text-muted-foreground">Currently Cooking</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{readyTodayCount}</p>
              <p className="text-xs text-muted-foreground">Orders Prepared Today</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompletedDishes}</p>
              <p className="text-xs text-muted-foreground">Dishes Cooked (Total)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Timer className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">11.4 min</p>
              <p className="text-xs text-muted-foreground">Avg Speed of Service</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Layout: 1. Chef Station & Contact, then 2. Kitchen Order History */}
      <div className="space-y-6">
        {/* Section 1: Chef Station & Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Chef Station & Contact
            </CardTitle>
            <CardDescription>
              Update your contact details and assigned kitchen station
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Cook / Chef Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chef Rafiq"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Direct Phone</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1712-444555"
                  />
                </div>

                {/* Email (Readonly) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Staff Login Email</label>
                  <Input
                    value={email}
                    disabled
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>

                {/* Emergency Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Emergency Contact Phone</label>
                  <Input
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+880 1819-777666"
                  />
                </div>

                {/* Assigned Station */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Assigned Kitchen Station</label>
                  <select
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Main Hot Line (Grill & Fry)">Main Hot Line (Grill & Fry)</option>
                    <option value="Wok & Rice Station">Wok & Rice Station</option>
                    <option value="Pizza & Oven Station">Pizza & Oven Station</option>
                    <option value="Cold Larder (Salads & Appetizers)">Cold Larder (Salads & Appetizers)</option>
                    <option value="Desserts & Pastry">Desserts & Pastry</option>
                    <option value="Expediter / Chef Pass">Expediter / Chef Pass</option>
                  </select>
                </div>

                {/* Shift Hours */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Kitchen Shift</label>
                  <select
                    value={shiftHours}
                    onChange={(e) => setShiftHours(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Morning Prep Shift (07:00 AM - 03:00 PM)">Morning Prep Shift (07:00 AM - 03:00 PM)</option>
                    <option value="Evening Rush Shift (03:00 PM - 11:00 PM)">Evening Rush Shift (03:00 PM - 11:00 PM)</option>
                    <option value="Night Kitchen Shift (11:00 PM - 07:00 AM)">Night Kitchen Shift (11:00 PM - 07:00 AM)</option>
                  </select>
                </div>
              </div>

              {/* Password Notice */}
              <div className="border-t pt-4">
                <div className="rounded-lg border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Kitchen staff login passwords are fixed and managed by restaurant administration.</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving} className="gap-2 min-w-[140px]">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Section 2: Real Kitchen Order History (Underneath) */}
        <Card>
          <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5 text-primary" /> Kitchen Order Preparation History
                  </CardTitle>
                  <CardDescription>
                    All kitchen tickets cooked and prepared across Dine-in, Takeaway, and Delivery
                  </CardDescription>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/60 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      statusFilter === 'all' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('cooking')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      statusFilter === 'cooking' ? 'bg-background shadow-xs text-amber-600' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    In Prep ({cookingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('completed')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      statusFilter === 'completed' ? 'bg-background shadow-xs text-emerald-600' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by Order # or food item (e.g. Burger, Pizza)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading kitchen orders...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No kitchen orders found matching your filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.slice(0, 15).map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-col gap-2 rounded-xl border p-3.5 text-xs transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {cleanOrderNumber(order.orderNumber)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize">
                            {getOrderTypeIcon(order.orderType)}
                            {order.orderType}
                            {order.orderType === 'dine-in' && order.tableNumber && ` · Table ${order.tableNumber}`}
                          </span>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      {/* Food Items Ordered */}
                      <div className="space-y-1 rounded-lg bg-muted/40 p-2.5">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Items to Cook ({order.items?.length || 0}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {order.items?.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs font-medium border border-border shadow-xs"
                            >
                              <span className="font-bold text-primary">{item.quantity}x</span>
                              <span>{item.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{order.customerName || 'Walk-in Guest'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(order.createdAt)} ({formatDate(order.createdAt)})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
