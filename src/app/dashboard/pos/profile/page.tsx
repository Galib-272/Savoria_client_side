'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Receipt,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Save,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  Building2,
  DollarSign,
  ShoppingCart,
  Award,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-current-user';
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

const cleanOrderNumber = (num?: string) => {
  if (!num) return '#1001';
  return num.startsWith('#') ? num : `#${num}`;
};

export default function CashierProfilePage() {
  const currentUser = useCurrentUser();

  // Basic Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Cashier specific details
  const [counterNumber, setCounterNumber] = useState('Counter 1 (Main POS)');
  const [shiftHours, setShiftHours] = useState('Morning Shift (08:00 AM - 04:00 PM)');
  const [emergencyPhone, setEmergencyPhone] = useState('+880 1819-123456');

  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');

      // Load saved station info from localStorage
      try {
        const key = `rms_cashier_info_${currentUser.id || currentUser.email}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.counterNumber) setCounterNumber(parsed.counterNumber);
          if (parsed.shiftHours) setShiftHours(parsed.shiftHours);
          if (parsed.emergencyPhone) setEmergencyPhone(parsed.emergencyPhone);
        }
      } catch (err) {
        console.error('Failed to load cashier info:', err);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    // Fetch live payment transactions processed at POS
    api.getPayments()
      .then((data) => {
        if (Array.isArray(data)) {
          setPayments(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPayments(false));
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

      // Save cashier specific counter/shift info
      if (currentUser) {
        const key = `rms_cashier_info_${currentUser.id || currentUser.email}`;
        localStorage.setItem(
          key,
          JSON.stringify({
            counterNumber,
            shiftHours,
            emergencyPhone,
          })
        );
      }

      toast.success('Cashier profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Metrics computation
  const todayStr = new Date().toDateString();
  const todayPayments = payments.filter(
    (p) => new Date(p.createdAt).toDateString() === todayStr
  );

  const todayCashTotal = todayPayments
    .filter((p) => p.paymentMethod === 'cash')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const todayDigitalTotal = todayPayments
    .filter((p) => ['card', 'mobile_banking', 'stripe', 'bank_transfer'].includes(p.paymentMethod))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalRevenueHandled = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const displayName = currentUser?.name || 'Nadia Islam';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getMethodBadge = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return (
          <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400">
            <Banknote className="h-3 w-3" /> Cash
          </Badge>
        );
      case 'card':
        return (
          <Badge variant="outline" className="gap-1 border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-400">
            <CreditCard className="h-3 w-3" /> Card
          </Badge>
        );
      case 'mobile_banking':
        return (
          <Badge variant="outline" className="gap-1 border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-400">
            <Smartphone className="h-3 w-3" /> Mobile Banking
          </Badge>
        );
      default:
        return <Badge variant="outline">{method || 'Paid'}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pos">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Cashier Profile & Register Summary</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile, assigned POS counter, and monitor register transactions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/pos">
            <Button variant="outline" size="sm" className="gap-2">
              <ShoppingCart className="h-4 w-4" /> POS Terminal
            </Button>
          </Link>
          <Link href="/dashboard/pos/transactions">
            <Button variant="outline" size="sm" className="gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" /> Transactions
            </Button>
          </Link>
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-3 py-1 font-semibold text-xs ml-1">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            On Duty · Register Active
          </Badge>
        </div>
      </div>

      {/* Hero Cashier Card */}
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
                <Receipt className="h-4 w-4" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <Badge variant="outline" className="border-primary/40 text-primary font-medium w-fit mx-auto sm:mx-0">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified Restaurant Cashier
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {currentUser?.email || 'cashier@savoria.com'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" /> {phone || '+880 1712-888999'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> {counterNumber}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Member since {currentUser?.joinDate ? formatDate(currentUser.joinDate) : 'Jan 2026'}
                </span>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Clock className="h-3 w-3 text-blue-500" /> {shiftHours}
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Award className="h-3 w-3 text-emerald-500" /> 100% Register Accuracy
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
            <div className="flex h-10 w-10 shrink-0 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="break-words text-xl font-bold sm:text-2xl">{todayPayments.length}</p>
              <p className="text-xs text-muted-foreground">Today&apos;s Transactions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
            <div className="flex h-10 w-10 shrink-0 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Banknote className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="break-words text-xl font-bold sm:text-2xl">{formatCurrency(todayCashTotal)}</p>
              <p className="text-xs text-muted-foreground">Cash In Register (Today)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
            <div className="flex h-10 w-10 shrink-0 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="break-words text-xl font-bold sm:text-2xl">{formatCurrency(todayDigitalTotal)}</p>
              <p className="text-xs text-muted-foreground">Digital / Card / Mobile</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
            <div className="flex h-10 w-10 shrink-0 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="break-words text-xl font-bold sm:text-2xl">{formatCurrency(totalRevenueHandled)}</p>
              <p className="text-xs text-muted-foreground">Total Sales Handled</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Layout: 1. Personal & Station Details, then 2. Transactions */}
      <div className="space-y-6">
        <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Personal & Register Station Details
              </CardTitle>
              <CardDescription>
                Update your contact details and assigned billing counter station
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
                      placeholder="e.g. Nadia Islam"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Phone Number</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1712-888999"
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
                      placeholder="+880 1819-123456"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" /> Register Terminal & Shift Assignment
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Counter Station */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Assigned Counter / Station</label>
                      <select
                        value={counterNumber}
                        onChange={(e) => setCounterNumber(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Counter 1 (Main POS)">Counter 1 (Main POS)</option>
                        <option value="Counter 2 (Takeaway / Express)">Counter 2 (Takeaway / Express)</option>
                        <option value="Counter 3 (Bar & Beverages)">Counter 3 (Bar & Beverages)</option>
                        <option value="Drive-thru Station">Drive-thru Station</option>
                      </select>
                    </div>

                    {/* Shift Hours */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Shift Schedule</label>
                      <select
                        value={shiftHours}
                        onChange={(e) => setShiftHours(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Morning Shift (08:00 AM - 04:00 PM)">Morning Shift (08:00 AM - 04:00 PM)</option>
                        <option value="Evening Shift (04:00 PM - 12:00 AM)">Evening Shift (04:00 PM - 12:00 AM)</option>
                        <option value="Night Shift (12:00 AM - 08:00 AM)">Night Shift (12:00 AM - 08:00 AM)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Password Notice */}
                <div className="border-t pt-4">
                  <div className="rounded-lg border border-border/60 bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Account passwords for cashier staff are fixed and managed by restaurant administration.</span>
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
          {/* Quick Register Guidelines */}
          <Card className="border-blue-200/60 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <ShieldCheck className="h-4 w-4" /> Cashier Register Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600">✓</span>
                <span>Count opening register float cash before starting the shift.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600">✓</span>
                <span>Always issue a printed or digital receipt for every completed payment.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600">✓</span>
                <span>Verify coupon minimum spend limits before applying discounts.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600">✓</span>
                <span>Confirm bKash/Nagad TrxID matches before releasing takeaway food.</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent POS Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" /> Recent Transactions
                </CardTitle>
                <Link href="/dashboard/pos/transactions">
                  <span className="text-xs text-primary font-medium hover:underline cursor-pointer">
                    View All
                  </span>
                </Link>
              </div>
              <CardDescription>Latest billing payments completed at POS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingPayments ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Loading transactions...
                </div>
              ) : recentPayments.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No billing transactions recorded yet.
                </div>
              ) : (
                recentPayments.map((p) => (
                  <div
                    key={p._id || p.id}
                    className="flex flex-col gap-1 rounded-lg border p-3 text-xs transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">
                        {cleanOrderNumber(p.orderNumber)}
                      </span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-mono text-[11px]">{p.receiptNumber || 'REC-1025'}</span>
                      {getMethodBadge(p.paymentMethod)}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t mt-1">
                      <span>{formatDate(p.createdAt)}</span>
                      <span>{formatTime(p.createdAt)}</span>
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
