'use client';

import { Suspense, useState, useMemo, useEffect, useDeferredValue, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X, LogIn, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { effectivePrice } from '@/components/restaurant/category-menu-bar';
import { CategoryCard } from '@/components/restaurant/category-card';
import { toast } from 'sonner';
import type { MenuItem, MenuCategory } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { addToCart, type CartModifier } from '@/lib/cart';
import { getStoredUser } from '@/lib/auth';

function MenuPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryList, setCategoryList] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // which category card is dropped down (one at a time)
  const [openCategory, setOpenCategory] = useState<string | null>(searchParams.get('category'));
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sortBy, setSortBy] = useState<string>('popular');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  // [min, max] chosen on the slider; null = no price limit
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getStoredUser());
  }, []);

  // keep the selected category when coming from a link like /menu?category=<id>
  useEffect(() => {
    const fromUrl = searchParams.get('category');
    if (fromUrl) setOpenCategory(fromUrl);
  }, [searchParams]);

  // coming from the home page with ?category=… → scroll that card into view once loaded
  useEffect(() => {
    const fromUrl = searchParams.get('category');
    if (!loading && fromUrl) cardRefs.current[fromUrl]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading, searchParams]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([api.getCategories(), api.getMenuItems()])
      .then(([cats, menuData]) => {
        if (!isMounted) return;
        setCategoryList((cats || []).map((c: any) => ({ ...c, id: c._id || c.id })));
        setItems((menuData || []).map((i: any) => ({ ...i, id: i._id || i.id })));
      })
      .catch(() => toast.error('Could not load the menu. Please refresh the page.'))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // slider limits follow the cheapest and most expensive dish
  const [priceFloor, priceCeiling] = useMemo(() => {
    if (items.length === 0) return [0, 1000];
    const prices = items.map(effectivePrice);
    return [Math.floor(Math.min(...prices) / 10) * 10, Math.ceil(Math.max(...prices) / 10) * 10];
  }, [items]);
  const sliderValue: [number, number] = priceRange ?? [priceFloor, priceCeiling];
  // the slider moves instantly; the (heavier) list update follows a moment later
  const deferredRange = useDeferredValue(priceRange);
  const deferredSearch = useDeferredValue(search);

  const filteredItems = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    let result = items.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q) && !(i.description || '').toLowerCase().includes(q)) return false;
      if (availableOnly && !i.available) return false;
      if (offersOnly && !(i.discountPrice && i.discountPrice > 0 && i.discountPrice < i.price)) return false;
      if (deferredRange) {
        const p = effectivePrice(i);
        if (p < deferredRange[0] || p > deferredRange[1]) return false;
      }
      return true;
    });

    switch (sortBy) {
      case 'price_low':
        result = result.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case 'price_high':
        result = result.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case 'rating':
        result = result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        result = result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        result = result.sort((a, b) => Number(!!b.popular) - Number(!!a.popular) || (b.reviewCount || 0) - (a.reviewCount || 0));
    }
    return result;
  }, [items, deferredSearch, availableOnly, offersOnly, deferredRange, sortBy]);

  const searching = deferredSearch.trim().length > 0;
  const narrowed = searching || availableOnly || offersOnly || deferredRange !== null;

  // one card per category, holding the dishes that pass the search / filters
  const categoryCards = useMemo(() => {
    const totals = new Map<string, number>();
    items.forEach((i) => totals.set(i.categoryId, (totals.get(i.categoryId) || 0) + 1));
    return categoryList
      .filter((c) => c.active !== false)
      .map((category) => ({
        category,
        dishes: filteredItems.filter((i) => i.categoryId === category.id),
        total: totals.get(category.id) || 0,
      }))
      .filter((c) => c.dishes.length > 0);
  }, [categoryList, items, filteredItems]);

  const filtersActive = availableOnly || offersOnly || priceRange !== null;
  const resetFilters = () => {
    setAvailableOnly(false);
    setOffersOnly(false);
    setPriceRange(null);
  };


  const handleAddToCart = (item: MenuItem) => {
    const user = getStoredUser();
    if (!user) {
      toast.error('Please log in to order food and add items to your cart.');
      router.push('/login?redirect=/menu');
      return;
    }
    // quick add: required choices (size, portion…) start on their first option; change them on the dish page
    const defaults: CartModifier[] = (item.modifiers || [])
      .filter((m) => m.required && m.options.length > 0)
      .map((m) => ({ name: m.options[0].name, price: m.options[0].price }));
    const added = addToCart(item, 1, defaults);
    if (added) {
      toast.success(`${item.name}${defaults.length ? ` (${defaults.map((d) => d.name).join(', ')})` : ''} added to cart`);
    } else {
      toast.info('Staff accounts take orders through the POS in the dashboard.');
    }
  };

  // NOTE: this is plain JSX (not a component defined inside render), so React keeps the
  // same slider element while you drag — that is what makes it move smoothly.
  const filterPanel = (
    <div className="space-y-7">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Price range</Label>
          <span className="text-sm font-medium text-primary" aria-live="polite">
            {priceRange ? `${formatCurrency(sliderValue[0])} – ${formatCurrency(sliderValue[1])}` : 'Any price'}
          </span>
        </div>
        <Slider
          min={priceFloor}
          max={priceCeiling}
          step={10}
          minStepsBetweenThumbs={1}
          value={sliderValue}
          onValueChange={(v) => {
            const next: [number, number] = [v[0], v[1]];
            setPriceRange(next[0] <= priceFloor && next[1] >= priceCeiling ? null : next);
          }}
          aria-label="Price range"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(priceFloor)}</span>
          <span>{formatCurrency(priceCeiling)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="block text-sm font-semibold">Show</Label>
        <label htmlFor="available" className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox id="available" checked={availableOnly} onCheckedChange={(c) => setAvailableOnly(c === true)} />
          Available now
        </label>
        <label htmlFor="offers" className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox id="offers" checked={offersOnly} onCheckedChange={(c) => setOffersOnly(c === true)} />
          On offer (discounted)
        </label>
      </div>

      {filtersActive && (
        <Button variant="outline" size="sm" className="w-full" onClick={resetFilters}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-4xl font-bold">Our Menu</h1>
        <p className="mt-2 text-muted-foreground">Pick a category to see every dish inside it</p>
      </div>

      {/* Guest Notice Banner */}
      {!isLoggedIn && (
        <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Browsing as a Guest</p>
              <p className="text-xs text-muted-foreground">You can explore our full menu. Please log in to order food or customize dishes.</p>
            </div>
          </div>
          <Link href="/login?redirect=/menu">
            <Button size="sm" className="whitespace-nowrap">
              Log In to Order
            </Button>
          </Link>
        </div>
      )}

      {/* Search and Sort Bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search dishes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-9" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name: A to Z</SelectItem>
            </SelectContent>
          </Select>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative shrink-0 lg:hidden" aria-label="Filters">
                <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
                {filtersActive && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">{filterPanel}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>



      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Desktop Filters Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border/60 bg-card p-6">
            <h3 className="mb-5 font-semibold">Filters</h3>
            {filterPanel}
          </div>
        </aside>

        {/* Menu Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : categoryCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-20 text-center">
              <p className="text-lg font-semibold">No dishes found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
              {(filtersActive || search) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    resetFilters();
                    setSearch('');
                  }}
                >
                  Clear search & filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{categoryCards.length}</span>{' '}
                  {categoryCards.length === 1 ? 'category' : 'categories'} ·{' '}
                  <span className="font-semibold text-foreground">{filteredItems.length}</span> {filteredItems.length === 1 ? 'dish' : 'dishes'}
                  {searching && ' match your search'}
                </p>
              </div>
              <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {categoryCards.map(({ category, dishes, total }) => (
                  <CategoryCard
                    key={category.id}
                    ref={(el) => {
                      cardRefs.current[category.id] = el;
                    }}
                    category={category}
                    dishes={dishes}
                    totalCount={total}
                    filtered={narrowed}
                    // while searching, every category with a match opens so the results are visible
                    open={searching || openCategory === category.id}
                    onToggle={() => setOpenCategory((cur) => (cur === category.id ? null : category.id))}
                    onAdd={handleAddToCart}
                    canOrder={isLoggedIn}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={null}>
      <MenuPageContent />
    </Suspense>
  );
}
