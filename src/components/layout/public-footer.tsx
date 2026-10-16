'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UtensilsCrossed, MapPin, Phone, Mail, Clock, Facebook, Instagram, Twitter } from 'lucide-react';
import { restaurantInfo as fallbackRestaurantInfo } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';

const footerLinks = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/offers', label: 'Offers' },
  { href: '/reservations', label: 'Reservations' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function PublicFooter() {
  const [restaurant, setRestaurant] = useState(fallbackRestaurantInfo);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    api.getSettings().then((data) => {
      if (data) setRestaurant((prev) => ({ ...prev, ...data }));
    }).catch(console.error);

    const checkAuth = () => {
      setIsLoggedIn(!!getStoredUser());
    };
    checkAuth();

    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const visibleLinks = isLoggedIn
    ? footerLinks
    : footerLinks.filter((link) => link.href !== '/reservations');

  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold">{restaurant.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{restaurant.description}</p>
            <div className="flex gap-3">
              <Link href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                <Facebook className="h-4 w-4" />
              </Link>
              <Link href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                <Instagram className="h-4 w-4" />
              </Link>
              <Link href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                <Twitter className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              {visibleLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {restaurant.address}
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                {restaurant.phone}
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                {restaurant.email}
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Opening Hours</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              {restaurant.hours}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {restaurant.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
