'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  ShoppingBag,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader2,
  Package,
  Bike,
  XCircle,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getStoredUser, type CurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:     { label: 'Pending',     color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',  icon: Clock },
  confirmed:   { label: 'Confirmed',   color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',        icon: CheckCircle2 },
  preparing:   { label: 'Preparing',   color: 'bg-orange-500/10 text-orange-600 border-orange-500/30',  icon: Loader2 },
  ready:       { label: 'Ready',       color: 'bg-green-500/10 text-green-600 border-green-500/30',     icon: Package },
  delivered:   { label: 'Delivered',   color: 'bg-green-600/10 text-green-700 border-green-600/30',     icon: CheckCircle2 },
  out_for_delivery: { label: 'On the way', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: Bike },
  cancelled:   { label: 'Cancelled',   color: 'bg-red-500/10 text-red-600 border-red-500/30',           icon: XCircle },
  completed:   { label: 'Completed',   color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace('/login');
      return;
    }
    setUser(stored);
    setEditName(stored.name);
    setEditPhone(stored.phone || '');

    // Fetch orders belonging to this customer's email
    api.getOrders({ email: stored.email })
      .then((data: any[]) => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [router]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error('Name cannot be empty'); return; }
    setSavingProfile(true);
    try {
      // Optimistic update in localStorage
      const updated = { ...user!, name: editName.trim(), phone: editPhone.trim() };
      localStorage.setItem('rms_user', JSON.stringify(updated));
      setUser(updated);
      setEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const totalSpent = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, o) => acc + (o.totalAmount || o.total || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-orange-500 to-red-600 pb-24 pt-12">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center text-white">
          {/* Avatar: real photo or initials */}
          <div className="mx-auto mb-4 h-24 w-24 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold">{user.name}</h1>
          <p className="mt-1 text-white/80">{user.email}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Customer Account
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 -mt-12">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Orders', value: orders.length },
            { label: 'Completed', value: orders.filter((o) => o.status === 'completed' || o.status === 'delivered').length },
            { label: 'Total Spent', value: `৳${totalSpent.toLocaleString()}` },
          ].map((stat) => (
            <Card key={stat.label} className="text-center shadow-lg border-0 bg-card">
              <CardContent className="pt-5 pb-4">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">

        {/* Profile card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> My Profile
            </CardTitle>
            {!editing ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                <Edit3 className="h-4 w-4" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditName(user.name); setEditPhone(user.phone || ''); }}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile} className="gap-1.5">
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</Label>
                {editing ? (
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Your name" />
                ) : (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-3 py-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    {user.name}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email Address</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  {user.email}
                  <Badge variant="secondary" className="ml-auto text-[10px]">Verified</Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone Number</Label>
                {editing ? (
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+880..." />
                ) : (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-3 py-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    {user.phone || <span className="text-muted-foreground">Not provided</span>}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Account Type</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-3 py-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                  Customer
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" /> Order History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading orders…
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No orders yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Your order history will appear here</p>
                <Link href="/menu">
                  <Button className="mt-4 gap-2" size="sm">
                    Browse Menu <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  const date = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—';
                  const amount = order.totalAmount || order.total || 0;
                  const itemCount = order.items?.length ?? 0;
                  const orderId = order._id || order.id || order.orderNumber;
                  return (
                    <Link
                      key={order._id || order.id}
                      href={`/orders?orderId=${orderId}`}
                      className="group flex items-center justify-between rounded-xl border border-border bg-accent/30 px-4 py-3.5 transition-all hover:bg-accent hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              Order {order.orderNumber ? (order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`) : `#${(order._id || order.id || '').slice(-6).toUpperCase()}`}
                            </p>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-background border border-border">
                              {order.orderType || 'delivery'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {itemCount} item{itemCount !== 1 ? 's' : ''} · {date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        <span className="text-sm font-semibold">৳{amount.toLocaleString()}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid gap-3 sm:grid-cols-2 pb-8">
          <Link href="/menu">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Browse Menu</p>
                  <p className="text-xs text-muted-foreground">Order your favourite food</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/reservations">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Book a Table</p>
                  <p className="text-xs text-muted-foreground">Reserve your spot</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
