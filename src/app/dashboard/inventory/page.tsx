'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, AlertTriangle, Package, TrendingDown } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

const statusConfig = {
  in_stock: { label: 'In Stock', variant: 'default' as const },
  low_stock: { label: 'Low Stock', variant: 'secondary' as const },
  out_of_stock: { label: 'Out of Stock', variant: 'destructive' as const },
};

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    api.getInventory().then((items) => {
      if (items && items.length) {
        setInventoryItems(items.map((i: any) => ({ ...i, id: i._id || i.id })));
      }
    }).catch(console.error);

    const socket = getSocket();
    if (socket) {
      socket.on('inventory:low_stock', (item: any) => {
        toast.warning(`⚠️ Low stock alert: ${item.name} (${item.currentStock} ${item.unit} remaining)`);
      });
      return () => {
        socket.off('inventory:low_stock');
      };
    }
  }, []);

  const filteredItems = inventoryItems.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const alerts = inventoryItems.filter((i) => i.status !== 'in_stock');
  const totalValue = inventoryItems.reduce((sum, i) => sum + i.currentStock * i.cost, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Inventory Management</h1>
        <p className="text-sm text-muted-foreground">Track stock levels, ingredients, and supplies</p>
      </div>

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-800">Stock Alerts ({alerts.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {alerts.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: {item.currentStock}{item.unit} · Min: {item.minStock}{item.unit}
                    </p>
                  </div>
                  <Badge variant={item.status === 'out_of_stock' ? 'destructive' : 'secondary'}>
                    {statusConfig[item.status].label}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="h-5 w-5 text-primary" /><span className="text-xs text-muted-foreground">Total Items</span></div>
          <p className="text-2xl font-bold">{inventoryItems.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-5 w-5 text-amber-500" /><span className="text-xs text-muted-foreground">Low Stock</span></div>
          <p className="text-2xl font-bold">{inventoryItems.filter((i) => i.status === 'low_stock').length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-5 w-5 text-destructive" /><span className="text-xs text-muted-foreground">Out of Stock</span></div>
          <p className="text-2xl font-bold">{inventoryItems.filter((i) => i.status === 'out_of_stock').length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">Inventory Value</span></div>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Min / Max</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <span className={item.status === 'out_of_stock' ? 'text-destructive font-bold' : item.status === 'low_stock' ? 'text-amber-600 font-bold' : ''}>
                      {item.currentStock} {item.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{item.minStock} / {item.maxStock} {item.unit}</TableCell>
                  <TableCell>{formatCurrency(item.cost)}/{item.unit}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell><Badge variant={statusConfig[item.status].variant}>{statusConfig[item.status].label}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
