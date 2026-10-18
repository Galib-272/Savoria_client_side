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
import { ArrowLeft, CheckCircle2, CreditCard } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { getCart, clearCart, type CartItem } from '@/lib/cart';
import { getStoredUser } from '@/lib/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

import { StripePaymentModal } from '@/components/checkout/stripe-payment-modal';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tableNumber, setTableNumber] = useState('1');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);

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

    const loaded = getCart();
    setCart(loaded);
  }, [router]);

  const subtotal = cart.reduce((sum, item) => {
    const modPrice = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
    return sum + (item.price + modPrice) * item.quantity;
  }, 0);
  const tax = Math.round(subtotal * 0.1);
  const deliveryFee = orderType === 'delivery' && cart.length > 0 ? 50 : 0;
  const total = subtotal + tax + deliveryFee;

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
    if (orderType === 'dine-in' && !tableNumber) {
      toast.error('Please specify your table number');
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
      const orderData = {
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
        tax,
        deliveryFee,
        total,
        paymentMethod: payMethod,
        paymentStatus: payStatus,
        stripePaymentIntentId,
        notes,
      };

      const res = await api.createOrder(orderData);
      const orderId = res?.order?._id || res?.order?.id || res?.data?._id || res?.data?.id || 'ORD-NEW';
      setCreatedOrderId(orderId);
      clearCart();
      setStripeModalOpen(false);

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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
                  <button key={type} type="button" onClick={() => setOrderType(type)} className={cn('rounded-lg border-2 px-4 py-3 text-sm font-medium capitalize transition-colors', orderType === type ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}>
                    {type.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

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
              {orderType === 'dine-in' && (
                <div className="space-y-2">
                  <Label>Table Number (T1 - T25)</Label>
                  <Input
                    placeholder="e.g. 5"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    required
                  />
                </div>
              )}
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
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax (10%)</span><span>{formatCurrency(tax)}</span></div>
              {deliveryFee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery Fee</span><span>{formatCurrency(deliveryFee)}</span></div>}
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
              <Button type="submit" className="w-full text-base font-bold h-11" disabled={submitting || cart.length === 0}>
                {submitting ? 'Processing Payment...' : 'Proceed to Payment'}
              </Button>
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
