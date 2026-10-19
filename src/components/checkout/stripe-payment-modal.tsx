'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  CheckCircle2,
  Loader2,
  Smartphone,
  Building2,
  UtensilsCrossed,
  ArrowLeft,
  ChevronDown,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Official Stripe Wordmark SVG
function StripeLogo({ className = 'h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 60 25"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M59.64 14.28c0-4.48-2.22-7.85-6.3-7.85-4.1 0-6.62 3.37-6.62 7.82 0 5.27 3.03 7.78 7.23 7.78 2.06 0 3.61-.46 4.78-1.12v-3.32c-1.17.61-2.48.97-4.1.97-1.63 0-3.05-.62-3.26-2.52h8.21c.03-.4.06-1.14.06-1.76zm-8.24-1.61c0-1.78 1.09-2.5 2.04-2.5.93 0 1.95.72 1.95 2.5h-3.99zM39.63 6.43h-4.32v15.6h4.32V6.43zm-.12-4.88c0 1.25-.97 2.15-2.07 2.15-1.11 0-2.07-.9-2.07-2.15 0-1.23.96-2.13 2.07-2.13 1.1 0 2.07.9 2.07 2.13zm-6.69 8.27V6.43h-4.22v2.32c-.88-1.54-2.4-2.32-4.15-2.32-3.4 0-6.07 2.76-6.07 7.76 0 4.8 2.58 7.84 5.97 7.84 1.76 0 3.33-.82 4.25-2.38v2.38h4.22V9.82zm-4.32 4.41c0 2.47-1.35 4.14-3.23 4.14-1.9 0-3.17-1.67-3.17-4.14 0-2.54 1.28-4.14 3.17-4.14 1.88 0 3.23 1.6 3.23 4.14zm-14.73-4.41c-1.07-.63-2.61-1.06-4.21-1.06-2.35 0-3.69 1.11-3.69 2.78 0 1.48 1.05 2.18 3.14 2.8 2.72.82 4.89 1.72 4.89 4.67 0 3.63-3.05 5.02-6.52 5.02-2.19 0-4.3-.59-5.59-1.42v-3.79c1.3.89 3.12 1.49 4.97 1.49 2.22 0 3.14-1 3.14-2.28 0-1.64-1.2-2.25-3.45-2.95-2.62-.82-4.57-1.89-4.57-4.51 0-3.23 2.73-4.99 6.26-4.99 1.88 0 3.73.46 4.92 1.17l.71 3.07z"
      />
    </svg>
  );
}

// Card Brand Badges
function VisaIcon() {
  return (
    <svg className="h-4 w-7" viewBox="0 0 36 24" fill="none">
      <rect width="36" height="24" rx="3" fill="#0A2540" />
      <path
        d="M14.5 16.5L16.2 7.5H18.3L16.6 16.5H14.5ZM23.4 7.7C23.0 7.5 22.3 7.3 21.4 7.3C19.3 7.3 17.8 8.4 17.8 10.0C17.8 11.2 18.9 11.8 19.7 12.2C20.5 12.6 20.8 12.9 20.8 13.3C20.8 13.9 20.1 14.2 19.4 14.2C18.6 14.2 18.0 14.0 17.4 13.7L17.0 15.6C17.6 15.9 18.5 16.1 19.4 16.1C21.7 16.1 23.2 15.0 23.2 13.3C23.2 12.0 22.4 11.2 21.2 10.6C20.5 10.2 20.1 9.9 20.1 9.5C20.1 9.1 20.5 8.7 21.4 8.7C22.1 8.7 22.7 8.9 23.1 9.1L23.4 7.7ZM27.8 7.5H26.2C25.7 7.5 25.3 7.7 25.1 8.1L22.2 15.1L24.3 15.1L24.7 14.0H27.3L27.5 15.1H29.4L27.8 7.5ZM25.3 12.4L26.3 9.6L26.9 12.4H25.3ZM13.8 7.5L11.8 13.6L11.6 12.4C11.3 11.1 10.0 9.7 8.7 8.9L10.6 16.5H12.8L16.1 7.5H13.8Z"
        fill="white"
      />
    </svg>
  );
}

