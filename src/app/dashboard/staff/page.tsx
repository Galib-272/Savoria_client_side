'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { StaffMember, StaffStatus } from '@/lib/types';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const roleColors: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-green-100 text-green-700',
  kitchen: 'bg-amber-100 text-amber-700',
  waiter: 'bg-cyan-100 text-cyan-700',
  delivery: 'bg-purple-100 text-purple-700',
  customer: 'bg-gray-100 text-gray-700',
};

const statusConfig: Record<StaffStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  inactive: { label: 'Inactive', variant: 'outline' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  on_leave: { label: 'On Leave', variant: 'secondary' },
};

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [suspendStaff, setSuspendStaff] = useState<StaffMember | null>(null);

  // Form states for new staff
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('waiter');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null);
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const myId = currentUser?.id || currentUser?._id;
  /** Managers may only manage front-of-house / kitchen / delivery staff (same rule as the server) */
  const canManage = (staff: StaffMember) =>
    staff.role !== 'admin' && staff.id !== myId && (isAdmin || ['cashier', 'kitchen', 'waiter', 'delivery'].includes(staff.role));

  useEffect(() => {
    api
      .getStaff()
      .then((staff) => setStaffList((Array.isArray(staff) ? staff : []).map((s: any) => ({ ...s, id: s._id || s.id }))))
      .catch((err) => toast.error(err.message || 'Failed to load staff'));
  }, []);

  const handleDelete = async () => {
    if (!deleteStaff) return;
    try {
      await api.deleteStaff(deleteStaff.id);
      setStaffList((prev) => prev.filter((s) => s.id !== deleteStaff.id));
      toast.success(`${deleteStaff.name} removed`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete staff member');
    } finally {
      setDeleteStaff(null);
    }
  };

  const handleAddStaff = async () => {
    if (!newName || !newEmail || !newPassword || !newRole) {
      toast.error('Name, email, password, and role are required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createStaff({
        name: newName,
        email: newEmail,
        password: newPassword,
        phone: newPhone,
        role: newRole,
      });
      toast.success('Staff member created successfully');
      setStaffList((prev) => [{ ...res.data, id: res.data._id || res.data.id }, ...prev]);
      setAddOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create staff');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!suspendStaff) return;
    const newStatus: StaffStatus = suspendStaff.status === 'suspended' ? 'active' : 'suspended';

    try {
      await api.updateStaff(suspendStaff.id, { status: newStatus });
      toast.success(`${suspendStaff.name} status updated to ${newStatus}`);
      setStaffList((prev) =>
        prev.map((s) => (s.id === suspendStaff.id ? { ...s, status: newStatus } : s))
      );
      setSuspendStaff(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && s.role !== roleFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage employees, roles, and permissions (10 Waiters policy)
            {!isAdmin && ' — only the Main Admin can add or remove accounts'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Staff
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {['admin', 'manager', 'cashier', 'kitchen', 'waiter', 'delivery'].map((role) => (
          <Card key={role}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold capitalize">{staffList.filter((s) => s.role === role).length}</p>
              <p className="text-xs text-muted-foreground capitalize">{role === 'waiter' ? 'Waiters (Max 10)' : role}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search staff by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="cashier">Cashier</SelectItem>
            <SelectItem value="kitchen">Kitchen</SelectItem>
            <SelectItem value="waiter">Waiter</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                        {staff.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{staff.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{staff.email}</p>
                        <Badge variant={statusConfig[staff.status]?.variant || 'default'} className="mt-1 sm:hidden">
                          {statusConfig[staff.status]?.label || staff.status}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${roleColors[staff.role] || 'bg-gray-100'}`}>
                      {staff.role}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{staff.phone || 'N/A'}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={statusConfig[staff.status]?.variant || 'default'}>
                      {statusConfig[staff.status]?.label || staff.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{staff.joinDate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canManage(staff) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={staff.status === 'suspended' ? 'Activate' : 'Suspend'}
                          title={staff.status === 'suspended' ? 'Activate' : 'Suspend'}
                          className={staff.status === 'suspended' ? 'text-green-600' : 'text-destructive'}
                          onClick={() => setSuspendStaff(staff)}
                        >
                          {staff.status === 'suspended' ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </Button>
                      )}
                      {isAdmin && canManage(staff) && (
                        <Button variant="ghost" size="icon" aria-label="Delete" title="Delete" className="text-destructive" onClick={() => setDeleteStaff(staff)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Suspend/Reactivate Dialog */}
      <Dialog open={!!suspendStaff} onOpenChange={(open) => !open && setSuspendStaff(null)}>
        {suspendStaff && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{suspendStaff.status === 'suspended' ? 'Activate Staff Member?' : 'Suspend Staff Member?'}</DialogTitle>
              <DialogDescription>
                {suspendStaff.status === 'suspended'
                  ? `Reactivate account for "${suspendStaff.name}".`
                  : `Are you sure you want to suspend "${suspendStaff.name}"? They will lose dashboard access immediately.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSuspendStaff(null)}>Cancel</Button>
              <Button
                variant={suspendStaff.status === 'suspended' ? 'default' : 'destructive'}
                onClick={handleToggleStatus}
              >
                {suspendStaff.status === 'suspended' ? 'Activate' : 'Suspend'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!deleteStaff} onOpenChange={(open) => !open && setDeleteStaff(null)}>
        {deleteStaff && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete {deleteStaff.name}?</DialogTitle>
              <DialogDescription>This permanently removes the account. Suspending is usually the better option.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteStaff(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>Create a new staff account (Note: Max 10 Waiters maintained)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+880 1700-000000" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="john@savoria.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="cashier">Cashier</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={submitting} onClick={handleAddStaff}>
              {submitting ? 'Adding...' : 'Add Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
