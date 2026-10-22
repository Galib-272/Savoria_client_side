'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
  Armchair,
  Check,
  X,
} from 'lucide-react';
import type { Reservation, ReservationStatus } from '@/lib/types';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const statusConfig: Record<
  ReservationStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }
> = {
  pending: { label: 'Pending Approval', variant: 'secondary', color: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700' },
  confirmed: { label: 'Confirmed', variant: 'default', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-700' },
  cancelled: { label: 'Declined / Cancelled', variant: 'destructive', color: 'bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-700' },
  completed: { label: 'Completed', variant: 'outline', color: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-700' },
  no_show: { label: 'No Show', variant: 'destructive', color: 'bg-gray-500/10 text-gray-600 border-gray-300 dark:border-gray-700' },
};

export default function DashboardReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    try {
      const data = await api.getReservations();
      if (Array.isArray(data)) {
        setReservations(data.map((r: any) => ({ ...r, id: r._id || r.id })));
      }
    } catch (err: any) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();

    // Data refresh only — the bell in the header shows the popup for new requests
    const socket = getSocket();
    if (!socket) return;
    const handleNewRequest = (data: any) => {
      const reservation = data?.reservation;
      if (!reservation) return;
      const resObj = { ...reservation, id: reservation._id || reservation.id };
      setReservations((prev) => [resObj, ...prev.filter((r) => r.id !== resObj.id)]);
    };
    const handleStatusUpdate = (data: any) => {
      const reservation = data?.reservation;
      if (!reservation) return;
      const resObj = { ...reservation, id: reservation._id || reservation.id };
      setReservations((prev) => prev.map((r) => (r.id === resObj.id ? { ...r, ...resObj } : r)));
    };
    socket.on('reservation:new_request', handleNewRequest);
    socket.on('reservation:status_update', handleStatusUpdate);
    socket.io.on('reconnect', fetchReservations);
    return () => {
      socket.off('reservation:new_request', handleNewRequest);
      socket.off('reservation:status_update', handleStatusUpdate);
      socket.io.off('reconnect', fetchReservations);
    };
  }, []);

  const pendingRequests = reservations.filter((r) => r.status === 'pending');
  const filtered = reservations.filter((r) => filterStatus === 'all' || r.status === filterStatus);

  const handleUpdateStatus = async (id: string, status: ReservationStatus, customerName?: string, tableNum?: number) => {
    if (status === 'cancelled' && !window.confirm(`Decline / cancel the reservation for ${customerName}?`)) return;
    // Optimistic update
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await api.updateReservationStatus(id, status);
      if (status === 'confirmed') {
        toast.success(`Reservation Accepted! Table T${tableNum} is now reserved for ${customerName}.`);
      } else if (status === 'cancelled') {
        toast.error(`Reservation for ${customerName} was declined.`);
      } else {
        toast.success(`Reservation marked as ${status}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update reservation status');
      fetchReservations(); // revert on error
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Reservations Management</h1>
          <p className="text-sm text-muted-foreground">
            Review customer reservation requests, approve table bookings, and coordinate floor seating.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReservations} className="self-start sm:self-auto">
          Refresh List
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">All Reservations</span>
            </div>
            <p className="text-2xl font-bold">{reservations.length}</p>
          </CardContent>
        </Card>
        <Card className={`border-border/60 shadow-sm ${pendingRequests.length > 0 ? 'bg-amber-500/5 border-amber-300 dark:border-amber-800' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium">Pending Requests</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingRequests.length}</p>
              {pendingRequests.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 animate-pulse">
                  Action Required
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground font-medium">Confirmed</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {reservations.filter((r) => r.status === 'confirmed').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Confirmed Guests</span>
            </div>
            <p className="text-2xl font-bold">
              {reservations.filter((r) => r.status === 'confirmed').reduce((s, r) => s + (r.guests || 1), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reservations Urgent Alert Box */}
      {pendingRequests.length > 0 && (
        <Card className="border-2 border-amber-400/80 bg-amber-50/50 dark:bg-amber-950/20 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-900 dark:text-amber-200">
                <Bell className="h-5 w-5 text-amber-600 animate-bounce" />
                Pending Reservation Requests ({pendingRequests.length})
              </CardTitle>
              <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-100 dark:bg-amber-900/40">
                Waiter Attention
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {pendingRequests.map((res) => (
              <div
                key={res.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-background/90 p-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-base">{res.customerName}</span>
                    <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-xs font-semibold">
                      Table T{res.tableNumber}
                    </Badge>
                    {res.seats && res.seats.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        <Armchair className="h-3 w-3" /> {res.seats.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> {res.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-500" /> {res.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-emerald-500" /> {res.guests} guest(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {res.customerPhone}
                    </span>
                  </div>
                  {res.specialRequest && (
                    <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded border border-amber-200/60 dark:border-amber-800/60 mt-1 max-w-lg">
                      <span className="font-semibold">Note:</span> {res.specialRequest}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm h-9 px-4 gap-1.5"
                    onClick={() => handleUpdateStatus(res.id, 'confirmed', res.customerName, res.tableNumber)}
                  >
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 px-4 gap-1.5 shadow-sm"
                    onClick={() => handleUpdateStatus(res.id, 'cancelled', res.customerName, res.tableNumber)}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filter and Table List */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reservations ({reservations.length})</SelectItem>
              <SelectItem value="pending">Pending ({pendingRequests.length})</SelectItem>
              <SelectItem value="confirmed">Confirmed ({reservations.filter((r) => r.status === 'confirmed').length})</SelectItem>
              <SelectItem value="completed">Completed ({reservations.filter((r) => r.status === 'completed').length})</SelectItem>
              <SelectItem value="cancelled">Declined / Cancelled ({reservations.filter((r) => r.status === 'cancelled').length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Customer</TableHead>
                <TableHead>Table & Seats</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Special Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading reservations...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No reservations found matching the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((res) => {
                  const cfg = statusConfig[res.status] || statusConfig.pending;
                  return (
                    <TableRow key={res.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <p className="font-semibold text-foreground">{res.customerName}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" /> {res.customerPhone}
                        </p>
                        {res.customerEmail && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {res.customerEmail}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-primary">
                            {res.tableNumber ? `Table T${res.tableNumber}` : 'Auto Assigned'}
                          </span>
                          {res.seats && res.seats.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded w-fit">
                              <Armchair className="h-3 w-3" /> {res.seats.join(', ')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium text-foreground">{res.date}</p>
                          <p className="text-xs text-muted-foreground">{res.time}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {res.guests}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {res.specialRequest || '—'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {res.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 gap-1"
                                onClick={() => handleUpdateStatus(res.id, 'confirmed', res.customerName, res.tableNumber)}
                              >
                                <Check className="h-3.5 w-3.5" /> Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs px-2.5 gap-1"
                                onClick={() => handleUpdateStatus(res.id, 'cancelled', res.customerName, res.tableNumber)}
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          {res.status === 'confirmed' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs px-3"
                                onClick={() => handleUpdateStatus(res.id, 'completed', res.customerName, res.tableNumber)}
                              >
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs px-2"
                                onClick={() => handleUpdateStatus(res.id, 'no_show', res.customerName, res.tableNumber)}
                              >
                                No-show
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-destructive hover:bg-destructive/10 px-2"
                                onClick={() => handleUpdateStatus(res.id, 'cancelled', res.customerName, res.tableNumber)}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {(res.status === 'cancelled' || res.status === 'completed' || res.status === 'no_show') && (
                            <span className="text-xs text-muted-foreground italic px-2">No actions</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
