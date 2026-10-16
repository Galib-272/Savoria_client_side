'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Minus, Star, Clock, ShoppingBag, Check, Lock } from 'lucide-react';
import { menuItems as fallbackMenuItems, categories as fallbackCategories, reviews as fallbackReviews } from '@/lib/mock-data';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { addToCart } from '@/lib/cart';
import { getStoredUser } from '@/lib/auth';
import type { MenuItem, MenuCategory, Review } from '@/lib/types';

export default function MenuItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idStr = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [item, setItem] = useState<MenuItem | null>(() => {
    return fallbackMenuItems.find((m) => m.id === idStr) || null;
  });
  const [categoriesList, setCategoriesList] = useState<MenuCategory[]>(fallbackCategories);
  const [reviewsList, setReviewsList] = useState<Review[]>(fallbackReviews);
  const [loading, setLoading] = useState(!item);

  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({});
  const [added, setAdded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getStoredUser());
  }, []);

  useEffect(() => {
    if (!idStr) return;

    // Fetch live categories
    api.getCategories().then((cats) => {
      if (cats && cats.length) setCategoriesList(cats.map((c: any) => ({ ...c, id: c._id || c.id })));
    }).catch(console.error);

    // Fetch live reviews
    api.getReviews().then((revs) => {
      if (revs && revs.length) setReviewsList(revs.map((r: any) => ({ ...r, id: r._id || r.id })));
    }).catch(console.error);

    // Try fetching item by ID or finding in all items
    api.getMenuItemById(idStr).then((res) => {
      if (res) {
        setItem({ ...res, id: res._id || res.id });
        setLoading(false);
      } else {
        // Fallback to checking full list
        return api.getMenuItems().then((all) => {
          const found = all.find((x: any) => (x._id || x.id) === idStr);
          if (found) setItem({ ...found, id: found._id || found.id });
          setLoading(false);
        });
      }
    }).catch(() => {
      // Check fallback
      const found = fallbackMenuItems.find((m) => m.id === idStr);
      if (found) setItem(found);
      setLoading(false);
    });
  }, [idStr]);

  const itemReviews = reviewsList.filter((r) => r.rating >= 4).slice(0, 3);

  const modifierPrice = useMemo(() => {
    if (!item?.modifiers) return 0;
    let extra = 0;
    item.modifiers.forEach((mod) => {
      const selected = selectedOptions[mod.id];
      if (mod.type === 'single' && typeof selected === 'string') {
        const opt = mod.options.find((o) => o.id === selected);
        if (opt) extra += opt.price;
      } else if (mod.type === 'multiple' && Array.isArray(selected)) {
        selected.forEach((id) => {
          const opt = mod.options.find((o) => o.id === id);
          if (opt) extra += opt.price;
        });
      }
    });
    return extra;
  }, [item, selectedOptions]);

  const handleSingleSelect = (modId: string, optId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [modId]: optId }));
  };

  const handleMultipleToggle = (modId: string, optId: string) => {
    setSelectedOptions((prev) => {
      const current = (prev[modId] as string[]) ?? [];
      return {
        ...prev,
        [modId]: current.includes(optId) ? current.filter((id) => id !== optId) : [...current, optId],
      };
    });
  };

  const handleAddToCart = () => {
    if (!item) return;

    const user = getStoredUser();
    if (!user) {
      toast.error('Please log in to order food and customize this dish.');
      router.push(`/login?redirect=/menu/${item.id}`);
      return;
    }

    const selectedMods: { name: string; price: number }[] = [];
    if (item.modifiers) {
      item.modifiers.forEach((mod) => {
        const sel = selectedOptions[mod.id];
        if (typeof sel === 'string') {
          const opt = mod.options.find((o) => o.id === sel);
          if (opt) selectedMods.push({ name: opt.name, price: opt.price });
        } else if (Array.isArray(sel)) {
          sel.forEach((sid) => {
            const opt = mod.options.find((o) => o.id === sid);
            if (opt) selectedMods.push({ name: opt.name, price: opt.price });
          });
        }
      });
    }

    addToCart(item, quantity, selectedMods);
    setAdded(true);
    toast.success(`${quantity} × ${item.name} added to cart`);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Loading dish details...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">Dish Not Found</h2>
        <p className="mt-2 text-muted-foreground">The item you are looking for does not exist.</p>
        <Link href="/menu" className="mt-4 inline-block">
          <Button>Back to Menu</Button>
        </Link>
      </div>
    );
  }

  const category = categoriesList.find((c: any) => c.id === item.categoryId || c.name === (item as any).category);
  const basePrice = item.discountPrice ?? item.price;
  const total = (basePrice + modifierPrice) * quantity;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/menu" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Menu
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Image */}
        <div className="relative overflow-hidden rounded-2xl">
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          {item.discountPrice && (
            <span className="absolute left-4 top-4 rounded-full bg-destructive px-3 py-1 text-sm font-bold text-white">
              {Math.round((1 - item.discountPrice / item.price) * 100)}% OFF
            </span>
          )}
          {!item.available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="rounded-lg bg-background px-4 py-2 font-semibold">Currently Unavailable</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            {category && <Badge variant="secondary">{category.icon} {category.name}</Badge>}
            {item.featured && <Badge className="bg-primary/10 text-primary">Featured</Badge>}
            {item.popular && <Badge className="bg-warning/10 text-warning">Popular</Badge>}
          </div>

          <h1 className="font-display text-3xl font-bold">{item.name}</h1>
          <p className="mt-2 text-muted-foreground">{item.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-semibold">{item.rating}</span>
              <span className="text-sm text-muted-foreground">({item.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> {item.prepTime} min
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{formatCurrency(basePrice)}</span>
            {item.discountPrice && (
              <span className="text-lg text-muted-foreground line-through">{formatCurrency(item.price)}</span>
            )}
          </div>

          <Separator className="my-6" />

          {/* Ingredients */}
          <div className="mb-6">
            <h3 className="mb-2 font-semibold">Ingredients</h3>
            <div className="flex flex-wrap gap-2">
              {item.ingredients.map((ing) => (
                <Badge key={ing} variant="outline">{ing}</Badge>
              ))}
            </div>
          </div>

          {/* Allergens */}
          {item.allergens.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 font-semibold">Allergens</h3>
              <div className="flex flex-wrap gap-2">
                {item.allergens.map((alg) => (
                  <Badge key={alg} variant="outline" className="border-destructive/30 text-destructive">{alg}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Modifiers */}
          {item.modifiers && item.modifiers.length > 0 && (
            <div className="mb-6 space-y-4">
              {item.modifiers.map((mod) => (
                <div key={mod.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-semibold">{mod.name}</h3>
                    {mod.required && <span className="text-xs text-destructive">*Required</span>}
                  </div>
                  {mod.type === 'single' ? (
                    <RadioGroup
                      onValueChange={(val) => handleSingleSelect(mod.id, val)}
                      defaultValue={mod.options[0]?.id}
                      className="space-y-2"
                    >
                      {mod.options.map((opt) => (
                        <div key={opt.id} className="flex items-center justify-between rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value={opt.id} id={opt.id} />
                            <Label htmlFor={opt.id} className="font-normal">{opt.name}</Label>
                          </div>
                          {opt.price > 0 && <span className="text-sm font-medium text-primary">+{formatCurrency(opt.price)}</span>}
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {mod.options.map((opt) => (
                        <div key={opt.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <Checkbox id={opt.id} onCheckedChange={() => handleMultipleToggle(mod.id, opt.id)} />
                            <Label htmlFor={opt.id} className="font-normal">{opt.name}</Label>
                          </div>
                          {opt.price > 0 && <span className="text-sm font-medium text-primary">+{formatCurrency(opt.price)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="sticky bottom-0 flex items-center gap-4 border-t bg-background/95 pt-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
              <span className="w-8 text-center font-bold">{quantity}</span>
              <Button size="icon" variant="outline" onClick={() => setQuantity((q) => q + 1)}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button onClick={handleAddToCart} disabled={!item.available} className="flex-1" size="lg">
              {!isLoggedIn ? (
                <><Lock className="mr-2 h-4 w-4" /> Log In to Order — {formatCurrency(total)}</>
              ) : added ? (
                <><Check className="mr-2 h-4 w-4" /> Added!</>
              ) : (
                <><ShoppingBag className="mr-2 h-4 w-4" /> Add to Cart — {formatCurrency(total)}</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-12">
        <h2 className="mb-4 font-display text-2xl font-bold">Customer Reviews</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {itemReviews.map((rev) => (
            <div key={rev.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex">{Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('h-4 w-4', i < rev.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30')} />
                ))}</div>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">"{rev.comment}"</p>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {rev.customerName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{rev.customerName}</p>
                  <p className="text-xs text-muted-foreground">{rev.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
