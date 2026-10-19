'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, Lock, LogIn } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { getCart, saveCart, type CartItem, saveCoupon, getSavedCoupon, clearCoupon } from '@/lib/cart';
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

    // Restore previously applied coupon if minimum order constraint is satisfied
    const saved = getSavedCoupon();
    if (saved) {
      if (saved.minOrder && loadedSubtotal < saved.minOrder) {
        clearCoupon();
      } else {
        setAppliedCoupon(saved.code);
        setDiscount(saved.discountAmount);
        setCouponCode(saved.code);
        setCouponType(saved.type);
        setCouponValue(saved.value);
        setCouponMinOrder(saved.minOrder || 0);
        setCouponMaxDiscount(saved.maxDiscount);
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

    // Enforce minimum spend requirement
    if (couponMinOrder > 0 && currentSubtotal < couponMinOrder) {
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponMinOrder(0);
      setCouponMaxDiscount(undefined);
      clearCoupon();
      toast.error(`Coupon ${appliedCoupon} removed: minimum spend of ৳${couponMinOrder} is required.`);
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
      minOrder: couponMinOrder,
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
    try {
      const res = await api.validateCoupon(couponCode.trim(), subtotal);
      if (res && res.success) {
        const discountAmt = res.discount || 0;
        const code = res.coupon?.code || couponCode.toUpperCase();
        const type = res.coupon?.type || 'percentage';
        const value = res.coupon?.value || 0;
        const minOrder = res.coupon?.minOrder || 0;
        const maxDiscount = res.coupon?.maxDiscount;

        if (minOrder > 0 && subtotal < minOrder) {
          toast.error(`Minimum spend of ৳${minOrder} required to apply coupon ${code}. Current subtotal is ${formatCurrency(subtotal)}.`);
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
        toast.success(`Coupon ${code} applied! You save ${formatCurrency(discountAmt)}`);
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
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Type</p>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-lg">
                  {(['dine-in', 'takeaway', 'delivery'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleOrderTypeChange(type)}
                      className={cn(
                        'py-1.5 text-xs font-medium rounded-md transition-all capitalize',
                        orderType === type
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {type.replace('-', ' ')}
                    </button>
                  ))}
                </div>
                {orderType !== 'delivery' && (
                  <p className="mt-1 text-[11px] text-emerald-600 font-medium">✓ No delivery fee for {orderType.replace('-', ' ')}</p>
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
                  <div className="flex gap-2">
                    <Input
                      placeholder="SAVE20"
                      className="text-sm"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <Button variant="outline" size="sm" onClick={applyCoupon}>Apply</Button>
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
