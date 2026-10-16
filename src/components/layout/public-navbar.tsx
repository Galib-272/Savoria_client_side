'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ShoppingBag,
  X,
  UtensilsCrossed,
  LayoutDashboard,
  LogOut,
  User,
  ChevronDown,
  Home,
  BookOpen,
  Tag,
  CalendarDays,
  Info,
  Phone,
  LogIn,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { restaurantInfo as fallbackRestaurantInfo } from '@/lib/mock-data';
import { getCart } from '@/lib/cart';
import { api } from '@/lib/api';
import { getStoredUser, type CurrentUser } from '@/lib/auth';
import { CustomerNotificationBell } from './customer-notifications';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/offers', label: 'Offers' },
  { href: '/reservations', label: 'Reservations' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

// Bottom nav items for mobile — Home in the center (index 2)
const mobileBottomNav = [
  { href: '/menu', label: 'Menu', icon: BookOpen },
  { href: '/offers', label: 'Offers', icon: Tag },
  { href: '/', label: 'Home', icon: Home, isCenter: true },
  { href: '/about', label: 'About', icon: Info },
  { href: '/contact', label: 'Contact', icon: Phone },
];

export function PublicNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(fallbackRestaurantInfo);
  const [cartCount, setCartCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getSettings().then((data) => {
      if (data) setRestaurant((prev) => ({ ...prev, ...data }));
    }).catch(console.error);

    const updateCount = () => {
      const items = getCart();
      setCartCount(items.reduce((acc, curr) => acc + curr.quantity, 0));
    };
    updateCount();

    const refreshUser = () => setCurrentUser(getStoredUser());
    refreshUser();

    window.addEventListener('cart_updated', updateCount);
    window.addEventListener('storage', refreshUser);
    return () => {
      window.removeEventListener('cart_updated', updateCount);
      window.removeEventListener('storage', refreshUser);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (mobileProfileRef.current && !mobileProfileRef.current.contains(e.target as Node)) {
        setMobileProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setDropdownOpen(false);
    setMobileProfileOpen(false);
    router.push('/');
  };

  const isStaff = currentUser && currentUser.role !== 'customer';

  // Generate initials from name
  const initials = currentUser
    ? currentUser.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '';

  // First name for display
  const firstName = currentUser?.name?.split(' ')[0] ?? '';

  // Hide Reservations link when not logged in
  const visibleNavLinks = currentUser
    ? navLinks
    : navLinks.filter((link) => link.href !== '/reservations');

  // Mobile bottom nav — hide Reservations when not logged in
  const visibleMobileBottomNav = currentUser
    ? mobileBottomNav
    : mobileBottomNav.filter((link) => link.href !== '/reservations');

  return (
    <>
      {/* ===== TOP HEADER BAR ===== */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              {restaurant.name}
            </span>
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <nav className="hidden items-center gap-1 md:flex">
            {visibleNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-primary',
                  pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Customer Notification Bell — only shows for logged-in customers */}
            <CustomerNotificationBell />

            {/* Cart */}
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-accent text-foreground transition-colors hover:bg-secondary"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* ===== DESKTOP: Logged-in user dropdown ===== */}
            {currentUser ? (
              <div className="relative hidden md:block" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 text-sm font-medium transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  {/* Avatar with image or initials fallback */}
                  <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground border border-border">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerText = initials;
                          }
                        }}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <span className="max-w-[110px] truncate text-sm font-medium">{firstName}</span>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', dropdownOpen && 'rotate-180')} />
                </button>

                {/* Desktop dropdown panel */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User info header */}
                    <div className="border-b border-border bg-accent/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground border border-border">
                          {currentUser.avatar ? (
                            <img
                              src={currentUser.avatar}
                              alt={currentUser.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                if (target.parentElement) {
                                  target.parentElement.innerText = initials;
                                }
                              }}
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{currentUser.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                          <span className="inline-block mt-0.5 rounded px-1.5 py-0.2 text-[10px] font-medium bg-primary/10 text-primary uppercase">
                            {currentUser.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-1.5 space-y-0.5">
                      {/* Customer-specific links: My Profile, Orders */}
                      {!isStaff ? (
                        <>
                          <Link
                            href="/profile"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                          >
                            <User className="h-4 w-4 text-muted-foreground" />
                            My Profile
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                          >
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            Orders
                          </Link>
                        </>
                      ) : (
                        /* Staff-only links */
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                          Staff Dashboard
                        </Link>
                      )}

                      <div className="my-1 h-px bg-border" />

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Guest: Login + Register (desktop only) */
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/login"
                  className="rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Register
                </Link>
              </div>
            )}

            {/* ===== MOBILE: Profile button in top bar ===== */}
            <div className="relative md:hidden" ref={mobileProfileRef}>
              {currentUser ? (
                <>
                  <button
                    onClick={() => setMobileProfileOpen((o) => !o)}
                    className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-primary text-xs font-bold text-primary-foreground border-2 border-primary/30 transition-transform active:scale-95"
                  >
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerText = initials;
                          }
                        }}
                      />
                    ) : (
                      initials
                    )}
                  </button>

                  {/* Mobile profile dropdown */}
                  {mobileProfileOpen && (
                    <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 z-[100]">
                      {/* User info header */}
                      <div className="border-b border-border bg-accent/50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground border border-border">
                            {currentUser.avatar ? (
                              <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                            ) : initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{currentUser.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                            <span className="inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary uppercase">
                              {currentUser.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        {!isStaff ? (
                          <>
                            <Link href="/profile" onClick={() => setMobileProfileOpen(false)}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                              <User className="h-4 w-4 text-muted-foreground" /> My Profile
                            </Link>
                            <Link href="/orders" onClick={() => setMobileProfileOpen(false)}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                              <ShoppingBag className="h-4 w-4 text-muted-foreground" /> Orders
                            </Link>
                          </>
                        ) : (
                          <Link href="/dashboard" onClick={() => setMobileProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                            <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Staff Dashboard
                          </Link>
                        )}
                        <div className="my-1 h-px bg-border" />
                        <button onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                          <LogOut className="h-4 w-4" /> Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Guest mobile: Login + Register buttons */
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/login"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== MOBILE BOTTOM NAVIGATION BAR ===== */}
      {/* Only visible on mobile screens (below md breakpoint) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Glassmorphism background */}
        <div className="border-t border-border/60 bg-background/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex h-[72px] max-w-lg items-end justify-around px-2 pb-2">
            {visibleMobileBottomNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              if (item.isCenter) {
                // Center elevated "Home" button
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative flex flex-col items-center -mt-5"
                  >
                    {/* Elevated circle */}
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300',
                        isActive
                          ? 'bg-primary text-primary-foreground scale-110 shadow-primary/30'
                          : 'bg-primary/90 text-primary-foreground hover:bg-primary hover:scale-105 shadow-primary/20'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span
                      className={cn(
                        'mt-1 text-[10px] font-semibold transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              }

              // Regular bottom nav item
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col items-center gap-0.5 py-1.5"
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground group-hover:text-foreground group-hover:bg-accent'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      isActive ? 'text-primary font-semibold' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                  {/* Active indicator dot */}
                  {isActive && (
                    <div className="h-1 w-1 rounded-full bg-primary animate-in zoom-in duration-200" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        {/* Safe area spacer for devices with home indicator */}
        <div className="bg-background/90 backdrop-blur-xl h-[env(safe-area-inset-bottom,0px)]" />
      </nav>
    </>
  );
}
