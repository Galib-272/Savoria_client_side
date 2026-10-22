'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Table2,
  Users,
  Package,
  Truck,
  ClipboardList,
  BarChart3,
  Settings,
  ScrollText,
  Receipt,
  ChefHat,
  Bike,
  Utensils,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { restaurantInfo as fallbackRestaurantInfo } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { UserRole } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface SubNavItem {
  href: string;
  label: string;
  icon?: React.ElementType;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Which roles can see this item. Empty = everyone with dashboard access. */
  roles: UserRole[];
  subItems?: SubNavItem[];
}

const allNavItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'customer'],
  },
  {
    href: '/dashboard/orders',
    label: 'Orders',
    icon: ShoppingBag,
    roles: ['admin', 'manager', 'cashier', 'waiter', 'delivery'],
  },
  {
    href: '/dashboard/pos',
    label: 'POS / Cashier',
    icon: Receipt,
    roles: ['admin', 'manager', 'cashier'],
    subItems: [
      { href: '/dashboard/pos', label: 'POS Terminal' },
      { href: '/dashboard/pos/transactions', label: 'Transaction History' },
      { href: '/dashboard/pos/profile', label: 'Cashier Profile' },
    ],
  },
  {
    href: '/dashboard/kitchen',
    label: 'Kitchen',
    icon: ChefHat,
    roles: ['admin', 'manager', 'kitchen'],
    subItems: [
      { href: '/dashboard/kitchen', label: 'Kitchen Board' },
      { href: '/dashboard/kitchen/served', label: 'Served to Table' },
      { href: '/dashboard/kitchen/takeaway', label: 'Takeaway Orders' },
      { href: '/dashboard/kitchen/delivery', label: 'Delivery Orders' },
      { href: '/dashboard/kitchen/profile', label: 'Chef Profile' },
    ],
  },
  {
    href: '/dashboard/tables',
    label: 'Tables & Seats',
    icon: Table2,
    roles: ['admin', 'manager', 'waiter', 'customer'],
  },
  {
    href: '/dashboard/menu',
    label: 'Menu Management',
    icon: UtensilsCrossed,
    roles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/delivery',
    label: 'Delivery',
    icon: Bike,
    roles: ['admin', 'manager', 'delivery'],
    subItems: [
      { href: '/dashboard/delivery', label: 'Delivery Board' },
      { href: '/dashboard/delivery/history', label: 'Delivery History' },
    ],
  },
  {
    href: '/dashboard/reservations',
    label: 'Reservations',
    icon: Utensils,
    roles: ['admin', 'manager', 'waiter', 'customer'],
  },
  {
    href: '/dashboard/inventory',
    label: 'Inventory',
    icon: Package,
    roles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/suppliers',
    label: 'Suppliers',
    icon: Truck,
    roles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/staff',
    label: 'Staff',
    icon: Users,
    roles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['admin', 'manager'],
  },
  {
    href: '/dashboard/audit-logs',
    label: 'Audit Logs',
    icon: ScrollText,
    roles: ['admin'],
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['admin', 'manager'],
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  cashier: 'Cashier',
  kitchen: 'Kitchen Staff',
  waiter: 'Waiter / Server',
  delivery: 'Delivery Driver',
  customer: 'Customer',
};

interface DashboardSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [restaurantName, setRestaurantName] = useState(fallbackRestaurantInfo.name);

  useEffect(() => {
    api.getSettings().then((data) => {
      if (data?.name) setRestaurantName(data.name);
    }).catch(console.error);
  }, []);

  const role = (currentUser?.role ?? 'customer') as UserRole;

  // Filter nav items based on logged-in user's role
  const visibleNavItems = allNavItems.filter((item) =>
    item.roles.includes(role)
  );

  const displayName = currentUser?.name || 'Guest';
  const displayRole = ROLE_LABELS[role] || role;
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Keep sub-items for POS, Kitchen & Delivery expanded by default for instant access
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    '/dashboard/pos': true,
    '/dashboard/kitchen': true,
    '/dashboard/delivery': true,
  });

  const toggleSubMenu = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMenus((prev) => ({
      ...prev,
      [href]: !(prev[href] ?? true),
    }));
  };

  const handleLogout = () => {
    api.logout();
    router.replace('/login');
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-card transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">{restaurantName}</span>
          </Link>
          <button onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 pt-3 pb-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary uppercase tracking-wide">
            {displayRole}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            {visibleNavItems.map((item) => {
              const isParentRoute =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(item.href + '/');

              const isExpanded = item.subItems
                ? (expandedMenus[item.href] ?? isParentRoute)
                : false;

              return (
                <div key={item.href} className="space-y-1">
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isParentRoute
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>

                    {item.subItems && (
                      <button
                        type="button"
                        onClick={(e) => toggleSubMenu(e, item.href)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mr-1"
                        aria-label="Toggle submenu"
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform duration-200',
                            !isExpanded && '-rotate-90'
                          )}
                        />
                      </button>
                    )}
                  </div>

                  {/* Render sub-items if present and expanded */}
                  {item.subItems && isExpanded && (
                    <div className="ml-5 space-y-0.5 border-l-2 border-border pl-2 py-1">
                      {item.subItems.map((sub) => {
                        const isSubActive =
                          sub.href === item.href
                            ? pathname === item.href
                            : pathname.startsWith(sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={onClose}
                            className={cn(
                              'block rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                              isSubActive
                                ? 'bg-primary/15 text-primary font-semibold'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            )}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* User card */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-accent p-3">
            <Link
              href={
                role === 'delivery' || pathname?.startsWith('/dashboard/delivery')
                  ? '/dashboard/delivery/profile'
                  : role === 'cashier' || pathname?.startsWith('/dashboard/pos')
                  ? '/dashboard/pos/profile'
                  : role === 'kitchen' || pathname?.startsWith('/dashboard/kitchen')
                  ? '/dashboard/kitchen/profile'
                  : '/profile'
              }
              className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground overflow-hidden border border-border">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.innerText = initials || 'U';
                      }
                    }}
                  />
                ) : (
                  initials || 'U'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{currentUser?.email || ''}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
