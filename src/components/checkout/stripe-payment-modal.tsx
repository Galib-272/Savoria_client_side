'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, CreditCard, CheckCircle2, Loader2, ShieldCheck, Smartphone, Building2, UtensilsCrossed, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface StripePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  paymentMethod: string; // 'card' | 'mobile_banking' | 'bank_transfer'
  customerName?: string;
  customerEmail?: string;
  orderNumber?: string;
  onSuccess: (paymentData: { paymentMethod: string; stripePaymentIntentId: string }) => void;
}

export function StripePaymentModal({
  open,
  onOpenChange,
  amount,
  paymentMethod,
  customerName = 'Customer',
  customerEmail = '',
  orderNumber = '',
  onSuccess,
}: StripePaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'card' | 'mobile' | 'bank'>(
    paymentMethod === 'mobile_banking' ? 'mobile' : paymentMethod === 'bank_transfer' ? 'bank' : 'card'
  );

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [nameOnCard, setNameOnCard] = useState(customerName || 'Test Customer');
  const [zip, setZip] = useState('1212');

  // Mobile Banking state
  const [mobileProvider, setMobileProvider] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [mobileNumber, setMobileNumber] = useState('01700-123456');
  const [mobileOtp, setMobileOtp] = useState('1234');

  // Bank Transfer state
  const [bankName, setBankName] = useState('City Bank PLC');
  const [accountNumber, setAccountNumber] = useState('1102938475');

  // Processing states
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const handlePay = () => {
    setStatus('processing');

    // Simulate authentic Stripe authorization
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        onSuccess({
          paymentMethod:
            activeTab === 'card'
              ? 'card'
              : activeTab === 'mobile'
              ? 'mobile_banking'
              : 'bank_transfer',
          stripePaymentIntentId: `pi_test_${Date.now()}_stripe_${Math.random().toString(36).substring(7)}`,
        });
      }, 1200);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (status !== 'processing' && status !== 'success') {
        onOpenChange(val);
      }
    }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-2xl rounded-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        
        {/* White Stripe Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 leading-tight">
                  Savoria Restaurant
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {orderNumber ? `Order ${orderNumber}` : 'Online Checkout'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Due
              </p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-50">
                {formatCurrency(amount)}
              </p>
            </div>
          </div>

          {/* Test mode banner */}
          <div className="mt-3.5 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 border border-amber-200 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              STRIPE TEST MODE — Any Card / Code Accepted
            </span>
            <span className="text-[11px] font-normal text-amber-700 dark:text-amber-400">
              No real money charged
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 animate-in zoom-in-75 duration-300">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Payment Successful!
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                Your payment of {formatCurrency(amount)} has been confirmed by Stripe. Finalizing your order...
              </p>
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-medium">
                <ShieldCheck className="h-4 w-4" /> Receipt generated
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Method Switcher Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg dark:bg-slate-900 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('card')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${
                    activeTab === 'card'
                      ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('mobile')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${
                    activeTab === 'mobile'
                      ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Mobile Banking</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bank')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-all ${
                    activeTab === 'bank'
                      ? 'bg-white shadow-xs text-indigo-600 dark:bg-slate-800 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Bank Transfer</span>
                </button>
              </div>

              {/* Card Form */}
              {activeTab === 'card' && (
                <div className="space-y-3.5 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Card Number
                    </Label>
                    <div className="relative">
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        className="pl-10 h-10 border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800 font-mono text-sm"
                      />
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        VISA / MC
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Expiration
                      </Label>
                      <Input
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM / YY"
                        className="h-10 border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        CVC / CVV
                      </Label>
                      <Input
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        placeholder="123"
                        className="h-10 border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Cardholder Name
                    </Label>
                    <Input
                      value={nameOnCard}
                      onChange={(e) => setNameOnCard(e.target.value)}
                      placeholder="Jane Doe"
                      className="h-10 border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Mobile Banking Form */}
              {activeTab === 'mobile' && (
                <div className="space-y-3.5 pt-1">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'bkash', name: 'bKash', color: 'border-pink-500 text-pink-600 bg-pink-50/50' },
                      { id: 'nagad', name: 'Nagad', color: 'border-orange-500 text-orange-600 bg-orange-50/50' },
                      { id: 'rocket', name: 'Rocket', color: 'border-purple-500 text-purple-600 bg-purple-50/50' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setMobileProvider(p.id as any)}
                        className={`rounded-lg border-2 py-2 px-1 text-xs font-bold transition-all text-center ${
                          mobileProvider === p.id
                            ? `${p.color} ring-2 ring-primary/20`
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {mobileProvider.toUpperCase()} Wallet Number
                    </Label>
                    <Input
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="01700-000000"
                      className="h-10 border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      PIN / OTP (Test Code)
                    </Label>
                    <Input
                      type="password"
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value)}
                      placeholder="••••"
                      className="h-10 border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Bank Transfer Form */}
              {activeTab === 'bank' && (
                <div className="space-y-3.5 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Bank Name
                    </Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. City Bank, Brac Bank"
                      className="h-10 border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Account / Transaction Reference
                    </Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 1102938475"
                      className="h-10 border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-800 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handlePay}
                  disabled={status === 'processing'}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 rounded-xl"
                >
                  {status === 'processing' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Authorizing with Stripe...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Pay {formatCurrency(amount)}</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Stripe Trust Footer */}
              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Powered by Stripe Payments • 256-Bit SSL Encrypted</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
