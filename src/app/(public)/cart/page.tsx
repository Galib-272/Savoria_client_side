'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, Lock, LogIn, Utensils, Bike, CheckCircle2 } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { getCart, saveCart, type CartItem, saveCoupon, getSavedCoupon, clearCoupon, getCouponMinSpend } from '@/lib/cart';
import { getStoredUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState(0);
  const [couponMinOrder, setCouponMinOrder] = useState<number>(0);
  const [couponMaxDiscount, setCouponMaxDiscount] = useState<number | undefined>(undefined);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getStoredUser());
    if (typeof window !== 'undefined') {
      const storedOrderType = localStorage.getItem('rms_order_type') as 'dine-in' | 'takeaway' | 'delivery';
      if (storedOrderType) {
        setOrderType(storedOrderType);
      }
    }
  }, []);

  useEffect(() => {
    const loaded = getCart();
    setCart(loaded);

    const loadedSubtotal = loaded.reduce((sum, item) => {
      const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
      return sum + (item.price + modPrice) * item.quantity;
    }, 0);

    // Restore previously applied coupon ONLY if minimum order constraint is strictly met
    const saved = getSavedCoupon();
    if (saved) {
      const minRequired = getCouponMinSpend(saved.code, saved.minOrder);
      if (loadedSubtotal < minRequired) {
        clearCoupon();
        setAppliedCoupon(null);
        setDiscount(0);
      } else {
        setAppliedCoupon(saved.code);
        setCouponCode(saved.code);
        setCouponType(saved.type);
        setCouponValue(saved.value);
        setCouponMinOrder(minRequired);
        setCouponMaxDiscount(saved.maxDiscount);
        // Verify with server
        api.validateCoupon(saved.code, loadedSubtotal).then((res) => {
          if (res && res.success) {
            setDiscount(res.discount);
          } else {
            clearCoupon();
            setAppliedCoupon(null);
            setDiscount(0);
          }
        }).catch(() => {
          clearCoupon();
          setAppliedCoupon(null);
          setDiscount(0);
        });
      }
    }

    const handleUpdate = () => {
      setCart(getCart());
    };
    window.addEventListener('cart_updated', handleUpdate);
    return () => window.removeEventListener('cart_updated', handleUpdate);
  }, []);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((c) =>
        c.menuItemId === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c
      );
      saveCart(updated);
      return updated;
    });
  };

  // Recalculate coupon discount when cart items change (quantity updates)
  useEffect(() => {
    if (!appliedCoupon || !couponValue) return;
    const currentSubtotal = cart.reduce((sum, item) => {
      const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
      return sum + (item.price + modPrice) * item.quantity;
    }, 0);

    const minRequired = getCouponMinSpend(appliedCoupon, couponMinOrder);

    // Strictly enforce minimum spend requirement on the food subtotal ("main money")
    if (minRequired > 0 && currentSubtotal < minRequired) {
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponMinOrder(0);
      setCouponMaxDiscount(undefined);
      clearCoupon();
      toast.error(`Coupon ${appliedCoupon} removed: requires minimum spend of ৳${minRequired}. Current food subtotal is ৳${currentSubtotal}.`);
      return;
    }

    let newDiscount = 0;
    if (couponType === 'percentage') {
      newDiscount = Math.round((currentSubtotal * couponValue) / 100);
      if (couponMaxDiscount && newDiscount > couponMaxDiscount) {
        newDiscount = couponMaxDiscount;
      }
    } else {
      newDiscount = couponValue;
    }
    setDiscount(newDiscount);
    saveCoupon({
      code: appliedCoupon,
      type: couponType,
      value: couponValue,
      minOrder: minRequired,
      maxDiscount: couponMaxDiscount,
      discountAmount: newDiscount,
    });
  }, [cart, appliedCoupon, couponType, couponValue, couponMinOrder, couponMaxDiscount]);

  const removeItem = (id: string) => {
    setCart((prev) => {
      const updated = prev.filter((c) => c.menuItemId !== id);
      saveCart(updated);
      return updated;
    });
    toast.success('Item removed from cart');
  };

  const removeCoupon = () => {
    setDiscount(0);
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponType('percentage');
    setCouponValue(0);
    setCouponMinOrder(0);
    setCouponMaxDiscount(undefined);
    clearCoupon();
    toast.success('Coupon removed');
  };

  const handleOrderTypeChange = (type: 'dine-in' | 'takeaway' | 'delivery') => {
    setOrderType(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rms_order_type', type);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    const code = couponCode.trim().toUpperCase();
    const minKnown = getCouponMinSpend(code, 0);

    // Ensure coupon can only apply if the main item subtotal reaches the minimum requirement
    if (minKnown > 0 && subtotal < minKnown) {
      toast.error(`Minimum food spend of ৳${minKnown} required to apply coupon ${code}. Current food subtotal is ${formatCurrency(subtotal)}.`);
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
          toast.error(`Minimum food spend of ৳${minOrder} required to apply coupon ${code}. Current food subtotal is ${formatCurrency(subtotal)}.`);
          return;
        }

        setDiscount(discountAmt);
        setAppliedCoupon(code);
        setCouponType(type);
        setCouponValue(value);
        setCouponMinOrder(minOrder);
        setCouponMaxDiscount(maxDiscount);
        saveCoupon({
          code,
          type,
          value,
          minOrder,
          maxDiscount,
          discountAmount: discountAmt,
        });
        toast.success(`Coupon ${code} applied! You save ${formatCurrency(discountAmt)} on food subtotal.`);
      } else {
        toast.error(res?.message || 'Invalid coupon code');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Invalid or expired coupon');
    }
  };

  const handleProceedToCheckout = () => {
    const user = getStoredUser();
    if (!user) {
      toast.error('Please log in to proceed to checkout and place an order.');
      router.push('/login?redirect=/checkout');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('rms_order_type', orderType);
    }
    router.push('/checkout');
  };

  const subtotal = cart.reduce((sum, item) => {
    const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
    return sum + (item.price + modPrice) * item.quantity;
  }, 0);
  const tax = Math.round(subtotal * 0.1);
  // Delivery charge applies ONLY for delivery orders, never for dine-in or takeaway
  const deliveryFee = orderType === 'delivery' && cart.length > 0 ? 50 : 0;
  const total = Math.max(0, subtotal - discount + tax + deliveryFee);

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
        <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/40" />
        <h2 className="font-display text-2xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-muted-foreground">Browse our menu and add some delicious items!</p>
        <Link href="/menu" className="mt-6">
          <Button>Browse Menu <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/menu" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-1 h-4 w-4" /> Continue Shopping
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">Your Cart</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.map((item) => {
            const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
            const itemTotal = (item.price + modPrice) * item.quantity;
            return (
              <Card key={item.menuItemId}>
                <CardContent className="flex items-center gap-4 p-4">
                  <img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.name}</p>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground">{item.modifiers.map((m) => m.name).join(', ')}</p>
                    )}
                    <p className="text-sm font-bold text-primary">{formatCurrency(item.price + modPrice)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(item.menuItemId, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(item.menuItemId, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <p className="w-20 text-right font-bold">{formatCurrency(itemTotal)}</p>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeItem(item.menuItemId)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Order Type Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Type</p>
                  <span className="text-[11px] font-medium text-muted-foreground">Select option</span>
                </div>
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-muted/50 rounded-xl border border-border/60">
                  {[
                    { key: 'dine-in', label: 'Dine In', icon: Utensils },
                    { key: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
                    { key: 'delivery', label: 'Delivery', icon: Bike },
                  ].map(({ key, label, icon: Icon }) => {
                    const isActive = orderType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleOrderTypeChange(key as any)}
                        className={cn(
                          'group relative flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs cursor-pointer select-none transition-all duration-200 ease-out',
                          isActive
                            ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 scale-[1.02] ring-2 ring-primary/30'
                            : 'text-muted-foreground bg-background/60 hover:bg-background hover:text-primary hover:shadow-xs hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 border border-transparent hover:border-primary/30 font-medium'
                        )}
                      >
                        <Icon className={cn('h-4 w-4 transition-transform duration-200 group-hover:scale-115', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary')} />
                        <span className="tracking-tight">{label}</span>
                        {isActive && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {orderType !== 'delivery' ? (
                  <p className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 animate-in fade-in duration-200">
                    <CheckCircle2 className="h-3.5 w-3.5" /> No delivery fee (৳0) for {orderType.replace('-', ' ')}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-amber-600 font-medium flex items-center gap-1.5 animate-in fade-in duration-200">
                    <Bike className="h-3.5 w-3.5" /> Delivery fee of ৳50 applies for home delivery
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-1 border-t border-border/50">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Discount ({appliedCoupon})</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax (10%)</span><span>{formatCurrency(tax)}</span></div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className={deliveryFee === 0 ? 'text-emerald-600 font-medium' : ''}>
                    {deliveryFee === 0 ? '৳0 (Free)' : formatCurrency(deliveryFee)}
                  </span>
                </div>
              </div>

              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
              <Button onClick={handleProceedToCheckout} className="w-full">
                {!isLoggedIn ? (
                  <><Lock className="mr-2 h-4 w-4" /> Log In to Checkout <ArrowRight className="ml-2 h-4 w-4" /></>
                ) : (
                  <>Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
              <div className="pt-2">
                <p className="mb-2 text-xs text-muted-foreground">Have a coupon?</p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-green-400/50 bg-green-50/50 px-3 py-2">
                    <div>
                      <span className="text-xs font-bold text-green-700">{appliedCoupon}</span>
                      <span className="ml-2 text-xs text-green-600">
                        ({couponType === 'percentage' ? `${couponValue}% off` : `৳${couponValue} off`})
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={removeCoupon}>
                      <Trash2 className="mr-1 h-3 w-3" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <Input
                        placeholder="SAVE20"
                        className="text-sm uppercase"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      <Button variant="outline" size="sm" onClick={applyCoupon}>Apply</Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Offers: <span className="font-semibold text-primary">SAVE20</span> (min spend ৳400) • <span className="font-semibold text-primary">SAVE30</span> (min spend ৳500)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
