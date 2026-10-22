'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2, Star, Flame, ToggleLeft, Loader2 } from 'lucide-react';
import type { MenuItem, MenuCategory } from '@/lib/types';
import { CategoryMenuBar } from '@/components/restaurant/category-menu-bar';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-current-user';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount || 0);

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600';

const EMPTY_FORM = {
  name: '',
  categoryId: '',
  price: '',
  discountPrice: '',
  description: '',
  image: '',
  prepTime: '15',
  available: true,
  featured: false,
  popular: false,
};

export default function MenuManagementPage() {
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cats, items] = await Promise.all([api.getCategories(), api.getMenuItems()]);
        setCategories(Array.isArray(cats) ? cats : []);
        setMenuItems((Array.isArray(items) ? items : []).map((i: any) => ({ ...i, id: i._id || i.id })));
      } catch (err: any) {
        toast.error(err.message || 'Failed to load menu data');
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
      setMenuItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i)));
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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      categoryId: item.categoryId,
      price: String(item.price),
      discountPrice: item.discountPrice ? String(item.discountPrice) : '',
      description: item.description || '',
      image: item.image || '',
      prepTime: String(item.prepTime || 15),
      available: item.available,
      featured: !!item.featured,
      popular: !!item.popular,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const price = Number(form.price);
    const discountPrice = form.discountPrice === '' ? '' : Number(form.discountPrice);
    if (!form.name.trim() || !form.categoryId || !(price >= 0) || form.price === '') {
      toast.error('Name, category, and price are required');
      return;
    }
    if (discountPrice !== '' && (!(discountPrice >= 0) || discountPrice >= price)) {
      toast.error('Discount price must be lower than the regular price');
      return;
    }
    if (form.image && !/^https?:\/\//i.test(form.image) && !form.image.startsWith('/')) {
      toast.error('Image must be a web link (https://…)');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        price,
        discountPrice,
        description: form.description.trim(),
        image: form.image.trim() || FALLBACK_IMAGE,
        prepTime: Number(form.prepTime) || 15,
        available: form.available,
        featured: form.featured,
        popular: form.popular,
      };
      if (editing) {
        const res = await api.updateMenuItem(editing.id, payload);
        const updated = res?.data ? { ...res.data, id: res.data._id || res.data.id } : null;
        if (updated) setMenuItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        toast.success(`${payload.name} updated`);
      } else {
        if (payload.discountPrice === '') delete payload.discountPrice;
        const res = await api.createMenuItem(payload);
        const created = res?.data ? { ...res.data, id: res.data._id || res.data.id } : null;
        if (created) setMenuItems((prev) => [created, ...prev]);
        toast.success('Menu item added successfully');
      }
      setFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save menu item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-muted-foreground">Add, edit, and manage your menu items</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Categories — each chip opens a dropdown of its dishes; pick one to edit it */}
      <CategoryMenuBar
        size="sm"
        categories={categories}
        items={menuItems}
        active={filterCat}
        onActiveChange={setFilterCat}
        onPickItem={openEdit}
        pickLabel="Edit"
        allowUnavailable
        showAllCategories
        showAllLabel={(c) => `Show all ${c.name} in the table`}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    Loading menu items...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const cat = categories.find((c) => c.id === item.categoryId);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image || FALLBACK_IMAGE}
                            alt={item.name}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{cat?.name || item.categoryName}</p>
                            {item.featured && (
                              <Badge className="mt-0.5">
                                <Flame className="mr-1 h-3 w-3" />
                                Featured
                              </Badge>
                            )}
                            {!item.available && (
                              <Badge variant="destructive" className="mt-0.5 sm:hidden">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{cat?.name || item.categoryName || 'Unknown'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {item.discountPrice ? (
                          <div>
                            <span className="font-medium text-primary">{formatCurrency(item.discountPrice)}</span>
                            <span className="ml-1 text-xs text-muted-foreground line-through">{formatCurrency(item.price)}</span>
                          </div>
                        ) : (
                          <span className="font-medium">{formatCurrency(item.price)}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={item.available ? 'default' : 'destructive'}>{item.available ? 'Available' : 'Unavailable'}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          <span className="text-sm">{item.rating || 'N/A'}</span>
                          <span className="text-xs text-muted-foreground">({item.reviewCount || 0})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Edit" aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleAvailability(item)}
                            title={item.available ? 'Mark unavailable' : 'Mark available'}
                            aria-label="Toggle availability"
                          >
                            <ToggleLeft className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteItem(item)} title="Delete" aria-label="Delete">
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

      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        {deleteItem && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Menu Item?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{deleteItem.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteItem(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add New Menu Item'}</DialogTitle>
            <DialogDescription>Prices here are what customers and the POS are charged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mi-name">Item Name</Label>
              <Input id="mi-name" placeholder="e.g. Chicken Burger" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mi-price">Price (৳)</Label>
                <Input id="mi-price" type="number" min={0} placeholder="350" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mi-disc">Sale price (৳)</Label>
                <Input id="mi-disc" type="number" min={0} placeholder="optional" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi-desc">Description</Label>
              <Textarea id="mi-desc" rows={2} placeholder="Short description of the item" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mi-img">Image URL</Label>
                <Input id="mi-img" placeholder="https://…" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mi-prep">Prep time (min)</Label>
                <Input id="mi-prep" type="number" min={1} value={form.prepTime} onChange={(e) => setForm({ ...form, prepTime: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="available" checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} />
                <Label htmlFor="available">Available</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="featured" checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
                <Label htmlFor="featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="popular" checked={form.popular} onCheckedChange={(v) => setForm({ ...form, popular: v })} />
                <Label htmlFor="popular">Popular</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting} onClick={handleSave}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
