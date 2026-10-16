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
import { Search, Plus, Edit, Truck } from 'lucide-react';
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

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [supData, purData, expData] = await Promise.all([
          api.getSuppliers().catch(() => []),
          api.getPurchases().catch(() => []),
          api.getExpenses().catch(() => []),
        ]);
        if (supData) setSuppliers(supData.map((s: any) => ({ ...s, id: s._id || s.id })));
        if (purData) setPurchases(purData.map((p: any) => ({ ...p, id: p._id || p.id })));
        if (expData) setExpenses(expData.map((e: any) => ({ ...e, id: e._id || e.id })));
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
        date: new Date().toISOString().split('T')[0],
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Suppliers & Expenses</h1>
          <p className="text-sm text-muted-foreground">Manage suppliers, purchases, and expenses</p>
        </div>
      </div>

      <Tabs defaultValue="suppliers">
        <TabsList>
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
            <Button onClick={() => toast.info('Supplier creation coming soon')}><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Products</TableHead>
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
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.company}</TableCell>
                      <TableCell>
                        <p className="text-sm">{s.phone}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {Array.isArray(s.products) ? s.products.join(', ') : s.products || 'N/A'}
                      </TableCell>
                      <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="capitalize">{s.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => toast.info(`Editing ${s.name}`)}><Edit className="h-4 w-4" /></Button>
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
            <Button onClick={() => toast.info('Purchase creation coming soon')}><Plus className="mr-2 h-4 w-4" /> New Purchase</Button>
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
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p></CardContent></Card>
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
    </div>
  );
}