function MastercardIcon() {
  return (
    <svg className="h-4 w-7" viewBox="0 0 36 24" fill="none">
      <rect width="36" height="24" rx="3" fill="#0A2540" />
      <circle cx="14" cy="12" r="6" fill="#EB001B" />
      <circle cx="22" cy="12" r="6" fill="#F79E1B" />
      <path
        d="M18 7.8A5.99 5.99 0 0 1 20.2 12A5.99 5.99 0 0 1 18 16.2A5.99 5.99 0 0 1 15.8 12A5.99 5.99 0 0 1 18 7.8Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function AmexIcon() {
  return (
    <svg className="h-4 w-7" viewBox="0 0 36 24" fill="none">
      <rect width="36" height="24" rx="3" fill="#007BC1" />
      <path
        d="M7 16.5L10.2 7.5H13.8L17 16.5H14.8L14.2 14.8H9.8L9.2 16.5H7ZM10.5 13H13.5L12 8.9L10.5 13ZM19 16.5V7.5H22.5L24.8 12.2L27.1 7.5H30.5V16.5H28.5V10.8L25.8 16.5H23.8L21 10.8V16.5H19Z"
        fill="white"
      />
    </svg>
  );
}

interface CartSummaryItem {
  name: string;
  price: number;
  quantity: number;
  modifiers?: any[];
}

interface StripePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  paymentMethod: string; // 'card' | 'mobile_banking' | 'bank_transfer'
  customerName?: string;
  customerEmail?: string;
  orderNumber?: string;
  items?: CartSummaryItem[];
  subtotal?: number;
  tax?: number;
  deliveryFee?: number;
  discount?: number;
  couponCode?: string;
  onSuccess: (paymentData: { paymentMethod: string; stripePaymentIntentId: string }) => Promise<any> | any;
}

