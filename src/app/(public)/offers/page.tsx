'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Tag, Clock, TrendingUp, Copy, Check } from 'lucide-react';
import { offers as fallbackOffers, coupons as fallbackCoupons } from '@/lib/mock-data';
import { api } from '@/lib/api';
import type { Coupon } from '@/lib/types';
import { toast } from 'sonner';

export default function OffersPage() {
  const [couponList, setCouponList] = useState<Coupon[]>(fallbackCoupons);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    api.getCoupons()
      .then((data) => {
        if (data && data.length) {
          setCouponList(data.map((c: any) => ({ ...c, id: c._id || c.id })));
        }
      })
      .catch(console.error);
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <Badge className="mb-3">Special Deals</Badge>
        <h1 className="font-display text-4xl font-bold">Offers & Promotions</h1>
        <p className="mt-2 text-muted-foreground">Save more with our exclusive deals and coupon codes</p>
      </div>

      {/* Offers Grid */}
      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {fallbackOffers.map((offer) => (
          <div
            key={offer.id}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${offer.color} p-6 text-white shadow-lg transition-transform hover:scale-105`}
          >
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-white/10 translate-y-10 -translate-x-10" />
            <Tag className="mb-3 h-8 w-8" />
            <Badge className="mb-3 bg-white/20 text-white">{offer.badge}</Badge>
            <h3 className="mb-2 font-display text-3xl font-bold">{offer.title}</h3>
            <p className="mb-4 text-white/90">{offer.description}</p>
            <Link href="/menu">
              <Button size="sm" className="bg-white text-gray-900 hover:bg-white/90">
                Order Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ))}
      </div>

      {/* Coupons Section */}
      <div className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl font-bold">Coupon Codes</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {couponList.filter((c) => c.active).map((coupon) => (
            <div key={coupon.id} className="relative overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-card p-6">
              <div className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background" />
              <div className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Use code</p>
                <p className="my-2 font-display text-2xl font-bold tracking-wider text-primary">{coupon.code}</p>
                <p className="text-lg font-semibold">
                  {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `৳${coupon.value} OFF`}
                </p>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Min order: ৳{coupon.minOrder}</p>
                  {coupon.maxDiscount && <p>Max discount: ৳{coupon.maxDiscount}</p>}
                  <p className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" /> Expires: {coupon.expiry}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full text-xs font-semibold"
                  onClick={() => handleCopyCode(coupon.code)}
                >
                  {copiedCode === coupon.code ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-secondary/50 p-8">
        <h2 className="mb-6 text-center font-display text-2xl font-bold">How to Use Coupons</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { step: '1', title: 'Choose Your Food', desc: 'Browse our menu and add items to your cart' },
            { step: '2', title: 'Apply Coupon Code', desc: 'Enter the coupon code at checkout to get your discount' },
            { step: '3', title: 'Enjoy Your Meal', desc: 'Pay less and enjoy your favorite food at a great price' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {item.step}
              </div>
              <h3 className="mb-1 font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
