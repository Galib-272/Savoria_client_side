'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Edit, Truck, Trash2, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add expense dialog
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expCategory, setExpCategory] = useState('utilities');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expSubmitting, setExpSubmitting] = useState(false);

  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const localToday = () => new Intl.DateTimeFormat('en-CA').format(new Date());

  // Supplier add / edit dialog
  const EMPTY_SUPPLIER = { name: '', company: '', phone: '', email: '', address: '', products: '', status: 'active' };
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [supplierSaving, setSupplierSaving] = useState(false);

  // New purchase dialog
  const EMPTY_LINE = { name: '', quantity: '', unit: 'kg', cost: '' };
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState<'completed' | 'pending'>('completed');
  const [purchaseLines, setPurchaseLines] = useState([{ ...EMPTY_LINE }]);
  const [purchaseSaving, setPurchaseSaving] = useState(false);
  const purchaseTotal = purchaseLines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.cost) || 0), 0);

  const openSupplierDialog = (supplier?: any) => {
    setEditingSupplier(supplier || null);
    setSupplierForm(
      supplier
        ? {
            name: supplier.name || '',
            company: supplier.company || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            products: Array.isArray(supplier.products) ? supplier.products.join(', ') : supplier.products || '',
            status: supplier.status || 'active',
          }
        : EMPTY_SUPPLIER
    );
    setSupplierOpen(true);
  };

  const saveSupplier = async () => {
    const f = supplierForm;
    if (!f.name.trim() || !f.company.trim() || !f.phone.trim() || !f.email.trim() || !f.address.trim()) {
      toast.error('Name, company, phone, email and address are required');
      return;
    }
    setSupplierSaving(true);
    try {
      const payload = { ...f, products: f.products.split(',').map((p) => p.trim()).filter(Boolean) };
      if (editingSupplier) {
        const res = await api.updateSupplier(editingSupplier.id, payload);
        const updated = { ...res.data, id: res.data._id || res.data.id };
        setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success(`${updated.name} updated`);
      } else {
        const res = await api.createSupplier(payload);
        setSuppliers((prev) => [{ ...res.data, id: res.data._id || res.data.id }, ...prev]);
        toast.success('Supplier added');
      }
      setSupplierOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier');
    } finally {
      setSupplierSaving(false);
    }
  };

  const deleteSupplier = async (supplier: any) => {
    if (!window.confirm(`Delete supplier ${supplier.name}?`)) return;
    try {
      await api.deleteSupplier(supplier.id);
      setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
      toast.success('Supplier deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
    }
  };

  const savePurchase = async () => {
    const lines = purchaseLines
      .map((l) => ({ name: l.name.trim(), unit: l.unit.trim(), quantity: Number(l.quantity), cost: Number(l.cost) }))
      .filter((l) => l.name && l.unit && l.quantity > 0 && l.cost >= 0);
    if (!purchaseSupplier) {
      toast.error('Choose a supplier');
      return;
    }
    if (lines.length === 0) {
      toast.error('Add at least one item with quantity and cost');
      return;
    }
    setPurchaseSaving(true);
    try {
      const total = lines.reduce((sum, l) => sum + l.quantity * l.cost, 0);
      const res = await api.createPurchase({ supplierName: purchaseSupplier, items: lines, total, date: localToday(), status: purchaseStatus });
      setPurchases((prev) => [{ ...res.data, id: res.data._id || res.data.id }, ...prev]);
      toast.success(
        purchaseStatus === 'completed' ? `Purchase ${res.data.purchaseNumber} recorded — matching inventory items restocked` : `Purchase ${res.data.purchaseNumber} saved as pending`
      );
      setPurchaseOpen(false);
      setPurchaseLines([{ ...EMPTY_LINE }]);
      setPurchaseSupplier('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create purchase');
    } finally {
      setPurchaseSaving(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [supData, purData, expData] = await Promise.all([
          api.getSuppliers().catch(() => []),
          api.getPurchases().catch(() => []),
          api.getExpenses().catch(() => []),
        ]);
        setSuppliers((supData || []).map((s: any) => ({ ...s, id: s._id || s.id })));
        setPurchases((purData || []).map((p: any) => ({ ...p, id: p._id || p.id })));
        setExpenses((expData || []).map((e: any) => ({ ...e, id: e._id || e.id })));
      } catch (err) {
        console.error(err);
        toast.error('Failed to load suppliers data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredSuppliers = suppliers.filter((s) =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.company?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddExpense = async () => {
    if (!expDescription || !expAmount || !expCategory) {
      toast.error('Description, category, and amount are required');
      return;
    }
    setExpSubmitting(true);
    try {
      const res = await api.createExpense({
        category: expCategory,
        description: expDescription,
        amount: parseFloat(expAmount),
        date: localToday(),
      });
      const newExp = res.data ? { ...res.data, id: res.data._id || res.data.id } : null;
      if (newExp) setExpenses((prev) => [newExp, ...prev]);
      toast.success('Expense added successfully');
      setExpenseOpen(false);
      setExpDescription(''); setExpAmount('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add expense');
    } finally {
      setExpSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonth = localToday().slice(0, 7);
  const monthExpenses = expenses.filter((e) => String(e.date || '').slice(0, 7) === thisMonth).reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Suppliers & Expenses</h1>
          <p className="text-sm text-muted-foreground">Manage suppliers, purchases, and expenses</p>
        </div>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button onClick={() => openSupplierDialog()}><Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Add Supplier</span><span className="sm:hidden">Add</span></Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="hidden sm:table-cell">Company</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Loading suppliers...</TableCell></TableRow>
                  ) : filteredSuppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No suppliers found</TableCell></TableRow>
                  ) : filteredSuppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.name}
                        <span className="block text-xs font-normal text-muted-foreground sm:hidden">{s.company}</span>
                        <span className="block text-xs font-normal text-muted-foreground md:hidden">{s.phone}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{s.company}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm">{s.phone}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {Array.isArray(s.products) ? s.products.join(', ') : s.products || 'N/A'}
                      </TableCell>
                      <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="capitalize">{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Edit supplier" onClick={() => openSupplierDialog(s)}><Edit className="h-4 w-4" /></Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" aria-label="Delete supplier" className="text-destructive" onClick={() => deleteSupplier(s)}><Trash2 className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchases Tab */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPurchaseOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Purchase</Button>
          </div>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading purchases...</p>
          ) : purchases.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No purchases yet</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {purchases.map((pur) => (
                <Card key={pur.id}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Truck className="h-4 w-4" /></div>
                        <div>
                          <p className="font-semibold text-sm">{pur.purchaseNumber}</p>
                          <p className="text-xs text-muted-foreground">{pur.supplierName}</p>
                        </div>
                      </div>
                      <Badge variant={pur.status === 'completed' ? 'default' : 'secondary'} className="capitalize">{pur.status}</Badge>
                    </div>
                    <div className="space-y-1 mb-3">
                      {(pur.items || []).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span>{item.quantity} {item.unit} × {formatCurrency(item.cost)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(pur.total || 0)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{pur.date}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setExpenseOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold">{formatCurrency(monthExpenses)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Categories</p><p className="text-2xl font-bold">{new Set(expenses.map((e) => e.category)).size}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Entries</p><p className="text-2xl font-bold">{expenses.length}</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Loading expenses...</TableCell></TableRow>
                  ) : expenses.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No expenses yet</TableCell></TableRow>
                  ) : expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell><Badge variant="outline">{exp.category}</Badge></TableCell>
                      <TableCell className="text-sm">{exp.description}</TableCell>
                      <TableCell className="text-sm">{exp.date}</TableCell>
                      <TableCell className="text-sm">{exp.createdBy || 'Admin'}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{formatCurrency(exp.amount || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>Record a new expense entry</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={expCategory} onValueChange={setExpCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="e.g. Monthly electricity bill" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount (৳)</Label>
              <Input type="number" placeholder="5000" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
            <Button disabled={expSubmitting} onClick={handleAddExpense}>{expSubmitting ? 'Adding...' : 'Add Expense'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Supplier */}
      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? `Edit ${editingSupplier.name}` : 'Add Supplier'}</DialogTitle>
            <DialogDescription>Suppliers appear in purchases and inventory.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([
              ['name', 'Contact name'],
              ['company', 'Company'],
              ['phone', 'Phone'],
              ['email', 'Email'],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`sup-${key}`}>{label}</Label>
                <Input id={`sup-${key}`} type={key === 'email' ? 'email' : 'text'} value={(supplierForm as any)[key]} onChange={(e) => setSupplierForm({ ...supplierForm, [key]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sup-address">Address</Label>
              <Input id="sup-address" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sup-products">Products (comma separated)</Label>
              <Input id="sup-products" placeholder="Chicken, Cooking Oil" value={supplierForm.products} onChange={(e) => setSupplierForm({ ...supplierForm, products: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={supplierForm.status} onValueChange={(v) => setSupplierForm({ ...supplierForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSupplierOpen(false)}>Cancel</Button>
            <Button disabled={supplierSaving} onClick={saveSupplier}>
              {supplierSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSupplier ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Purchase */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Purchase</DialogTitle>
            <DialogDescription>Completed purchases automatically add stock to inventory items with the same name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={purchaseSupplier} onValueChange={setPurchaseSupplier}>
                  <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.company || s.name}>{s.company || s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={purchaseStatus} onValueChange={(v) => setPurchaseStatus(v as 'completed' | 'pending')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Received (add to stock)</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              {purchaseLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_90px_80px_100px_auto] sm:border-0 sm:p-0">
                  <Input className="col-span-2 sm:col-span-1" placeholder="Item (e.g. Chicken)" value={line.name} onChange={(e) => setPurchaseLines((p) => p.map((l, i) => (i === idx ? { ...l, name: e.target.value } : l)))} />
                  <Input type="number" min={0} step="any" placeholder="Qty" value={line.quantity} onChange={(e) => setPurchaseLines((p) => p.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)))} />
                  <Input placeholder="Unit" value={line.unit} onChange={(e) => setPurchaseLines((p) => p.map((l, i) => (i === idx ? { ...l, unit: e.target.value } : l)))} />
                  <Input type="number" min={0} step="any" placeholder="Cost/unit" value={line.cost} onChange={(e) => setPurchaseLines((p) => p.map((l, i) => (i === idx ? { ...l, cost: e.target.value } : l)))} />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={purchaseLines.length === 1} onClick={() => setPurchaseLines((p) => p.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setPurchaseLines((p) => [...p, { ...EMPTY_LINE }])}>
                <Plus className="mr-1 h-4 w-4" /> Add line
              </Button>
            </div>
            <div className="flex justify-between border-t border-border pt-3 font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(purchaseTotal)}</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPurchaseOpen(false)}>Cancel</Button>
            <Button disabled={purchaseSaving} onClick={savePurchase}>
              {purchaseSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
