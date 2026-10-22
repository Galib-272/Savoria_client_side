'use client';

import { RequireRole } from '@/components/auth/require-role';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, CreditCard, Armchair, MapPin, Utensils, ShoppingBag, Bike } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { getCart, clearCart, type CartItem, getSavedCoupon, saveCoupon, clearCoupon, getCouponMinSpend, computeCouponDiscount } from '@/lib/cart';
import { useRestaurantSettings, calcTax } from '@/hooks/use-restaurant-settings';
import { getStoredUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

import { StripePaymentModal } from '@/components/checkout/stripe-payment-modal';
import { TableSeatSelector } from '@/components/checkout/table-seat-selector';

function CheckoutPageContent() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedTableName, setSelectedTableName] = useState('');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string>('');
  const settings = useRestaurantSettings();
  const [stripeModalOpen, setStripeModalOpen] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState(0);
  const [couponMinOrder, setCouponMinOrder] = useState<number>(0);
  const [couponMaxDiscount, setCouponMaxDiscount] = useState<number | undefined>(undefined);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      toast.error('Please log in to proceed with checkout.');
      router.replace('/login?redirect=/checkout');
      return;
    }
    if (user.name) setName(user.name);
    if (user.email) setEmail(user.email);
    if (user.phone) setPhone(user.phone);

    if (typeof window !== 'undefined') {
      const storedOrderType = localStorage.getItem('rms_order_type') as 'dine-in' | 'takeaway' | 'delivery';
      if (storedOrderType) {
        setOrderType(storedOrderType);
      }
    }

    const loaded = getCart();
    setCart(loaded);

    const loadedSubtotal = loaded.reduce((sum, item) => {
      const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
      return sum + (item.price + modPrice) * item.quantity;
    }, 0);

    // Restore applied coupon ONLY if minimum order constraint is strictly met
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
  }, [router]);

  const subtotal = cart.reduce((sum, item) => {
    const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
    return sum + (item.price + modPrice) * item.quantity;
  }, 0);

  // Recalculate discount whenever subtotal or coupon parameters change
  useEffect(() => {
    if (!appliedCoupon || !couponValue) return;

    const minRequired = getCouponMinSpend(appliedCoupon, couponMinOrder);

    // Strictly enforce minimum spend requirement on the food subtotal ("main money")
    if (minRequired > 0 && subtotal < minRequired) {
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponMinOrder(0);
      setCouponMaxDiscount(undefined);
      clearCoupon();
      toast.error(`Coupon ${appliedCoupon} removed: requires minimum spend of ৳${minRequired}. Current food subtotal is ৳${subtotal}.`);
      return;
    }

    const newDiscount = computeCouponDiscount(subtotal, couponType, couponValue, couponMaxDiscount);
    setDiscount(newDiscount);
    saveCoupon({
      code: appliedCoupon,
      type: couponType,
      value: couponValue,
      minOrder: minRequired,
      maxDiscount: couponMaxDiscount,
      discountAmount: newDiscount,
    });
  }, [subtotal, appliedCoupon, couponType, couponValue, couponMinOrder, couponMaxDiscount]);

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

  const tax = calcTax(subtotal, settings.taxRate);
  // Delivery fee applies strictly for delivery orders only (same value the server charges)
  const deliveryFee = orderType === 'delivery' && cart.length > 0 ? settings.deliveryFee : 0;
  const total = Math.max(0, subtotal - discount + tax + deliveryFee);

  const handleTableSeatSelect = (tableId: string, tableNum: number, tableName: string, seats: string[]) => {
    setSelectedTableId(tableId);
    setTableNumber(String(tableNum));
    setSelectedTableName(tableName);
    setSelectedSeats(seats);
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (orderType === 'dine-in' && (!tableNumber || selectedSeats.length === 0)) {
      toast.error('Please select a table and at least one seat');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Please enter your delivery address');
      return;
    }

    // Cash: the order goes to the kitchen now and is paid at the counter / to the waiter / to the rider
    if (paymentMethod === 'cash') {
      executeOrderCreation({ payMethod: 'cash' }).catch(() => undefined);
      return;
    }

    // Card, Mobile Banking & Bank Transfer: open authentic white Stripe modal
    setStripeModalOpen(true);
  };

  const executeOrderCreation = async ({
    payMethod,
    stripePaymentIntentId,
  }: {
    payMethod: string;
    stripePaymentIntentId?: string;
  }) => {
    setSubmitting(true);
    try {
      // The server prices every item from the menu and recalculates tax, fees and the coupon
      const orderData: Record<string, any> = {
        orderType,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        tableNumber: orderType === 'dine-in' ? Number(tableNumber) : undefined,
        seats: orderType === 'dine-in' ? selectedSeats : undefined,
        address: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          quantity: c.quantity,
          modifiers: c.modifiers || [],
        })),
        couponCode: appliedCoupon || undefined,
        paymentMethod: payMethod,
        stripePaymentIntentId,
        notes: notes.trim() || undefined,
      };

      const res = await api.createOrder(orderData);
      const order = res?.data;
      const orderId = order?._id || order?.id;
      setCreatedOrderId(orderId);
      setCreatedOrderNumber(order?.orderNumber || '');
      clearCart();

      if (payMethod === 'cash') {
        const where =
          orderType === 'delivery' ? 'to the rider on delivery' : orderType === 'takeaway' ? 'at the counter when you collect it' : 'to your waiter at the table';
        toast.success(`Order ${order?.orderNumber} placed! Please pay ${formatCurrency(order?.total ?? total)} ${where}.`);
        router.push(`/orders?orderId=${orderId}`);
      } else {
        // the payment modal shows its own success state and redirects
        toast.success(`Payment of ${formatCurrency(order?.total ?? total)} received. Order ${order?.orderNumber} placed!`);
      }
      return res;
    } catch (err: any) {
      setStripeModalOpen(false);
      toast.error(err?.message || 'Failed to place order');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  if (createdOrderId) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success animate-in zoom-in">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="font-display text-2xl font-bold">Order Confirmed!</h2>
        <p className="mt-2 text-muted-foreground">Order {createdOrderNumber} has been received. Redirecting to live order tracking...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/cart" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Cart
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">Checkout</h1>

      <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Type */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order Type</CardTitle>
                <span className="text-xs text-muted-foreground">Choose dining method</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'dine-in', label: 'Dine In', icon: Utensils, note: 'Reserve table & seats' },
                  { key: 'takeaway', label: 'Takeaway', icon: ShoppingBag, note: 'Pickup in store' },
                  { key: 'delivery', label: 'Delivery', icon: Bike, note: `Home delivery (৳${settings.deliveryFee})` },
                ].map(({ key, label, icon: Icon, note }) => {
                  const isActive = orderType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setOrderType(key as any);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('rms_order_type', key);
                        }
                        if (key !== 'dine-in') {
                          setSelectedTableId('');
                          setSelectedTableName('');
                          setSelectedSeats([]);
                          setTableNumber('');
                        }
                      }}
                      className={cn(
                        'group relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all duration-200 ease-out cursor-pointer select-none',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm shadow-primary/10 scale-[1.02] ring-2 ring-primary/20'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/70 hover:text-foreground hover:-translate-y-0.5 hover:shadow-xs active:scale-95'
                      )}
                    >
                      <Icon className={cn('h-5 w-5 transition-transform duration-200 group-hover:scale-115', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
                      <span className="text-sm font-semibold capitalize tracking-tight">{label}</span>
                      <span className="text-[10px] text-muted-foreground">{note}</span>
                      {isActive && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Dine-In: Interactive Table & Seat Selection */}
          {orderType === 'dine-in' && (
            <div className="space-y-4">
              <TableSeatSelector
                onSelect={handleTableSeatSelect}
                selectedTableId={selectedTableId}
                selectedSeats={selectedSeats}
                customerName={name}
              />

              {/* Selected table confirmation strip */}
              {selectedTableName && selectedSeats.length > 0 && (
                <div className="flex items-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 animate-in slide-in-from-top-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Armchair className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {selectedTableName} — {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      Seats: {selectedSeats.join(', ')}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-primary/30 text-primary text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Customer Info */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Customer Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+880 1700-000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {orderType === 'delivery' && (
                <div className="space-y-2">
                  <Label>Delivery Address</Label>
                  <Textarea
                    placeholder="House, Road, Area, City"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Special Instructions</Label>
                <Textarea
                  placeholder="Any special requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Payment Method</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {['Cash', 'Card', 'Mobile Banking', 'Bank Transfer'].map((method) => (
                  <button key={method} type="button" onClick={() => setPaymentMethod(method.toLowerCase().replace(' ', '_'))} className={cn('flex items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors', paymentMethod === method.toLowerCase().replace(' ', '_') ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}>
                    <CreditCard className="h-4 w-4" /> {method}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-20">
            <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Your cart is empty.</p>
                ) : (
                  cart.map((item) => {
                    const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
                    return (
                      <div key={item.menuItemId} className="flex justify-between">
                        <span className="text-muted-foreground truncate max-w-[170px]">{item.name} × {item.quantity}</span>
                        <span>{formatCurrency((item.price + modPrice) * item.quantity)}</span>
                      </div>
                    );
                  })
                )}
              </div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Discount ({appliedCoupon})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({settings.taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className={deliveryFee === 0 ? 'text-emerald-600 font-medium' : ''}>
                  {deliveryFee === 0 ? '৳0 (Free)' : formatCurrency(deliveryFee)}
                </span>
              </div>
              <Separator />

              {/* Dine-in seat info in summary */}
              {orderType === 'dine-in' && selectedTableName && selectedSeats.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Armchair className="h-3.5 w-3.5" /> Table
                    </span>
                    <span className="font-medium">{selectedTableName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Seats</span>
                    <span className="font-medium">{selectedSeats.join(', ')}</span>
                  </div>
                  <Separator />
                </>
              )}

              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
              <Button type="submit" className="w-full text-base font-bold h-11" disabled={submitting || cart.length === 0 || (orderType === 'dine-in' && selectedSeats.length === 0)}>
                {submitting ? 'Processing Payment...' : orderType === 'dine-in' && selectedSeats.length === 0 ? 'Select Table & Seats First' : 'Proceed to Payment'}
              </Button>

              {/* Coupon Code Section */}
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={removeCoupon}
                    >
                      Remove
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
                    <Button type="button" variant="outline" size="sm" onClick={applyCoupon}>
                      Apply
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Real White Stripe Payment Page for Card, Mobile Banking & Bank Transfer */}
      <StripePaymentModal
        open={stripeModalOpen}
        onOpenChange={setStripeModalOpen}
        amount={total}
        paymentMethod={paymentMethod}
        customerName={name}
        customerEmail={email}
        items={cart}
        subtotal={subtotal}
        tax={tax}
        deliveryFee={deliveryFee}
        discount={discount}
        couponCode={appliedCoupon || undefined}
        onSuccess={async ({ paymentMethod: confirmedMethod, stripePaymentIntentId }) => {
          return await executeOrderCreation({
            payMethod: confirmedMethod,
            stripePaymentIntentId,
          });
        }}
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireRole roles={['customer']}>
      <CheckoutPageContent />
    </RequireRole>
  );
}
