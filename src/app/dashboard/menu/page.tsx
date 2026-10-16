'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, Star, Flame, ToggleLeft } from 'lucide-react';
import type { MenuItem, MenuCategory } from '@/lib/types';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add form states
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrepTime, setNewPrepTime] = useState('15');
  const [newAvailable, setNewAvailable] = useState(true);
  const [newFeatured, setNewFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cats, items] = await Promise.all([
          api.getCategories(),
          api.getMenuItems(),
        ]);
        if (cats && cats.length) setCategories(cats);
        if (items && items.length) setMenuItems(items.map((i: any) => ({ ...i, id: i._id || i.id })));
      } catch (err) {
        console.error(err);
        toast.error('Failed to load menu data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = menuItems.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== 'all' && item.categoryId !== filterCat) return false;
    return true;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await api.toggleItemAvailability(item.id);
      setMenuItems((prev) => prev.map((i) => i.id === item.id ? { ...i, available: !i.available } : i));
      toast.success(`${item.name} is now ${item.available ? 'unavailable' : 'available'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update availability');
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await api.deleteMenuItem(deleteItem.id);
      setMenuItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
      toast.success(`${deleteItem.name} has been deleted`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete item');
    } finally {
      setDeleteItem(null);
    }
  };

  const handleAddItem = async () => {
    if (!newName || !newCategory || !newPrice) {
      toast.error('Name, category, and price are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createMenuItem({
        name: newName,
        categoryId: newCategory,
        price: parseFloat(newPrice),
        description: newDescription,
        preparationTime: parseInt(newPrepTime),
        available: newAvailable,
        featured: newFeatured,
        image: '/placeholder.jpg',
      });
      const newItem = res.data ? { ...res.data, id: res.data._id || res.data.id } : null;
      if (newItem) setMenuItems((prev) => [newItem, ...prev]);
      toast.success('Menu item added successfully');
      setAddOpen(false);
      setNewName(''); setNewCategory(''); setNewPrice(''); setNewDescription(''); setNewPrepTime('15');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add menu item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-muted-foreground">Add, edit, and manage your menu items</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Loading menu items...</TableCell></TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No items found</TableCell></TableRow>
              ) : filteredItems.map((item) => {
                const cat = categories.find((c) => c.id === item.categoryId);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" onError={(e) => { (e.target as any).src = 'https://via.placeholder.com/48'; }} />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.featured && <Badge className="mt-0.5"><Flame className="mr-1 h-3 w-3" />Featured</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{cat?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {item.discountPrice ? (
                        <div>
                          <span className="font-medium text-primary">{formatCurrency(item.discountPrice)}</span>
                          <span className="ml-1 text-xs text-muted-foreground line-through">{formatCurrency(item.price)}</span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatCurrency(item.price)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.available ? 'default' : 'destructive'}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        <span className="text-sm">{item.rating || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">({item.reviewCount || 0})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleAvailability(item)} title={item.available ? 'Mark unavailable' : 'Mark available'}>
                          <ToggleLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteItem(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        {deleteItem && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Menu Item?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deleteItem.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Menu Item</DialogTitle>
            <DialogDescription>Fill in the details for the new menu item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input placeholder="e.g. Chicken Burger" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (৳)</Label>
                <Input type="number" placeholder="350" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Short description of the item" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Preparation Time (minutes)</Label>
              <Input type="number" placeholder="15" value={newPrepTime} onChange={(e) => setNewPrepTime(e.target.value)} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="available" checked={newAvailable} onCheckedChange={setNewAvailable} />
                <Label htmlFor="available">Available</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="featured" checked={newFeatured} onCheckedChange={setNewFeatured} />
                <Label htmlFor="featured">Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={submitting} onClick={handleAddItem}>{submitting ? 'Adding...' : 'Add Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
