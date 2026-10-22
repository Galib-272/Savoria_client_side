'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, CreditCard, User } from 'lucide-react';
import type { MenuItem, MenuCategory } from '@/lib/types';
import { CategoryMenuBar } from '@/components/restaurant/category-menu-bar';
import { FoodImage } from '@/components/restaurant/food-image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useRestaurantSettings, calcTax } from '@/hooks/use-restaurant-settings';
import { getCouponMinSpend } from '@/lib/cart';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);

interface CartItem {
  menuItemId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const settings = useRestaurantSettings();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [processing, setProcessing] = useState(false);

  // Coupon state for POS cashier
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState(0);

  const [couponMinOrder, setCouponMinOrder] = useState<number>(0);
  const [couponMaxDiscount, setCouponMaxDiscount] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Fetch live categories and menu items
    api.getCategories().then((cats) => {
      if (Array.isArray(cats)) setCategories(cats);
    }).catch(console.error);

    api.getMenuItems().then((items) => {
      if (items && items.length) setMenuItems(items.map((i: any) => ({ ...i, id: i._id || i.id })));
    }).catch(console.error);
  }, []);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCat = activeCat === 'all' || item.categoryId === activeCat;
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [menuItems, activeCat, search]);

  const addToCart = (item: MenuItem) => {
    if (!item.available) {
      toast.error(`${item.name} is currently unavailable`);
      return;
    }
    setCart((prev) => {
      const itemId = item.id || (item as any)._id;
      const existing = prev.find((c) => c.menuItemId === itemId);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === itemId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menuItemId: itemId,
          name: item.name,
          image: item.image,
          price: item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeItem = (menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  // Recalculate discount whenever subtotal or coupon settings change
  useEffect(() => {
    if (!appliedCoupon || !couponValue) {
      setDiscount(0);
      return;
    }

    const minRequired = getCouponMinSpend(appliedCoupon, couponMinOrder);

    if (minRequired > 0 && subtotal < minRequired) {
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponMinOrder(0);
      setCouponMaxDiscount(undefined);
      toast.error(`Coupon ${appliedCoupon} removed: requires minimum spend of ৳${minRequired}. Current subtotal is ৳${subtotal}.`);
      return;
    }

    let newDiscount = 0;
    if (couponType === 'percentage') {
      newDiscount = Math.round((subtotal * couponValue) / 100);
      if (couponMaxDiscount && newDiscount > couponMaxDiscount) {
        newDiscount = couponMaxDiscount;
      }
    } else {
      newDiscount = couponValue;
    }
    setDiscount(Math.min(newDiscount, subtotal));
  }, [subtotal, appliedCoupon, couponType, couponValue, couponMinOrder, couponMaxDiscount]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    const code = couponCode.trim().toUpperCase();
    const minKnown = getCouponMinSpend(code, 0);

    if (minKnown > 0 && subtotal < minKnown) {
      toast.error(`Minimum food spend of ৳${minKnown} required to apply coupon ${code}. Current subtotal is ${formatCurrency(subtotal)}.`);
      return;
    }

    try {
      const res = await api.validateCoupon(code, subtotal);
      if (res && res.success) {
        const discountAmt = res.discount || 0;
        const type = res.coupon?.type || 'percentage';
        const value = res.coupon?.value || 0;
        const minOrder = res.coupon?.minOrder || minKnown;
        const maxDiscount = res.coupon?.maxDiscount;

        if (minOrder > 0 && subtotal < minOrder) {
          toast.error(`Minimum food spend of ৳${minOrder} required to apply coupon ${code}. Current subtotal is ${formatCurrency(subtotal)}.`);
          return;
        }

        setDiscount(discountAmt);
        setAppliedCoupon(code);
        setCouponType(type);
        setCouponValue(value);
        setCouponMinOrder(minOrder);
        setCouponMaxDiscount(maxDiscount);
        toast.success(`Coupon ${code} applied! Discount: ${formatCurrency(discountAmt)}`);
      } else {
        toast.error(res?.message || 'Invalid coupon code');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired coupon');
    }
  };

  const removeCoupon = () => {
    setDiscount(0);
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponType('percentage');
    setCouponValue(0);
    setCouponMinOrder(0);
    setCouponMaxDiscount(undefined);
    toast.success('Coupon removed');
  };

  const tax = calcTax(subtotal, settings.taxRate);
  // Delivery fee strictly for delivery orders only (same value the server uses)
  const deliveryFee = orderType === 'delivery' && cart.length > 0 ? settings.deliveryFee : 0;
  const total = Math.max(0, subtotal - discount + tax + deliveryFee);

  const handleCheckout = async () => {
    if (!cart.length) {
      toast.error('Cart is empty');
      return;
    }
    if (orderType === 'dine-in') {
      const n = Number(tableNumber);
      if (!Number.isInteger(n) || n < 1 || n > 25) {
        toast.error('Enter a table number between 1 and 25');
        return;
      }
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Enter the delivery address');
      return;
    }

    setProcessing(true);
    let createdOrder: any = null;
    try {
      // 1. Create the order (server prices every item from the menu)
      const orderRes = await api.createOrder({
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        orderType,
        tableNumber: orderType === 'dine-in' ? Number(tableNumber) : undefined,
        address: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
        couponCode: appliedCoupon || undefined,
        items: cart.map((c) => ({ menuItemId: c.menuItemId, name: c.name, quantity: c.quantity })),
      });
      createdOrder = orderRes?.data;

      // 2. Take the payment once (cashier billing)
      const payMethodKey = paymentMethod.toLowerCase().replace(/ /g, '_');
      const payRes = await api.processPayment({
        orderId: createdOrder._id || createdOrder.id,
        amount: createdOrder.total,
        paymentMethod: ['card', 'mobile_banking', 'bank_transfer'].includes(payMethodKey) ? payMethodKey : 'cash',
      });

      toast.success(`Order ${createdOrder.orderNumber} paid — receipt ${payRes?.receiptNumber}`);
      setCart([]);
      setAppliedCoupon(null);
      setCouponCode('');
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setCheckoutOpen(false);
    } catch (err: any) {
      if (createdOrder) {
        toast.error(`Order ${createdOrder.orderNumber} was sent to the kitchen but the payment failed: ${err.message}. Collect it from the Orders page.`);
        setCart([]);
        setCheckoutOpen(false);
      } else {
        toast.error(err.message || 'Could not create the order');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="font-display text-2xl font-bold">POS / Cashier</h1>
          <p className="text-sm text-muted-foreground">Point of sale for fast order processing & payments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/pos"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>POS Terminal</span>
          </Link>
          <Link
            href="/dashboard/pos/transactions"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors shadow-xs"
          >
            <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Transaction History</span>
          </Link>
          <Link
            href="/dashboard/pos/profile"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors shadow-xs"
          >
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Cashier Profile</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Menu Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>

          {/* Categories — each chip opens a dropdown of its dishes; pick one to add it */}
          <CategoryMenuBar
            size="sm"
            categories={categories}
            items={menuItems}
            active={activeCat}
            onActiveChange={setActiveCat}
            onPickItem={(item) => {
              addToCart(item);
              toast.success(`${item.name} added`, { duration: 1200 });
            }}
            pickLabel="+ Add"
            showAllLabel={(c) => `Show all ${c.name} in the grid`}
          />

          {/* Menu Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={!item.available}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:shadow-none"
              >
                <div className="aspect-square overflow-hidden">
                  <FoodImage src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                </div>
                {!item.available && (
                  <span className="absolute left-2 top-2 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">Unavailable</span>
                )}
                <div className="p-2">
                  <p className="truncate text-xs font-semibold">{item.name}</p>
                  <p className="text-sm font-bold text-primary">{formatCurrency(item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" /> Current Order
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShoppingCart className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Cart is empty</p>
                    <p className="text-xs text-muted-foreground">Click items to add</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.menuItemId} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
                        <FoodImage src={item.image} alt={item.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{item.name}</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.menuItemId, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.menuItemId, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.menuItemId)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              {cart.length > 0 && (
                <div className="border-t border-border p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>Discount ({appliedCoupon})</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({settings.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary text-lg">{formatCurrency(total)}</span></div>

                  {/* Quick Coupon Input for POS */}
                  <div className="pt-2 pb-1">
                    <p className="mb-1.5 text-xs text-muted-foreground">Apply Coupon Code</p>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-green-400/50 bg-green-50/50 px-2.5 py-1.5">
                        <div className="text-xs">
                          <span className="font-bold text-green-700">{appliedCoupon}</span>
                          <span className="ml-1 text-green-600">
                            ({couponType === 'percentage' ? `${couponValue}% off` : `৳${couponValue}`})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-xs text-destructive hover:text-destructive"
                          onClick={removeCoupon}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="SAVE20"
                          className="h-8 text-xs uppercase"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        />
                        <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={applyCoupon}>
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button className="w-full mt-2" onClick={() => setCheckoutOpen(true)}>
                    <Receipt className="mr-2 h-4 w-4" /> Checkout ({formatCurrency(total)})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>Process payment for the current order</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Order Type</p>
              <div className="grid grid-cols-3 gap-2">
                {(['dine-in', 'takeaway', 'delivery'] as const).map((type) => (
                  <button key={type} onClick={() => setOrderType(type)} className={cn('rounded-lg border px-3 py-2 text-xs font-medium capitalize', orderType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}>
                    {type.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Customer Name</p>
                <Input placeholder="Walk-in Customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Phone (optional)</p>
                <Input placeholder="01XXXXXXXXX" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="tel" />
              </div>
            </div>

            {orderType === 'dine-in' && (
              <div>
                <p className="mb-2 text-sm font-medium">Table Number (1–25)</p>
                <Input placeholder="e.g. 5" type="number" min={1} max={25} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
              </div>
            )}

            {orderType === 'delivery' && (
              <div>
                <p className="mb-2 text-sm font-medium">Delivery Address</p>
                <Input placeholder="Customer address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {['Cash', 'Card', 'Mobile Banking', 'Bank Transfer'].map((method) => (
                  <button key={method} onClick={() => setPaymentMethod(method)} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium', paymentMethod === method ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}>
                    <CreditCard className="h-3 w-3" /> {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Discount ({appliedCoupon})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({settings.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery Fee</span><span>{formatCurrency(deliveryFee)}</span></div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button onClick={handleCheckout}>Process Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
