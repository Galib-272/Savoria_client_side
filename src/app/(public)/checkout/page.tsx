'use client';

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
import { ArrowLeft, CheckCircle2, CreditCard, Armchair, MapPin } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { getCart, clearCart, type CartItem, getSavedCoupon, saveCoupon, clearCoupon } from '@/lib/cart';
import { getStoredUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

import { StripePaymentModal } from '@/components/checkout/stripe-payment-modal';
import { TableSeatSelector } from '@/components/checkout/table-seat-selector';

export default function CheckoutPage() {
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

    // Restore applied coupon if minimum order constraint is met
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
  }, [router]);

  const subtotal = cart.reduce((sum, item) => {
    const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
    return sum + (item.price + modPrice) * item.quantity;
  }, 0);

  // Recalculate discount whenever subtotal or coupon parameters change
  useEffect(() => {
    if (!appliedCoupon || !couponValue) return;

    if (couponMinOrder > 0 && subtotal < couponMinOrder) {
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
      newDiscount = Math.round((subtotal * couponValue) / 100);
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
  }, [subtotal, appliedCoupon, couponType, couponValue, couponMinOrder, couponMaxDiscount]);

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

  const tax = Math.round(subtotal * 0.1);
  // Delivery fee applies strictly for delivery orders only
  const deliveryFee = orderType === 'delivery' && cart.length > 0 ? 50 : 0;
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

    // Cash selection: instantly receive payment and create order
    if (paymentMethod === 'cash') {
      executeOrderCreation({
        payMethod: 'cash',
        payStatus: 'paid',
      });
      return;
    }

    // Card, Mobile Banking & Bank Transfer: open authentic white Stripe modal
    setStripeModalOpen(true);
  };

  const executeOrderCreation = async ({
    payMethod,
    payStatus,
    stripePaymentIntentId,
  }: {
    payMethod: string;
    payStatus: string;
    stripePaymentIntentId?: string;
  }) => {
    setSubmitting(true);
    try {
      const orderData: Record<string, any> = {
        orderType,
        customerName: name,
        customerPhone: phone,
        customerEmail: email.trim().toLowerCase(),
        tableNumber: orderType === 'dine-in' ? Number(tableNumber) || 1 : undefined,
        address: orderType === 'delivery' ? deliveryAddress : undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          modifiers: c.modifiers || [],
        })),
        subtotal,
        discount,
        couponCode: appliedCoupon || undefined,
        tax,
        deliveryFee,
        total,
        paymentMethod: payMethod,
        paymentStatus: payStatus,
        stripePaymentIntentId,
        notes,
      };

      // Include dine-in seat selection metadata
      if (orderType === 'dine-in' && selectedSeats.length > 0) {
        orderData.selectedTableId = selectedTableId;
        orderData.selectedTableName = selectedTableName;
        orderData.selectedSeats = selectedSeats;
      }

      const res = await api.createOrder(orderData);
      const orderId = res?.order?._id || res?.order?.id || res?.data?._id || res?.data?.id || 'ORD-NEW';
      setCreatedOrderId(orderId);
      clearCart();
      setStripeModalOpen(false);

      // Mark selected seats as occupied on the table
      if (orderType === 'dine-in' && selectedTableId && selectedSeats.length > 0) {
        try {
          for (const seat of selectedSeats) {
            await api.updateSeatStatus(selectedTableId, seat, 'occupied', name);
          }
        } catch {
          // Non-blocking — seats might have been updated by kitchen/waiter
        }
      }

      if (payMethod === 'cash') {
        toast.success(`Order confirmed! Cash payment of ${formatCurrency(total)} instantly received.`);
        router.push(`/orders?orderId=${orderId}`);
      } else {
        toast.success(`Payment of ${formatCurrency(total)} confirmed! Order placed successfully.`);
        router.push(`/orders?orderId=${orderId}`);
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
        <h2 className="font-display text-2xl font-bold">Payment & Order Confirmed!</h2>
        <p className="mt-2 text-muted-foreground">Order #{createdOrderId} has been received. Redirecting to live order tracking...</p>
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
            <CardHeader><CardTitle className="text-lg">Order Type</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {(['dine-in', 'takeaway', 'delivery'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setOrderType(type);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('rms_order_type', type);
                      }
                      if (type !== 'dine-in') {
                        setSelectedTableId('');
                        setSelectedTableName('');
                        setSelectedSeats([]);
                        setTableNumber('');
                      }
                    }}
                    className={cn('rounded-lg border-2 px-4 py-3 text-sm font-medium capitalize transition-colors', orderType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}
                  >
                    {type.replace('-', ' ')}
                  </button>
                ))}
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
          <Card className="sticky top-20">
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
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax (10%)</span><span>{formatCurrency(tax)}</span></div>
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
            payStatus: 'paid',
            stripePaymentIntentId,
          });
        }}
      />
    </div>
  );
}
