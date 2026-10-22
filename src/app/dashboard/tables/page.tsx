'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Wrench,
  Armchair,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type { Table as TableType, TableStatus, Seat } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { getStoredUser, type CurrentUser } from '@/lib/auth';

const statusConfig: Record<
  TableStatus,
  { label: string; color: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  available: { label: 'Available', color: 'bg-green-500/10 text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-800', icon: CheckCircle },
  occupied: { label: 'Occupied', color: 'bg-red-500/10 text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-800', icon: Users },
  reserved: { label: 'Reserved', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-800', icon: Clock },
  cleaning: { label: 'Cleaning', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-800', icon: Wrench },
  out_of_service: { label: 'Out of Service', color: 'bg-gray-500/10 text-gray-500 dark:text-gray-400', border: 'border-gray-300 dark:border-gray-800', icon: AlertCircle },
};

const DEFAULT_SEATS: Seat[] = [
  { seatNumber: 'S1', status: 'available' },
  { seatNumber: 'S2', status: 'available' },
  { seatNumber: 'S3', status: 'available' },
  { seatNumber: 'S4', status: 'available' },
];

export default function TablesPage() {
  const [tables, setTables] = useState<TableType[]>([]);
  const [filterSection, setFilterSection] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Selected seat dialog state
  const [selectedSeatDialog, setSelectedSeatDialog] = useState<{
    table: TableType;
    seat: Seat;
  } | null>(null);
  const [customerBookingName, setCustomerBookingName] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('7:00 PM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTables = useCallback(() => {
    api
      .getTables()
      .then((data) => {
        if (Array.isArray(data)) {
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
  }, []);

  useEffect(() => {
    const user = getStoredUser();
    setCurrentUser(user);
    if (user?.name) {
      setCustomerBookingName(user.name);
    }

    // Default booking date to today (local date, not UTC)
    setBookingDate(new Intl.DateTimeFormat('en-CA').format(new Date()));

    loadTables();

    // 2. Real-time table updates (rooms are assigned by the server)
    const socket = getSocket();
    if (!socket) return;
    const onTable = (updatedTable: any) => {
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
    socket.on('table:updated', onTable);
    socket.io.on('reconnect', loadTables);
    return () => {
      socket.off('table:updated', onTable);
      socket.io.off('reconnect', loadTables);
    };
  }, [loadTables]);

  const sections = Array.from(new Set(tables.map((t) => t.section)));

  const filteredTables = tables.filter((t) => {
    if (filterSection !== 'all' && t.section !== filterSection) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const updateTableStatus = async (id: string, status: TableStatus) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      await api.updateTableStatus(id, status);
      toast.success(`Table status updated to ${statusConfig[status].label}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update table status');
      loadTables();
    }
  };

  const handleSeatClick = (table: TableType, seat: Seat) => {
    const isCustomer = currentUser?.role === 'customer';

    if (isCustomer) {
      if (seat.status === 'occupied') {
        toast.info(`Seat ${seat.seatNumber} on Table T${String(table.number).padStart(2, '0')} is currently occupied.`);
        return;
      }

      if (seat.status === 'reserved' && seat.currentCustomerName !== currentUser?.name) {
        toast.info(`Seat ${seat.seatNumber} is already reserved by another customer.`);
        return;
      }
    }

    // Both waiters and customers can open the dialog
    setSelectedSeatDialog({ table, seat });
    setCustomerBookingName(seat.currentCustomerName || (isCustomer ? currentUser?.name || '' : ''));
  };

  const updateSeatStatusDirect = async (
    table: TableType,
    seatNumber: 'S1' | 'S2' | 'S3' | 'S4',
    newStatus: 'available' | 'occupied' | 'reserved',
    customerName?: string
  ) => {
    setIsSubmitting(true);
    try {
      const trimmedName = customerName?.trim() || undefined;

      // Optimistic update
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== table.id) return t;
          const updatedSeats = (t.seats || DEFAULT_SEATS).map((s) =>
            s.seatNumber === seatNumber
              ? {
                  ...s,
                  status: newStatus,
                  currentCustomerName: newStatus === 'available' ? undefined : (trimmedName || s.currentCustomerName),
                }
              : s
          );
          return { ...t, seats: updatedSeats };
        })
      );

      await api.updateSeatStatus(table.id, seatNumber, newStatus, trimmedName);
      toast.success(
        `Seat ${seatNumber} on Table T${String(table.number).padStart(2, '0')} updated to ${newStatus}!`
      );
      setSelectedSeatDialog(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update seat status');
      loadTables(); // undo the optimistic change
    } finally {
      setIsSubmitting(false);
    }
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

      // Optimistic update
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

      // Call API
      await api.updateSeatStatus(table.id, seat.seatNumber, nextStatus, nextCustomerName);

      if (nextStatus === 'reserved') {
        toast.success(`Seat ${seat.seatNumber} on Table T${String(table.number).padStart(2, '0')} successfully reserved for ${name}!`);
      } else {
        toast.success(`Seat ${seat.seatNumber} reservation cancelled.`);
      }

      setSelectedSeatDialog(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update seat status');
      loadTables(); // undo the optimistic change
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStaff = currentUser?.role && ['admin', 'manager', 'waiter', 'cashier'].includes(currentUser.role);

  // Count seat metrics
  let totalSeatsAvailable = 0;
  let totalSeatsOccupied = 0;
  let totalSeatsReserved = 0;
  tables.forEach((t) => {
    (t.seats || DEFAULT_SEATS).forEach((s) => {
      if (s.status === 'available') totalSeatsAvailable++;
      else if (s.status === 'occupied') totalSeatsOccupied++;
      else if (s.status === 'reserved') totalSeatsReserved++;
    });
  });

  const counts = {
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    cleaning: tables.filter((t) => t.status === 'cleaning').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {currentUser?.role === 'customer' ? 'Choose Your Table & Seat' : 'Table & Seat Management'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.role === 'customer'
              ? 'Click any table and select an available seat (S1 – S4) to book your dining spot'
              : 'Interactive floor plan and real-time seat allocation for 25 tables'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{counts.available}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Available Tables</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Armchair className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-primary">{totalSeatsAvailable}</p>
              <p className="text-xs text-muted-foreground">Available Seats (S1-S4)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{counts.reserved}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Reserved Tables ({totalSeatsReserved} seats)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{counts.occupied}</p>
              <p className="text-xs text-red-600 dark:text-red-400">Occupied Tables ({totalSeatsOccupied} seats)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seat Legend & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-4">
        {/* Seat button legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-foreground">Seat Legend:</span>
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

        {/* Filters */}
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
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="out_of_service">Out of Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Floor Plan Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTables.map((table) => {
          const config = statusConfig[table.status] || statusConfig.available;
          const seats = table.seats && table.seats.length === 4 ? table.seats : DEFAULT_SEATS;

          return (
            <Card
              key={table.id}
              className={cn(
                'border-2 transition-all hover:shadow-md bg-card/90 overflow-hidden',
                config.border
              )}
            >
              <CardContent className="p-4 space-y-3">
                {/* Header: Table number + Section + Status */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-lg font-bold">
                        T{String(table.number).padStart(2, '0')}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-medium py-0 px-1.5">
                        {table.section}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Capacity: 4 guests</p>
                  </div>
                  <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', config.color)}>
                    <config.icon className="h-3.5 w-3.5" />
                    <span>{config.label}</span>
                  </div>
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

                {/* Table details & Staff actions */}
                {table.waiterName && (
                  <p className="text-[11px] text-muted-foreground">Waiter: {table.waiterName}</p>
                )}

                {isStaff && (
                  <div className="pt-1 flex gap-1 border-t border-border/50">
                    {table.status === 'available' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-xs"
                        onClick={() => updateTableStatus(table.id, 'occupied')}
                      >
                        Occupy Table
                      </Button>
                    )}
                    {table.status === 'occupied' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-xs"
                        onClick={() => updateTableStatus(table.id, 'cleaning')}
                      >
                        Clear Table
                      </Button>
                    )}
                    {table.status === 'cleaning' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-xs"
                        onClick={() => updateTableStatus(table.id, 'available')}
                      >
                        Mark Ready
                      </Button>
                    )}
                    {table.status === 'reserved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-xs"
                        onClick={() => updateTableStatus(table.id, 'occupied')}
                      >
                        Seat Guests
                      </Button>
                    )}
                    {table.status === 'out_of_service' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-xs"
                        onClick={() => updateTableStatus(table.id, 'available')}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* SEAT MANAGEMENT DIALOG (WAITER / STAFF VS CUSTOMER) */}
      {selectedSeatDialog && (
        <Dialog open={!!selectedSeatDialog} onOpenChange={(open) => !open && setSelectedSeatDialog(null)}>
          {isStaff ? (
            /* ================= WAITER / STAFF SEAT CONTROL DIALOG ================= */
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Armchair className="h-5 w-5 text-primary" />
                  Manage Seat {selectedSeatDialog.seat.seatNumber} — Table T
                  {String(selectedSeatDialog.table.number).padStart(2, '0')}
                </DialogTitle>
                <DialogDescription>
                  Section: <span className="font-semibold text-foreground">{selectedSeatDialog.table.section}</span> · Current Status:{' '}
                  <span
                    className={cn(
                      'font-bold capitalize',
                      selectedSeatDialog.seat.status === 'available'
                        ? 'text-green-600'
                        : selectedSeatDialog.seat.status === 'reserved'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    )}
                  >
                    {selectedSeatDialog.seat.status}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Visual Seat Representation */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold border-2 shadow-sm',
                        selectedSeatDialog.seat.status === 'available'
                          ? 'bg-green-500 text-white border-green-600'
                          : selectedSeatDialog.seat.status === 'reserved'
                          ? 'bg-yellow-400 text-neutral-900 border-yellow-500'
                          : 'bg-red-500 text-white border-red-600'
                      )}
                    >
                      {selectedSeatDialog.seat.seatNumber}
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        Seat {selectedSeatDialog.seat.seatNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedSeatDialog.seat.currentCustomerName
                          ? `Guest: ${selectedSeatDialog.seat.currentCustomerName}`
                          : 'No customer assigned'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      'capitalize font-semibold',
                      selectedSeatDialog.seat.status === 'available'
                        ? 'bg-green-500/15 text-green-700 border-green-300'
                        : selectedSeatDialog.seat.status === 'reserved'
                        ? 'bg-yellow-500/15 text-yellow-800 border-yellow-300'
                        : 'bg-red-500/15 text-red-700 border-red-300'
                    )}
                  >
                    {selectedSeatDialog.seat.status}
                  </Badge>
                </div>

                {/* Guest / Customer Name Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="staffGuestName">Guest / Customer Name (optional)</Label>
                  <Input
                    id="staffGuestName"
                    value={customerBookingName}
                    onChange={(e) => setCustomerBookingName(e.target.value)}
                    placeholder="Enter guest or customer name"
                  />
                </div>

                {/* 3 Quick Status Action Buttons */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Change Seat Status
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        updateSeatStatusDirect(
                          selectedSeatDialog.table,
                          selectedSeatDialog.seat.seatNumber,
                          'available'
                        )
                      }
                      className={cn(
                        'h-14 flex flex-col items-center justify-center gap-0.5 rounded-xl font-bold transition-all border-2 shadow-sm',
                        selectedSeatDialog.seat.status === 'available'
                          ? 'bg-green-600 text-white border-green-700 ring-2 ring-green-400'
                          : 'bg-green-500 hover:bg-green-600 text-white border-green-600 active:scale-95'
                      )}
                    >
                      <span className="text-sm">Available</span>
                      <span className="text-[10px] font-normal opacity-90">Green</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        updateSeatStatusDirect(
                          selectedSeatDialog.table,
                          selectedSeatDialog.seat.seatNumber,
                          'occupied',
                          customerBookingName
                        )
                      }
                      className={cn(
                        'h-14 flex flex-col items-center justify-center gap-0.5 rounded-xl font-bold transition-all border-2 shadow-sm',
                        selectedSeatDialog.seat.status === 'occupied'
                          ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-400'
                          : 'bg-red-500 hover:bg-red-600 text-white border-red-600 active:scale-95'
                      )}
                    >
                      <span className="text-sm">Occupied</span>
                      <span className="text-[10px] font-normal opacity-90">Red</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() =>
                        updateSeatStatusDirect(
                          selectedSeatDialog.table,
                          selectedSeatDialog.seat.seatNumber,
                          'reserved',
                          customerBookingName
                        )
                      }
                      className={cn(
                        'h-14 flex flex-col items-center justify-center gap-0.5 rounded-xl font-bold transition-all border-2 shadow-sm',
                        selectedSeatDialog.seat.status === 'reserved'
                          ? 'bg-yellow-500 text-neutral-900 border-yellow-600 ring-2 ring-yellow-300'
                          : 'bg-yellow-400 hover:bg-yellow-500 text-neutral-900 border-yellow-500 active:scale-95'
                      )}
                    >
                      <span className="text-sm">Reserved</span>
                      <span className="text-[10px] font-normal opacity-90">Yellow</span>
                    </button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" className="w-full" onClick={() => setSelectedSeatDialog(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          ) : (
            /* ================= CUSTOMER RESERVATION DIALOG ================= */
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Armchair className="h-5 w-5 text-primary" />
                  Select Seat {selectedSeatDialog.seat.seatNumber} on Table T
                  {String(selectedSeatDialog.table.number).padStart(2, '0')}
                </DialogTitle>
                <DialogDescription>
                  Section: <span className="font-semibold text-foreground">{selectedSeatDialog.table.section}</span> · Current status:{' '}
                  <span className="capitalize font-semibold text-primary">{selectedSeatDialog.seat.status}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold border-2 shadow-sm',
                        selectedSeatDialog.seat.status === 'available'
                          ? 'bg-green-500 text-white border-green-600'
                          : selectedSeatDialog.seat.status === 'reserved'
                          ? 'bg-yellow-400 text-neutral-900 border-yellow-500'
                          : 'bg-red-500 text-white border-red-600'
                      )}
                    >
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
                  <Label htmlFor="bookingName">Your Name</Label>
                  <Input
                    id="bookingName"
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

                {selectedSeatDialog.seat.currentCustomerName && (
                  <div className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
                    Reserved by:{' '}
                    <span className="font-semibold text-foreground">
                      {selectedSeatDialog.seat.currentCustomerName}
                    </span>
                  </div>
                )}
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
          )}
        </Dialog>
      )}
    </div>
  );
}
