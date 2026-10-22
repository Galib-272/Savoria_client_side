'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, AlertTriangle, Package, TrendingDown, Plus, Pencil, Trash2, ArrowUpDown, Loader2 } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);

const statusConfig = {
  in_stock: { label: 'In Stock', variant: 'default' as const },
  low_stock: { label: 'Low Stock', variant: 'secondary' as const },
  out_of_stock: { label: 'Out of Stock', variant: 'destructive' as const },
};

const EMPTY_FORM = { name: '', category: '', unit: 'kg', currentStock: '0', minStock: '5', maxStock: '100', cost: '0', supplier: '', expirationDate: '' };

export default function InventoryPage() {
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[] | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .getInventory()
      .then((items) => setInventoryItems((Array.isArray(items) ? items : []).map((i: any) => ({ ...i, id: i._id || i.id }))))
      .catch((err) => {
        toast.error(err.message || 'Failed to load inventory');
        setInventoryItems([]);
      });
  }, []);

  useEffect(() => {
    load();
    // Refresh when stock changes (the bell shows the low-stock popup)
    const socket = getSocket();
    if (!socket) return;
    socket.on('inventory:low_stock', load);
    socket.io.on('reconnect', load);
    return () => {
      socket.off('inventory:low_stock', load);
      socket.io.off('reconnect', load);
    };
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      currentStock: String(item.currentStock),
      minStock: String(item.minStock),
      maxStock: String(item.maxStock ?? ''),
      cost: String(item.cost),
      supplier: item.supplier,
      expirationDate: item.expirationDate || '',
    });
    setFormOpen(true);
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category.trim() || !form.unit.trim() || !form.supplier.trim()) {
      toast.error('Name, category, unit and supplier are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        supplier: form.supplier.trim(),
        currentStock: Number(form.currentStock),
        minStock: Number(form.minStock),
        maxStock: Number(form.maxStock || 0),
        cost: Number(form.cost),
        expirationDate: form.expirationDate || undefined,
      };
      if (editing) {
        await api.updateInventoryItem(editing.id, payload);
        toast.success(`${payload.name} updated`);
      } else {
        await api.createInventoryItem(payload);
        toast.success(`${payload.name} added to inventory`);
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const saveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjusting) return;
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error('Enter a positive amount to add or a negative amount to remove');
      return;
    }
    setSaving(true);
    try {
      await api.adjustStock(adjusting.id, amount, adjustReason || undefined);
      toast.success(`${adjusting.name} stock ${amount > 0 ? 'increased' : 'reduced'} by ${Math.abs(amount)} ${adjusting.unit}`);
      setAdjusting(null);
      setAdjustAmount('');
      setAdjustReason('');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item: InventoryItem) => {
    if (!window.confirm(`Delete ${item.name} from inventory?`)) return;
    try {
      await api.deleteInventoryItem(item.id);
      toast.success(`${item.name} deleted`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    }
  };

  const list = inventoryItems || [];
  const filteredItems = list.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });
  const alerts = list.filter((i) => i.status !== 'in_stock');
  const totalValue = list.reduce((sum, i) => sum + i.currentStock * i.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">Track stock levels, ingredients, and supplies</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-800 dark:text-amber-300">Stock Alerts ({alerts.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-background p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: {item.currentStock} {item.unit} · Min: {item.minStock} {item.unit}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setAdjusting(item)}>
                    Restock
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{list.length}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingDown className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Need Restock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-muted-foreground">Stock Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="hidden md:table-cell">Min / Max</TableHead>
                <TableHead className="hidden md:table-cell">Cost</TableHead>
                <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryItems === null ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const pct = item.maxStock ? Math.min(100, (item.currentStock / item.maxStock) * 100) : 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                        <span className="block text-xs text-muted-foreground sm:hidden">{item.category}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{item.category}</TableCell>
                      <TableCell>
                        <div className="whitespace-nowrap">
                          {item.currentStock} {item.unit}
                        </div>
                        <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${item.status === 'out_of_stock' ? 'bg-destructive' : item.status === 'low_stock' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap md:table-cell">
                        {item.minStock} / {item.maxStock} {item.unit}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap md:table-cell">{formatCurrency(item.cost)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{item.supplier}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[item.status]?.variant || 'default'} className="whitespace-nowrap">
                          {statusConfig[item.status]?.label || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Adjust stock" title="Adjust stock" onClick={() => setAdjusting(item)}>
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Edit" title="Edit" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" aria-label="Delete" title="Delete" className="text-destructive" onClick={() => deleteItem(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {/* Add / edit item */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add Inventory Item'}</DialogTitle>
            <DialogDescription>Stock status (in stock / low / out) is calculated automatically from the minimum level.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveItem} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inv-name">Name</Label>
                <Input id="inv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-cat">Category</Label>
                <Input id="inv-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Meat" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-unit">Unit</Label>
                <Input id="inv-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, L, pcs" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-sup">Supplier</Label>
                <Input id="inv-sup" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-cur">Current stock</Label>
                <Input id="inv-cur" type="number" min={0} step="any" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-cost">Cost per unit (৳)</Label>
                <Input id="inv-cost" type="number" min={0} step="any" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-min">Minimum level</Label>
                <Input id="inv-min" type="number" min={0} step="any" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-max">Maximum level</Label>
                <Input id="inv-max" type="number" min={0} step="any" value={form.maxStock} onChange={(e) => setForm({ ...form, maxStock: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inv-exp">Expiry date (optional)</Label>
                <Input id="inv-exp" type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust stock */}
      <Dialog open={!!adjusting} onOpenChange={(open) => !open && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock — {adjusting?.name}</DialogTitle>
            <DialogDescription>
              Currently {adjusting?.currentStock} {adjusting?.unit}. Use a positive number to add stock, negative to remove.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveAdjustment} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adj-amount">Change ({adjusting?.unit})</Label>
              <Input id="adj-amount" type="number" step="any" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="e.g. 10 or -2" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-reason">Reason (optional)</Label>
              <Input id="adj-reason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Delivery received, spoilage…" />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAdjusting(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
