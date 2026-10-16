'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, Phone } from 'lucide-react';
import type { Reservation, ReservationStatus } from '@/lib/types';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const statusConfig: Record<ReservationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'outline' },
  no_show: { label: 'No Show', variant: 'destructive' },
};

export default function DashboardReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    api.getReservations().then((data) => {
      if (data && data.length) {
        setReservations(data.map((r: any) => ({ ...r, id: r._id || r.id })));
      }
    }).catch(console.error);
  }, []);

  const filtered = reservations.filter((r) => filterStatus === 'all' || r.status === filterStatus);

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    try {
      await api.updateReservationStatus(id, status);
      toast.success(`Reservation marked as ${status}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update reservation status');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Reservations</h1>
        <p className="text-sm text-muted-foreground">Manage table reservations and bookings</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Today</span></div><p className="text-2xl font-bold">{reservations.filter((r) => r.date === '2026-10-09').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Pending</span></div><p className="text-2xl font-bold">{reservations.filter((r) => r.status === 'pending').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Confirmed</span></div><p className="text-2xl font-bold">{reservations.filter((r) => r.status === 'confirmed').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">Total Guests</span></div><p className="text-2xl font-bold">{reservations.filter((r) => r.status === 'confirmed').reduce((s, r) => s + r.guests, 0)}</p></CardContent></Card>
      </div>

      <div className="flex justify-between items-center">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reservations</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Special Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((res) => (
                <TableRow key={res.id}>
                  <TableCell>
                    <p className="font-medium">{res.customerName}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{res.customerPhone}</p>
                  </TableCell>
                  <TableCell>{res.date}</TableCell>
                  <TableCell>{res.time}</TableCell>
                  <TableCell>{res.guests}</TableCell>
                  <TableCell>{res.tableNumber ? `T${res.tableNumber}` : 'Auto'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{res.specialRequest || '—'}</TableCell>
                  <TableCell><Badge variant={statusConfig[res.status].variant}>{statusConfig[res.status].label}</Badge></TableCell>
                  <TableCell className="text-right">
                    {res.status === 'pending' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(res.id, 'confirmed')}>Confirm</Button>
                    )}
                    {res.status === 'confirmed' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(res.id, 'completed')}>Complete</Button>
                    )}
                    {(res.status === 'pending' || res.status === 'confirmed') && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive ml-1" onClick={() => updateStatus(res.id, 'cancelled')}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
