'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, X, LogIn } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FoodCard } from '@/components/restaurant/food-card';
import { menuItems as fallbackMenuItems, categories as fallbackCategories } from '@/lib/mock-data';
import { toast } from 'sonner';
import type { MenuItem, MenuCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { addToCart } from '@/lib/cart';
import { getStoredUser } from '@/lib/auth';

export default function MenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>(fallbackMenuItems);
  const [categoryList, setCategoryList] = useState<MenuCategory[]>(fallbackCategories);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getStoredUser());
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([api.getCategories(), api.getMenuItems()])
      .then(([cats, menuData]) => {
        if (!isMounted) return;
        if (cats && cats.length > 0) {
          setCategoryList(cats.map((c: any) => ({ ...c, id: c._id || c.id })));
        }
        if (menuData && menuData.length > 0) {
          setItems(menuData.map((i: any) => ({ ...i, id: i._id || i.id })));
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (search) {
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (activeCategory !== 'all') {
      result = result.filter((i: any) => {
        const catId = i.categoryId || (i.category && (i.category._id || i.category.id || i.category));
        return catId === activeCategory || i.category === activeCategory;
      });
    }

    if (availableOnly) {
      result = result.filter((i) => i.available);
    }

    result = result.filter((i) => i.price <= maxPrice);

    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
        break;
      case 'price_high':
        result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'popular':
        result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
    }

    return result;
  }, [items, search, activeCategory, availableOnly, maxPrice, sortBy]);

  const handleAddToCart = (item: MenuItem) => {
    const user = getStoredUser();
    if (!user) {
      toast.error('Please log in to order food and add items to your cart.');
      router.push('/login?redirect=/menu');
      return;
    }
    const added = addToCart(item, 1);
    if (added) {
      toast.success(`${item.name} added to cart`);
    }
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <Label className="mb-3 block text-sm font-semibold">Availability</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="available"
            checked={availableOnly}
            onCheckedChange={(checked) => setAvailableOnly(checked === true)}
          />
          <Label htmlFor="available" className="text-sm">Available only</Label>
        </div>
      </div>

      <div>
        <Label className="mb-3 block text-sm font-semibold">
          Max Price: <span className="text-primary">৳{maxPrice}</span>
        </Label>
        <input
          type="range"
          min={100}
          max={1000}
          step={50}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-4xl font-bold">Our Menu</h1>
        <p className="mt-2 text-muted-foreground">Discover our delicious selection of dishes</p>
      </div>

      {/* Guest Notice Banner */}
      {!isLoggedIn && (
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Browsing as a Guest</p>
              <p className="text-muted-foreground text-xs">You can explore our full menu. Please log in to order food or customize dishes.</p>
            </div>
          </div>
          <Link href="/login?redirect=/menu">
            <Button size="sm" className="whitespace-nowrap">
              Log In to Order
            </Button>
          </Link>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground hover:bg-secondary'
          )}
        >
          All Items
        </button>
        {categoryList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground hover:bg-secondary'
            )}
          >
            <span>{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border/60 bg-card p-6">
            <h3 className="mb-4 font-semibold">Filters</h3>
            <FilterContent />
          </div>
        </div>

        {/* Menu Grid */}
        <div className="lg:col-span-3">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-20 text-center">
              <p className="text-lg font-semibold">No dishes found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredItems.length}</span> dishes
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <FoodCard key={item.id} item={item} onAddToCart={() => handleAddToCart(item)} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
