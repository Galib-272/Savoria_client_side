'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bike,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Package,
  MapPin,
  Clock,
  ArrowLeft,
  Save,
  Star,
  Award,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Car,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Order } from '@/lib/types';
import { toast } from 'sonner';
import Link from 'next/link';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

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

export default function DeliveryProfilePage() {
  const currentUser = useCurrentUser();

  // Basic Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Delivery Specific Profile Details
  const [vehicleType, setVehicleType] = useState('Motorcycle');
  const [vehicleNumber, setVehicleNumber] = useState('DHAKA-METRO-HA-1234');
  const [emergencyPhone, setEmergencyPhone] = useState('+880 1811-987654');
  const [serviceArea, setServiceArea] = useState('Gulshan, Banani, Dhanmondi');

  const [saving, setSaving] = useState(false);
  const [deliveryOrders, setDeliveryOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');

      // Load saved vehicle & delivery info from localStorage if available
      try {
        const key = `rms_delivery_info_${currentUser.id || currentUser.email}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.vehicleType) setVehicleType(parsed.vehicleType);
          if (parsed.vehicleNumber) setVehicleNumber(parsed.vehicleNumber);
          if (parsed.emergencyPhone) setEmergencyPhone(parsed.emergencyPhone);
          if (parsed.serviceArea) setServiceArea(parsed.serviceArea);
        }
      } catch (err) {
        console.error('Failed to load delivery driver info:', err);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    // Fetch all delivery orders to calculate driver metrics & recent activity
    api.getOrders({ orderType: 'delivery' })
      .then((data) => {
        if (data && Array.isArray(data)) {
          const mapped = data.map((o: any) => ({ ...o, id: o._id || o.id }));
          setDeliveryOrders(mapped);
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
      const updateData: { name: string; phone?: string } = {
        name: name.trim(),
        phone: phone.trim(),
      };

      await api.updateProfile(updateData);

      // Save delivery specific vehicle info
      if (currentUser) {
        const key = `rms_delivery_info_${currentUser.id || currentUser.email}`;
        localStorage.setItem(
          key,
          JSON.stringify({
            vehicleType,
            vehicleNumber,
            emergencyPhone,
            serviceArea,
          })
        );
      }

      toast.success('Delivery driver profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const todayStr = new Date().toDateString();
  const deliveredOrders = deliveryOrders.filter((o) => o.status === 'delivered');
  const deliveredTodayCount = deliveredOrders.filter(
    (o) => new Date(o.completedAt || o.updatedAt || o.createdAt).toDateString() === todayStr
  ).length;
  const activeDeliveriesCount = deliveryOrders.filter((o) =>
    ['picked_up', 'out_for_delivery'].includes(o.status)
  ).length;
  const totalRevenueHandled = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const displayName = currentUser?.name || 'Jamal Ahmed';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Recent 5 deliveries
  const recentDeliveries = [...deliveredOrders]
    .sort(
      (a: any, b: any) =>
        new Date(b.completedAt || b.updatedAt || b.createdAt).getTime() -
        new Date(a.completedAt || a.updatedAt || a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/delivery">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Delivery Driver Profile</h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal information, delivery vehicle details, and track performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-3 py-1 font-semibold text-xs">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            On Duty & Ready
          </Badge>
        </div>
      </div>

      {/* Hero Driver Card */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-md ring-4 ring-primary/20">
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
                <Bike className="h-4 w-4" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <Badge variant="outline" className="border-primary/40 text-primary font-medium w-fit mx-auto sm:mx-0">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified Delivery Partner
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {currentUser?.email || 'delivery@savoria.com'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" /> {phone || '+880 1712-345678'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Member since {currentUser?.joinDate ? formatDate(currentUser.joinDate) : 'Jan 2026'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Bike className="h-3.5 w-3.5 text-primary" /> {vehicleType} ({vehicleNumber})
                </span>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.9 Driver Rating
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Award className="h-3 w-3 text-emerald-500" /> 99.2% On-Time Delivery
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <MapPin className="h-3 w-3 text-blue-500" /> {serviceArea}
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{deliveredOrders.length}</p>
              <p className="text-xs text-muted-foreground">Total Delivered</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{deliveredTodayCount}</p>
              <p className="text-xs text-muted-foreground">Delivered Today</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeDeliveriesCount}</p>
              <p className="text-xs text-muted-foreground">Active Deliveries</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenueHandled)}</p>
              <p className="text-xs text-muted-foreground">Revenue Handled</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Layout: 1. Personal & Vehicle Details, then 2. Deliveries */}
      <div className="space-y-6">
        <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Personal & Vehicle Information
              </CardTitle>
              <CardDescription>
                Update your contact information and assigned delivery transport details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Full Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jamal Ahmed"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Phone Number</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1712-345678"
                    />
                  </div>

                  {/* Email (Readonly) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Email Address (Login)</label>
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
                      placeholder="+880 1811-987654"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Bike className="h-4 w-4 text-primary" /> Delivery Vehicle & Coverage
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Vehicle Type */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Vehicle Type</label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Electric Scooter">Electric Scooter</option>
                        <option value="Bicycle">Bicycle</option>
                        <option value="Car / Microvan">Car / Microvan</option>
                      </select>
                    </div>

                    {/* License Plate / Vehicle Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">License Plate / Vehicle Reg</label>
                      <Input
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="e.g. DHAKA-METRO-HA-1234"
                      />
                    </div>

                    {/* Preferred Coverage Area */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Assigned Delivery Zones</label>
                      <Input
                        value={serviceArea}
                        onChange={(e) => setServiceArea(e.target.value)}
                        placeholder="e.g. Gulshan, Banani, Baridhara, Dhanmondi"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Notice */}
                <div className="border-t pt-4">
                  <div className="rounded-lg border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Account passwords for delivery staff are fixed and managed by restaurant administration.</span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving} className="gap-2 min-w-[140px]">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          {/* Driver Rules & Guidelines Card */}
          <Card className="border-emerald-200/60 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> Driver Safety & Service Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">✓</span>
                <span>Always wear your helmet and carry your driver ID card.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">✓</span>
                <span>Check packaging, warmers, and drinks before leaving the kitchen.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">✓</span>
                <span>Call the customer 5 minutes before arriving at the drop location.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-600">✓</span>
                <span>Ensure cash is collected accurately on Cash on Delivery orders.</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Completed Deliveries */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Recent Deliveries
                </CardTitle>
                <Link href="/dashboard/delivery/history">
                  <span className="text-xs text-primary font-medium hover:underline cursor-pointer">
                    View All
                  </span>
                </Link>
              </div>
              <CardDescription>Latest orders delivered to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingOrders ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Loading recent deliveries...
                </div>
              ) : recentDeliveries.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No completed deliveries found yet.
                </div>
              ) : (
                recentDeliveries.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-1 rounded-lg border p-3 text-xs transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{order.orderNumber}</span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
                        {formatCurrency(order.total)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{order.customerName}</span>
                    </div>

                    {order.address && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{order.address}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t mt-1">
                      <span>{formatDate(order.completedAt || order.updatedAt || order.createdAt)}</span>
                      <span>{formatTime(order.completedAt || order.updatedAt || order.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
