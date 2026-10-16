'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, Lock, LogIn } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getCart, saveCart, type CartItem } from '@/lib/cart';
import { getStoredUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getStoredUser());
  }, []);

  useEffect(() => {
    const loaded = getCart();
    setCart(loaded);

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

  const removeItem = (id: string) => {
    setCart((prev) => {
      const updated = prev.filter((c) => c.menuItemId !== id);
      saveCart(updated);
      return updated;
    });
    toast.success('Item removed from cart');
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await api.validateCoupon(couponCode.trim(), subtotal);
      if (res && res.valid) {
        setDiscount(res.discountAmount || 0);
        setAppliedCoupon(res.coupon?.code || couponCode.toUpperCase());
        toast.success(`Coupon ${res.coupon?.code || couponCode} applied! Saved ${formatCurrency(res.discountAmount || 0)}`);
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
    router.push('/checkout');
  };

  const subtotal = cart.reduce((sum, item) => {
    const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
    return sum + (item.price + modPrice) * item.quantity;
  }, 0);
  const tax = Math.round(subtotal * 0.1);
  const deliveryFee = cart.length > 0 ? 50 : 0;
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
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-success font-medium">
                  <span>Discount ({appliedCoupon})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax (10%)</span><span>{formatCurrency(tax)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery Fee</span><span>{formatCurrency(deliveryFee)}</span></div>
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
                <div className="flex gap-2">
                  <Input
                    placeholder="SAVE20"
                    className="text-sm"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  <Button variant="outline" size="sm" onClick={applyCoupon}>Apply</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
