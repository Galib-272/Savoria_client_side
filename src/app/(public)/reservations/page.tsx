'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Clock, Users, CheckCircle2, Lock, ArrowRight, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { reservations as fallbackReservations } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { getStoredUser, type CurrentUser } from '@/lib/auth';
import type { Reservation } from '@/lib/types';

export default function ReservationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [time, setTime] = useState('7:00 PM');
  const [guests, setGuests] = useState('2');
  const [tableNum, setTableNum] = useState('1');
  const [specialRequest, setSpecialRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recentList, setRecentList] = useState<any[]>(fallbackReservations);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    if (stored) {
      setName(stored.name || '');
      setEmail(stored.email || '');
      setPhone(stored.phone || '');
    }
    setCheckingAuth(false);
  }, []);

  const fetchReservations = () => {
    api.getReservations()
      .then((data) => {
        if (data && data.length) {
          setRecentList(data.map((r: any) => ({ ...r, id: r._id || r.id })));
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (user) {
      fetchReservations();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please select a reservation date');
      return;
    }
    setSubmitting(true);
    try {
      const formattedDate = date.toISOString().split('T')[0];
      await api.createReservation({
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        date: formattedDate,
        time,
        guests: Number(guests) || 2,
        tableNumber: Number(tableNum) || 1,
        seats: ['S1', 'S2'],
        specialRequest,
      });
      setSubmitted(true);
      toast.success('Reservation request submitted successfully!');
      fetchReservations();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit reservation');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Sign In Required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Table reservations are exclusively available for our registered customers.
            Please sign in to your account or create a new one to book a table.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?redirect=/reservations">
              <Button className="w-full sm:w-auto">
                <LogIn className="mr-2 h-4 w-4" /> Sign In
              </Button>
            </Link>
            <Link href="/register?redirect=/reservations">
              <Button variant="outline" className="w-full sm:w-auto">
                Create an Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold">Reserve a Table</h1>
        <p className="mt-2 text-muted-foreground">Book your table for an unforgettable dining experience</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Reservation Form */}
        <Card className="p-6">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mb-2 font-display text-2xl font-bold">Reservation Requested!</h3>
              <p className="text-muted-foreground">We will call you to confirm your reservation shortly.</p>
              <Button className="mt-6" onClick={() => setSubmitted(false)}>
                Make Another Reservation
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+880 1700-000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Select a Date</Label>
                <div className="rounded-lg border border-border p-3">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date()}
                    className="mx-auto"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['12:00 PM', '1:00 PM', '2:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Guests</Label>
                  <Select value={guests} onValueChange={setGuests}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'guest' : 'guests'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Table</Label>
                  <Select value={tableNum} onValueChange={setTableNum}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={String(num)}>Table T{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="request">Special Request (optional)</Label>
                <Textarea
                  id="request"
                  placeholder="Any special requirements? e.g. window seat, birthday celebration..."
                  rows={3}
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !date}>
                {submitting ? 'Submitting...' : 'Request Reservation'}
              </Button>
            </form>
          )}
        </Card>

        {/* Info and Existing Reservations */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4 text-center">
              <CalendarIcon className="mx-auto mb-2 h-6 w-6 text-primary" />
              <h3 className="text-sm font-semibold">Easy Booking</h3>
              <p className="text-xs text-muted-foreground">Reserve in just a few clicks</p>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
              <h3 className="text-sm font-semibold">Flexible Times</h3>
              <p className="text-xs text-muted-foreground">10 AM to 11 PM daily</p>
            </Card>
            <Card className="p-4 text-center">
              <Users className="mx-auto mb-2 h-6 w-6 text-primary" />
              <h3 className="text-sm font-semibold">Any Group Size</h3>
              <p className="text-xs text-muted-foreground">1 to 8 guests</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Recent Reservations</h3>
            <div className="space-y-3">
              {recentList.slice(0, 5).map((res) => (
                <div key={res.id} className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{res.customerName}</p>
                    <p className="text-sm text-muted-foreground">{res.date} at {res.time} · {res.guests} guests (T{res.tableNumber})</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    res.status === 'confirmed' ? 'bg-success/10 text-success' :
                    res.status === 'pending' ? 'bg-warning/10 text-warning' :
                    res.status === 'completed' ? 'bg-primary/10 text-primary' :
                    'bg-destructive/10 text-destructive'
                  }`}>
                    {res.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