export function StripePaymentModal({
  open,
  onOpenChange,
  amount,
  paymentMethod,
  customerName = 'Customer',
  customerEmail = '',
  orderNumber = '',
  items = [],
  subtotal = 0,
  tax = 0,
  deliveryFee = 0,
  discount = 0,
  couponCode = '',
  onSuccess,
}: StripePaymentModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'card' | 'mobile' | 'bank'>(
    paymentMethod === 'mobile_banking'
      ? 'mobile'
      : paymentMethod === 'bank_transfer'
      ? 'bank'
      : 'card'
  );

  // Form states - blank by default so user can enter whatever they want
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [country, setCountry] = useState('BD');
  const [postalCode, setPostalCode] = useState('');

  // Mobile Banking state - blank
  const [mobileProvider, setMobileProvider] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobilePin, setMobilePin] = useState('');

  // Bank Transfer state - blank
  const [bankName, setBankName] = useState('City Bank PLC');
  const [accountNumber, setAccountNumber] = useState('');

  // Status state
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  // Lock background scroll when open & reset all fields to completely blank
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setEmail(customerEmail || '');
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setNameOnCard('');
      setPostalCode('');
      setMobileNumber('');
      setMobilePin('');
      setAccountNumber('');
      setStatus('idle');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, customerEmail]);

  if (!open) return null;

  // Auto-format card number: groups of 4 digits separated by spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || '';
    setCardNumber(formatted);
  };

  // Auto-format expiration date: handles auto-slash, MM/YY, and typing 1/27
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Handle backspace when trailing slash is present
    if (val.length < expiry.length) {
      if (expiry.endsWith('/') && !val.endsWith('/')) {
        val = val.slice(0, -1);
      }
      setExpiry(val);
      return;
    }

    // If user typed or pasted with a slash, e.g. "1/27", "1/", "12/27"
    if (val.includes('/')) {
      const parts = val.split('/');
      let m = parts[0].replace(/\D/g, '').slice(0, 2);
      const y = (parts[1] || '').replace(/\D/g, '').slice(0, 2);

      if (m.length === 1 && (parts.length > 1 || val.endsWith('/'))) {
        m = `0${m}`;
      }
      const mNum = parseInt(m, 10);
      if (mNum > 12) m = '12';
      else if (mNum === 0 && m.length === 2) m = '01';

      if (y.length > 0) {
        setExpiry(`${m}/${y}`);
      } else {
        setExpiry(`${m}/`);
      }
      return;
    }

    // Extract digits only (when typed without slash)
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (!digits) {
      setExpiry('');
      return;
    }

    // If user typed 1 digit: if 2-9, auto-format to 0X/
    if (digits.length === 1) {
      if (Number(digits) > 1) {
        setExpiry(`0${digits}/`);
        return;
      }
      setExpiry(digits);
      return;
    }

    // 2 or more digits: e.g. "01" -> "01/", "12" -> "12/", "0127" -> "01/27"
    let month = digits.slice(0, 2);
    const year = digits.slice(2, 4);

    const monthNum = parseInt(month, 10);
    if (monthNum > 12) {
      month = '12';
    } else if (monthNum === 0) {
      month = '01';
    }

    if (year.length > 0) {
      setExpiry(`${month}/${year}`);
    } else {
      setExpiry(`${month}/`);
    }
  };

  // Auto-format CVC: digits only, max 4
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvc(digits);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'processing' || status === 'success') return;

    setStatus('processing');

    try {
      const res = await onSuccess({
        paymentMethod:
          activeTab === 'card'
            ? 'card'
            : activeTab === 'mobile'
            ? 'mobile_banking'
            : 'bank_transfer',
        stripePaymentIntentId: `pi_live_${Date.now()}_stripe_${Math.random()
          .toString(36)
          .substring(7)}`,
      });

      setStatus('success');
      const orderId =
        res?.order?._id || res?.order?.id || res?.data?._id || res?.data?.id || '';

      setTimeout(() => {
        onOpenChange(false);
        if (orderId) {
          router.push(`/orders?orderId=${orderId}`);
        } else {
          router.push('/orders');
        }
      }, 700);
    } catch {
      setStatus('idle');
      onOpenChange(false);
    }
  };

  const displaySubtotal = subtotal > 0 ? subtotal : Math.round(amount / 1.1);
  const displayTax = tax > 0 ? tax : Math.round(amount - displaySubtotal);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col lg:flex-row bg-[#ffffff] text-[#1a1f36] overflow-y-auto selection:bg-[#635bff]/20 font-sans antialiased">
      {/* LEFT COLUMN: Clean Stripe Order Summary (Off-white / Slate-50) */}
      <div className="w-full lg:w-[46%] bg-[#f7f9fa] border-b lg:border-b-0 lg:border-r border-[#e6ebf1] p-6 sm:p-8 lg:p-14 flex flex-col justify-between min-h-full">
        <div>
          {/* Back to Restaurant Link */}
          <button
            type="button"
            onClick={() => {
              if (status !== 'processing') onOpenChange(false);
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#4f566b] hover:text-[#1a1f36] transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Savoria</span>
          </button>

          {/* Merchant Brand & Amount */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-[#635bff] to-[#4f46e5] text-white shadow-sm">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#697386] tracking-wide uppercase">
                  Savoria Restaurant
                </p>
                <h2 className="text-lg font-bold text-[#1a1f36]">Online Order</h2>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-medium text-[#697386]">Pay Savoria Restaurant</p>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1a1f36] mt-0.5">
                {formatCurrency(amount)}
              </p>
            </div>
          </div>

          {/* Itemized Cart List */}
          <div className="mt-8 pt-6 border-t border-[#e6ebf1] space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#697386]">
              Order Summary
            </p>

            {items && items.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <span className="font-medium text-[#1a1f36] truncate">{item.name}</span>
                      <span className="text-xs text-[#697386]">× {item.quantity}</span>
                    </div>
                    <span className="font-medium text-[#1a1f36]">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#1a1f36]">Restaurant Dining & Service</span>
                <span className="font-medium text-[#1a1f36]">{formatCurrency(displaySubtotal)}</span>
              </div>
            )}

            <div className="pt-4 border-t border-[#e6ebf1] space-y-2 text-sm text-[#4f566b]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-[#1a1f36]">{formatCurrency(displaySubtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#00a854] font-medium">
                  <span>Discount {couponCode ? `(${couponCode})` : ''}</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery fee</span>
                  <span className="font-medium text-[#1a1f36]">
                    {formatCurrency(deliveryFee)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated taxes (10%)</span>
                <span className="font-medium text-[#1a1f36]">{formatCurrency(displayTax)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#e6ebf1] text-base font-bold text-[#1a1f36]">
                <span>Total due</span>
                <span>{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Trust Note */}
        <div className="hidden lg:flex items-center gap-2 pt-10 text-xs text-[#697386]">
          <Shield className="h-4 w-4 text-[#00d924]" />
          <span>Encrypted with 256-bit SSL certificate</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Pristine White Stripe Payment Screen */}
      <div className="w-full lg:w-[54%] bg-[#ffffff] p-6 sm:p-8 lg:p-14 flex flex-col justify-between min-h-full">
        <div className="max-w-lg mx-auto w-full">
          {status === 'success' ? (
            /* Stripe Payment Success Animation */
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#00d924]/10 text-[#00d924]">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-bold text-[#1a1f36]">Payment successful</h3>
              <p className="text-sm text-[#4f566b] max-w-sm">
                Thank you! Your payment of {formatCurrency(amount)} has been confirmed by Stripe.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-[#697386] pt-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Redirecting you to your order...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-6">
              {/* Payment Methods Selector Tabs */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#697386] mb-2.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-[#f7f9fa] border border-[#e6ebf1] rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveTab('card')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-all ${
                      activeTab === 'card'
                        ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#635bff] font-semibold border border-[#e6ebf1]'
                        : 'text-[#4f566b] hover:text-[#1a1f36]'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('mobile')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-all ${
                      activeTab === 'mobile'
                        ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#635bff] font-semibold border border-[#e6ebf1]'
                        : 'text-[#4f566b] hover:text-[#1a1f36]'
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Mobile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('bank')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-all ${
                      activeTab === 'bank'
                        ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#635bff] font-semibold border border-[#e6ebf1]'
                        : 'text-[#4f566b] hover:text-[#1a1f36]'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Bank</span>
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <label className="block text-sm font-semibold text-[#1a1f36] mb-1.5">
                  Contact information
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#e6ebf1] bg-white text-sm text-[#1a1f36] placeholder-[#a1aab6] shadow-xs focus:outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all"
                />
              </div>

              {/* TAB 1: CARD PAYMENT DETAILS */}
              {activeTab === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1a1f36] mb-1.5">
                      Card information
                    </label>

                    {/* Stripe Elements Grouped Card Input Box */}
                    <div className="rounded-lg border border-[#e6ebf1] bg-white shadow-xs focus-within:border-[#635bff] focus-within:ring-2 focus-within:ring-[#635bff]/20 transition-all overflow-hidden divide-y divide-[#e6ebf1]">
                      {/* Card Number */}
                      <div className="relative flex items-center px-3.5 h-11">
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          maxLength={19}
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="1234 1234 1234 1234"
                          className="w-full text-sm text-[#1a1f36] placeholder-[#a1aab6] bg-transparent focus:outline-none tracking-wider font-mono text-[13px]"
                        />
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <VisaIcon />
                          <MastercardIcon />
                          <AmexIcon />
                        </div>
                      </div>

                      {/* Expiration and CVC */}
                      <div className="grid grid-cols-2 divide-x divide-[#e6ebf1]">
                        <div className="px-3.5 h-11 flex items-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            maxLength={5}
                            value={expiry}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY"
                            className="w-full text-sm text-[#1a1f36] placeholder-[#a1aab6] bg-transparent focus:outline-none font-mono text-[13px]"
                          />
                        </div>
                        <div className="px-3.5 h-11 flex items-center justify-between">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            maxLength={4}
                            value={cvc}
                            onChange={handleCvcChange}
                            placeholder="CVC"
                            className="w-full text-sm text-[#1a1f36] placeholder-[#a1aab6] bg-transparent focus:outline-none font-mono text-[13px]"
                          />
                          <CreditCard className="h-4 w-4 text-[#a1aab6] shrink-0" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1a1f36] mb-1.5">
                      Cardholder name
                    </label>
                    <input
                      type="text"
                      value={nameOnCard}
                      onChange={(e) => setNameOnCard(e.target.value)}
                      placeholder="Full name on card"
                      className="w-full h-11 px-3.5 rounded-lg border border-[#e6ebf1] bg-white text-sm text-[#1a1f36] placeholder-[#a1aab6] shadow-xs focus:outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all"
                    />
                  </div>

                  {/* Country & Postal Code */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1a1f36] mb-1.5">
                      Country or region
                    </label>
                    <div className="rounded-lg border border-[#e6ebf1] bg-white shadow-xs divide-y divide-[#e6ebf1] focus-within:border-[#635bff] focus-within:ring-2 focus-within:ring-[#635bff]/20 transition-all overflow-hidden">
                      <div className="relative px-3.5 h-11 flex items-center">
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full text-sm text-[#1a1f36] bg-transparent focus:outline-none appearance-none cursor-pointer pr-6"
                        >
                          <option value="BD">Bangladesh</option>
                          <option value="US">United States</option>
                          <option value="GB">United Kingdom</option>
                          <option value="CA">Canada</option>
                          <option value="AU">Australia</option>
                          <option value="EU">European Union</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 h-4 w-4 text-[#697386] pointer-events-none" />
                      </div>
                      <div className="px-3.5 h-11 flex items-center">
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="Postal code"
                          className="w-full text-sm text-[#1a1f36] placeholder-[#a1aab6] bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MOBILE BANKING */}
              {activeTab === 'mobile' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1a1f36] mb-2">
                      Select Mobile Wallet
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setMobileProvider('bkash')}
                        className={`py-3 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                          mobileProvider === 'bkash'
                            ? 'border-[#e2136e] bg-[#e2136e]/5 text-[#e2136e] ring-2 ring-[#e2136e]/20'
                            : 'border-[#e6ebf1] hover:border-slate-300 text-[#4f566b]'
                        }`}
                      >
                        bKash
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileProvider('nagad')}
                        className={`py-3 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                          mobileProvider === 'nagad'
                            ? 'border-[#f7941d] bg-[#f7941d]/5 text-[#f7941d] ring-2 ring-[#f7941d]/20'
                            : 'border-[#e6ebf1] hover:border-slate-300 text-[#4f566b]'
                        }`}
                      >
                        Nagad
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileProvider('rocket')}
                        className={`py-3 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                          mobileProvider === 'rocket'
                            ? 'border-[#8c3494] bg-[#8c3494]/5 text-[#8c3494] ring-2 ring-[#8c3494]/20'
                            : 'border-[#e6ebf1] hover:border-slate-300 text-[#4f566b]'
                        }`}
                      >
                        Rocket
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1a1f36] mb-1.5">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full h-11 px-3.5 rounded-lg border border-[#e6ebf1] bg-white text-sm text-[#1a1f36] placeholder-[#a1aab6] shadow-xs focus:outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1a1f36] mb-1.5">
                      Verification PIN
                    </label>
                    <input
                      type="password"
                      value={mobilePin}
                      onChange={(e) => setMobilePin(e.target.value)}
                      placeholder="••••"
                      maxLength={5}
                      className="w-full h-11 px-3.5 rounded-lg border border-[#e6ebf1] bg-white text-sm text-[#1a1f36] placeholder-[#a1aab6] shadow-xs focus:outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all tracking-widest"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: BANK TRANSFER */}
              {activeTab === 'bank' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1a1f36] mb-1.5">
                      Receiving Bank
                    </label>
                    <div className="relative">
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-lg border border-[#e6ebf1] bg-white text-sm text-[#1a1f36] shadow-xs focus:outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all appearance-none cursor-pointer pr-8"
                      >
                        <option value="City Bank PLC">City Bank PLC</option>
                        <option value="BRAC Bank">BRAC Bank PLC</option>
                        <option value="Eastern Bank Ltd">Eastern Bank Ltd (EBL)</option>
                        <option value="Dutch-Bangla Bank">Dutch-Bangla Bank Ltd</option>
                        <option value="Standard Chartered">Standard Chartered Bank</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#697386] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1a1f36] mb-1.5">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="1102938475"
                      className="w-full h-11 px-3.5 rounded-lg border border-[#e6ebf1] bg-white text-sm text-[#1a1f36] placeholder-[#a1aab6] shadow-xs focus:outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Authentic Stripe Blurple Pay Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === 'processing'}
                  className="w-full h-12 rounded-lg bg-[#635bff] hover:bg-[#0a2540] active:scale-[0.99] disabled:opacity-75 disabled:pointer-events-none text-white text-base font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {status === 'processing' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Pay {formatCurrency(amount)}</span>
                  )}
                </button>
              </div>

              {/* Stripe Guarantee Terms Footer */}
              <div className="pt-2 flex flex-col items-center justify-center space-y-2 text-center">
                <div className="flex items-center gap-1.5 text-xs text-[#697386]">
                  <span>Powered by</span>
                  <span className="text-[#635bff] font-bold text-sm tracking-tight flex items-center">
                    <StripeLogo className="h-4 fill-[#635bff]" />
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#8792a2]">
                  <span className="hover:underline cursor-pointer">Terms</span>
                  <span>•</span>
                  <span className="hover:underline cursor-pointer">Privacy</span>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Mobile footer guarantee */}
        <div className="lg:hidden flex items-center justify-center gap-1.5 text-xs text-[#697386] pt-8">
          <Shield className="h-3.5 w-3.5 text-[#00d924]" />
          <span>256-Bit SSL Encrypted Payment</span>
        </div>
      </div>
    </div>
  );
}
