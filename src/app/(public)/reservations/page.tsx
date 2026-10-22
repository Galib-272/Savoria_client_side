'use client';

import { RequireRole } from '@/components/auth/require-role';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  LogIn,
  Armchair,
  Check,
  AlertCircle,
  XCircle,
  Sparkles,
  Info,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getStoredUser, type CurrentUser } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import type { Table as TableType, TableStatus, Seat, Reservation, ReservationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const DEFAULT_SEATS: Seat[] = [
  { seatNumber: 'S1', status: 'available' },
  { seatNumber: 'S2', status: 'available' },
  { seatNumber: 'S3', status: 'available' },
  { seatNumber: 'S4', status: 'available' },
];

const statusConfig: Record<
  TableStatus,
  { label: string; badgeClass: string; borderClass: string; bgClass: string }
> = {
  available: {
    label: 'Available',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
    borderClass: 'border-emerald-200 dark:border-emerald-800/60',
    bgClass: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
  },
  occupied: {
    label: 'Occupied',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800',
    borderClass: 'border-rose-200 dark:border-rose-800/60',
    bgClass: 'bg-rose-50/20 dark:bg-rose-950/10 opacity-75',
  },
  reserved: {
    label: 'Reserved',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800',
    borderClass: 'border-amber-200 dark:border-amber-800/60',
    bgClass: 'bg-amber-50/20 dark:bg-amber-950/10 opacity-80',
  },
  cleaning: {
    label: 'Cleaning',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800',
    borderClass: 'border-blue-200 dark:border-blue-800/60',
    bgClass: 'opacity-70',
  },
  out_of_service: {
    label: 'Out of Service',
    badgeClass: 'bg-gray-500/10 text-gray-500 border-gray-300 dark:border-gray-800',
    borderClass: 'border-gray-200 dark:border-gray-800/60',
    bgClass: 'opacity-50 cursor-not-allowed',
  },
};

const reservationStatusConfig: Record<
  ReservationStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: 'Pending Waiter Approval',
    color: 'bg-amber-500/15 text-amber-600 border-amber-300 dark:border-amber-700',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed by Waiter',
    color: 'bg-emerald-500/15 text-emerald-600 border-emerald-300 dark:border-emerald-700',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Declined by Waiter',
    color: 'bg-rose-500/15 text-rose-600 border-rose-300 dark:border-rose-700',
    icon: XCircle,
  },
  completed: {
    label: 'Completed',
    color: 'bg-blue-500/15 text-blue-600 border-blue-300 dark:border-blue-700',
    icon: CheckCircle2,
  },
  no_show: {
    label: 'No Show',
    color: 'bg-gray-500/15 text-gray-600 border-gray-300 dark:border-gray-700',
    icon: AlertCircle,
  },
};

/** YYYY-MM-DD in the user's own timezone (toISOString() would shift the day for Bangladesh, UTC+6) */
const toLocalDateString = (d: Date) => new Intl.DateTimeFormat('en-CA').format(d);

function ReservationsPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Live tables state
  const [tables, setTables] = useState<TableType[]>([]);
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [tablesLoading, setTablesLoading] = useState(true);

  // Selection state (initially null - customer must pick)
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Booking Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('7:00 PM');
  const [guests, setGuests] = useState('1');
  const [specialRequest, setSpecialRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // User's reservation history
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  // Seats already booked by other reservations for the chosen date & time
  const [bookedSeats, setBookedSeats] = useState<Record<string, string[]>>({});
  const dateStr = date ? toLocalDateString(date) : '';
  const isToday = dateStr === toLocalDateString(new Date());

  // 1. Check Auth & pre-populate
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

  // 2. Fetch live tables
  const fetchTables = async () => {
    try {
      const data = await api.getTables();
      if (data && data.length) {
        setTables(
          data.map((t: any) => ({
            ...t,
            id: t._id || t.id,
            seats: t.seats && t.seats.length === 4 ? t.seats : DEFAULT_SEATS,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    } finally {
      setTablesLoading(false);
    }
  };

  // 3. Fetch reservations
  const fetchReservations = async () => {
    try {
      const data = await api.getReservations();
      setMyReservations((Array.isArray(data) ? data : []).map((r: any) => ({ ...r, id: r._id || r.id })));
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    }
  };

  useEffect(() => {
    fetchTables();
    if (user) {
      fetchReservations();
    }
  }, [user]);

  // 4. Socket Listeners for Real-Time Status Updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;


    // Live Table updates from staff/waiter actions
    const handleTableUpdated = (updatedTable: any) => {
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
    };

    // Live status of the customer's own reservations (the bell shows the popup)
    const handleReservationStatusUpdate = (data: any) => {
      const reservation = data?.reservation;
      if (!reservation) return;
      const resId = reservation._id || reservation.id;
      setMyReservations((prev) => prev.map((r) => (r.id === resId ? { ...r, status: reservation.status } : r)));
      fetchTables();
    };

    socket.on('table:updated', handleTableUpdated);
    socket.on('reservation:status_update', handleReservationStatusUpdate);

    return () => {
      socket.off('table:updated', handleTableUpdated);
      socket.off('reservation:status_update', handleReservationStatusUpdate);
    };
  }, []);

  // Update guest count when selected seats change
  const handleToggleSeat = (tableNumber: number, seatNum: string, seatStatus: string) => {
    if (seatStatus !== 'available') {
      toast.warning(`Seat ${seatNum} on Table T${tableNumber} is ${seatStatus}. Please pick an available seat.`);
      return;
    }

    if (selectedTableNumber !== tableNumber) {
      // Switching tables, set this table and this seat
      setSelectedTableNumber(tableNumber);
      setSelectedSeats([seatNum]);
      setGuests('1');
      return;
    }

    // Toggling seats on current table
    if (selectedSeats.includes(seatNum)) {
      const updated = selectedSeats.filter((s) => s !== seatNum);
      if (updated.length === 0) {
        // All seats deselected, unselect table
        setSelectedTableNumber(null);
        setSelectedSeats([]);
        setGuests('1');
      } else {
        setSelectedSeats(updated);
        setGuests(String(updated.length));
      }
    } else {
      const updated = [...selectedSeats, seatNum].sort();
      setSelectedSeats(updated);
      setGuests(String(updated.length));
    }
  };

  const handleSelectEntireTable = (table: TableType) => {
    if (table.status === 'occupied' || table.status === 'out_of_service') {
      toast.warning(`Table T${table.number} is currently ${table.status}.`);
      return;
    }

    if (selectedTableNumber === table.number) {
      // Clicking already selected table deselects it
      setSelectedTableNumber(null);
      setSelectedSeats([]);
      setGuests('1');
      return;
    }

    const availableSeats = (table.seats || DEFAULT_SEATS)
      .filter((s) => s.status === 'available')
      .map((s) => s.seatNumber);

    if (availableSeats.length === 0) {
      toast.warning(`All seats at Table T${table.number} are currently reserved or occupied.`);
      return;
    }

    setSelectedTableNumber(table.number);
    setSelectedSeats(availableSeats);
    setGuests(String(availableSeats.length));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please select a reservation date');
      return;
    }
    if (!selectedTableNumber || selectedSeats.length === 0) {
      toast.error('Please select a table and at least one available seat from the floor map.');
      return;
    }

    setSubmitting(true);
    try {
      const formattedDate = toLocalDateString(date);
      const payload = {
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        date: formattedDate,
        time,
        guests: Number(guests) || selectedSeats.length,
        tableNumber: selectedTableNumber,
        seats: selectedSeats,
        specialRequest,
      };

      const res = await api.createReservation(payload);

      setSubmitted(true);
      toast.success('Reservation Request Sent! 🔔', {
        description: `Your request for Table T${selectedTableNumber} (${selectedSeats.join(', ')}) has been dispatched to all waiters for approval.`,
        duration: 8000,
      });

      // Refetch reservations and tables
      fetchReservations();
      fetchTables();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit reservation request');
    } finally {
      setSubmitting(false);
    }
  };

  // Seats booked for the chosen date & time (other customers' reservations)
  useEffect(() => {
    if (!dateStr || !time) return;
    let alive = true;
    api
      .getReservationAvailability(dateStr, time)
      .then((booked) => alive && setBookedSeats(booked))
      .catch(() => alive && setBookedSeats({}));
    return () => {
      alive = false;
    };
  }, [dateStr, time, myReservations.length]);

  // Seat availability for the chosen slot: booked seats are reserved; "occupied right now" only matters for today
  const displayTables: TableType[] = tables.map((t) => {
    const booked = bookedSeats[String(t.number)] || [];
    const unusable = t.status === 'out_of_service' || (isToday && t.status === 'cleaning');
    const seats = (t.seats || DEFAULT_SEATS).map((seat) => ({
      ...seat,
      status: (unusable
        ? 'occupied'
        : booked.includes(seat.seatNumber)
        ? 'reserved'
        : isToday && seat.status === 'occupied'
        ? 'occupied'
        : 'available') as Seat['status'],
    }));
    const free = seats.filter((s) => s.status === 'available').length;
    const status: TableType['status'] = unusable
      ? t.status
      : free === 4
      ? 'available'
      : seats.some((s) => s.status === 'occupied')
      ? 'occupied'
      : 'reserved';
    return { ...t, seats, status };
  });

  // Drop a selection that just became unavailable for the new date/time
  useEffect(() => {
    if (!selectedTableNumber) return;
    const table = displayTables.find((t) => t.number === selectedTableNumber);
    const stillFree = selectedSeats.filter((s) => table?.seats?.find((x) => x.seatNumber === s)?.status === 'available');
    if (stillFree.length !== selectedSeats.length) {
      setSelectedSeats(stillFree);
      if (stillFree.length === 0) setSelectedTableNumber(null);
      toast.info('Some selected seats are already booked for that date/time — please pick again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookedSeats, isToday]);

  const cancelReservation = async (res: Reservation) => {
    if (!window.confirm(`Cancel your reservation for Table T${res.tableNumber} on ${res.date} at ${res.time}?`)) return;
    try {
      await api.cancelMyReservation(res.id);
      toast.success('Reservation cancelled');
      fetchReservations();
    } catch (err: any) {
      toast.error(err.message || 'Could not cancel the reservation');
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
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
            Table reservations and live seat selection are exclusively available for our registered customers.
            Please sign in to select a table and send a booking request.
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

  // Filter tables
  const sections = Array.from(new Set(tables.map((t) => t.section).filter(Boolean)));
  const filteredTables = displayTables.filter((t) => {
    if (selectedSection !== 'all' && t.section !== selectedSection) return false;
    if (selectedStatusFilter !== 'all' && t.status !== selectedStatusFilter) return false;
    return true;
  });

  const selectedTableObj = displayTables.find((t) => t.number === selectedTableNumber);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 px-3 py-1 text-xs font-semibold">
          Interactive Dining Booking
        </Badge>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Choose Your Table & Seats</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View live table availability, select your preferred seating location, and send a reservation request directly to our floor waiters.
        </p>
      </div>

      {/* Main Grid: Interactive Floor Map on Left/Top, Booking Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Interactive Table & Seat Map (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border/80 shadow-md">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Live Restaurant Floor Map
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click any available table and select the seats (S1 - S4) you desire.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTables}
                  className="h-8 gap-1 text-xs self-start sm:self-auto"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
              </div>

              {/* Status Legend */}
              <div className="flex flex-wrap items-center gap-3 pt-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" /> Available
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-3 w-3 rounded-full bg-amber-500 shadow-sm" /> Reserved
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-3 w-3 rounded-full bg-rose-500 shadow-sm" /> Occupied
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-3 w-3 rounded-full bg-primary ring-2 ring-primary/40 shadow-sm" /> Selected by You
                </span>
              </div>

              {/* Section Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant={selectedSection === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedSection('all')}
                  className="h-7 text-xs rounded-full"
                >
                  All Sections
                </Button>
                {sections.map((sec) => (
                  <Button
                    key={sec}
                    size="sm"
                    variant={selectedSection === sec ? 'default' : 'outline'}
                    onClick={() => setSelectedSection(sec)}
                    className="h-7 text-xs rounded-full"
                  >
                    {sec}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {tablesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm">Loading floor layout & seat availability...</p>
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No tables found in this section.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredTables.map((table) => {
                    const isTableSelected = selectedTableNumber === table.number;
                    const cfg = statusConfig[table.status] || statusConfig.available;
                    const tableSeats = table.seats && table.seats.length === 4 ? table.seats : DEFAULT_SEATS;

                    return (
                      <div
                        key={table.id || table.number}
                        className={cn(
                          'relative rounded-xl border p-3.5 transition-all duration-200 shadow-sm flex flex-col justify-between gap-3',
                          cfg.borderClass,
                          isTableSelected
                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md'
                            : cfg.bgClass
                        )}
                      >
                        {/* Table Header */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleSelectEntireTable(table)}
                            className="text-left font-bold text-foreground text-sm flex items-center gap-1.5 hover:text-primary transition-colors"
                          >
                            <span>Table T{table.number}</span>
                            {isTableSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </button>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                              cfg.badgeClass
                            )}
                          >
                            {cfg.label}
                          </span>
                        </div>

                        {/* Section info */}
                        <p className="text-[11px] text-muted-foreground">{table.section || 'Main Dining'}</p>

                        {/* 4 Seats Visualization */}
                        <div className="bg-background/80 dark:bg-card/90 rounded-lg p-2.5 border border-border/50">
                          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                            Seats ({tableSeats.filter((s) => s.status === 'available').length}/4 Free)
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {tableSeats.map((seat) => {
                              const isSeatSelected =
                                isTableSelected && selectedSeats.includes(seat.seatNumber);
                              const isAvailable = seat.status === 'available';

                              return (
                                <button
                                  key={seat.seatNumber}
                                  type="button"
                                  onClick={() => handleToggleSeat(table.number, seat.seatNumber, seat.status)}
                                  disabled={!isAvailable && !isSeatSelected}
                                  className={cn(
                                    'flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                                    isSeatSelected
                                      ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary'
                                      : seat.status === 'occupied'
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900 cursor-not-allowed opacity-60'
                                      : seat.status === 'reserved'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-900 cursor-not-allowed opacity-70'
                                      : 'bg-muted/70 hover:bg-emerald-500/15 hover:text-emerald-700 text-foreground border border-border/60 hover:border-emerald-300'
                                  )}
                                  title={`Seat ${seat.seatNumber}: ${seat.status}`}
                                >
                                  <span className="flex items-center gap-1 font-semibold shrink-0">
                                    <Armchair className="h-3 w-3" />
                                    {seat.seatNumber}
                                  </span>
                                  {isSeatSelected ? (
                                    <span className="flex items-center gap-0.5 text-[10px] font-bold">
                                      <Check className="h-3 w-3" />
                                    </span>
                                  ) : (
                                    <span className="text-[9px] opacity-75 capitalize truncate">{seat.status}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Quick Selection button */}
                        <Button
                          type="button"
                          variant={isTableSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSelectEntireTable(table)}
                          disabled={table.status === 'occupied' || table.status === 'out_of_service'}
                          className="w-full h-7 text-xs font-semibold"
                        >
                          {isTableSelected ? 'Table Selected ✓' : 'Select Table'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Reservation Request Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/80 shadow-md">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Reservation Details
              </CardTitle>
              <CardDescription className="text-xs">
                Complete your details and submit request to the floor waiter.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">Request Dispatched!</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Your reservation request for Table T{selectedTableNumber} ({selectedSeats.join(', ')}) has been sent. Waiters have received an alert to accept or reject it.
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3 text-xs w-full text-left space-y-1">
                    <p><span className="font-semibold">Table:</span> T{selectedTableNumber} ({selectedTableObj?.section || 'Main Dining'})</p>
                    <p><span className="font-semibold">Seats:</span> {selectedSeats.join(', ')}</p>
                    <p><span className="font-semibold">Time:</span> {dateStr} at {time}</p>
                    <p><span className="font-semibold">Status:</span> <span className="text-amber-600 font-semibold">Pending Waiter Approval</span></p>
                  </div>
                  <Button
                    className="w-full text-xs font-semibold"
                    onClick={() => {
                      setSubmitted(false);
                      setSelectedTableNumber(null);
                      setSelectedSeats([]);
                    }}
                  >
                    Make Another Reservation
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Selected Table / Seats Highlight Pill */}
                  {selectedTableNumber && selectedSeats.length > 0 ? (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Selected Dining Spot</p>
                        <p className="text-base font-bold text-foreground">
                          Table T{selectedTableNumber} · {selectedSeats.length} Seat(s)
                        </p>
                        <p className="text-[11px] text-muted-foreground">{selectedTableObj?.section || 'Main Dining'}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedSeats.map((s) => (
                          <span key={s} className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                            {s}
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTableNumber(null);
                            setSelectedSeats([]);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-destructive underline ml-1"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-4 text-center space-y-1">
                      <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
                        <Armchair className="h-4 w-4 text-primary" /> No Table Selected Yet
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Please click an available table on the floor map to pick your table and seats.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cust-name" className="text-xs font-semibold">Full Name</Label>
                      <Input
                        id="cust-name"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cust-phone" className="text-xs font-semibold">Phone Number</Label>
                      <Input
                        id="cust-phone"
                        placeholder="+880 1700-000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cust-email" className="text-xs font-semibold">Email (Optional)</Label>
                    <Input
                      id="cust-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Calendar Date Picker */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Date of Dining</Label>
                    <div className="rounded-lg border border-border p-2 bg-card">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="mx-auto"
                      />
                    </div>
                  </div>

                  {/* Time and Guests */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Time Slot</Label>
                      <Select value={time} onValueChange={setTime}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['12:00 PM', '1:00 PM', '2:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'].map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Guests Count</Label>
                      <Select value={guests} onValueChange={setGuests}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <SelectItem key={n} value={String(n)} className="text-xs">
                              {n} {n === 1 ? 'Guest' : 'Guests'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Special Request */}
                  <div className="space-y-1.5">
                    <Label htmlFor="special-req" className="text-xs font-semibold">Special Requests (Optional)</Label>
                    <Textarea
                      id="special-req"
                      placeholder="e.g. Birthday anniversary, quiet corner, baby chair needed..."
                      rows={2}
                      value={specialRequest}
                      onChange={(e) => setSpecialRequest(e.target.value)}
                      className="text-xs resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-10 font-bold text-sm shadow-md transition-all gap-2"
                    disabled={submitting || !date || !selectedTableNumber || selectedSeats.length === 0}
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Sending Request to Waiters...
                      </>
                    ) : !selectedTableNumber || selectedSeats.length === 0 ? (
                      <>
                        <Armchair className="h-4 w-4" /> Pick a Table & Seat from Map to Book
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Request Reservation (Table T{selectedTableNumber} · {selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'})
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Active Reservations / Tracker */}
          <Card className="border-border/80 shadow-md">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Your Reservations
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchReservations} className="h-7 text-xs px-2">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {myReservations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No reservations requested yet. Pick a table above to get started!
                </p>
              ) : (
                myReservations.slice(0, 4).map((res) => {
                  const cfg = reservationStatusConfig[res.status] || reservationStatusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={res.id}
                      className="rounded-xl border border-border/70 p-3 bg-muted/20 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">
                          Table T{res.tableNumber} {res.seats && res.seats.length > 0 ? `(${res.seats.join(', ')})` : ''}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                            cfg.color
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{res.date} at {res.time}</span>
                        <span>{res.guests} guest(s)</span>
                      </div>
                      {(res.status === 'pending' || res.status === 'confirmed') && (
                        <button
                          type="button"
                          onClick={() => cancelReservation(res)}
                          className="self-end text-[11px] font-semibold text-destructive hover:underline"
                        >
                          Cancel reservation
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <RequireRole roles={['customer']}>
      <ReservationsPageContent />
    </RequireRole>
  );
}
